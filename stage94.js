// DEADLINE — v0.9.4 WILD / ERROR / Stage 9 마무리
"use strict";

(() => {
  GAME_DATA.version = "v0.9.4";
  GAME_DATA.stage = 9;

  const WILD_ID = GAME_DATA.stage94?.wildId || "WD";
  const ERROR_ID = GAME_DATA.stage94?.errorId || "ER";

  const BASE_WEIGHTS_94 = {
    CH: 21,
    CO: 21,
    BL: 17,
    ST: 13,
    DM: 9,
    CR: 7,
    SV: 5,
    WD: 3,
    ER: 4
  };

  const LUCK_FACTORS_94 = {
    CH: 0,
    CO: 0,
    BL: 0.15,
    ST: 0.35,
    DM: 0.65,
    CR: 0.9,
    SV: 1.2,
    WD: 0.22
  };

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousSpin = Game.spin;
  const previousCalculatePatternScore = Game.calculatePatternScore;
  const previousRenderDynamicReferenceTables = Game.renderDynamicReferenceTables;
  const previousGetSymbolEmoji = Game.getSymbolEmoji;
  const previousRollStage90ModifiersForSymbol = Game.rollStage90ModifiersForSymbol;
  const previousEvaluateAndRenderScore = Game.evaluateAndRenderScore;

  Game.resetStage94State = function () {
    this.stage94PreviousColumns = [];
    this.stage94PendingCash = 0;
    this.stage94ErrorEventCount = 0;
    this.stage94ErrorCellsSeen = 0;
  };

  Game.cloneStage94Columns = function (columns = this.currentColumns) {
    return (columns || []).map((column) =>
      (column || []).map((symbol) => ({
        ...symbol,
        modifiers: Array.isArray(symbol?.modifiers) ? [...symbol.modifiers] : undefined
      }))
    );
  };

  Game.getStage94NormalSymbols = function () {
    return (GAME_DATA.symbols || []).filter((symbol) => symbol.id !== WILD_ID && symbol.id !== ERROR_ID);
  };

  Game.getStage94SpecialSymbol = function (id) {
    return GAME_DATA.symbols.find((symbol) => symbol.id === id) || null;
  };

  Game.isStage94Wild = function (symbol) {
    return symbol?.id === WILD_ID;
  };

  Game.isStage94Error = function (symbol) {
    return symbol?.id === ERROR_ID;
  };

  Game.getSymbolEmoji = function (symbolId) {
    if (symbolId === WILD_ID) return "🃏";
    if (symbolId === ERROR_ID) return "⚠️";
    return previousGetSymbolEmoji?.call(this, symbolId) || "❔";
  };

  Game.getStage90SymbolWeightMap = function () {
    const luck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    const result = {};

    (GAME_DATA.symbols || []).forEach((symbol) => {
      const base = BASE_WEIGHTS_94[symbol.id] ?? 0.01;
      if (symbol.id === ERROR_ID) {
        result[symbol.id] = Math.max(0.15, base / (1 + luck * 0.75));
        return;
      }
      const factor = LUCK_FACTORS_94[symbol.id] || 0;
      result[symbol.id] = Math.max(0.01, base * (1 + luck * factor));
    });

    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect || {};
      if (effect.type === "wild_weight_add") {
        result[WILD_ID] = Math.max(0.01, (result[WILD_ID] || 0) + (Number(effect.amount) || 0));
      }
      if (Number(effect.errorWeightAdd) > 0) {
        result[ERROR_ID] = Math.max(0.01, (result[ERROR_ID] || 0) + Number(effect.errorWeightAdd));
      }
      if (effect.type === "special_weight_shift") {
        result[WILD_ID] = Math.max(0.01, (result[WILD_ID] || 0) + (Number(effect.wildAdd) || 0));
        result[ERROR_ID] = Math.max(0.01, (result[ERROR_ID] || 0) + (Number(effect.errorAdd) || 0));
      }
    });

    return result;
  };

  Game.rollStage90ModifiersForSymbol = function (symbol) {
    if (symbol?.id === ERROR_ID) return [];
    return previousRollStage90ModifiersForSymbol.call(this, symbol);
  };

  Game.applyStage94ReferenceSpecials = function () {
    this.forceStage91EmojiReference?.();

    const wildRow = this.symbolValueTable?.querySelector(`.symbol-reference-row[data-symbol="${WILD_ID}"]`);
    const errorRow = this.symbolValueTable?.querySelector(`.symbol-reference-row[data-symbol="${ERROR_ID}"]`);

    if (wildRow) {
      wildRow.classList.add("stage94-special-reference", "is-wild-reference");
      const value = wildRow.querySelector(".reference-current-value");
      if (value) value.textContent = "특수";
    }
    if (errorRow) {
      errorRow.classList.add("stage94-special-reference", "is-error-reference");
      const value = errorRow.querySelector(".reference-current-value");
      if (value) value.textContent = "ERROR";
    }

    const section = this.symbolValueTable?.closest(".reference-section");
    const helper = section?.querySelector(".reference-section-header small");
    if (helper) helper.textContent = "이모지 · 확률 · 가치";
  };

  Game.renderDynamicReferenceTables = function (...args) {
    const result = previousRenderDynamicReferenceTables.apply(this, args);
    this.applyStage94ReferenceSpecials();
    return result;
  };

  Game.resolveStage94Match = function (coords, { maxWild = Infinity } = {}) {
    if (!Array.isArray(coords) || !coords.length) return null;

    const cells = coords.map(([col, row]) => this.symbolAt(col, row));
    if (cells.some((symbol) => !symbol || this.isStage94Error(symbol))) return null;

    const wildCount = cells.filter((symbol) => this.isStage94Wild(symbol)).length;
    if (wildCount > maxWild) return null;

    const normalCells = cells.filter((symbol) => !this.isStage94Wild(symbol));
    if (!normalCells.length) return null;

    const targetId = normalCells[0].id;
    if (!normalCells.every((symbol) => symbol.id === targetId)) return null;

    const symbol = this.getStage94NormalSymbols().find((entry) => entry.id === targetId);
    if (!symbol) return null;

    return { symbol, wildCount };
  };

  Game.makeStage94Pattern = function (key, coords, match) {
    const pattern = this.makePattern(key, coords, match.symbol);
    return {
      ...pattern,
      usesWild: match.wildCount > 0,
      wildCount: match.wildCount
    };
  };

  Game.detectStage94HorizontalPatterns = function () {
    const found = [];
    const { columns, rows } = GAME_DATA.board;
    const normalSymbols = this.getStage94NormalSymbols();

    for (let row = 0; row < rows; row += 1) {
      const candidates = [];

      normalSymbols.forEach((target) => {
        let col = 0;
        while (col < columns) {
          const compatible = (cell) => cell && (cell.id === target.id || cell.id === WILD_ID);
          while (col < columns && !compatible(this.symbolAt(col, row))) col += 1;
          if (col >= columns) break;

          const start = col;
          let hasTarget = false;
          while (col < columns && compatible(this.symbolAt(col, row))) {
            if (this.symbolAt(col, row)?.id === target.id) hasTarget = true;
            col += 1;
          }

          const length = col - start;
          if (length < 3 || !hasTarget) continue;

          const coords = Array.from({ length }, (_, offset) => [start + offset, row]);
          const wildCount = coords.filter(([x, y]) => this.symbolAt(x, y)?.id === WILD_ID).length;
          candidates.push({ target, start, length, coords, wildCount });
        }
      });

      candidates.sort((a, b) =>
        b.length - a.length ||
        (Number(b.target.value) || 0) - (Number(a.target.value) || 0) ||
        a.start - b.start
      );

      const occupied = new Set();
      const chosen = [];
      candidates.forEach((candidate) => {
        const keys = candidate.coords.map(([col]) => `${col}:${row}`);
        if (keys.some((key) => occupied.has(key))) return;
        keys.forEach((key) => occupied.add(key));
        chosen.push(candidate);
      });

      chosen.sort((a, b) => a.start - b.start).forEach((candidate) => {
        const key = candidate.length >= 5 ? "H5" : candidate.length === 4 ? "H4" : "H3";
        found.push(this.makeStage94Pattern(key, candidate.coords, {
          symbol: candidate.target,
          wildCount: candidate.wildCount
        }));
      });
    }

    return found;
  };

  Game.detectPatterns = function () {
    const found = [...this.detectStage94HorizontalPatterns()];
    const { columns, rows } = GAME_DATA.board;

    for (let col = 0; col < columns; col += 1) {
      const coords = [[col, 0], [col, 1], [col, 2]];
      const match = this.resolveStage94Match(coords);
      if (match) found.push(this.makeStage94Pattern("V3", coords, match));
    }

    for (let startCol = 0; startCol <= columns - 3; startCol += 1) {
      const down = [[startCol, 0], [startCol + 1, 1], [startCol + 2, 2]];
      const up = [[startCol, 2], [startCol + 1, 1], [startCol + 2, 0]];
      const downMatch = this.resolveStage94Match(down);
      const upMatch = this.resolveStage94Match(up);
      if (downMatch) found.push(this.makeStage94Pattern("DIAG", down, downMatch));
      if (upMatch) found.push(this.makeStage94Pattern("DIAG", up, upMatch));
    }

    [
      { key: "V", coords: [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]] },
      { key: "INV_V", coords: [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]] },
      { key: "X", coords: [[0, 0], [4, 0], [2, 1], [0, 2], [4, 2]] }
    ].forEach(({ key, coords }) => {
      const match = this.resolveStage94Match(coords);
      if (match) found.push(this.makeStage94Pattern(key, coords, match));
    });

    const allCoords = [];
    for (let col = 0; col < columns; col += 1) {
      for (let row = 0; row < rows; row += 1) allCoords.push([col, row]);
    }
    const jackpot = this.resolveStage94Match(allCoords, {
      maxWild: GAME_DATA.stage94?.jackpotWildLimit ?? 1
    });
    if (jackpot) found.push(this.makeStage94Pattern("JACKPOT", allCoords, jackpot));

    const seen = new Set();
    return found.filter((pattern) => {
      const coordKey = pattern.coords.map(([col, row]) => `${col}:${row}`).join("|");
      const key = `${pattern.key}:${pattern.symbol.id}:${coordKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  Game.calculatePatternScore = function (pattern) {
    const result = previousCalculatePatternScore.call(this, pattern);
    if (!pattern?.usesWild) return result;

    let factor = 1;
    const itemEffects = [...(result.itemEffects || []), `WILD ${pattern.wildCount}칸 대체`];

    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect || {};
      if (effect.type === "wild_pattern_mult") {
        factor *= Number(effect.factor) || 1;
        itemEffects.push(`${item.name} ×${this.formatReferenceNumber?.(effect.factor) || effect.factor}`);
      }
      if (
        effect.type === "wild_high_value_mult" &&
        effect.symbolIds?.includes(pattern.symbol.id)
      ) {
        factor *= Number(effect.factor) || 1;
        itemEffects.push(`${item.name} ×${this.formatReferenceNumber?.(effect.factor) || effect.factor}`);
      }
    });

    if (factor === 1) return { ...result, itemEffects };
    return {
      ...result,
      raw: result.raw * factor,
      amount: Math.max(1, Math.round(result.amount * factor)),
      itemEffects
    };
  };

  Game.getStage94RandomNormalSymbol = function () {
    const normals = this.getStage94NormalSymbols();
    const weights = this.getStage90SymbolWeightMap();
    const total = normals.reduce((sum, symbol) => sum + Math.max(0, Number(weights[symbol.id]) || 0), 0) || 1;
    let cursor = Math.random() * total;
    let picked = normals[0];

    for (const symbol of normals) {
      cursor -= Math.max(0, Number(weights[symbol.id]) || 0);
      if (cursor <= 0) {
        picked = symbol;
        break;
      }
    }
    return picked ? { ...picked } : null;
  };

  Game.getStage94ErrorCells = function () {
    const cells = [];
    (this.currentColumns || []).forEach((column, col) => {
      (column || []).forEach((symbol, row) => {
        if (symbol?.id === ERROR_ID) cells.push([col, row]);
      });
    });
    return cells;
  };

  Game.replaceStage94Cell = function (col, row, symbol) {
    if (!symbol || !this.currentColumns?.[col]) return;
    this.currentColumns[col][row] = {
      ...symbol,
      modifiers: Array.isArray(symbol.modifiers) ? [...symbol.modifiers] : undefined
    };
  };

  Game.stage94ItemChance = function (item, chance) {
    const multiplier = this.getStage90ChanceMultiplier?.() || 1;
    const attempts = 1 + (this.getStage90ChanceExtraAttempts?.() || 0);
    const finalChance = Math.min(0.95, Math.max(0, (Number(chance) || 0) * multiplier));
    let success = false;

    for (let i = 0; i < attempts; i += 1) {
      if (Math.random() < finalChance) {
        success = true;
        break;
      }
    }

    if (success) {
      if (this.stage90Stats) this.stage90Stats.chanceProcs += 1;
      (this.getStage90ItemsByEffect?.("chance_growth") || []).forEach((cat) => {
        const step = Number(cat.effect?.step) || 0;
        cat.stage90Growth = Math.min(2, (Number(cat.stage90Growth) || 0) + step);
      });
    }

    return success;
  };

  Game.queueStage94ItemCard = function (item) {
    if (!item) return;
    this.queueStage93ActivationCard?.(item);
  };

  Game.processStage94Errors = async function ({ creditWallet = false } = {}) {
    this.stage94PendingCash = 0;
    if (!creditWallet) return;

    const initialErrors = this.getStage94ErrorCells();
    if (!initialErrors.length) return;
    this.stage94ErrorCellsSeen += initialErrors.length;

    this.getStage90ItemsByEffect?.("error_bank").forEach((item) => {
      const amount = Math.max(0, Number(item.effect?.amount) || 0) * initialErrors.length;
      item.stage90StoredCash = Math.max(0, Number(item.stage90StoredCash) || 0) + amount;
      if (amount > 0) this.queueStage94ItemCard(item);
    });

    const debuggers = this.getStage90ItemsByEffect?.("error_convert_first") || [];
    let convertBudget = Math.min(
      GAME_DATA.stage94?.maxErrorConversionsPerSpin ?? 8,
      debuggers.reduce((sum, item) => sum + Math.max(0, Number(item.effect?.count) || 1), 0)
    );
    if (convertBudget > 0) {
      for (const [col, row] of this.getStage94ErrorCells()) {
        if (convertBudget <= 0) break;
        this.replaceStage94Cell(col, row, this.getStage94RandomNormalSymbol());
        convertBudget -= 1;
      }
      debuggers.forEach((item) => this.queueStage94ItemCard(item));
    }

    const backupItems = this.getStage90ItemsByEffect?.("error_restore_chance") || [];
    for (const item of backupItems) {
      let activated = false;
      for (const [col, row] of this.getStage94ErrorCells()) {
        const previous = this.stage94PreviousColumns?.[col]?.[row];
        if (!previous || [WILD_ID, ERROR_ID].includes(previous.id)) continue;
        if (!this.stage94ItemChance(item, item.effect?.chance)) continue;
        this.replaceStage94Cell(col, row, previous);
        activated = true;
      }
      if (activated) this.queueStage94ItemCard(item);
    }

    const unstableItems = this.getStage90ItemsByEffect?.("error_to_wild_chance") || [];
    const wildSymbol = this.getStage94SpecialSymbol(WILD_ID);
    for (const item of unstableItems) {
      let activated = false;
      for (const [col, row] of this.getStage94ErrorCells()) {
        if (!this.stage94ItemChance(item, item.effect?.chance)) continue;
        this.replaceStage94Cell(col, row, wildSymbol);
        activated = true;
      }
      if (activated) this.queueStage94ItemCard(item);
    }

    let errors = this.getStage94ErrorCells();
    if (errors.length < 2) {
      this.renderReels?.();
      return;
    }

    this.stage94ErrorEventCount += 1;
    this.showStage90Event?.("error", "⚠️ ERROR EVENT", `${errors.length}개 감지`);

    // ERROR EVENT 기반 추가 지급은 커널 패닉이 있어도 먼저 확정합니다.
    (this.getStage90ItemsByEffect?.("error_event_cash") || []).forEach((item) => {
      const bonus = Math.max(0, Number(item.effect?.amountPerError) || 0) * errors.length;
      if (bonus > 0) {
        this.stage94PendingCash += bonus;
        this.queueStage94ItemCard(item);
      }
    });

    const kernel = (this.getStage90ItemsByEffect?.("error_event_all_to_wild") || [])[0];
    if (kernel && wildSymbol) {
      errors.forEach(([col, row]) => this.replaceStage94Cell(col, row, wildSymbol));
      this.queueStage94ItemCard(kernel);
      this.renderReels?.();
      return;
    }

    const routers = this.getStage90ItemsByEffect?.("error_swap") || [];
    if (routers.length && errors.length) {
      const [errorCol, errorRow] = errors[Math.floor(Math.random() * errors.length)];
      const candidates = [];
      (this.currentColumns || []).forEach((column, col) => {
        (column || []).forEach((symbol, row) => {
          if (col === errorCol && row === errorRow) return;
          if (symbol?.id === ERROR_ID) return;
          candidates.push([col, row]);
        });
      });
      if (candidates.length) {
        const [targetCol, targetRow] = candidates[Math.floor(Math.random() * candidates.length)];
        const temp = this.currentColumns[targetCol][targetRow];
        this.currentColumns[targetCol][targetRow] = this.currentColumns[errorCol][errorRow];
        this.currentColumns[errorCol][errorRow] = temp;
        routers.forEach((item) => this.queueStage94ItemCard(item));
      }
    }

    errors = this.getStage94ErrorCells();

    const roll = Math.random();
    if (roll < 0.5 && errors.length) {
      const [col, row] = errors[Math.floor(Math.random() * errors.length)];
      this.replaceStage94Cell(col, row, this.getStage94RandomNormalSymbol());
      this.showStage90Event?.("error", "ERROR 복구", "오류 1칸 정상화");
    } else if (roll < 0.8) {
      const bonus = Math.max(1, errors.length * 4);
      this.stage94PendingCash += bonus;
      this.showStage90Event?.("cash", "ERROR 보상", `+$${bonus}`);
    } else {
      this.tickets += 1;
      this.showStage90Event?.("ticket", "ERROR 티켓", "+1T");
    }

    this.renderReels?.();
    await this.wait?.(70);
  };

  Game.spin = async function (...args) {
    const actualSpin = Boolean(
      this.roundStarted && this.currentMode && this.spinsRemaining > 0 &&
      !this.isSpinning && !this.isResolvingRound && !this.gameOver && !this.runComplete &&
      !this.shopOpen && !this.flowOverlay?.classList.contains("is-open")
    );
    if (actualSpin) this.stage94PreviousColumns = this.cloneStage94Columns();
    return previousSpin.apply(this, args);
  };

  Game.evaluateAndRenderScore = async function (options = {}) {
    const creditWallet = Boolean(options.creditWallet);
    await this.processStage94Errors({ creditWallet });

    const baseTotal = await previousEvaluateAndRenderScore.call(this, options);
    if (!creditWallet) return baseTotal;

    let collectorRelease = 0;
    if (baseTotal > 0) {
      (this.getStage90ItemsByEffect?.("error_bank") || []).forEach((item) => {
        collectorRelease += Math.max(0, Number(item.stage90StoredCash) || 0);
        item.stage90StoredCash = 0;
      });
    }

    const extra = Math.max(0, Math.round((this.stage94PendingCash || 0) + collectorRelease));
    this.stage94PendingCash = 0;
    if (extra <= 0) {
      this.updateAllUI?.();
      return baseTotal;
    }

    this.wallet += extra;
    if (this.runStats) {
      if (baseTotal <= 0) this.runStats.winningRerolls += 1;
      this.runStats.totalEarned += extra;
      this.runStats.bestPayout = Math.max(this.runStats.bestPayout, baseTotal + extra);
    }

    this.updateEconomyUI?.(false);
    this.payoutValue.textContent = `+ $ ${(baseTotal + extra).toLocaleString("ko-KR")}`;
    this.scoreBreakdown?.insertAdjacentHTML("beforeend", `
      <div class="trigger-score-summary stage94-score-summary">
        <span>${collectorRelease > 0 ? "ERROR 저장금 / 이벤트" : "ERROR EVENT"}</span>
        <strong>+$${extra.toLocaleString("ko-KR")}</strong>
      </div>
    `);
    this.readoutDetail.textContent = `${this.readoutDetail.textContent} · ERROR +$${extra.toLocaleString("ko-KR")}`;
    this.updateAllUI?.();
    return baseTotal + extra;
  };

  Game.init = function () {
    this.resetStage94State();
    previousInit.call(this);
    this.applyStage94ReferenceSpecials();
    this.stage = 9;
    this.status = "WILD_ERROR_STAGE9_COMPLETE";
    this.stageStatus.textContent = this.roundPreparation
      ? "9단계 · 라운드 준비"
      : "9단계 · WILD / ERROR";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.4 WILD / ERROR systems loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage94State();
    const result = previousRestartRun.apply(this, args);
    this.resetStage94State();
    this.applyStage94ReferenceSpecials();
    return result;
  };
})();
