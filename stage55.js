// DEADLINE — Stage 5.6 라운드 준비 / 금고 이동 / 납부 게이지 / 재화 플로팅
"use strict";

(() => {
  Game.stage = 5;
  Game.status = "ROUND_PREPARATION";
  Game.roundStarted = false;
  Game.finalPaymentPhase = false;
  Game.autoAdvanceTimer = null;
  Game.paymentCommitted = 0;

  const previousInit = Game.init;
  const previousStartRound = Game.startRound;
  const previousSpin = Game.spin;
  const previousEvaluateAndRenderScore = Game.evaluateAndRenderScore;
  const previousDepositVaultUnit = Game.depositVaultUnit;
  const previousAnimateVaultEvent = Game.animateVaultEvent;
  const previousGetUnusedRoundCount = Game.getUnusedRoundCount;
  const previousSettleDeadline = Game.settleDeadline;
  const previousShowDeadlineSuccess = Game.showDeadlineSuccess;
  const previousShowGameOver = Game.showGameOver;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAll = Game.updateAllUI;

  EffectsManager.showCurrencyGain = function (element, amount) {
    if (!element || !Number.isFinite(amount) || amount <= 0) return;

    const host =
      element.closest(".deadline-account-section, .wallet-section, .vault-chamber") ||
      element.parentElement;
    if (!host) return;

    host.classList.add("currency-gain-host");

    const hostRect = host.getBoundingClientRect();
    const valueRect = element.getBoundingClientRect();
    const activeCount = host.querySelectorAll(".currency-gain-float").length;
    const stackIndex = Math.min(activeCount, 6);

    const gain = document.createElement("span");
    gain.className = "currency-gain-float";
    gain.textContent = `+${Math.round(amount).toLocaleString("ko-KR")}`;
    gain.style.left = `${valueRect.left - hostRect.left + valueRect.width * 0.5}px`;
    gain.style.top = `${valueRect.top - hostRect.top - 2}px`;
    gain.style.setProperty("--gain-stack", String(stackIndex));
    gain.style.setProperty(
      "--gain-duration",
      `${GAME_DATA.economy.gainFloatDuration ?? 1500}ms`
    );

    host.appendChild(gain);

    const remove = () => gain.remove();
    gain.addEventListener("animationend", remove, { once: true });
    window.setTimeout(remove, (GAME_DATA.economy.gainFloatDuration ?? 1500) + 120);
  };

  Game.init = function () {
    this.roundStarted = false;
    this.finalPaymentPhase = false;
    this.autoAdvanceTimer = null;
    this.paymentCommitted = 0;
    this.vaultControls = document.querySelector("#vaultControls");
    this.progressPendingFill = document.querySelector("#progressPendingFill");

    previousInit.call(this);

    if (this.deadlineConfirmButton) {
      this.deadlineConfirmButton.hidden = true;
      this.deadlineConfirmButton.disabled = true;
      this.deadlineConfirmButton.setAttribute("aria-hidden", "true");
    }

    if (this.vaultControls) {
      this.vaultControls.addEventListener("click", (event) => {
        const termButton = event.target.closest("button[data-sidebar-vault-term]");
        if (termButton) {
          this.selectVaultTerm(Number(termButton.dataset.sidebarVaultTerm));
          return;
        }

        const depositButton = event.target.closest("button[data-sidebar-vault-deposit]");
        if (depositButton) this.depositVaultUnit();
      });
    }

    this.stageStatus.textContent = "5단계 · 라운드 준비";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 5.6 loaded.`);
  };

  Game.showRoundChoice = function () {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "회전";
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.roundStarted = false;
    this.paymentCommitted = this.deadlinePaid;

    if (!this.vaultDeposit) this.selectedVaultTerm = null;

    const normal = GAME_DATA.deadline.modes.NORMAL;
    const risk = GAME_DATA.deadline.modes.RISK;

    this.flowOptions.classList.remove("has-vault-setup");
    this.flowOptions.classList.add("mode-only");
    this.flowEyebrow.textContent =
      `마감 ${this.deadlineNumber} · 라운드 ${this.round} / ${this.roundsPerDeadline}`;
    this.flowTitle.textContent = this.round === this.roundsPerDeadline
      ? "마지막 라운드 선택"
      : "라운드 방식 선택";
    this.flowText.textContent = `일반 ${normal.spins}회전 · 위험 ${risk.spins}회전`;
    this.flowOptions.innerHTML = `
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
    `;
    this.flowFooter.textContent = "";

    this.updateAllUI();
    this.openFlowOverlay();
  };

  Game.startRound = function (modeId) {
    if (this.finalPaymentPhase) return;

    this.roundStarted = false;
    this.paymentCommitted = this.deadlinePaid;
    previousStartRound.call(this, modeId);

    if (this.currentMode) {
      this.roundStarted = false;
      this.stageStatus.textContent = "5단계 · 라운드 준비";
      this.readoutDetail.textContent = `라운드 ${this.round} 준비`;
      this.updateAllUI();
    }
  };

  Game.selectVaultTerm = function (rounds) {
    if (
      !this.canUseEconomyControls() ||
      !this.currentMode ||
      this.roundStarted ||
      this.finalPaymentPhase ||
      this.flowOverlay.classList.contains("is-open") ||
      this.vaultDeposit ||
      !this.getVaultTerm(rounds)
    ) return;

    this.selectedVaultTerm = rounds;
    this.updateAllUI();
  };

  Game.canFundVault = function () {
    if (
      !this.canUseEconomyControls() ||
      !this.currentMode ||
      this.roundStarted ||
      this.finalPaymentPhase ||
      this.flowOverlay.classList.contains("is-open")
    ) return false;

    if (this.vaultDeposit) return this.vaultDeposit.state === "FUNDING";
    return Boolean(this.selectedVaultTerm);
  };

  Game.depositVaultUnit = function () {
    const before = this.vaultDeposit?.currentAmount || 0;
    previousDepositVaultUnit.call(this);
    const after = this.vaultDeposit?.currentAmount || 0;
    const gained = after - before;

    if (gained > 0) {
      EffectsManager.showCurrencyGain(this.bankValue, gained);
    }
  };

  Game.spin = async function () {
    const canActuallySpin =
      !this.isSpinning &&
      !this.isResolvingRound &&
      !this.gameOver &&
      !this.runComplete &&
      !this.finalPaymentPhase &&
      Boolean(this.currentMode) &&
      this.spinsRemaining > 0 &&
      !this.flowOverlay.classList.contains("is-open");

    if (canActuallySpin && !this.roundStarted) {
      if (this.vaultDeposit?.state === "FUNDING") {
        this.lockVaultFunding();
      } else if (!this.vaultDeposit) {
        this.selectedVaultTerm = null;
      }

      this.paymentCommitted = this.deadlinePaid;
      this.roundStarted = true;
      this.stageStatus.textContent = "5단계 · 라운드 진행";
      this.updateAllUI();
    }

    return previousSpin.call(this);
  };

  Game.evaluateAndRenderScore = async function (options = {}) {
    const walletBefore = this.wallet;
    const resultPromise = previousEvaluateAndRenderScore.call(this, options);
    const gained = this.wallet - walletBefore;

    if (options.creditWallet && gained > 0) {
      EffectsManager.showCurrencyGain(this.walletValue, gained);
    }

    return resultPromise;
  };

  Game.animateVaultEvent = async function (event) {
    if (event?.interest > 0) {
      EffectsManager.showCurrencyGain(this.bankValue, event.interest);
    }

    if (event?.type === "MATURED" && event.after > 0) {
      EffectsManager.showCurrencyGain(this.walletValue, event.after);
    }

    return previousAnimateVaultEvent.call(this, event);
  };

  Game.canPayDeadline = function () {
    if (
      this.isSpinning ||
      this.isResolvingRound ||
      this.gameOver ||
      this.runComplete ||
      this.lastSettlement
    ) {
      return false;
    }

    if (this.finalPaymentPhase) return true;

    return Boolean(this.currentMode) &&
      !this.roundStarted &&
      this.spinsTotal > 0 &&
      this.spinsRemaining === this.spinsTotal &&
      !this.flowOverlay.classList.contains("is-open");
  };

  Game.depositDeadlineUnit = async function () {
    if (!this.canPayDeadline()) return;

    const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);
    if (remaining <= 0) return;

    const amount = Math.min(this.getDepositUnit(), remaining);
    if (this.wallet < amount) return;

    const walletBefore = this.wallet;
    const paidBefore = this.deadlinePaid;

    this.wallet -= amount;
    this.deadlinePaid += amount;

    this.readoutDetail.textContent = this.finalPaymentPhase
      ? `최종 납부 · $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`
      : `마감 계좌 · $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`;

    this.updateAllUI();
    EffectsManager.showCurrencyGain(this.deadlinePaidValue, amount);

    await Promise.all([
      this.animateCurrency(this.deadlinePaidValue, paidBefore, this.deadlinePaid),
      this.animateCurrency(this.walletValue, walletBefore, this.wallet)
    ]);

    if (this.deadlinePaid >= this.deadlineTarget && !this.lastSettlement) {
      this.settleDeadline(this.finalPaymentPhase ? "FINAL_PAYMENT" : "AUTO_PAYMENT");
    }
  };

  Game.getUnusedRoundCount = function (trigger) {
    if (trigger === "FINAL_PAYMENT" || this.finalPaymentPhase) return 0;
    return previousGetUnusedRoundCount.call(this, trigger);
  };

  Game.settleDeadline = function (trigger = "AUTO_PAYMENT") {
    return previousSettleDeadline.call(this, trigger);
  };

  Game.enterFinalPaymentPhase = function () {
    this.finalPaymentPhase = true;
    this.roundStarted = false;
    this.round = 0;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;
    this.paymentCommitted = this.deadlinePaid;

    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "5단계 · 최종 납부";
    this.flowOptions.classList.remove("has-vault-setup", "mode-only");

    const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);

    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} · 0라운드`;
    this.flowTitle.textContent = "최종 납부";
    this.flowText.textContent = `미납 금액 $${remaining.toLocaleString("ko-KR")}`;
    this.flowOptions.innerHTML = `
      <div class="final-payment-panel">
        <span>마감 계좌</span>
        <strong>$${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}</strong>
        <small>지갑 $${this.wallet.toLocaleString("ko-KR")}</small>
      </div>
    `;
    this.flowFooter.textContent = "";

    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.showGameOver = function () {
    const reachedLastPlayableRound =
      !this.finalPaymentPhase &&
      !this.lastSettlement &&
      this.round >= this.roundsPerDeadline;

    if (reachedLastPlayableRound) {
      const maximumPayable = this.deadlinePaid + this.wallet;

      if (maximumPayable >= this.deadlineTarget) {
        this.enterFinalPaymentPhase();
        return;
      }
    }

    return previousShowGameOver.call(this);
  };

  Game.showDeadlineSuccess = function (settlement) {
    const isLast = this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1;

    if (isLast) {
      this.finalPaymentPhase = false;
      this.roundStarted = false;
      previousShowDeadlineSuccess.call(this, settlement);
      return;
    }

    this.finalPaymentPhase = false;
    this.roundStarted = false;
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "5단계 · 납부 완료";
    this.flowOptions.classList.remove("has-vault-setup", "mode-only");

    const bonusText = settlement.bonusTickets > 0
      ? `미사용 라운드 보너스 · 티켓 +${settlement.bonusTickets}`
      : "미사용 라운드 보너스 없음";

    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} 납부 완료`;
    this.flowTitle.textContent = "납부 완료";
    this.flowText.textContent = `$${settlement.target.toLocaleString("ko-KR")} 정산 완료`;
    this.flowOptions.innerHTML = `
      <div class="auto-advance-panel">
        <strong>다음 마감으로 이동합니다</strong>
        <span>${bonusText}</span>
      </div>
    `;
    this.flowFooter.textContent = "";

    this.openFlowOverlay();
    this.updateAllUI();
    this.spinStatus.textContent = "납부 완료";

    window.clearTimeout(this.autoAdvanceTimer);
    this.autoAdvanceTimer = window.setTimeout(() => {
      if (!this.gameOver && !this.runComplete && this.lastSettlement) {
        this.advanceDeadline();
      }
    }, GAME_DATA.economy.autoAdvanceDelay ?? 650);
  };

  Game.advanceDeadline = function () {
    window.clearTimeout(this.autoAdvanceTimer);
    this.autoAdvanceTimer = null;
    this.finalPaymentPhase = false;
    this.roundStarted = false;
    this.paymentCommitted = 0;
    previousAdvanceDeadline.call(this);
  };

  Game.restartRun = function () {
    window.clearTimeout(this.autoAdvanceTimer);
    this.autoAdvanceTimer = null;
    this.finalPaymentPhase = false;
    this.roundStarted = false;
    this.paymentCommitted = 0;
    previousRestartRun.call(this);
  };

  Game.updatePaymentProgress = function () {
    if (!this.progressFill || !this.progressPendingFill) return;

    const target = Math.max(1, this.deadlineTarget);
    const committed = Math.max(0, Math.min(this.deadlinePaid, this.paymentCommitted));
    const pending = Math.max(0, this.deadlinePaid - committed);
    const committedRatio = Math.min(1, committed / target);
    const pendingRatio = Math.min(1 - committedRatio, pending / target);

    this.progressFill.style.left = "0";
    this.progressFill.style.width = `${committedRatio * 100}%`;
    this.progressPendingFill.style.left = `${committedRatio * 100}%`;
    this.progressPendingFill.style.width = `${pendingRatio * 100}%`;
  };

  Game.renderVaultControls = function () {
    if (!this.vaultControls) return;

    const deposit = this.vaultDeposit;
    if (deposit?.state === "LOCKED") {
      this.vaultControls.innerHTML = "";
      return;
    }

    const prepOpen =
      Boolean(this.currentMode) &&
      !this.roundStarted &&
      !this.finalPaymentPhase &&
      !this.flowOverlay.classList.contains("is-open") &&
      !this.lastSettlement;

    const funding = deposit?.state === "FUNDING" ? deposit : null;
    const selectedTerm = funding?.termRounds || this.selectedVaultTerm;
    const unit = funding?.depositUnit || this.getDepositUnit();
    const currentAmount = funding?.currentAmount || 0;
    const canDeposit = prepOpen && this.canFundVault() && this.wallet >= unit;
    const termDisabled = !prepOpen || Boolean(funding);

    this.vaultControls.innerHTML = `
      <div class="vault-inline-term-grid">
        <button class="vault-inline-term ${selectedTerm === 2 ? "is-selected" : ""}"
          data-sidebar-vault-term="2" ${termDisabled ? "disabled" : ""}>
          <strong>2라운드</strong><small>15% · 15% · 티켓 +1</small>
        </button>
        <button class="vault-inline-term ${selectedTerm === 4 ? "is-selected" : ""}"
          data-sidebar-vault-term="4" ${termDisabled ? "disabled" : ""}>
          <strong>4라운드</strong><small>15% · 15% · 25% · 25%</small>
        </button>
      </div>
      <div class="vault-inline-meta">
        <span>예치 단위 <strong>$${unit.toLocaleString("ko-KR")}</strong></span>
        <span>현재 예치금 <strong>$${currentAmount.toLocaleString("ko-KR")}</strong></span>
      </div>
      <button class="vault-inline-deposit" data-sidebar-vault-deposit="1"
        ${!selectedTerm || !canDeposit ? "disabled" : ""}>예치</button>
    `;
  };

  Game.updateFinanceVisualState = function () {
    const paymentLocked =
      Boolean(this.currentMode) && this.roundStarted && !this.finalPaymentPhase;
    const prepOpen =
      Boolean(this.currentMode) && !this.roundStarted && !this.finalPaymentPhase;
    const vaultLocked =
      paymentLocked ||
      this.finalPaymentPhase ||
      this.vaultDeposit?.state === "LOCKED";

    this.deadlineAccountSection?.classList.toggle("is-round-locked", paymentLocked);
    this.deadlineAccountSection?.classList.toggle("is-prep-open", prepOpen);
    this.vaultSection?.classList.toggle("is-round-locked", Boolean(vaultLocked));
    this.vaultSection?.classList.toggle(
      "is-prep-open",
      prepOpen && this.vaultDeposit?.state !== "LOCKED"
    );

    if (this.vaultLockState) {
      if (this.vaultDeposit?.state === "LOCKED") {
        this.vaultLockState.textContent = "잠김";
      } else if (this.vaultDeposit?.state === "FUNDING") {
        this.vaultLockState.textContent = "준비";
      } else if (vaultLocked) {
        this.vaultLockState.textContent = "잠김";
      } else if (prepOpen) {
        this.vaultLockState.textContent = "열림";
      } else {
        this.vaultLockState.textContent = "대기";
      }
    }
  };

  Game.updateDeadlineUI = function () {
    if (!this.deadlineStateBadge) return;

    const settled = Boolean(this.lastSettlement);
    const full = this.deadlinePaid >= this.deadlineTarget;
    const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);
    const nextAmount = Math.min(this.getDepositUnit(), remaining);
    const canPayNow = this.canPayDeadline();
    const insufficient = canPayNow && !full && nextAmount > 0 && this.wallet < nextAmount;
    const finalPayment = this.finalPaymentPhase && !settled && !full;
    const warningRound =
      !this.finalPaymentPhase && !settled && !full && this.round === 2;
    const criticalRound =
      !this.finalPaymentPhase && !settled && !full && this.round >= this.roundsPerDeadline;
    const paymentLocked = Boolean(this.currentMode) && this.roundStarted && !settled;
    const critical = finalPayment || criticalRound;

    this.deadlineAccountSection.classList.toggle("is-warning", warningRound);
    this.deadlineAccountSection.classList.toggle("is-critical", critical);
    this.deadlineAccountSection.classList.toggle("is-final-payment", finalPayment);
    this.deadlineAccountSection.classList.toggle("is-funded", full || settled);
    this.progressFill.classList.remove("is-danger");

    this.deadlineStateBadge.classList.toggle("is-funded", full || settled);
    this.deadlineStateBadge.classList.toggle("is-danger", critical);

    if (settled) this.deadlineStateBadge.textContent = "정산 완료";
    else if (full) this.deadlineStateBadge.textContent = "납부 완료";
    else if (finalPayment) this.deadlineStateBadge.textContent = "최종 납부";
    else if (canPayNow) this.deadlineStateBadge.textContent = "납부 가능";
    else if (paymentLocked) this.deadlineStateBadge.textContent = "잠김";
    else this.deadlineStateBadge.textContent = "대기";

    let warningText = `미납 금액 $${remaining.toLocaleString("ko-KR")}`;
    let warningActive = warningRound || critical;

    if (settled || full) {
      warningText = "납부 완료";
      warningActive = false;
    }

    if (insufficient) {
      warningText += " · 잔액 부족";
      warningActive = true;
    }

    this.deadlineWarningCopy.textContent = warningText;
    this.deadlineWarningCopy.classList.toggle("is-danger", warningActive);

    const canDeposit =
      canPayNow &&
      !full &&
      !settled &&
      nextAmount > 0 &&
      this.wallet >= nextAmount;

    this.deadlineDepositButton.disabled = !canDeposit;
    this.deadlineDepositButton.textContent = "납부";

    if (this.deadlineConfirmButton) {
      this.deadlineConfirmButton.hidden = true;
      this.deadlineConfirmButton.disabled = true;
    }

    this.deadlineRiskChip.classList.toggle("is-hidden", !critical);
    this.deadlineRiskChip.textContent = finalPayment ? "최종 납부" : "마감 위험";
  };

  Game.updateAllUI = function () {
    previousUpdateAll.call(this);

    if (this.finalPaymentPhase) {
      this.roundStatus.textContent = "0 · 최종 납부";
      this.spinStatus.textContent = "최종 납부";
    } else if (this.currentMode && !this.roundStarted) {
      this.spinStatus.textContent = "준비";
    }

    if (this.gameOver) this.spinStatus.textContent = "게임 오버";
    else if (this.runComplete) this.spinStatus.textContent = "완료";

    this.updatePaymentProgress();
    this.updateFinanceVisualState();
    this.renderVaultControls();
    this.updateDeadlineUI();
  };
})();
