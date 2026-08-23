// DEADLINE — v1.2.0 LUCK PATTERN PROTOTYPE
"use strict";

(() => {
  GAME_DATA.version = "v1.2.0";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousUpdateStatsRail = Game.updateStatsRail;
  const previousPrepareStage90SpinEffects = Game.prepareStage90SpinEffects;
  const previousGetStage90SymbolWeightMap = Game.getStage90SymbolWeightMap;
  const previousRandomSymbol = Game.randomSymbol;
  const previousRandomColumn = Game.randomColumn;

  const LUCK_EXCLUDED_SYMBOLS = new Set(["WD", "ER"]);

  Game.resetStage120LuckState = function () {
    this.stage120PreparedColumns = null;
    this.stage120PreparedColumnIndex = 0;
    this.stage120LastLuck = 0;
    this.stage120LastGuarantee = 0;
    this.stage120LastTargetId = null;
  };

  Game.getStage120LuckGuarantee = function (luckValue = null) {
    const luck = Math.max(0, Number(luckValue ?? this.stage90ActiveLuck) || 0);
    if (luck < 0.25) return 0;
    return Math.min(15, 2 + Math.floor(((luck - 0.25) + 1e-9) / 0.25));
  };

  Game.getStage120PersistentLuck = function () {
    return (this.getStage96ShinyItems?.("LUCK") || []).length * 0.12;
  };

  // v1.2.0 실험: 행운은 더 이상 희귀 심볼/ERROR 가중치를 직접 보정하지 않습니다.
  // 기존 아이템/계약/영구 심볼 가중치 변화는 그대로 유지됩니다.
  Game.getStage90SymbolWeightMap = function (...args) {
    const savedLuck = this.stage90ActiveLuck;
    this.stage90ActiveLuck = 0;
    try {
      return previousGetStage90SymbolWeightMap.apply(this, args) || {};
    } finally {
      this.stage90ActiveLuck = savedLuck;
    }
  };

  Game.pickStage120LuckTarget = function () {
    const symbols = (GAME_DATA.symbols || []).filter((symbol) =>
      symbol && !LUCK_EXCLUDED_SYMBOLS.has(symbol.id)
    );
    if (!symbols.length) return null;

    const weights = this.getStage90SymbolWeightMap?.() || {};
    const total = symbols.reduce(
      (sum, symbol) => sum + Math.max(0, Number(weights[symbol.id]) || 0),
      0
    );
    if (total <= 0) return symbols[Math.floor(Math.random() * symbols.length)] || null;

    let cursor = Math.random() * total;
    for (const symbol of symbols) {
      cursor -= Math.max(0, Number(weights[symbol.id]) || 0);
      if (cursor <= 0) return symbol;
    }
    return symbols.at(-1) || null;
  };

  Game.makeStage120ForcedSymbol = function (target) {
    if (!target) return null;
    const clone = { ...target };
    delete clone.modifiers;
    const modifiers = this.rollStage90ModifiersForSymbol?.(clone) || [];
    if (modifiers.length) clone.modifiers = [...modifiers];
    return clone;
  };

  Game.buildStage120LuckBoard = function (luck) {
    const columns = Array.from(
      { length: GAME_DATA.board.columns },
      () => Array.from(
        { length: GAME_DATA.board.rows },
        () => previousRandomSymbol.call(this)
      )
    );

    const guarantee = this.getStage120LuckGuarantee(luck);
    const target = guarantee > 0 ? this.pickStage120LuckTarget() : null;

    this.stage120LastLuck = Math.max(0, Number(luck) || 0);
    this.stage120LastGuarantee = guarantee;
    this.stage120LastTargetId = target?.id || null;

    if (!target || guarantee <= 0) return columns;

    const candidates = [];
    let currentCount = 0;
    columns.forEach((column, col) => {
      column.forEach((symbol, row) => {
        if (symbol?.id === target.id) currentCount += 1;
        else candidates.push([col, row]);
      });
    });

    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    let needed = Math.max(0, guarantee - currentCount);
    while (needed > 0 && candidates.length) {
      const [col, row] = candidates.pop();
      const forced = this.makeStage120ForcedSymbol(target);
      if (!forced) break;
      columns[col][row] = forced;
      needed -= 1;
    }

    return columns;
  };

  Game.prepareStage90SpinEffects = function (...args) {
    const result = previousPrepareStage90SpinEffects.apply(this, args);
    const luck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    this.stage120PreparedColumns = this.buildStage120LuckBoard(luck);
    this.stage120PreparedColumnIndex = 0;
    return result;
  };

  Game.randomColumn = function (...args) {
    const prepared = this.stage120PreparedColumns;
    const index = Math.max(0, Number(this.stage120PreparedColumnIndex) || 0);

    if (Array.isArray(prepared) && index < prepared.length) {
      const column = prepared[index].map((symbol) => ({
        ...symbol,
        modifiers: Array.isArray(symbol?.modifiers) ? [...symbol.modifiers] : undefined
      }));
      this.stage120PreparedColumnIndex = index + 1;
      if (this.stage120PreparedColumnIndex >= prepared.length) {
        this.stage120PreparedColumns = null;
        this.stage120PreparedColumnIndex = 0;
      }
      return column;
    }

    return previousRandomColumn.apply(this, args);
  };

  Game.updateStage120VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.2.0";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.2.0";
  };

  Game.updateStatsRail = function (...args) {
    const result = previousUpdateStatsRail?.apply(this, args);
    const grid = this.runStatsGrid || document.querySelector("#runStatsGrid");
    if (!grid) return result;

    grid.querySelector(".stage110-luck-stat")?.remove();
    grid.querySelector(".stage120-luck-stat")?.remove();

    const activeLuck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    const persistentLuck = this.getStage120PersistentLuck();
    const luck = activeLuck > 0 ? activeLuck : persistentLuck;
    const guarantee = this.getStage120LuckGuarantee(luck);
    const effectText = guarantee > 0 ? `최소 ${guarantee}칸` : "보장 없음";

    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="stat-reference-row stage120-luck-stat" title="행운이 높을수록 한 종류의 일반 심볼이 같은 판에 최소 여러 칸 등장합니다."><span>🍀 행운</span><strong>${luck.toFixed(2)} · ${effectText}</strong></div>`
    );
    return result;
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.updateStage120VersionUI();
    return result;
  };

  Game.init = function (...args) {
    this.resetStage120LuckState();
    const result = previousInit.apply(this, args);
    this.updateStage120VersionUI();
    this.updateStatsRail?.();
    this.stage = 10;
    this.status = "LUCK_PATTERN_PROTOTYPE_120";
    console.info(`DEADLINE ${GAME_DATA.version}: v1.2.0 luck pattern prototype loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    this.resetStage120LuckState();
    const result = previousRestartRun.apply(this, args);
    this.resetStage120LuckState();
    this.updateStage120VersionUI();
    this.updateStatsRail?.();
    this.stage = 10;
    return result;
  };
})();
