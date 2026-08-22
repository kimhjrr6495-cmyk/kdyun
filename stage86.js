// DEADLINE — v0.8.6 당첨 테두리 / 릴 정지 연출 정리
"use strict";

(() => {
  GAME_DATA.version = "v0.8.6";
  GAME_DATA.stage = 8;

  const previousInit = Game.init;

  Game.init = function () {
    previousInit.call(this);
    this.stage = 8;
    this.status = "CLEAN_WIN_BORDER_NO_STOP_FLASH";
    console.info(`DEADLINE ${GAME_DATA.version}: v0.8.6 clean win borders loaded.`);
  };
})();
