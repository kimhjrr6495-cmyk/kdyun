// DEADLINE — v1.3.0 ECONOMY & LUCK REBALANCE
"use strict";

(() => {
  GAME_DATA.version = "v1.3.0";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousUpdateStatsRail = Game.updateStatsRail;
  const previousPrepareStage90SpinEffects = Game.prepareStage90SpinEffects;
  const previousShowDeadlineSuccess = Game.showDeadlineSuccess;
  const previousGetUnusedRoundCount = Game.getUnusedRoundCount;

  const LUCK_EXCLUDED_SYMBOLS = new Set(["WD", "ER"]);
  const EARLY_CLEAR_TICKETS = { 3: 8, 2: 5, 1: 3, 0: 1 };

  Game.patchStage130Data = function () {
    GAME_DATA.version = "v1.3.0";

    GAME_DATA.shop.rerollBaseTargetRatio = 0.08;
    GAME_DATA.shop.rerollStepTargetRatio = 0.03;

    if (GAME_DATA.economy?.vaultTerms?.["2"]) {
      GAME_DATA.economy.vaultTerms["2"].roundRates = [0.20, 0.20];
    }
    if (GAME_DATA.economy?.vaultTerms?.["4"]) {
      GAME_DATA.economy.vaultTerms["4"].roundRates = [0.20, 0.20, 0.35, 0.35];
    }

    const greenPepper = (GAME_DATA.items || []).find((item) => item.id === "green_pepper");
    if (greenPepper) {
      greenPepper.note = "15% 확률로 이번 ↻ ROLL 행운 +4 · 9회 발동 후 소멸";
      greenPepper.effect = { ...(greenPepper.effect || {}), type: "chance_spin_luck", luck: 4 };
    }

    const refreshCoupon = (GAME_DATA.items || []).find((item) => item.id === "refresh_coupon");
    if (refreshCoupon) {
      refreshCoupon.note = "상점 새로고침 $ 비용 -20%";
      refreshCoupon.stage96RerollDiscount = 0.20;
    }

    const pointsCard = (GAME_DATA.items || []).find((item) => item.id === "points_card");
    if (pointsCard) {
      pointsCard.note = "상점 새로고침 3회마다 다음 1회 무료 · $ 비용 0";
    }

    const overloadShelf = (GAME_DATA.items || []).find((item) => item.id === "overload_shelf");
    if (overloadShelf) {
      overloadShelf.note = "보유 아이템 최대치 +3 · 상점 새로고침 $ 비용 +10%";
    }

    if (GAME_DATA.shinyTraits?.LUCK) {
      GAME_DATA.shinyTraits.LUCK.note = "매 ↻ ROLL 기본 행운 +1";
    }

    (GAME_DATA.items || []).forEach((item) => {
      if (!item || typeof item.note !== "string") return;
      if (item.effect?.type === "shop_reroll_discount") {
        item.note = "상점 새로고침 $ 비용 -20%";
        item.stage96RerollDiscount = 0.20;
      }
      if (item.effect?.type === "shop_reroll_free_every") {
        const every = Math.max(1, Number(item.effect?.every) || 3);
        item.note = `상점 새로고침 ${every}회마다 다음 1회 무료 · $ 비용 0`;
      }
    });
  };

  Game.getStage120LuckGuarantee = function (luckValue = null) {
    const luck = Math.max(0, Number(luckValue ?? this.stage90ActiveLuck) || 0);
    return Math.min(15, Math.floor(luck + 1e-9));
  };

  Game.getStage120PersistentLuck = function () {
    return (this.getStage96ShinyItems?.("LUCK") || []).length;
  };

  Game.pickStage120LuckTarget = function () {
    const symbols = (GAME_DATA.symbols || []).filter((symbol) =>
      symbol && !LUCK_EXCLUDED_SYMBOLS.has(symbol.id)
    );
    if (!symbols.length) return null;

    const weights = this.getStage90SymbolWeightMap?.() || {};
    const total = symbols.reduce(
      (sum, symbol) => sum + Math.max(0, Number(weights[symbol.id]) || 0),
      0
    );
    if (total <= 0) return symbols[Math.floor(Math.random() * symbols.length)] || null;

    let cursor = Math.random() * total;
    for (const symbol of symbols) {
      cursor -= Math.max(0, Number(weights[symbol.id]) || 0);
      if (cursor <= 0) return symbol;
    }
    return symbols.at(-1) || null;
  };

  Game.buildStage120LuckBoard = function (luck) {
    const columns = Array.from(
      { length: GAME_DATA.board.columns },
      () => Array.from(
        { length: GAME_DATA.board.rows },
        () => this.randomSymbol()
      )
    );

    const guarantee = this.getStage120LuckGuarantee(luck);
    const target = guarantee > 0 ? this.pickStage120LuckTarget() : null;

    this.stage120LastLuck = Math.max(0, Number(luck) || 0);
    this.stage120LastGuarantee = guarantee;
    this.stage120LastTargetId = target?.id || null;

    if (!target || guarantee <= 0) return columns;

    const positions = [];
    for (let col = 0; col < GAME_DATA.board.columns; col += 1) {
      for (let row = 0; row < GAME_DATA.board.rows; row += 1) positions.push([col, row]);
    }

    for (let i = positions.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    positions.slice(0, guarantee).forEach(([col, row]) => {
      const forced = this.makeStage120ForcedSymbol?.(target) || { ...target };
      columns[col][row] = forced;
    });

    return columns;
  };

  Game.prepareStage90SpinEffects = function (...args) {
    const result = previousPrepareStage90SpinEffects.apply(this, args);
    const shinyCount = (this.getStage96ShinyItems?.("LUCK") || []).length;
    if (shinyCount > 0) this.stage90ActiveLuck += shinyCount * 0.88;

    const luck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    this.stage120PreparedColumns = this.buildStage120LuckBoard(luck);
    this.stage120PreparedColumnIndex = 0;
    return result;
  };

  Game.getStage130RemainingRounds = function (trigger = "AUTO_PAYMENT") {
    if (trigger === "FINAL_PAYMENT" || this.finalPaymentPhase) return 0;
    if (trigger === "ROUND_END") {
      return Math.max(0, this.roundsPerDeadline - Math.max(0, Number(this.round) || 0));
    }
    return Math.max(0, this.roundsPerDeadline - Math.max(1, Number(this.round) || 1) + 1);
  };

  Game.getUnusedRoundCount = function (trigger) {
    const rounds = this.getStage130RemainingRounds(trigger);
    if (Number.isFinite(rounds)) return rounds;
    return previousGetUnusedRoundCount?.call(this, trigger) || 0;
  };

  Game.getStage130EarlyClearTicketReward = function (remainingRounds) {
    const rounds = Math.max(0, Math.min(3, Math.floor(Number(remainingRounds) || 0)));
    return EARLY_CLEAR_TICKETS[rounds] ?? 1;
  };

  Game.showDeadlineSuccess = function (settlement) {
    if (settlement && !settlement.stage130EarlyClearAdjusted) {
      const remainingRounds = this.getStage130RemainingRounds(settlement.trigger);
      const desiredBonus = this.getStage130EarlyClearTicketReward(remainingRounds);
      const previousBonus = Math.max(0, Number(settlement.bonusTickets) || 0);
      const delta = desiredBonus - previousBonus;
      if (delta !== 0) this.tickets = Math.max(0, Number(this.tickets) || 0) + delta;

      settlement.unusedRounds = remainingRounds;
      settlement.bonusTickets = desiredBonus;
      settlement.stage130EarlyClearTickets = desiredBonus;
      settlement.stage130EarlyClearAdjusted = true;
    }

    const result = previousShowDeadlineSuccess.call(this, settlement);

    if (settlement?.stage130EarlyClearTickets > 0) {
      const panel = this.flowOptions?.querySelector(".auto-advance-panel");
      if (panel) {
        panel.querySelector(".stage130-early-clear-reward")?.remove();
        panel.insertAdjacentHTML(
          "beforeend",
          `<strong class="stage130-early-clear-reward">조기 상환 보너스 · 🎟️ +${settlement.stage130EarlyClearTickets}</strong>`
        );
      }
    }

    this.updateAllUI?.();
    return result;
  };

  Game.getStage130DeadlineDepositUnit = function () {
    return Math.max(1, Math.round(Math.max(1, Number(this.deadlineTarget) || 1) * 0.20));
  };

  Game.depositDeadlineUnit = async function () {
    if (!this.canPayDeadline?.()) return;

    const remaining = Math.max(0, Number(this.deadlineTarget) - Number(this.deadlinePaid));
    if (remaining <= 0) return;

    const walletAvailable = Math.max(0, Math.floor(Number(this.wallet) || 0));
    const amount = Math.min(this.getStage130DeadlineDepositUnit(), remaining, walletAvailable);
    if (amount <= 0) return;

    const walletBefore = this.wallet;
    const paidBefore = this.deadlinePaid;

    this.wallet -= amount;
    this.deadlinePaid += amount;
    this.paymentCommitted = this.deadlinePaid;
    if (this.stage100DepositedThisDeadline !== undefined) this.stage100DepositedThisDeadline = true;

    this.readoutDetail.textContent = this.finalPaymentPhase
      ? `최종 납부 · $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`
      : `마감 계좌 · $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`;

    this.updateAllUI();
    EffectsManager.showCurrencyGain?.(this.deadlinePaidValue, amount);

    await Promise.all([
      this.animateCurrency?.(this.deadlinePaidValue, paidBefore, this.deadlinePaid),
      this.animateCurrency?.(this.walletValue, walletBefore, this.wallet)
    ]);

    if (this.deadlinePaid >= this.deadlineTarget && !this.lastSettlement) {
      this.settleDeadline(this.finalPaymentPhase ? "FINAL_PAYMENT" : "AUTO_PAYMENT");
    }
  };

  Game.ensureStage130DeadlineAccountInteraction = function () {
    const section = this.deadlineAccountSection || document.querySelector("#deadlineAccountSection");
    if (!section || section.dataset.stage130Bound === "1") return;
    section.dataset.stage130Bound = "1";

    const activate = (event) => {
      if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
      if (event.type === "keydown") event.preventDefault();
      if (!section.classList.contains("stage130-can-deposit")) return;
      this.depositDeadlineUnit?.();
    };

    section.addEventListener("click", activate);
    section.addEventListener("keydown", activate);
  };

  Game.updateStage130DeadlineAccountUI = function () {
    const section = this.deadlineAccountSection || document.querySelector("#deadlineAccountSection");
    if (!section) return;

    if (this.deadlineDepositButton) {
      this.deadlineDepositButton.hidden = true;
      this.deadlineDepositButton.disabled = true;
      this.deadlineDepositButton.setAttribute("aria-hidden", "true");
      this.deadlineDepositButton.tabIndex = -1;
    }

    let hint = section.querySelector(".stage130-deposit-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "stage130-deposit-hint";
      const progress = section.querySelector(".payment-progress-track") || section.querySelector(".progress-track");
      progress?.insertAdjacentElement("afterend", hint);
    }

    const remaining = Math.max(0, Number(this.deadlineTarget) - Number(this.deadlinePaid));
    const walletAvailable = Math.max(0, Math.floor(Number(this.wallet) || 0));
    const unit = Math.min(this.getStage130DeadlineDepositUnit(), remaining, walletAvailable);
    const canPay = Boolean(this.canPayDeadline?.()) && remaining > 0 && unit > 0;

    section.classList.toggle("stage130-can-deposit", canPay);
    section.classList.toggle("stage130-cannot-deposit", !canPay);
    section.setAttribute("role", "button");
    section.setAttribute("aria-disabled", canPay ? "false" : "true");
    section.tabIndex = canPay ? 0 : -1;

    const label = section.querySelector(".vault-heading .label");
    if (label) label.textContent = "마감 계좌 · 클릭 납부";

    if (hint) {
      if (remaining <= 0) hint.textContent = "목표 충족 · 다음 마감으로 잔액 유지";
      else if (canPay) hint.textContent = `클릭 시 $${unit.toLocaleString("ko-KR")} 납부 · 1회 최대 목표의 20%`;
      else if (walletAvailable <= 0) hint.textContent = "납부 가능한 지갑 잔액 없음";
      else hint.textContent = "라운드 준비/최종 납부 단계에서 계좌를 클릭해 납부";
    }
  };

  Game.updateStage130VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.3.0";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.3.0";
  };

  Game.updateStatsRail = function (...args) {
    const result = previousUpdateStatsRail?.apply(this, args);
    const grid = this.runStatsGrid || document.querySelector("#runStatsGrid");
    if (!grid) return result;

    grid.querySelector(".stage110-luck-stat")?.remove();
    grid.querySelector(".stage120-luck-stat")?.remove();
    grid.querySelector(".stage130-luck-stat")?.remove();

    const activeLuck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    const persistentLuck = this.getStage120PersistentLuck();
    const luck = activeLuck > 0 ? activeLuck : persistentLuck;
    const integerLuck = this.getStage120LuckGuarantee(luck);
    const effectText = integerLuck > 0 ? `동일 심볼 ${integerLuck}칸 지정` : "보장 없음";

    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="stat-reference-row stage130-luck-stat" title="Luck N이면 가중치로 뽑힌 Lucky Symbol을 서로 다른 랜덤 N칸에 배치합니다."><span>🍀 행운</span><strong>${integerLuck} · ${effectText}</strong></div>`
    );
    return result;
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.ensureStage130DeadlineAccountInteraction();
    this.updateStage130DeadlineAccountUI();
    this.updateStage130VersionUI();
    return result;
  };

  Game.init = function (...args) {
    this.patchStage130Data();
    const result = previousInit.apply(this, args);
    this.patchStage130Data();
    this.ensureStage130DeadlineAccountInteraction();
    this.updateStage130DeadlineAccountUI();
    this.updateStage130VersionUI();
    this.updateStatsRail?.();
    this.stage = 10;
    this.status = "ECONOMY_LUCK_REBALANCE_130";
    console.info(`DEADLINE ${GAME_DATA.version}: v1.3.0 economy & integer luck rebalance loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    this.patchStage130Data();
    const result = previousRestartRun.apply(this, args);
    this.patchStage130Data();
    this.ensureStage130DeadlineAccountInteraction();
    this.updateStage130DeadlineAccountUI();
    this.updateStage130VersionUI();
    this.updateStatsRail?.();
    this.stage = 10;
    return result;
  };

  Game.patchStage130Data();
})();
