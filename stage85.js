// DEADLINE — v0.8.5 릴 심볼 미니멀 표시
"use strict";

(() => {
  GAME_DATA.version = "v0.8.5";
  GAME_DATA.stage = 8;

  const previousInit = Game.init;

  // 릴에는 이모지만 표시합니다. 심볼 이름 텍스트는 aria-label로만 남겨 접근성은 유지합니다.
  Game.symbolHTML = function (symbol, col = null, row = null) {
    const coordinateAttrs =
      Number.isInteger(col) && Number.isInteger(row)
        ? ` data-col="${col}" data-row="${row}"`
        : "";
    const emoji = this.getSymbolEmoji?.(symbol.id) || symbol.code;

    return `
      <div class="reel-symbol" data-symbol="${symbol.id}"${coordinateAttrs} aria-label="${symbol.name}">
        <b class="symbol-emoji" aria-hidden="true">${emoji}</b>
      </div>
    `;
  };

  Game.init = function () {
    previousInit.call(this);
    this.stage = 8;
    this.status = "MINIMAL_EMOJI_REELS";
    console.info(`DEADLINE ${GAME_DATA.version}: v0.8.5 minimal emoji reels loaded.`);
  };
})();
