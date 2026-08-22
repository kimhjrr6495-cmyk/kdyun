// DEADLINE — Stage 5.7 슬롯 고정 / 라운드 준비 강조
"use strict";

(() => {
  const previousInit = Game.init;
  const previousUpdateFinanceVisualState = Game.updateFinanceVisualState;

  Game.init = function () {
    this.machinePanel = document.querySelector("#machinePanel");
    previousInit.call(this);
    this.updateFinanceVisualState();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 5.7 loaded.`);
  };

  Game.updateFinanceVisualState = function () {
    previousUpdateFinanceVisualState.call(this);

    const prepOpen =
      Boolean(this.currentMode) &&
      !this.roundStarted &&
      !this.finalPaymentPhase &&
      !this.gameOver &&
      !this.runComplete &&
      !this.lastSettlement &&
      !this.flowOverlay.classList.contains("is-open");

    this.machinePanel?.classList.toggle("is-round-prep", prepOpen);
  };
})();
