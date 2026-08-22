// DEADLINE — Stage 7.0 첫 20개 아이템 / 실제 효과 / 준비 상점 잠금
"use strict";

(() => {
  Game.stage = 7;
  Game.status = "ITEM_EFFECTS";

  const previousInit = Game.init;
  const previousShowRoundChoice = Game.showRoundChoice;
  const previousTogglePreparedMode = Game.togglePreparedMode;
  const previousBeginPreparedRound = Game.beginPreparedRound;
  const previousOpenPrepShop = Game.openPrepShop;
  const previousContinueFromShop = Game.continueFromShop;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousGetShopRerollCost = Game.getShopRerollCost;
  const previousBreakdownHTML = Game.breakdownHTML;
  const previousEvaluateAndRenderScore = Game.evaluateAndRenderScore;

  Game.init = function () {
    previousInit.call(this);
    this.stage = 7;
    this.status = "ITEM_EFFECTS";
    this.stageStatus.textContent = this.roundPreparation
      ? "7단계 · 라운드 준비"
      : "7단계 · 아이템 시스템";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 7 item effects loaded.`);
  };

  Game.showRoundChoice = function (note = "") {
    previousShowRoundChoice.call(this, note);
    this.stageStatus.textContent = "7단계 · 라운드 준비";
  };

  Game.getOwnedEffectItems = function (type) {
    return (this.ownedItems || []).filter((item) => item.effect?.type === type);
  };

  Game.getBoardDistinctSymbolCount = function () {
    const ids = new Set();
    (this.currentColumns || []).forEach((column) => {
      column.forEach((symbol) => {
        if (symbol?.id) ids.add(symbol.id);
      });
    });
    return ids.size;
  };

  Game.itemConditionMatches = function (condition) {
    if (condition === "FIRST_SPIN") {
      if (this.itemScoringContext?.creditWallet === false) return false;
      return Boolean(
        this.currentMode &&
        this.roundStarted &&
        this.spinsTotal > 0 &&
        this.spinsRemaining === this.spinsTotal
      );
    }

    if (condition === "LAST_SPIN") {
      if (this.itemScoringContext?.creditWallet === false) return false;
      return Boolean(
        this.currentMode &&
        this.roundStarted &&
        this.spinsRemaining === 1
      );
    }

    if (condition === "DIVERSE_6") {
      return this.getBoardDistinctSymbolCount() >= 6;
    }

    return false;
  };

  // 기본 공식은 유지하고 아이템이 VALUE / PATTERN MULT / GLOBAL 항을 수정합니다.
  Game.calculatePatternScore = function (pattern) {
    let base = pattern.symbol.value;
    const symbolMultiplier = pattern.symbol.multiplier ?? 1;
    const count = pattern.coords.length;
    const patternBaseValue = pattern.baseValue;
    let patternMultiplier = GAME_DATA.scoring.patternMultiplier;
    let globalMultiplier = GAME_DATA.scoring.globalMultiplier;
    const itemEffects = [];

    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect;
      if (!effect) return;

      if (effect.type === "symbol_value" && effect.symbolId === pattern.symbol.id) {
        base += effect.amount;
        itemEffects.push(`${item.name} +${effect.amount} VALUE`);
        return;
      }

      if (effect.type === "pattern_mult" && effect.keys?.includes(pattern.key)) {
        patternMultiplier *= effect.factor;
        itemEffects.push(`${item.name} ×${effect.factor.toFixed(2)}`);
        return;
      }

      if (effect.type === "global_mult") {
        globalMultiplier *= effect.factor;
        itemEffects.push(`${item.name} ×${effect.factor.toFixed(2)}`);
        return;
      }

      if (
        effect.type === "conditional_mult" &&
        this.itemConditionMatches(effect.condition)
      ) {
        globalMultiplier *= effect.factor;
        itemEffects.push(`${item.name} ×${effect.factor.toFixed(2)}`);
      }
    });

    const raw =
      base *
      symbolMultiplier *
      count *
      patternBaseValue *
      patternMultiplier *
      globalMultiplier;
    const amount = Math.round(raw);

    return {
      ...pattern,
      base,
      symbolMultiplier,
      count,
      patternBaseValue,
      patternMultiplier,
      globalMultiplier,
      raw,
      amount,
      itemEffects
    };
  };

  Game.breakdownHTML = function (pattern) {
    const html = previousBreakdownHTML.call(this, pattern);
    if (!pattern.itemEffects?.length) return html;

    const itemText = pattern.itemEffects.join(" · ");
    return html.replace(
      "</div>",
      `<small class="score-item-effects">아이템 적용 · ${itemText}</small></div>`
    );
  };

  Game.evaluateAndRenderScore = async function (options = {}) {
    this.itemScoringContext = options;
    try {
      return await previousEvaluateAndRenderScore.call(this, options);
    } finally {
      this.itemScoringContext = null;
    }
  };

  Game.generateShopOffers = function () {
    const pool = [...(GAME_DATA.items || [])];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    this.shopOffers = pool
      .slice(0, GAME_DATA.shop.offerCount)
      .map((item) => ({ ...item, sold: false }));
  };

  Game.getModeTicketBonus = function () {
    return this.getOwnedEffectItems("mode_ticket_bonus")
      .reduce((sum, item) => sum + (item.effect?.amount || 0), 0);
  };

  Game.beginPreparedRound = function () {
    const selectedMode = this.selectedRoundModeId
      ? GAME_DATA.deadline.modes[this.selectedRoundModeId]
      : null;
    const wasPrepared = Boolean(this.roundPreparation && selectedMode);
    const ticketBonus = wasPrepared ? this.getModeTicketBonus() : 0;

    previousBeginPreparedRound.call(this);

    if (!wasPrepared || !this.roundStarted || this.roundPreparation) return;

    if (ticketBonus > 0) {
      this.tickets += ticketBonus;
      this.scoreBreakdown.textContent =
        `${selectedMode.spins}회 리롤 · 기본 티켓 +${selectedMode.tickets} · 아이템 +${ticketBonus}`;
      this.readoutDetail.textContent =
        `${selectedMode.name} · 리롤 ${selectedMode.spins}회 · 티켓 총 +${selectedMode.tickets + ticketBonus}`;
    }

    this.stageStatus.textContent = "7단계 · 라운드 진행";
    this.updateAllUI();
  };

  Game.getShopRerollCost = function () {
    const baseCost = previousGetShopRerollCost.call(this);
    const discount = this.getOwnedEffectItems("shop_reroll_discount")
      .reduce((sum, item) => sum + (item.effect?.amount || 0), 0);
    return Math.max(1, baseCost - discount);
  };

  Game.canOpenPrepShop = function () {
    return Boolean(
      this.roundPreparation &&
      !this.selectedRoundModeId &&
      !this.finalPaymentPhase &&
      !this.roundStarted &&
      !this.gameOver &&
      !this.runComplete &&
      !this.lastSettlement &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      !this.shopOpen &&
      !this.flowOverlay.classList.contains("is-open")
    );
  };

  // 리롤 횟수를 선택한 순간 납부/금고와 똑같이 상점도 잠깁니다.
  Game.openPrepShop = function () {
    if (this.selectedRoundModeId) return;
    previousOpenPrepShop.call(this);
    if (this.shopOpen) this.stageStatus.textContent = "7단계 · 상점";
  };

  Game.continueFromShop = function () {
    previousContinueFromShop.call(this);
    if (this.roundPreparation && !this.shopOpen) {
      this.stageStatus.textContent = "7단계 · 라운드 준비";
    }
  };

  Game.togglePreparedMode = function (modeId) {
    const before = this.selectedRoundModeId;
    previousTogglePreparedMode.call(this, modeId);

    if (!this.roundPreparation) return;

    if (this.selectedRoundModeId) {
      const mode = GAME_DATA.deadline.modes[this.selectedRoundModeId];
      this.readoutDetail.textContent =
        `${mode.spins}회 리롤 선택 · 납부 · 금고 · 상점 잠김 · 시작을 누르면 확정`;
    } else if (before === modeId) {
      this.readoutDetail.textContent =
        "리롤 선택 취소 · 납부 · 금고 · 상점을 다시 사용할 수 있습니다.";
    }
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);

    const shopUnlocked = this.canOpenPrepShop();
    const modeLocked = Boolean(
      this.roundPreparation &&
      this.selectedRoundModeId &&
      !this.finalPaymentPhase &&
      !this.roundStarted
    );

    if (this.actionShopButton) {
      this.actionShopButton.disabled = !shopUnlocked;
      this.actionShopButton.classList.toggle("is-available", shopUnlocked);
      this.actionShopButton.classList.toggle("is-mode-locked", modeLocked);
      this.actionShopButton.title = modeLocked
        ? "리롤 선택을 취소하면 상점을 다시 사용할 수 있습니다."
        : "";
    }
  };
})();
