// DEADLINE — Stage 5.2 capital allocation layer
"use strict";

(() => {
  Game.stage = 5;
  Game.status = "CAPITAL_ALLOCATION";
  Game.vaultDeposit = null;
  Game.selectedVaultTerm = null;
  Game.deadlinePaid = 0;
  Game.lastSettlement = null;

  const baseInit = Game.init;
  const baseBind = Game.bindInputs;
  const baseSpin = Game.spin;
  const baseStartRound = Game.startRound;
  const baseRestart = Game.restartRun;
  const baseUpdateAll = Game.updateAllUI;

  Game.init = function () {
    this.deadlineStateBadge = document.querySelector("#deadlineStateBadge");
    this.deadlinePaidValue = document.querySelector("#deadlinePaidValue");
    this.deadlineDepositUnitCopy = document.querySelector("#deadlineDepositUnitCopy");
    this.deadlineDepositButton = document.querySelector("#deadlineDepositButton");
    this.deadlineConfirmButton = document.querySelector("#deadlineConfirmButton");

    this.vaultStateBadge = document.querySelector("#vaultStateBadge");
    this.vaultStatusCopy = document.querySelector("#vaultStatusCopy");
    this.vaultTicketProgress = document.querySelector("#vaultTicketProgress");
    this.vaultPreview = document.querySelector("#vaultPreview");
    this.vaultTermButtons = [...document.querySelectorAll("[data-vault-term]")];
    this.vaultDepositUnitButton = document.querySelector("#vaultDepositUnitButton");

    baseInit.call(this);
    this.stageStatus.textContent = "STAGE 5 · CAPITAL ALLOCATION";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: capital allocation loaded.`);
  };

  Game.bindInputs = function () {
    baseBind.call(this);

    this.deadlineDepositButton.addEventListener("click", () => this.depositDeadlineUnit());
    this.deadlineConfirmButton.addEventListener("click", () => this.settleDeadline("EARLY"));

    this.vaultTermButtons.forEach((button) => {
      button.addEventListener("click", () => {
        this.selectVaultTerm(Number(button.dataset.vaultTerm));
      });
    });
    this.vaultDepositUnitButton.addEventListener("click", () => this.depositVaultUnit());
  };

  Game.spin = async function () {
    const spinPromise = baseSpin.call(this);
    this.updateFinancialControls();
    await spinPromise;
    this.updateFinancialControls();
  };

  Game.startRound = function (modeId) {
    const mode = GAME_DATA.deadline.modes[modeId];
    if (!mode || this.gameOver || this.runComplete || this.isSpinning) return;

    if (this.vaultDeposit?.state === "FUNDING") {
      this.lockVaultFunding();
    } else if (!this.vaultDeposit) {
      this.selectedVaultTerm = null;
    }

    baseStartRound.call(this, modeId);
  };

  Game.canUseEconomyControls = function () {
    return !(
      this.isSpinning ||
      this.isResolvingRound ||
      this.gameOver ||
      this.runComplete ||
      this.lastSettlement
    );
  };

  Game.getDepositUnit = function (target = this.deadlineTarget) {
    return Math.max(1, Math.round(target * GAME_DATA.economy.depositUnitRatio));
  };

  Game.getVaultTicketThreshold = function (target = this.deadlineTarget) {
    return Math.max(1, Math.round(target * GAME_DATA.economy.vaultTicketThresholdRatio));
  };

  Game.getVaultTerm = function (rounds) {
    return GAME_DATA.economy.vaultTerms[String(rounds)] || null;
  };

  Game.selectVaultTerm = function (rounds) {
    if (
      !this.canUseEconomyControls() ||
      this.currentMode ||
      this.vaultDeposit ||
      !this.getVaultTerm(rounds)
    ) return;

    this.selectedVaultTerm = rounds;
    this.updateFinancialControls();
  };

  Game.canFundVault = function () {
    if (!this.canUseEconomyControls() || this.currentMode) return false;
    if (this.vaultDeposit) return this.vaultDeposit.state === "FUNDING";
    return Boolean(this.selectedVaultTerm);
  };

  Game.depositVaultUnit = function () {
    if (!this.canFundVault()) return;

    let deposit = this.vaultDeposit;

    if (!deposit) {
      const term = this.getVaultTerm(this.selectedVaultTerm);
      if (!term) return;

      const referenceTarget = this.deadlineTarget;
      deposit = {
        state: "FUNDING",
        referenceDeadline: this.deadlineNumber,
        referenceTarget,
        depositUnit: this.getDepositUnit(referenceTarget),
        ticketThreshold: this.getVaultTicketThreshold(referenceTarget),
        principal: 0,
        awardedTicketMilestones: 0,
        termRounds: term.rounds,
        roundsRemaining: term.rounds,
        rate: term.rate,
        maturityAmount: 0
      };
      this.vaultDeposit = deposit;
      this.selectedVaultTerm = null;
    }

    const amount = deposit.depositUnit;
    if (this.wallet < amount) return;

    this.wallet -= amount;
    deposit.principal += amount;
    deposit.maturityAmount = Math.round(deposit.principal * (1 + deposit.rate));
    this.bank = deposit.principal;

    const reachedMilestones = Math.floor(deposit.principal / deposit.ticketThreshold);
    const ticketGain = Math.max(0, reachedMilestones - deposit.awardedTicketMilestones);

    if (ticketGain > 0) {
      this.tickets += ticketGain;
      deposit.awardedTicketMilestones = reachedMilestones;
    }

    this.readoutDetail.textContent = ticketGain > 0
      ? `금고 +$${amount.toLocaleString("ko-KR")} · 목표 50% 구간 달성 · 티켓 +${ticketGain}`
      : `금고 +$${amount.toLocaleString("ko-KR")} · 현재 예치 $${deposit.principal.toLocaleString("ko-KR")}`;

    this.updateAllUI();
  };

  Game.lockVaultFunding = function () {
    if (!this.vaultDeposit || this.vaultDeposit.state !== "FUNDING") return false;
    this.vaultDeposit.state = "LOCKED";
    this.vaultDeposit.roundsRemaining = this.vaultDeposit.termRounds;
    return true;
  };

  Game.advanceVaultRound = function () {
    const deposit = this.vaultDeposit;
    if (!deposit || deposit.state !== "LOCKED") return null;

    deposit.roundsRemaining -= 1;

    if (deposit.roundsRemaining > 0) {
      return { type: "TICK", ...deposit };
    }

    const matured = { ...deposit };
    this.wallet += matured.maturityAmount;
    this.bank = 0;
    this.vaultDeposit = null;
    EffectsManager.pulseWallet(this.walletValue);

    return { type: "MATURED", ...matured };
  };

  Game.describeVaultEvent = function (event) {
    if (!event) return "금고 변동 없음";

    if (event.type === "TICK") {
      return `금고 ${event.roundsRemaining}R 남음 · 만기 $${event.maturityAmount.toLocaleString("ko-KR")}`;
    }

    const profit = event.maturityAmount - event.principal;
    return `금고 만기 +$${event.maturityAmount.toLocaleString("ko-KR")} · 수익 +$${profit.toLocaleString("ko-KR")}`;
  };

  Game.depositDeadlineUnit = function () {
    if (!this.canUseEconomyControls()) return;

    const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);
    if (remaining <= 0) return;

    const amount = Math.min(this.getDepositUnit(), remaining);
    if (this.wallet < amount) return;

    this.wallet -= amount;
    this.deadlinePaid += amount;

    this.readoutDetail.textContent =
      `마감 계좌 +$${amount.toLocaleString("ko-KR")} · $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`;

    this.updateAllUI();
  };

  Game.resolveRound = function () {
    const completedRound = this.round;
    const vaultEvent = this.advanceVaultRound();
    const vaultText = this.describeVaultEvent(vaultEvent);

    this.isResolvingRound = false;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();

    this.scoreBreakdown.textContent = `라운드 ${completedRound} 종료 · ${vaultText}`;
    this.readoutDetail.textContent = vaultText;

    if (this.deadlinePaid >= this.deadlineTarget) {
      this.settleDeadline("ROUND_END");
      return;
    }

    if (this.round < this.roundsPerDeadline) {
      this.round += 1;
      this.showRoundChoice(vaultText);
      return;
    }

    this.showGameOver();
  };

  Game.showRoundChoice = function (note = "") {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "회전";
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();

    const normal = GAME_DATA.deadline.modes.NORMAL;
    const risk = GAME_DATA.deadline.modes.RISK;
    const vaultStatus = this.vaultDeposit
      ? this.vaultDeposit.state === "LOCKED"
        ? ` · 금고 $${this.vaultDeposit.principal.toLocaleString("ko-KR")} / ${this.vaultDeposit.roundsRemaining}R 잠금`
        : ` · 금고 $${this.vaultDeposit.principal.toLocaleString("ko-KR")} 예치 준비`
      : "";

    this.flowEyebrow.textContent =
      `DEADLINE ${this.deadlineNumber} · ROUND ${this.round} / ${this.roundsPerDeadline}`;
    this.flowTitle.textContent = "라운드 방식 선택";
    this.flowText.textContent =
      `마감 $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")} · 지갑 $${this.wallet.toLocaleString("ko-KR")}${vaultStatus}`;
    this.flowOptions.innerHTML = `
      <button class="flow-choice" data-action="start-round" data-mode="NORMAL">
        <span>${normal.name}</span><strong>${normal.spins} SPINS</strong>
        <small>티켓 +${normal.tickets} · 안정적인 선택</small>
      </button>
      <button class="flow-choice risk" data-action="start-round" data-mode="RISK">
        <span>${risk.name}</span><strong>${risk.spins} SPINS</strong>
        <small>티켓 +${risk.tickets} · 적은 회전, 높은 보상</small>
      </button>`;

    this.flowFooter.textContent = note
      ? `${note} · 마감 납부/금고 예치는 왼쪽 패널에서 관리`
      : "마감 납부/금고 예치는 왼쪽 패널에서 관리합니다.";

    this.openFlowOverlay();
    this.updateFinancialControls();
  };

  Game.getUnusedRoundCount = function (trigger) {
    if (trigger === "ROUND_END" || this.currentMode) {
      return Math.max(0, this.roundsPerDeadline - this.round);
    }
    return Math.max(0, this.roundsPerDeadline - this.round + 1);
  };

  Game.settleDeadline = function (trigger = "ROUND_END") {
    if (this.lastSettlement || this.deadlinePaid < this.deadlineTarget) return false;

    this.lockVaultFunding();

    const unusedRounds = this.getUnusedRoundCount(trigger);
    const bonusTickets = unusedRounds * GAME_DATA.economy.earlyPaymentTicketPerUnusedRound;
    this.tickets += bonusTickets;

    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;
    this.lastSettlement = {
      trigger,
      target: this.deadlineTarget,
      paid: this.deadlinePaid,
      unusedRounds,
      bonusTickets
    };

    this.updateAllUI();
    this.showDeadlineSuccess(this.lastSettlement);
    return true;
  };

  Game.showDeadlineSuccess = function (settlement) {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 5 · DEADLINE FUNDED";

    const isLast = this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1;
    const label = settlement.trigger === "EARLY" ? "마감 확정" : "마감 정산";
    const bonus = settlement.bonusTickets
      ? `미사용 라운드 ${settlement.unusedRounds}개 · +${settlement.bonusTickets}T`
      : "미사용 라운드 보너스 없음";
    const locked = this.vaultDeposit
      ? ` · 금고 ${this.vaultDeposit.roundsRemaining}R 잠금 유지`
      : "";

    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} FUNDED`;
    this.flowTitle.textContent = `${label} 완료`;
    this.flowText.textContent =
      `마감 계좌 $${settlement.paid.toLocaleString("ko-KR")} / $${settlement.target.toLocaleString("ko-KR")} · 지갑 $${this.wallet.toLocaleString("ko-KR")}${locked}`;

    if (isLast) {
      this.runComplete = true;
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="restart-run">
          <span>STAGE 5 LOOP CLEAR</span>
          <strong>처음부터 다시 테스트</strong>
        </button>`;
      this.flowFooter.textContent = `${bonus} · 최종 엔딩/Endless는 Stage 12에서 구현합니다.`;
    } else {
      const nextTarget = GAME_DATA.deadline.targets[this.deadlineIndex + 1];
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="next-deadline">
          <span>NEXT DEADLINE</span>
          <strong>다음 목표 $${nextTarget.toLocaleString("ko-KR")}</strong>
        </button>`;
      this.flowFooter.textContent = bonus;
    }

    this.openFlowOverlay();
    this.updateAllUI();
    this.spinStatus.textContent = "PAID";
  };

  Game.showGameOver = function () {
    this.gameOver = true;
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 5 · GAME OVER";

    const shortfall = Math.max(0, this.deadlineTarget - this.deadlinePaid);
    const locked = this.vaultDeposit
      ? ` · 금고 $${this.vaultDeposit.principal.toLocaleString("ko-KR")}는 ${this.vaultDeposit.state === "LOCKED" ? `${this.vaultDeposit.roundsRemaining}R 잠금` : "예치 준비"}`
      : "";

    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} FAILED`;
    this.flowTitle.textContent = "GAME OVER";
    this.flowText.textContent =
      `마감 계좌에 $${shortfall.toLocaleString("ko-KR")} 미납 · 지갑 $${this.wallet.toLocaleString("ko-KR")}${locked}`;
    this.flowOptions.innerHTML = `
      <button class="flow-primary danger" data-action="restart-run">
        <span>RESTART</span>
        <strong>처음부터 다시 시작</strong>
      </button>`;
    this.flowFooter.textContent = `${this.roundsPerDeadline}라운드를 모두 사용했습니다.`;

    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.advanceDeadline = function () {
    if (this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1) return;

    this.deadlineIndex += 1;
    this.round = 1;
    this.deadlinePaid = 0;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;
    this.lastSettlement = null;
    this.selectedVaultTerm = null;
    this.stageStatus.textContent = "STAGE 5 · CAPITAL ALLOCATION";
    this.updateAllUI();
    this.showRoundChoice();
  };

  Game.restartRun = function () {
    this.vaultDeposit = null;
    this.selectedVaultTerm = null;
    this.deadlinePaid = 0;
    this.lastSettlement = null;
    this.bank = 0;

    baseRestart.call(this);
    this.stageStatus.textContent = "STAGE 5 · CAPITAL ALLOCATION";
    this.updateAllUI();
  };

  Game.updateEconomyUI = function (updateWalletText = true) {
    if (updateWalletText) {
      this.walletValue.textContent = `$ ${this.wallet.toLocaleString("ko-KR")}`;
    }

    this.bankValue.textContent =
      `$ ${(this.vaultDeposit?.principal || 0).toLocaleString("ko-KR")}`;
    this.deadlinePaidValue.textContent = `$ ${this.deadlinePaid.toLocaleString("ko-KR")}`;
    this.deadlineTargetValue.textContent = `$ ${this.deadlineTarget.toLocaleString("ko-KR")}`;

    const ratio = Math.min(1, this.deadlinePaid / this.deadlineTarget);
    this.progressFill.style.width = `${ratio * 100}%`;
    this.progressCopy.textContent =
      `$ ${this.deadlinePaid.toLocaleString("ko-KR")} / $ ${this.deadlineTarget.toLocaleString("ko-KR")}`;
  };

  Game.updateDeadlineUI = function () {
    if (!this.deadlineStateBadge) return;

    const settled = Boolean(this.lastSettlement);
    const full = this.deadlinePaid >= this.deadlineTarget;
    const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);
    const unit = this.getDepositUnit();
    const nextAmount = Math.min(unit, remaining);

    this.deadlineStateBadge.classList.toggle("is-funded", full);
    this.deadlineStateBadge.textContent = settled ? "SETTLED" : full ? "FUNDED" : "OPEN";
    this.deadlineDepositUnitCopy.textContent = full
      ? "목표 납부 완료 · 마감 확정 가능"
      : `1회 납부 $${unit.toLocaleString("ko-KR")} · 목표의 5% · 미납 $${remaining.toLocaleString("ko-KR")}`;

    const canDeposit =
      this.canUseEconomyControls() &&
      !full &&
      nextAmount > 0 &&
      this.wallet >= nextAmount;

    this.deadlineDepositButton.disabled = !canDeposit;
    this.deadlineDepositButton.textContent = full
      ? "납부 완료"
      : `+5% 납부 · $${nextAmount.toLocaleString("ko-KR")}`;

    const canConfirm = this.canUseEconomyControls() && full;
    this.deadlineConfirmButton.disabled = !canConfirm;

    if (canConfirm) {
      const bonus =
        this.getUnusedRoundCount("EARLY") *
        GAME_DATA.economy.earlyPaymentTicketPerUnusedRound;
      this.deadlineConfirmButton.textContent = bonus
        ? `마감 확정 · +${bonus}T`
        : "마감 확정";
    } else {
      this.deadlineConfirmButton.textContent = "마감 확정";
    }
  };

  Game.updateVaultUI = function () {
    if (!this.vaultStateBadge) return;

    const deposit = this.vaultDeposit;
    const canChooseTerm =
      this.canUseEconomyControls() &&
      !this.currentMode &&
      !deposit;

    this.vaultTermButtons.forEach((button) => {
      const term = Number(button.dataset.vaultTerm);
      button.classList.toggle("is-selected", !deposit && this.selectedVaultTerm === term);
      button.disabled = !canChooseTerm;
    });

    if (deposit) {
      const profit = deposit.maturityAmount - deposit.principal;
      const nextTicketAt = (deposit.awardedTicketMilestones + 1) * deposit.ticketThreshold;
      const nextTicketRemaining = Math.max(0, nextTicketAt - deposit.principal);

      if (deposit.state === "FUNDING") {
        this.vaultStateBadge.textContent = "FUNDING";
        this.vaultStateBadge.classList.remove("is-locked");
        this.vaultStateBadge.classList.add("is-funding");
        this.vaultStatusCopy.textContent =
          `${deposit.termRounds}R 상품 · 예치 $${deposit.principal.toLocaleString("ko-KR")} · 다음 라운드 시작 시 잠금`;
        this.vaultPreview.innerHTML =
          `만기 예상 <strong>$${deposit.maturityAmount.toLocaleString("ko-KR")}</strong> · +${Math.round(deposit.rate * 100)}% · 기준 목표 $${deposit.referenceTarget.toLocaleString("ko-KR")}`;
      } else {
        this.vaultStateBadge.textContent = "LOCKED";
        this.vaultStateBadge.classList.add("is-locked");
        this.vaultStateBadge.classList.remove("is-funding");
        this.vaultStatusCopy.textContent =
          `남은 ${deposit.roundsRemaining} ROUND · 원금 $${deposit.principal.toLocaleString("ko-KR")} · +${Math.round(deposit.rate * 100)}%`;
        this.vaultPreview.innerHTML =
          `만기 수령 <strong>$${deposit.maturityAmount.toLocaleString("ko-KR")}</strong> · 수익 +$${profit.toLocaleString("ko-KR")} · 중도출금 불가`;
      }

      this.vaultTicketProgress.textContent =
        `티켓 +${deposit.awardedTicketMilestones} 획득 · 다음 +1T까지 $${nextTicketRemaining.toLocaleString("ko-KR")} 예치`;
    } else {
      this.vaultStateBadge.textContent = "READY";
      this.vaultStateBadge.classList.remove("is-locked", "is-funding");

      if (this.selectedVaultTerm) {
        const term = this.getVaultTerm(this.selectedVaultTerm);
        const unit = this.getDepositUnit();
        const threshold = this.getVaultTicketThreshold();
        this.vaultStatusCopy.textContent = `${term.rounds}라운드 상품 선택됨`;
        this.vaultPreview.innerHTML =
          `1회 예치 <strong>$${unit.toLocaleString("ko-KR")}</strong> · +${Math.round(term.rate * 100)}% · 목표 50%($${threshold.toLocaleString("ko-KR")})마다 +1T`;
      } else {
        this.vaultStatusCopy.textContent = "예치 없음 · 기간을 선택하세요.";
        this.vaultPreview.textContent =
          "기간 선택 → 목표의 5%씩 예치 → 다음 라운드 시작 시 잠금";
      }

      this.vaultTicketProgress.textContent = "목표의 50% 예치마다 티켓 +1";
    }

    const fundingDeposit = this.vaultDeposit?.state === "FUNDING"
      ? this.vaultDeposit
      : null;
    const depositUnit = fundingDeposit?.depositUnit || this.getDepositUnit();
    const canDeposit =
      this.canFundVault() &&
      this.wallet >= depositUnit;

    this.vaultDepositUnitButton.disabled = !canDeposit;
    this.vaultDepositUnitButton.textContent =
      `+5% 예치 · $${depositUnit.toLocaleString("ko-KR")}`;
  };

  Game.updateFinancialControls = function () {
    this.updateDeadlineUI();
    this.updateVaultUI();
  };

  Game.updateAllUI = function () {
    baseUpdateAll.call(this);
    this.updateFinancialControls();
  };
})();
