// DEADLINE — Stage 5.5 납부 타이밍 / 0라운드 / 자동 정산 / 재화 플로팅
"use strict";

(() => {
  Game.stage = 5;
  Game.status = "PAYMENT_WINDOW";
  Game.roundStarted = false;
  Game.finalPaymentPhase = false;
  Game.autoAdvanceTimer = null;

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
  const previousUpdateAllUI = Game.updateAllUI;

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
    gain.style.top = `${valueRect.top - hostRect.top}px`;
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
    previousInit.call(this);

    if (this.deadlineConfirmButton) {
      this.deadlineConfirmButton.hidden = true;
      this.deadlineConfirmButton.disabled = true;
      this.deadlineConfirmButton.setAttribute("aria-hidden", "true");
    }

    this.stageStatus.textContent = "5단계 · 납부 구간";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 5.5 loaded.`);
  };

  Game.startRound = function (modeId) {
    if (this.finalPaymentPhase) return;

    this.roundStarted = false;
    previousStartRound.call(this, modeId);

    if (this.currentMode) {
      this.roundStarted = false;
      this.readoutDetail.textContent =
        `라운드 ${this.round} 준비 · 첫 회전 전까지 마감 납부 가능`;
      this.updateAllUI();
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
      this.roundStarted = true;
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

  Game.depositVaultUnit = function () {
    const before = this.vaultDeposit?.currentAmount || 0;
    previousDepositVaultUnit.call(this);
    const after = this.vaultDeposit?.currentAmount || 0;
    const gained = after - before;

    if (gained > 0) {
      EffectsManager.showCurrencyGain(this.bankValue, gained);
    }
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
      this.spinsRemaining === this.spinsTotal;
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
      : `마감 계좌 납부 · $${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`;

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

    if (this.currentMode) {
      return Math.max(0, this.roundsPerDeadline - this.round);
    }

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

    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "5단계 · 최종 납부";
    this.flowOptions.classList.remove("has-vault-setup");

    const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);

    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} · 0라운드`;
    this.flowTitle.textContent = "최종 납부";
    this.flowText.textContent =
      `추가 회전은 없습니다. 남은 $${remaining.toLocaleString("ko-KR")}을 지갑에서 납부하세요.`;
    this.flowOptions.innerHTML = `
      <div class="final-payment-panel">
        <span>마감 계좌</span>
        <strong>$${this.deadlinePaid.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}</strong>
        <small>지갑 $${this.wallet.toLocaleString("ko-KR")} · 왼쪽의 납부 버튼을 사용하세요.</small>
      </div>
    `;
    this.flowFooter.textContent = "지갑의 모든 돈을 넣어도 목표에 도달할 수 없으면 즉시 게임 오버입니다.";

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
    this.flowOptions.classList.remove("has-vault-setup");

    const bonusText = settlement.bonusTickets > 0
      ? `미사용 라운드 보너스 · 티켓 +${settlement.bonusTickets}`
      : "미사용 라운드 보너스 없음";

    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} 납부 완료`;
    this.flowTitle.textContent = "납부 완료";
    this.flowText.textContent =
      `$${settlement.target.toLocaleString("ko-KR")} 납부가 완료되었습니다.`;
    this.flowOptions.innerHTML = `
      <div class="auto-advance-panel">
        <strong>다음 마감으로 이동합니다</strong>
        <span>${bonusText}</span>
      </div>
    `;
    this.flowFooter.textContent = "별도의 마감 확정 버튼 없이 자동으로 진행됩니다.";

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
    previousAdvanceDeadline.call(this);
  };

  Game.restartRun = function () {
    window.clearTimeout(this.autoAdvanceTimer);
    this.autoAdvanceTimer = null;
    this.finalPaymentPhase = false;
    this.roundStarted = false;
    previousRestartRun.call(this);
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
    const finalPlayableRound =
      !this.finalPaymentPhase &&
      !settled &&
      !full &&
      this.round >= this.roundsPerDeadline;
    const warningRound =
      !this.finalPaymentPhase &&
      !settled &&
      !full &&
      this.round === 2;
    const paymentLocked = Boolean(this.currentMode) && this.roundStarted && !settled;
    const waitingForMode = !this.currentMode && !this.finalPaymentPhase && !settled;

    const critical = finalPayment || finalPlayableRound;

    this.deadlineAccountSection.classList.toggle("is-warning", warningRound);
    this.deadlineAccountSection.classList.toggle("is-critical", critical);
    this.deadlineAccountSection.classList.toggle("is-final-payment", finalPayment);
    this.deadlineAccountSection.classList.toggle("is-funded", full || settled);
    this.progressFill.classList.toggle("is-danger", critical);

    this.deadlineStateBadge.classList.toggle("is-funded", full || settled);
    this.deadlineStateBadge.classList.toggle("is-danger", critical);

    if (settled) this.deadlineStateBadge.textContent = "정산 완료";
    else if (full) this.deadlineStateBadge.textContent = "납부 완료";
    else if (finalPayment) this.deadlineStateBadge.textContent = "최종 납부";
    else if (canPayNow) this.deadlineStateBadge.textContent = "납부 가능";
    else if (paymentLocked) this.deadlineStateBadge.textContent = "납부 잠김";
    else this.deadlineStateBadge.textContent = "납부 대기";

    let warningText = `미납 금액 $${remaining.toLocaleString("ko-KR")}`;
    let warningActive = false;

    if (settled || full) {
      warningText = "납부 완료 · 자동으로 다음 마감으로 이동합니다.";
    } else if (finalPayment) {
      warningText = `최종 납부 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = true;
    } else if (paymentLocked) {
      warningText = `라운드 진행 중에는 납부할 수 없습니다 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = finalPlayableRound;
    } else if (canPayNow && finalPlayableRound) {
      warningText = `경고 · 마지막 라운드 · 지금 납부 가능 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = true;
    } else if (canPayNow) {
      warningText = `첫 회전 전 납부 가능 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = warningRound;
    } else if (finalPlayableRound) {
      warningText = `경고 · 마지막 라운드 · 방식을 선택한 뒤 납부하세요 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = true;
    } else if (warningRound) {
      warningText = `납부가 필요합니다 · 방식을 선택한 뒤 첫 회전 전에 납부하세요 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
      warningActive = true;
    } else if (waitingForMode) {
      warningText = `방식을 선택한 뒤 첫 회전 전에 납부할 수 있습니다 · 미납 금액 $${remaining.toLocaleString("ko-KR")}`;
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
    previousUpdateAllUI.call(this);

    if (this.finalPaymentPhase) {
      this.roundStatus.textContent = "0 · 최종 납부";
      this.spinStatus.textContent = "최종 납부";
    } else if (this.currentMode && !this.roundStarted) {
      this.spinStatus.textContent = "시작 전";
    }

    if (this.gameOver) this.spinStatus.textContent = "게임 오버";
    else if (this.runComplete) this.spinStatus.textContent = "완료";

    this.updateDeadlineUI();
  };
})();
