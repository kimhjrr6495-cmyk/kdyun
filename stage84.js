// DEADLINE — v0.8.4 이모지 심볼 / 릴 가독성 개선
"use strict";

(() => {
  GAME_DATA.version = "v0.8.4";
  GAME_DATA.stage = 8;

  const SYMBOL_EMOJI_84 = {
    CH: "🍒",
    CO: "🪙",
    BL: "🔔",
    ST: "⭐",
    DM: "💎",
    CR: "👑",
    SV: "7️⃣"
  };

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.getSymbolEmoji = function (symbolId) {
    return SYMBOL_EMOJI_84[symbolId] || "❔";
  };

  // 릴의 CH / CO / BL 같은 코드 표기를 이모지 심볼로 교체합니다.
  // data-symbol / data-col / data-row는 그대로 유지해서 판정/연출 로직에는 영향을 주지 않습니다.
  Game.symbolHTML = function (symbol, col = null, row = null) {
    const coordinateAttrs =
      Number.isInteger(col) && Number.isInteger(row)
        ? ` data-col="${col}" data-row="${row}"`
        : "";
    const emoji = this.getSymbolEmoji(symbol.id);

    return `
      <div class="reel-symbol" data-symbol="${symbol.id}"${coordinateAttrs} aria-label="${symbol.name}">
        <b class="symbol-emoji" aria-hidden="true">${emoji}</b>
        <small>${symbol.name}</small>
      </div>
    `;
  };

  // 오른쪽 심볼 가격표의 구조/확률/현재 가치/변화식은 유지하고 이름 칸만 같은 이모지로 교체합니다.
  Game.applyEmojiToSymbolReferenceTable = function () {
    if (!this.symbolValueTable) return;

    this.symbolValueTable
      .querySelectorAll(".symbol-reference-row[data-symbol]")
      .forEach((row) => {
        const symbolId = row.dataset.symbol;
        const symbol = GAME_DATA.symbols.find((entry) => entry.id === symbolId);
        const nameEl = row.querySelector(".reference-name");
        if (!symbol || !nameEl) return;

        nameEl.textContent = this.getSymbolEmoji(symbolId);
        nameEl.classList.add("reference-symbol-emoji");
        nameEl.setAttribute("aria-label", symbol.name);
        nameEl.title = symbol.name;
      });
  };

  Game.init = function () {
    previousInit.call(this);
    this.applyEmojiToSymbolReferenceTable();
    this.stage = 8;
    this.status = "EMOJI_SYMBOL_READABILITY";
    console.info(`DEADLINE ${GAME_DATA.version}: v0.8.4 emoji symbols loaded.`);
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    this.applyEmojiToSymbolReferenceTable();
  };
})();
