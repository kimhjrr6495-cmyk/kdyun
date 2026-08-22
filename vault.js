// DEADLINE — Stage 5.4 자금 배분 / 금고 잠금 / 재화 카운트업 / 마감 경고 계층
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
    this.deadlineAccountSection = document.querySelector("#deadlineAccountSection");
    this.deadlineStateBadge = document.querySelector("#deadlineStateBadge");
    this.deadlinePaidValue = document.querySelector("#deadlinePaidValue");
    this.deadlineWarningCopy = document.querySelector("#deadlineWarningCopy");
    this.deadlineDepositButton = document.querySelector("#deadlineDepositButton");
    this.deadlineConfirmButton = document.querySelector("#deadlineConfirmButton");
    this.deadlineRiskChip = document.querySelector("#deadlineRiskChip");

    this.vaultSection = document.querySelector("#vaultSection");
    this.vaultLockState = document.querySelector("#vaultLockState");
    this.vaultRoundCopy = document.querySelector("#vaultRoundCopy");
    this.vaultRateValue = document.querySelector("#vaultRateValue");
    this.vaultTicketProgress = document.querySelector("#vaultTicketProgress");

    baseInit.call(this);
    this.stageStatus.textContent = "5단계 · 자금 배분";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 5.4 loaded.`);
  };

  Game.bindInputs = function () {
    baseBind.call(this);

    this.deadlineDepositButton.addEventListener("click", () => this.depositDeadlineUnit());
    this.deadlineConfirmButton.addEventListener("click", () => this.settleDeadline("EARLY"));

    this.flowOptions.addEventListener("click", (event) => {
      const termButton = event.target.closest("button[data-vault-term]");
      if (termButton) {
        this.selectVaultTerm(Number(termButton.dataset.vaultTerm));
        return;
      }

      const depositButton = event.target.closest("button[data-vault-deposit]");
      if (depositButton) this.depositVaultUnit();
    });
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
    this.stageStatus.textContent = "5단계 · 자금 배분";
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

  Game.getCurrencyAnimationDuration = function () {
    return GAME_DATA.economy.currencyAnimationDuration ?? 600;
  };

  Game.animateCurrency = function (element, from, to) {
    return EffectsManager.animateCurrency(element, from, to, {
      duration: this.getCurrencyAnimationDuration()
    });
  };

  Game.getVaultTerm = function (rounds) {
    return GAME_DATA.economy.vaultTerms[String(rounds)] || null;
  };

  Game.getVaultCurrentRate = function (deposit = this.vaultDeposit) {
    if (!deposit) return 0;
    const term = this.getVaultTerm(deposit.termRounds);
    if (!term) return 0;
    const index = Math.min(deposit.completedRounds, term.roundRates.length - 1);
    return term.roundRates[index] ?? 0;
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
    if (!this.flowOverlay.classList.contains("is-open")) return false;
    if (this.vaultDeposit) return this.vaultDeposit.state === "FUNDING";
    return Boolean(this.selectedVaultTerm);
  };

  Game.depositVaultUnit = function () {
    if (!this.canFundVault()) return;

    let deposit = this.vaultDeposit;

    if (!deposit) {
      const term = this.getVaultTerm(this.selectedVaultTerm);
      if (!term) return;

      deposit = {
        state: "FUNDING",
        termRounds: term.rounds,
        depositUnit: this.getDepositUnit(),
        principal: 0,
        currentAmount: 0,
        completedRounds: 0,
        roundsRemaining: term.rounds,
        ticketsEarned: 0,
        totalTickets: term.totalTickets
      };
      this.vaultDeposit = deposit;
      this.selectedVaultTerm = null;
    }

    const amount = deposit.depositUnit;
    if (this.wallet < amount) return;

    const walletBefore = this.wallet;
    const vaultBefore = deposit.currentAmount;

    this.wallet -= amount;
    deposit.principal += amount;
    deposit.currentAmount += amount;
    this.bank = deposit.currentAmount;

    this.readoutDetail.textContent =
      `금고 예치 · 현재 $${deposit.currentAmount.toLocaleString("ko-KR")}`;

    this.updateAllUI();

    const overlayVaultValue = this.flowOptions.querySelector("#roundVaultAmountValue");
    this.animateCurrency(this.walletValue, walletBefore, this.wallet);
    this.animateCurrency(this.bankValue, vaultBefore, deposit.currentAmount);
    if (overlayVaultValue) {
      this.animateCurrency(overlayVaultValue, vaultBefore, deposit.currentAmount);
    }
  };

  Game.lockVaultFunding = function () {
    const deposit = this.vaultDeposit;
    if (!deposit || deposit.state !== "FUNDING" || deposit.currentAmount <= 0) return false;

    deposit.state = "LOCKED";
    deposit.completedRounds = 0;
    deposit.roundsRemaining = deposit.termRounds;
    this.bank = deposit.currentAmount;
    return true;
  };

  Game.advanceVaultRound = function () {
    const deposit = this.vaultDeposit;
    if (!deposit || deposit.state !== "LOCKED") return null;

    const term = this.getVaultTerm(deposit.termRounds);
    if (!term) return null;

    const roundNumber = deposit.completedRounds + 1;
    const rate = term.roundRates[roundNumber - 1] ?? 0;
    const before = deposit.currentAmount;
    const interest = Math.max(0, Math.floor(before * rate));
    const after = before + interest;
    const walletBeforeMaturity = this.wallet;

    deposit.currentAmount = after;
    deposit.completedRounds = roundNumber;
    deposit.roundsRemaining = Math.max(0, deposit.termRounds - roundNumber);
    this.bank = after;

    const ticketGain = term.ticketRounds.includes(roundNumber) ? 1 : 0;
    if (ticketGain > 0) {
      this.tickets += ticketGain;
      deposit.ticketsEarned += ticketGain;
    }

    const event = {
      type: deposit.roundsRemaining <= 0 ? "MATURED" : "TICK",
      before,
      after,
      interest,
      rate,
      roundNumber,
      ticketGain,
      termRounds: deposit.termRounds,
      roundsRemaining: deposit.roundsRemaining,
      ticketsEarned: deposit.ticketsEarned,
      totalTickets: deposit.totalTickets,
      walletBeforeMaturity
    };

    if (event.type === "MATURED") {
      this.wallet += after;
      event.walletAfterMaturity = this.wallet;
      this.bank = 0;
      this.vaultDeposit = null;
    }

    return event;
  };

  Game.animateVaultEvent = async function (event) {
    if (!event) return;

    const rateText = Math.round(event.rate * 100);
    const interestText = event.interest.toLocaleString("ko-KR");

    if (event.type === "TICK") {
      this.vaultRateValue.textContent = `적용 이자 ${rateText}% (+${interestText})`;
      this.vaultRateValue.classList.add("is-applying");
      await this.animateCurrency(this.bankValue, event.before, event.after);
      this.vaultRateValue.classList.remove("is-applying");
      this.updateVaultUI();
      return;
    }

    this.vaultLockState.textContent = "만기 정산";
    this.vaultRoundCopy.textContent = "남은 라운드 0";
    this.vaultRateValue.textContent = `적용 이자 ${rateText}% (+${interestText})`;
    this.vaultRateValue.classList.add("is-applying");
    this.bankValue.textContent = `$ ${event.after.toLocaleString("ko-KR")}`;

    EffectsManager.pulseWallet(this.walletValue);
    await this.animateCurrency(
      this.walletValue,
      event.walletBeforeMaturity,
      event.walletAfterMaturity
    );

    this.vaultRateValue.classList.remove("is-applying");
    this.updateVaultUI();
  };

  Game.describeVaultEvent = function (event) {
    if (!event) return "금고 변동 없음";

    const rateText = Math.round(event.rate * 100);
    const ticketText = event.ticketGain > 0 ? ` · 티켓 +${event.ticketGain}` : "";

    if (event.type === "MATURED") {
      return `금고 만기 · ${rateText}% 이자 +$${event.interest.toLocaleString("ko-KR")} · 지갑 +$${event.after.toLocaleString("ko-KR")}${ticketText}`;
    }

    return `금고 이자 ${rateText}% · +$${event.interest.toLocaleString("ko-KR")} · 현재 $${event.after.toLocaleString("ko-KR")}${ticketText}`;
  };

  Game.depositDeadlineUnit = function () {
    if (!this.canUseEconomyControls()) return;

    const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);
    if (remaining <= 0) return;

    const amount = Math.min(this.getDepositUnit(), remaining);
    if (this.wallet < amount) return;

    const walletBefore = this.wallet;
    const paidBefore = this.deadlinePaid;

    this.wallet -= amount;
    this.deadlinePaid += amount;

    this.readoutDetail.textContent =
      `마감 계좌 납부 · $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`;

    this.updateAllUI();
    this.animateCurrency(this.deadlinePaidValue, paidBefore, this.deadlinePaid);
    this.animateCurrency(this.walletValue, walletBefore, this.wallet);
  };

  Game.resolveRound = async function () {
    const completedRound = this.round;
    const vaultEvent = this.advanceVaultRound();
    const vaultText = this.describeVaultEvent(vaultEvent);

    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();

    this.scoreBreakdown.textContent = `라운드 ${completedRound} 종료 · ${vaultText}`;
    this.readoutDetail.textContent = vaultText;

    await this.animateVaultEvent(vaultEvent);
    this.isResolvingRound = false;
    this.updateAllUI();

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

    this.flowOptions.classList.add("has-vault-setup");
    this.flowEyebrow.textContent =
      `마감 ${this.deadlineNumber} · 라운드 ${this.round} / ${this.roundsPerDeadline}`;
    this.flowTitle.textContent = this.round === this.roundsPerDeadline
      ? "마지막 라운드 선택"
      : "라운드 방식 선택";
    this.flowText.textContent =
      `마감 $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")} · 지갑 $${this.wallet.toLocaleString("ko-KR")}`;

    this.flowOptions.innerHTML = `
      <div class="round-choice-layout">
        <section class="round-mode-block">
          <span class="round-block-title">라운드</span>
          <div class="round-mode-grid">
            <button class="flow-choice" data-action="start-round" data-mode="NORMAL">
              <span>${normal.name}</span>
              <strong>${normal.spins}회전</strong>
              <small>티켓 +${normal.tickets} · 안정적인 선택</small>
            </button>
            <button class="flow-choice risk" data-action="start-round" data-mode="RISK">
              <span>${risk.name}</span>
              <strong>${risk.spins}회전</strong>
              <small>티켓 +${risk.tickets} · 적은 회전, 높은 보상</small>
            </button>
          </div>
        </section>
        <aside id="roundVaultSetup" class="round-vault-setup"></aside>
      </div>
    `;

    this.flowFooter.textContent = note
      ? `${note} · 금고를 사용하지 않아도 바로 라운드를 시작할 수 있습니다.`
      : "금고를 사용하지 않아도 바로 라운드를 시작할 수 있습니다.";

    this.renderRoundVaultSetup();
    this.openFlowOverlay();
    this.updateFinancialControls();
  };

  Game.renderRoundVaultSetup = function () {
    const panel = this.flowOptions?.querySelector("#roundVaultSetup");
    if (!panel) return;

    const deposit = this.vaultDeposit;
    panel.classList.toggle("is-locked", deposit?.state === "LOCKED");

    if (deposit?.state === "LOCKED") {
      const rate = this.getVaultCurrentRate(deposit);
      panel.innerHTML = `
        <div class="round-vault-heading">
          <span>금고</span>
          <b>잠김</b>
        </div>
        <div class="round-vault-lockline">
          <span class="round-vault-lock-dot"></span>
          남은 라운드가 끝날 때까지 열 수 없습니다.
        </div>
        <div class="round-vault-locked-value">$${deposit.currentAmount.toLocaleString("ko-KR")}</div>
        <div class="round-vault-current-rate">현재 이자 ${Math.round(rate * 100)}%</div>
        <div class="round-vault-copy">남은 라운드 ${deposit.roundsRemaining}</div>
        <div class="round-vault-ticket">티켓 ${deposit.ticketsEarned} / ${deposit.totalTickets}</div>
      `;
      return;
    }

    const funding = deposit?.state === "FUNDING" ? deposit : null;
    const selectedTerm = funding?.termRounds || this.selectedVaultTerm;
    const unit = funding?.depositUnit || this.getDepositUnit();
    const currentAmount = funding?.currentAmount || 0;
    const canDeposit = this.canFundVault() && this.wallet >= unit;

    panel.innerHTML = `
      <div class="round-vault-heading">
        <span>금고</span>
        <b>${funding ? "잠금 준비" : "선택"}</b>
      </div>
      <div class="round-vault-terms">
        <button data-vault-term="2" class="round-vault-term ${selectedTerm === 2 ? "is-selected" : ""}" ${funding ? "disabled" : ""}>
          <strong>2라운드</strong><small>15% · 15% · 만기 티켓 +1</small>
        </button>
        <button data-vault-term="4" class="round-vault-term ${selectedTerm === 4 ? "is-selected" : ""}" ${funding ? "disabled" : ""}>
          <strong>4라운드</strong><small>15% · 15% · 25% · 25% · 총 티켓 +2</small>
        </button>
      </div>
      <div class="round-vault-info">
        <span>예치 단위 <strong>$${unit.toLocaleString("ko-KR")}</strong></span>
        <span>현재 예치금 <strong id="roundVaultAmountValue">$${currentAmount.toLocaleString("ko-KR")}</strong></span>
      </div>
      <button class="round-vault-deposit" data-vault-deposit="1" ${!selectedTerm || !canDeposit ? "disabled" : ""}>예치</button>
      <div class="round-vault-help">${selectedTerm ? "라운드를 시작하면 금고가 잠깁니다." : "기다릴 라운드를 먼저 선택하세요."}</div>
    `;
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
    this.stageStatus.textContent = "5단계 · 마감 정산 완료";
    this.flowOptions.classList.remove("has-vault-setup");

    const isLast = this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1;
    const label = settlement.trigger === "EARLY" ? "마감 확정" : "마감 정산";
    const bonus = settlement.bonusTickets
      ? `미사용 라운드 ${settlement.unusedRounds}개 · 티켓 +${settlement.bonusTickets}`
      : "미사용 라운드 보너스 없음";
    const locked = this.vaultDeposit
      ? ` · 금고 남은 라운드 ${this.vaultDeposit.roundsRemaining}`
      : "";

    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} 정산 완료`;
    this.flowTitle.textContent = `${label} 완료`;
    this.flowText.textContent =
      `마감 계좌 $${settlement.paid.toLocaleString("ko-KR")} / $${settlement.target.toLocaleString("ko-KR")} · 지갑 $${this.wallet.toLocaleString("ko-KR")}${locked}`;

    if (isLast) {
      this.runComplete = true;
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="restart-run">
          <span>5단계 반복 완료</span>
          <strong>처음부터 다시 테스트</strong>
        </button>`;
      this.flowFooter.textContent = `${bonus} · 최종 엔딩과 무한 모드는 12단계에서 구현합니다.`;
    } else {
      const nextTarget = GAME_DATA.deadline.targets[this.deadlineIndex + 1];
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="next-deadline">
          <span>다음 마감</span>
          <strong>다음 목표 $${nextTarget.toLocaleString("ko-KR")}</strong>
        </button>`;
      this.flowFooter.textContent = bonus;
    }

    this.openFlowOverlay();
    this.updateAllUI();
    this.spinStatus.textContent = "납부 완료";
  };

  Game.showGameOver = function () {
    this.gameOver = true;
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "5단계 · 게임 오버";
    this.flowOptions.classList.remove("has-vault-setup");

    const shortfall = Math.max(0, this.deadlineTarget - this.deadlinePaid);
    const locked = this.vaultDeposit
      ? ` · 금고 $${this.vaultDeposit.currentAmount.toLocaleString("ko-KR")} 잠김`
      : "";

    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} 실패`;
    this.flowTitle.textContent = "게임 오버";
    this.flowText.textContent =
      `미납 금액 $${shortfall.toLocaleString("ko-KR")} · 지갑 $${this.wallet.toLocaleString("ko-KR")}${locked}`;
    this.flowOptions.innerHTML = `
      <button class="flow-primary danger" data-action="restart-run">
        <span>다시 시작</span>
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
    this.stageStatus.textContent = "5단계 · 자금 배분";
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
    this.stageStatus.textContent = "5단계 · 자금 배분";
    this.updateAllUI();
  };

  Game.updateEconomyUI = function (updateWalletText = true) {
    if (updateWalletText) {
      this.walletValue.textContent = `$ ${this.wallet.toLocaleString("ko-KR")}`;
    }

    const vaultAmount = this.vaultDeposit?.currentAmount || 0;
    this.bankValue.textContent = `$ ${vaultAmount.toLocaleString("ko-KR")}`;
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
    const nextAmount = Math.min(this.getDepositUnit(), remaining);
    const insufficient = !full && nextAmount > 0 && this.wallet < nextAmount;
    const warning = !full && !settled && this.round === 2;
    const critical = !full && !settled && this.round >= this.roundsPerDeadline;

    this.deadlineAccountSection.classList.toggle("is-warning", warning);
    this.deadlineAccountSection.classList.toggle("is-critical", critical);
    this.deadlineAccountSection.classList.toggle("is-funded", full);
    this.progressFill.classList.toggle("is-danger", critical);

    this.deadlineStateBadge.classList.toggle("is-funded", full);
    this.deadlineStateBadge.classList.toggle("is-danger", critical);
    this.deadlineStateBadge.textContent = settled
      ? "정산 완료"
      : full
        ? "납부 완료"
        : "납부 진행 중";

    let warningText = `미납 금액 $${remaining.toLocaleString("ko-KR")}`;
    let warningActive = false;

    if (settled) {
      warningText = "정산 완료";
    } else if (full) {
      const bonus =
        this.getUnusedRoundCount("EARLY") *
        GAME_DATA.economy.earlyPaymentTicketPerUnusedRound;
      warningText = bonus > 0
        ? `납부 완료 · 지금 확정하면 티켓 +${bonus}`
        : "납부 완료 · 마감 확정 가능";
    } else if (critical) {
      warningText = `경고 · 마지막 라운드 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = true;
    } else if (warning) {
      warningText = `납부가 필요합니다 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = true;
    }

    if (insufficient && !settled && !full) {
      warningText += " · 잔액 부족";
      warningActive = true;
    }

    this.deadlineWarningCopy.textContent = warningText;
    this.deadlineWarningCopy.classList.toggle("is-danger", warningActive);

    const canDeposit =
      this.canUseEconomyControls() &&
      !full &&
      nextAmount > 0 &&
      this.wallet >= nextAmount;

    this.deadlineDepositButton.disabled = !canDeposit;
    this.deadlineDepositButton.textContent = "납부";

    const canConfirm = this.canUseEconomyControls() && full;
    this.deadlineConfirmButton.disabled = !canConfirm;
    this.deadlineConfirmButton.textContent = "마감 확정";

    this.deadlineRiskChip.classList.toggle("is-hidden", !critical);
  };

  Game.updateVaultUI = function () {
    if (!this.vaultRoundCopy) return;

    const deposit = this.vaultDeposit;

    if (!deposit) {
      this.vaultLockState.textContent = "비어 있음";
      this.vaultRoundCopy.textContent = "남은 라운드 -";
      this.vaultRateValue.textContent = "현재 이자 -";
      this.vaultTicketProgress.textContent = "티켓 -";
      this.vaultSection.classList.remove("is-active", "is-funding");
      return;
    }

    const rate = this.getVaultCurrentRate(deposit);
    this.vaultRateValue.textContent = `현재 이자 ${Math.round(rate * 100)}%`;
    this.vaultTicketProgress.textContent =
      `티켓 ${deposit.ticketsEarned} / ${deposit.totalTickets}`;

    if (deposit.state === "FUNDING") {
      this.vaultLockState.textContent = "잠금 준비";
      this.vaultRoundCopy.textContent = `남은 라운드 ${deposit.termRounds}`;
      this.vaultSection.classList.add("is-funding");
      this.vaultSection.classList.remove("is-active");
    } else {
      this.vaultLockState.textContent = "잠김";
      this.vaultRoundCopy.textContent = `남은 라운드 ${deposit.roundsRemaining}`;
      this.vaultSection.classList.add("is-active");
      this.vaultSection.classList.remove("is-funding");
    }
  };

  Game.updateFinancialControls = function () {
    this.updateDeadlineUI();
    this.updateVaultUI();
    this.renderRoundVaultSetup();
  };

  Game.updateAllUI = function () {
    baseUpdateAll.call(this);

    if (this.gameOver) this.spinStatus.textContent = "게임 오버";
    else if (this.runComplete) this.spinStatus.textContent = "완료";

    this.updateFinancialControls();
  };
})();
