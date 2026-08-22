// DEADLINE — Stage 5 economy layer
// Stage 4의 Game 객체를 확장해 지갑/금고/이자/마감 정산/조기 상환을 연결합니다.

"use strict";

(() => {
  Game.stage = 5;
  Game.status = "ECONOMY";
  Game.lastInterest = 0;
  Game.lastSettlement = null;

  Object.defineProperty(Game, "totalFunds", {
    configurable: true,
    get() { return this.wallet + this.bank; }
  });

  Object.defineProperty(Game, "walletInterestRate", {
    configurable: true,
    get() { return GAME_DATA.economy.walletInterestRate; }
  });

  const originalInit = Game.init;
  const originalBindInputs = Game.bindInputs;
  const originalSpin = Game.spin;
  const originalRestartRun = Game.restartRun;
  const originalUpdateAllUI = Game.updateAllUI;

  Game.init = function () {
    this.deposit25Button = document.querySelector("#deposit25Button");
    this.depositAllButton = document.querySelector("#depositAllButton");
    this.withdraw25Button = document.querySelector("#withdraw25Button");
    this.withdrawAllButton = document.querySelector("#withdrawAllButton");
    this.earlyPaymentButton = document.querySelector("#earlyPaymentButton");
    this.interestRateValue = document.querySelector("#interestRateValue");

    originalInit.call(this);
    this.stage = 5;
    this.status = "ECONOMY";
    this.stageStatus.textContent = "STAGE 5 · ECONOMY";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: economy layer loaded.`);
  };

  Game.bindInputs = function () {
    originalBindInputs.call(this);
    this.deposit25Button.addEventListener("click", () => this.depositToBank(0.25));
    this.depositAllButton.addEventListener("click", () => this.depositToBank(1));
    this.withdraw25Button.addEventListener("click", () => this.withdrawFromBank(0.25));
    this.withdrawAllButton.addEventListener("click", () => this.withdrawFromBank(1));
    this.earlyPaymentButton.addEventListener("click", () => this.attemptEarlyPayment());
  };

  Game.spin = async function () {
    const spinPromise = originalSpin.call(this);
    this.updateFinancialControls();
    await spinPromise;
    this.updateFinancialControls();
  };

  Game.canMoveMoney = function () {
    return !(this.isSpinning || this.isResolvingRound || this.gameOver || this.runComplete);
  };

  Game.depositToBank = function (ratio) {
    if (!this.canMoveMoney() || this.wallet <= 0) return;
    const amount = ratio >= 1
      ? this.wallet
      : Math.min(this.wallet, Math.max(1, Math.floor(this.wallet * ratio)));

    this.wallet -= amount;
    this.bank += amount;
    this.readoutDetail.textContent =
      `금고 입금 +$${amount.toLocaleString("ko-KR")} · 금고는 이자 없음`;
    this.updateAllUI();
  };

  Game.withdrawFromBank = function (ratio) {
    if (!this.canMoveMoney() || this.bank <= 0) return;
    const amount = ratio >= 1
      ? this.bank
      : Math.min(this.bank, Math.max(1, Math.floor(this.bank * ratio)));

    this.bank -= amount;
    this.wallet += amount;
    this.readoutDetail.textContent =
      `금고 출금 $${amount.toLocaleString("ko-KR")} → 지갑 · 다음 라운드 종료 시 이자 대상`;
    this.updateAllUI();
  };

  Game.applyRoundInterest = function () {
    const before = this.wallet;
    const interest = Math.max(0, Math.round(before * this.walletInterestRate));
    this.wallet += interest;
    this.lastInterest = interest;
    if (interest > 0) EffectsManager.pulseWallet(this.walletValue);
    return interest;
  };

  Game.getUnusedRoundCount = function (trigger) {
    if (trigger === "ROUND_END" || this.currentMode) {
      return Math.max(0, this.roundsPerDeadline - this.round);
    }
    return Math.max(0, this.roundsPerDeadline - this.round + 1);
  };

  Game.resolveRound = function () {
    const completedRound = this.round;
    const walletBeforeInterest = this.wallet;
    const interest = this.applyRoundInterest();

    this.isResolvingRound = false;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();

    if (interest > 0) {
      this.scoreBreakdown.textContent =
        `라운드 ${completedRound} 이자 · $${walletBeforeInterest.toLocaleString("ko-KR")} × ${(this.walletInterestRate * 100).toFixed(0)}% = +$${interest.toLocaleString("ko-KR")}`;
      this.readoutDetail.textContent = `라운드 종료 이자 +$${interest.toLocaleString("ko-KR")}`;
    } else {
      this.scoreBreakdown.textContent = `라운드 ${completedRound} 종료 · 지갑 이자 $0`;
      this.readoutDetail.textContent = "라운드 종료 · 이자 $0";
    }

    if (this.totalFunds >= this.deadlineTarget) {
      this.settleDeadline({ trigger: "ROUND_END", interest, completedRound });
      return;
    }

    if (this.round < this.roundsPerDeadline) {
      this.round += 1;
      this.showRoundChoice(
        interest > 0
          ? `직전 라운드 이자 +$${interest.toLocaleString("ko-KR")}`
          : "직전 라운드 이자 $0"
      );
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

    this.flowEyebrow.textContent =
      `DEADLINE ${this.deadlineNumber} · ROUND ${this.round} / ${this.roundsPerDeadline}`;
    this.flowTitle.textContent = "라운드 방식 선택";
    this.flowText.textContent =
      `목표 $${this.deadlineTarget.toLocaleString("ko-KR")} · 보유 $${this.totalFunds.toLocaleString("ko-KR")} (지갑 $${this.wallet.toLocaleString("ko-KR")} + 금고 $${this.bank.toLocaleString("ko-KR")})`;
    this.flowOptions.innerHTML = `
      <button class="flow-choice" data-action="start-round" data-mode="NORMAL">
        <span>${normal.name}</span>
        <strong>${normal.spins} SPINS</strong>
        <small>티켓 +${normal.tickets} · 안정적인 선택</small>
      </button>
      <button class="flow-choice risk" data-action="start-round" data-mode="RISK">
        <span>${risk.name}</span>
        <strong>${risk.spins} SPINS</strong>
        <small>티켓 +${risk.tickets} · 적은 회전, 높은 보상</small>
      </button>
    `;
    this.flowFooter.textContent = note
      ? `${note} · 지갑 이자 ${(this.walletInterestRate * 100).toFixed(0)}% / 금고 이자 0%`
      : `지갑 이자 ${(this.walletInterestRate * 100).toFixed(0)}% / 금고 이자 0%`;
    this.openFlowOverlay();
    this.updateFinancialControls();
  };

  Game.settleDeadline = function ({
    trigger = "ROUND_END",
    interest = 0,
    completedRound = this.round
  } = {}) {
    if (this.lastSettlement || this.totalFunds < this.deadlineTarget) return false;

    const target = this.deadlineTarget;
    let remaining = target;

    const fromWallet = Math.min(this.wallet, remaining);
    this.wallet -= fromWallet;
    remaining -= fromWallet;

    const fromBank = Math.min(this.bank, remaining);
    this.bank -= fromBank;
    remaining -= fromBank;
    if (remaining > 0) return false;

    const unusedRounds = this.getUnusedRoundCount(trigger);
    const bonusPerRound = GAME_DATA.economy.earlyPaymentTicketPerUnusedRound;
    const bonusTickets = unusedRounds * bonusPerRound;
    this.tickets += bonusTickets;

    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;

    this.lastSettlement = {
      trigger,
      target,
      fromWallet,
      fromBank,
      unusedRounds,
      bonusTickets,
      interest,
      completedRound
    };

    this.updateAllUI();
    this.showDeadlineSuccess(this.lastSettlement);
    return true;
  };

  Game.attemptEarlyPayment = function () {
    if (
      this.lastSettlement ||
      this.gameOver ||
      this.runComplete ||
      this.isSpinning ||
      this.isResolvingRound ||
      this.totalFunds < this.deadlineTarget
    ) return;

    this.settleDeadline({ trigger: "EARLY", interest: 0, completedRound: this.round });
  };

  Game.showDeadlineSuccess = function (settlement) {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 5 · DEADLINE SETTLED";

    const isLast = this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1;
    const triggerText = settlement.trigger === "EARLY" ? "조기 상환" : "마감 정산";
    const bonusText = settlement.bonusTickets > 0
      ? `미사용 라운드 ${settlement.unusedRounds}개 보너스 +${settlement.bonusTickets}T`
      : "미사용 라운드 보너스 없음";

    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} SETTLED`;
    this.flowTitle.textContent = `${triggerText} 완료`;
    this.flowText.textContent =
      `$${settlement.target.toLocaleString("ko-KR")} 납부 · 지갑 -$${settlement.fromWallet.toLocaleString("ko-KR")} · 금고 -$${settlement.fromBank.toLocaleString("ko-KR")} · 잔액 $${this.totalFunds.toLocaleString("ko-KR")}`;

    if (isLast) {
      this.runComplete = true;
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="restart-run">
          <span>STAGE 5 LOOP CLEAR</span>
          <strong>처음부터 다시 테스트</strong>
        </button>
      `;
      this.flowFooter.textContent = `${bonusText} · 최종 엔딩/Endless는 Stage 12에서 구현합니다.`;
    } else {
      const nextTarget = GAME_DATA.deadline.targets[this.deadlineIndex + 1];
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="next-deadline">
          <span>NEXT DEADLINE</span>
          <strong>다음 목표 $${nextTarget.toLocaleString("ko-KR")}</strong>
        </button>
      `;
      this.flowFooter.textContent =
        `${settlement.interest > 0 ? `이번 라운드 이자 +$${settlement.interest.toLocaleString("ko-KR")} · ` : ""}${bonusText}`;
    }

    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.showGameOver = function () {
    this.gameOver = true;
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 5 · GAME OVER";

    const shortfall = Math.max(0, this.deadlineTarget - this.totalFunds);
    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} FAILED`;
    this.flowTitle.textContent = "GAME OVER";
    this.flowText.textContent =
      `목표까지 $${shortfall.toLocaleString("ko-KR")} 부족합니다. · 지갑 $${this.wallet.toLocaleString("ko-KR")} + 금고 $${this.bank.toLocaleString("ko-KR")}`;
    this.flowOptions.innerHTML = `
      <button class="flow-primary danger" data-action="restart-run">
        <span>RESTART</span>
        <strong>처음부터 다시 시작</strong>
      </button>
    `;
    this.flowFooter.textContent = `${this.roundsPerDeadline}라운드를 모두 사용했습니다.`;
    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.advanceDeadline = function () {
    if (this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1) return;

    this.deadlineIndex += 1;
    this.round = 1;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;
    this.lastInterest = 0;
    this.lastSettlement = null;
    this.stageStatus.textContent = "STAGE 5 · ECONOMY";
    this.updateAllUI();
    this.showRoundChoice();
  };

  Game.restartRun = function () {
    originalRestartRun.call(this);
    this.lastInterest = 0;
    this.lastSettlement = null;
    this.stage = 5;
    this.status = "ECONOMY";
    this.stageStatus.textContent = "STAGE 5 · ECONOMY";
    this.updateAllUI();
  };

  Game.updateEconomyUI = function (updateWalletText = true) {
    if (updateWalletText) {
      this.walletValue.textContent = `$ ${this.wallet.toLocaleString("ko-KR")}`;
    }
    this.bankValue.textContent = `$ ${this.bank.toLocaleString("ko-KR")}`;

    const ratio = Math.min(1, this.totalFunds / this.deadlineTarget);
    this.progressFill.style.width = `${ratio * 100}%`;
    this.progressCopy.textContent =
      `$ ${this.totalFunds.toLocaleString("ko-KR")} / $ ${this.deadlineTarget.toLocaleString("ko-KR")}`;
  };

  Game.updateFinancialControls = function () {
    const locked = !this.canMoveMoney();
    this.deposit25Button.disabled = locked || this.wallet <= 0;
    this.depositAllButton.disabled = locked || this.wallet <= 0;
    this.withdraw25Button.disabled = locked || this.bank <= 0;
    this.withdrawAllButton.disabled = locked || this.bank <= 0;

    const canPay =
      !locked &&
      !this.lastSettlement &&
      this.totalFunds >= this.deadlineTarget;
    this.earlyPaymentButton.disabled = !canPay;

    if (canPay) {
      const unusedRounds = this.getUnusedRoundCount("EARLY");
      const bonus = unusedRounds * GAME_DATA.economy.earlyPaymentTicketPerUnusedRound;
      this.earlyPaymentButton.textContent = bonus > 0
        ? `조기 상환 · 미사용 라운드 +${bonus}T`
        : "조기 상환";
    } else {
      this.earlyPaymentButton.textContent = "조기 상환";
    }
  };

  Game.updateAllUI = function () {
    originalUpdateAllUI.call(this);
    this.interestRateValue.textContent = `${(this.walletInterestRate * 100).toFixed(0)}%`;
    this.updateEconomyUI(true);
    this.updateFinancialControls();
  };
})();
