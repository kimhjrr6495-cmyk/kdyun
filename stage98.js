// DEADLINE — v0.9.8 stable market-linked reel layout
"use strict";

(() => {
  GAME_DATA.version = "v0.9.8";
  GAME_DATA.stage = 9;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;

  Game.init = function () {
    previousInit.call(this);
    this.stage = 9;
    this.status = "STABLE_MACHINE_LAYOUT";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.8 stable machine layout loaded.`);
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.updateAllUI?.();
    return result;
  };
})();
