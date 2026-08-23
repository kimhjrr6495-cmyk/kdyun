// DEADLINE — v1.3.5 high-tier pattern frequency rebalance
"use strict";
(() => {
  const V = "v1.3.5";
  const prev = {
    init: Game.init,
    restart: Game.restartRun,
    update: Game.updateAllUI,
    stats: Game.updateStatsRail,
    buildLuckBoard: Game.buildStage120LuckBoard
  };

  const SHAPES = {
    V: [[0,0],[1,1],[2,2],[3,1],[4,0]],
    INV_V: [[0,2],[1,1],[2,0],[3,1],[4,2]],
    X: [[0,0],[4,0],[2,1],[0,2],[4,2]]
  };

  Game.s135PatternRates = function (luckValue = null) {
    const luck = Math.min(10, Math.max(0, Number(luckValue ?? this.stage90ActiveLuck) || 0));
    return {
      luck,
      jackpot: 0.03 + luck * 0.003,
      x: 0.05 + luck * 0.005,
      v: 0.14 + luck * 0.01,
      h5: 0.15 + luck * 0.01
    };
  };

  Game.s135PickPatternSymbol = function () {
    const weights = this.getStage90SymbolWeightMap?.() || {};
    let normals = (GAME_DATA.symbols || []).filter((symbol) =>
      symbol && !["WD", "ER"].includes(symbol.id) && (Number(weights[symbol.id]) || 0) > 0.00001
    );
    if (!normals.length) {
      normals = (GAME_DATA.symbols || []).filter((symbol) => symbol && !["WD", "ER"].includes(symbol.id));
    }
    if (!normals.length) return null;

    const total = normals.reduce((sum, symbol) => sum + Math.max(0, Number(weights[symbol.id]) || 0), 0);
    if (total <= 0) return normals[Math.floor(Math.random() * normals.length)] || null;

    let cursor = Math.random() * total;
    for (const symbol of normals) {
      cursor -= Math.max(0, Number(weights[symbol.id]) || 0);
      if (cursor <= 0) return symbol;
    }
    return normals.at(-1) || null;
  };

  Game.s135MakeForcedSymbol = function (target, patternKey) {
    if (!target) return null;
    let symbol;
    if (typeof this.makeStage120ForcedSymbol === "function") {
      symbol = this.makeStage120ForcedSymbol(target);
    } else {
      symbol = { ...target };
      delete symbol.modifiers;
      const mods = this.rollStage90ModifiersForSymbol?.(symbol) || [];
      if (mods.length) symbol.modifiers = [...mods];
    }
    if (symbol) symbol.stage135ForcedPattern = patternKey;
    return symbol;
  };

  Game.s135ForcePattern = function (columns, key) {
    if (!Array.isArray(columns) || columns.length < 5) return columns;
    const target = this.s135PickPatternSymbol();
    if (!target) return columns;

    let coords = [];
    if (key === "JACKPOT") {
      for (let col = 0; col < 5; col += 1) {
        for (let row = 0; row < 3; row += 1) coords.push([col, row]);
      }
    } else if (key === "X") {
      coords = SHAPES.X;
    } else if (key === "V" || key === "INV_V") {
      coords = SHAPES[key];
    } else if (key === "H5") {
      const row = Math.floor(Math.random() * 3);
      coords = Array.from({ length: 5 }, (_, col) => [col, row]);
    }

    for (const [col, row] of coords) {
      if (!columns[col] || row < 0 || row >= columns[col].length) continue;
      const forced = this.s135MakeForcedSymbol(target, key);
      if (forced) columns[col][row] = forced;
    }

    this.stage135LastForcedPattern = key;
    this.stage135LastForcedSymbolId = target.id;
    return columns;
  };

  Game.buildStage120LuckBoard = function (luckValue) {
    const rawLuck = Math.max(0, Number(luckValue) || 0);
    const legacyLuck = Math.min(10, rawLuck);
    const columns = prev.buildLuckBoard
      ? prev.buildLuckBoard.call(this, legacyLuck)
      : Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => this.randomSymbol()));

    const rates = this.s135PatternRates(rawLuck);
    this.stage135LastRates = { ...rates };
    this.stage135LastForcedPattern = null;
    this.stage135LastForcedSymbolId = null;

    // One exclusive priority roll keeps the requested per-ROLL forced rates exact.
    // Natural board matches can still add a very small amount on top.
    const roll = Math.random();
    let cursor = rates.jackpot;
    if (roll < cursor) return this.s135ForcePattern(columns, "JACKPOT");
    cursor += rates.x;
    if (roll < cursor) return this.s135ForcePattern(columns, "X");
    cursor += rates.v;
    if (roll < cursor) return this.s135ForcePattern(columns, Math.random() < 0.5 ? "V" : "INV_V");
    cursor += rates.h5;
    if (roll < cursor) return this.s135ForcePattern(columns, "H5");
    return columns;
  };

  Game.s135VersionUI = function () {
    GAME_DATA.version = V;
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = `CONTROLLED MARKET SYSTEM · VERSION ${V}`;
    const chip = document.querySelector(".top-status .status-chip strong");
    if (chip) chip.textContent = V;
  };

  Game.updateStatsRail = function (...args) {
    const result = prev.stats?.apply(this, args);
    const grid = this.runStatsGrid || document.querySelector("#runStatsGrid");
    if (!grid) return result;
    grid.querySelector(".stage135-pattern-rate-stat")?.remove();

    const lastLuck = Number(this.stage120LastLuck);
    const persistent = Number(this.getStage120PersistentLuck?.()) || 0;
    const active = Number(this.stage90ActiveLuck) || 0;
    const luck = Number.isFinite(lastLuck) && lastLuck > 0 ? lastLuck : Math.max(active, persistent);
    const r = this.s135PatternRates(luck);
    const pct = (v) => `${(v * 100).toFixed(1)}%`;
    const forced = this.stage135LastForcedPattern ? ` · 최근 ${this.stage135LastForcedPattern}` : "";
    grid.insertAdjacentHTML(
      "beforeend",
      `<div class="stat-reference-row stage135-pattern-rate-stat" title="고급 패턴 강제 완성 판정. 자연 생성 패턴은 별도로 추가될 수 있습니다."><span>🎰 고급 패턴</span><strong>J ${pct(r.jackpot)} · X ${pct(r.x)} · V ${pct(r.v)} · H5 ${pct(r.h5)}${forced}</strong></div>`
    );
    return result;
  };

  Game.updateAllUI = function (...args) {
    const result = prev.update.apply(this, args);
    this.s135VersionUI();
    return result;
  };

  Game.init = function (...args) {
    this.stage135LastRates = null;
    this.stage135LastForcedPattern = null;
    this.stage135LastForcedSymbolId = null;
    const result = prev.init.apply(this, args);
    this.s135VersionUI();
    this.updateStatsRail?.();
    console.info("DEADLINE v1.3.5: high-tier pattern frequency rebalance loaded.");
    return result;
  };

  Game.restartRun = function (...args) {
    this.stage135LastRates = null;
    this.stage135LastForcedPattern = null;
    this.stage135LastForcedSymbolId = null;
    const result = prev.restart.apply(this, args);
    this.s135VersionUI();
    this.updateStatsRail?.();
    return result;
  };

  Game.s135VersionUI();
})();
