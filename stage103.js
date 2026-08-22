// DEADLINE — v1.0.3 action bar cleanup / contract visual polish
"use strict";

(() => {
  GAME_DATA.version = "v1.0.3";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousShowStage100ContractOffer = Game.showStage100ContractOffer;

  Game.applyStage103ContractCloseGuard = function () {
    if (!this.flowOverlay?.classList.contains("is-contract-modal")) return;
    const close = this.shopCloseButton || document.querySelector("#shopCloseButton");
    if (close) {
      close.hidden = true;
      close.setAttribute("aria-hidden", "true");
      close.tabIndex = -1;
    }
  };

  Game.updateStage103VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.0.3";

    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.0.3";
  };

  Game.showStage100ContractOffer = function (...args) {
    const result = previousShowStage100ContractOffer.apply(this, args);
    this.applyStage103ContractCloseGuard();
    return result;
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.applyStage103ContractCloseGuard();
    this.updateStage103VersionUI();
    return result;
  };

  Game.init = function () {
    previousInit.call(this);
    this.applyStage103ContractCloseGuard();
    this.updateStage103VersionUI();
    this.stage = 10;
    this.status = "CONTRACTS_UI_POLISH_103";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.0.3 UI polish loaded.`);
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.applyStage103ContractCloseGuard();
    this.updateStage103VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
