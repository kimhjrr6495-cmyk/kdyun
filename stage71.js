// DEADLINE — v0.7.1 즉시 라운드 시작 / 차단 오버레이 대응 / 개발 테스트 자금
"use strict";

(() => {
  Game.stage = 7;
  Game.status = "ITEM_EFFECTS_DIRECT_START";

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.canShowPrepChoice = function () {
    return Boolean(
      this.roundPreparation &&
      !this.shopOpen &&
      !this.finalPaymentPhase &&
      !this.gameOver &&
      !this.runComplete &&
      !this.lastSettlement &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      !this.flowOverlay.classList.contains("is-open")
    );
  };

  Game.addTestFunds = function () {
    if (!Number.isFinite(this.wallet)) return;

    this.wallet += 100;
    this.updateAllUI();
    EffectsManager?.pulseWallet?.(this.walletValue);

    if (this.readoutDetail) {
      this.readoutDetail.textContent = "TEST · 지갑 +$100";
    }
  };

  Game.init = function () {
    this.devCreditButton = document.querySelector("#devCreditButton");

    previousInit.call(this);

    this.devCreditButton?.addEventListener("click", () => this.addTestFunds());
    this.stageStatus.textContent = this.roundPreparation
      ? "7단계 · 라운드 준비"
      : "7단계 · 아이템 시스템";
    this.updateAllUI();

    console.info(`DEADLINE ${GAME_DATA.version}: v0.7.1 direct-start flow loaded.`);
  };

  // 7회/3회 선택 자체가 라운드 확정입니다. 별도 시작 버튼/취소 단계는 없습니다.
  Game.togglePreparedMode = function (modeId) {
    if (!this.canShowPrepChoice()) return;

    const mode = GAME_DATA.deadline.modes[modeId];
    if (!mode) return;

    this.selectedRoundModeId = modeId;
    this.readoutDetail.textContent =
      `${mode.spins}회 리롤 확정 · 납부 · 금고 · 상점 잠금 · 라운드 시작`;

    // 먼저 UI를 잠금 상태로 갱신한 뒤 실제 라운드를 시작합니다.
    this.updateAllUI();
    this.beginPreparedRound();
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);

    const prepChoiceVisible = this.canShowPrepChoice();
    if (this.roundPrepPanel) {
      this.roundPrepPanel.hidden = !prepChoiceVisible;
      this.roundPrepPanel.setAttribute("aria-hidden", prepChoiceVisible ? "false" : "true");
    }

    // 준비 중에는 '시작' 버튼 자체가 없습니다. 라운드가 시작된 뒤에만 리롤 버튼이 등장합니다.
    const showRerollButton = Boolean(
      (this.roundStarted && this.currentMode) ||
      this.isSpinning ||
      this.isResolvingRound
    );

    if (this.spinButton) {
      this.spinButton.hidden = !showRerollButton;
      if (this.roundStarted && this.currentMode && !this.isSpinning && !this.isResolvingRound) {
        this.spinButton.textContent = "리롤";
      }
    }

    // 상점은 오직 진짜 준비 상태에서만 활성. 팝업/정산/0라운드/진행 중에는 잠깁니다.
    const shopUnlocked = Boolean(
      prepChoiceVisible &&
      !this.selectedRoundModeId
    );

    if (this.actionShopButton) {
      this.actionShopButton.disabled = !shopUnlocked;
      this.actionShopButton.classList.toggle("is-available", shopUnlocked);
      this.actionShopButton.classList.remove("is-mode-locked");
      this.actionShopButton.title = shopUnlocked
        ? "라운드 시작 전에 상점을 이용할 수 있습니다."
        : "라운드 준비 상태에서만 상점을 이용할 수 있습니다.";
    }
  };
})();
