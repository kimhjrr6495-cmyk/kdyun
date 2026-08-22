// DEADLINE — v1.0.7 fixed contract HUD position / hide empty dock
"use strict";

(() => {
  GAME_DATA.version = "v1.0.7";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.updateStage107ContractDock = function () {
    this.ensureStage106HudLayout?.();

    const dock = document.querySelector("#stage105SlotMeta .stage105-contract-dock");
    const hud = document.querySelector("#stage104ContractHud");
    const hasContract = Boolean(this.stage100ActiveContract && hud && !hud.hidden);

    if (dock) {
      dock.hidden = !hasContract;
      dock.classList.toggle("is-empty", !hasContract);
      dock.setAttribute("aria-hidden", hasContract ? "false" : "true");
    }

    if (hasContract && hud && dock && hud.parentElement !== dock) {
      dock.appendChild(hud);
    }
  };

  Game.updateStage107VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.0.7";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.0.7";
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.updateStage107ContractDock();
    this.updateStage107VersionUI();
    return result;
  };

  Game.init = function () {
    const result = previousInit.call(this);
    this.updateStage107ContractDock();
    this.updateStage107VersionUI();
    this.stage = 10;
    this.status = "STAGE10_FIXED_CONTRACT_DOCK_107";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.0.7 fixed contract dock loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.updateStage107ContractDock();
    this.updateStage107VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
