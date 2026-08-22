// DEADLINE — v1.0.1 light-only theme / contracts layout polish
"use strict";

(() => {
  GAME_DATA.version = "v1.0.1";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.applyStage101LightOnly = function () {
    document.documentElement.classList.remove("theme-dark-root");
    document.body?.classList.remove("theme-dark");
    document.documentElement.style.colorScheme = "light";

    const themeToggle = document.querySelector("#stage96ThemeToggle");
    themeToggle?.remove();

    try {
      localStorage.removeItem("deadline-theme");
    } catch (_) {}
  };

  // Stage 9의 테마 API를 남겨둔 채 호출돼도 항상 라이트로 귀결되게 합니다.
  Game.ensureStage96ThemeToggle = function () {
    document.querySelector("#stage96ThemeToggle")?.remove();
    return null;
  };

  Game.applyStage96Theme = function () {
    this.applyStage101LightOnly();
  };

  Game.loadStage96Theme = function () {
    this.applyStage101LightOnly();
  };

  Game.updateStage101VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.0.1";

    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.0.1";
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.applyStage101LightOnly();
    this.updateStage101VersionUI();
    return result;
  };

  Game.init = function () {
    this.applyStage101LightOnly();
    previousInit.call(this);
    this.applyStage101LightOnly();
    this.updateStage101VersionUI();
    this.stage = 10;
    this.status = "CONTRACTS_LIGHT_ONLY_UI";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.0.1 light-only UI loaded.`);
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.applyStage101LightOnly();
    this.updateStage101VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
