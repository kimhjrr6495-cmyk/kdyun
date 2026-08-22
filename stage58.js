// DEADLINE — Stage 5.8 방식 선택 / 자금 배분 / 명시적 시작 / 리롤 분리
"use strict";

(() => {
  Game.stage = 5;
  Game.status = "EXPLICIT_ROUND_START";
  Game.awaitingRoundStart = false;
  Game.pendingModeTickets = 0;

  const previousInit = Game.init;
  const previousShowRoundChoice = Game.showRoundChoice;
  const previousStartRound = Game.startRound;
  const previousSpin = Game.spin;
  const previousUpdateFinanceVisualState = Game.updateFinanceVisualState;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousRestartRun = Game.restartRun;

  Game.init = function () {
    this.awaitingRoundStart = false;
    this.pendingModeTickets = 0;
    this.roundStartButton = document.querySelector("#roundStartButton");

    previousInit.call(this);

    this.roundStartButton?.addEventListener("click", () => this.beginRoundPlay());
    this.stageStatus.textContent = "5단계 · 방식 선택";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 5.8 loaded.`);
  };

  Game.showRoundChoice = function (...args) {
    this.awaitingRoundStart = false;
    this.pendingModeTickets = 0;
    const result = previousShowRoundChoice.apply(this, args);
    this.stageStatus.textContent = "5단계 · 방식 선택";
    this.spinButton.textContent = "리롤";
    this.updateAllUI();
    return result;
  };

  Game.startRound = function (modeId) {
    if (this.finalPaymentPhase || this.gameOver || this.runComplete) return;

    this.awaitingRoundStart = false;
    this.pendingModeTickets = 0;
    const result = previousStartRound.call(this, modeId);

    if (this.currentMode) {
      // 기존 기반 로직은 방식 선택 시 티켓을 즉시 지급하므로 되돌린 뒤,
      // 실제 시작 버튼을 누르는 순간 지급하도록 보류합니다.
      const selectedTickets = this.currentMode.tickets ?? 0;
      this.tickets = Math.max(0, this.tickets - selectedTickets);
      this.pendingModeTickets = selectedTickets;

      this.awaitingRoundStart = true;
      this.roundStarted = false;
      this.spinButton.disabled = true;
      this.patternTestButton.disabled = true;
      this.spinButton.textContent = "리롤";
      this.stageStatus.textContent = "5단계 · 자금 배분";
      this.readoutDetail.textContent = `라운드 ${this.round} 준비`;
      this.updateAllUI();
    }

    return result;
  };

  Game.beginRoundPlay = function () {
    if (
      !this.awaitingRoundStart ||
      !this.currentMode ||
      this.roundStarted ||
      this.finalPaymentPhase ||
      this.gameOver ||
      this.runComplete ||
      this.isSpinning ||
      this.isResolvingRound ||
      this.flowOverlay.classList.contains("is-open")
    ) return;

    if (this.vaultDeposit?.state === "FUNDING") {
      this.lockVaultFunding();
    } else if (!this.vaultDeposit) {
      this.selectedVaultTerm = null;
    }

    if (this.pendingModeTickets > 0) {
      this.tickets += this.pendingModeTickets;
      this.pendingModeTickets = 0;
    }

    // 이번 준비 구간에서 납부한 빨간 게이지를 확정 구간으로 전환합니다.
    this.paymentCommitted = this.deadlinePaid;
    this.awaitingRoundStart = false;
    this.roundStarted = true;
    this.stageStatus.textContent = "5단계 · 라운드 진행";
    this.readoutDetail.textContent = `${this.currentMode.name} · 리롤 ${this.spinsRemaining}회`;

    this.spinButton.disabled = this.spinsRemaining <= 0;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "리롤";
    this.updateAllUI();
  };

  Game.spin = async function () {
    // 시작 버튼을 누르기 전에는 리롤/스페이스 입력 모두 무시합니다.
    if (this.awaitingRoundStart || !this.roundStarted) return;

    const result = await previousSpin.call(this);

    if (
      this.currentMode &&
      this.roundStarted &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      this.spinsRemaining > 0
    ) {
      this.spinButton.textContent = "리롤";
    }

    return result;
  };

  Game.updateFinanceVisualState = function () {
    previousUpdateFinanceVisualState.call(this);

    const modeSelecting =
      this.flowOverlay.classList.contains("is-open") &&
      !this.currentMode &&
      !this.finalPaymentPhase &&
      !this.lastSettlement &&
      !this.gameOver &&
      !this.runComplete;

    const prepOpen =
      this.awaitingRoundStart &&
      Boolean(this.currentMode) &&
      !this.roundStarted &&
      !this.finalPaymentPhase &&
      !this.flowOverlay.classList.contains("is-open") &&
      !this.lastSettlement;

    this.deadlineAccountSection?.classList.toggle("is-mode-selecting", modeSelecting);
    this.vaultSection?.classList.toggle("is-mode-selecting", modeSelecting);
    this.machinePanel?.classList.toggle("is-awaiting-start", prepOpen);

    if (this.roundStartButton) {
      this.roundStartButton.hidden = !prepOpen;
      this.roundStartButton.disabled = !prepOpen;
    }
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);

    const prepOpen =
      this.awaitingRoundStart &&
      Boolean(this.currentMode) &&
      !this.roundStarted &&
      !this.finalPaymentPhase &&
      !this.flowOverlay.classList.contains("is-open") &&
      !this.lastSettlement;

    if (prepOpen) {
      this.spinButton.disabled = true;
      this.patternTestButton.disabled = true;
      this.spinButton.textContent = "리롤";
      this.spinStatus.textContent = "시작 대기";
    } else if (
      this.currentMode &&
      this.roundStarted &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      this.spinsRemaining > 0
    ) {
      this.spinButton.textContent = "리롤";
    }

    this.updateFinanceVisualState();
  };

  Game.advanceDeadline = function () {
    this.awaitingRoundStart = false;
    this.pendingModeTickets = 0;
    previousAdvanceDeadline.call(this);
  };

  Game.restartRun = function () {
    this.awaitingRoundStart = false;
    this.pendingModeTickets = 0;
    previousRestartRun.call(this);
  };
})();
