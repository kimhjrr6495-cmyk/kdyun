// DEADLINE — v0.7.3 실시간 심볼 가치 / 패턴 배수 / 등장확률 표시
"use strict";

(() => {
  Game.stage = 7;
  Game.status = "DYNAMIC_REFERENCE_VALUES";

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;

  const PATTERN_SHORT_LABELS_73 = {
    H3: "가로 3",
    H4: "가로 4",
    H5: "가로 5",
    V3: "세로 3",
    DIAG: "대각선",
    V: "V",
    INV_V: "역 V",
    X: "X",
    JACKPOT: "잭팟"
  };

  const PATTERN_ORDER_73 = ["H3", "H4", "H5", "V3", "DIAG", "V", "INV_V", "X", "JACKPOT"];

  Game.formatReferenceNumber = function (value, maxDigits = 2) {
    if (!Number.isFinite(value)) return "0";
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(maxDigits)).toString();
  };

  Game.formatModifierExpression = function (factor = 1, add = 0) {
    const parts = [];
    if (Math.abs(factor - 1) > 0.0001) {
      parts.push(`×${this.formatReferenceNumber(factor)}`);
    }
    if (Math.abs(add) > 0.0001) {
      const sign = add > 0 ? "+" : "−";
      parts.push(`${sign}${this.formatReferenceNumber(Math.abs(add))}`);
    }
    return parts.length ? `(${parts.join(" ")})` : "";
  };

  // 현재 randomSymbol()은 7종 균등 추첨입니다. 따라서 실제 표시 확률도 균등 확률을 사용합니다.
  Game.getCurrentSymbolProbability = function () {
    const count = Math.max(1, GAME_DATA.symbols.length);
    return 100 / count;
  };

  Game.getSymbolValueState = function (symbolId) {
    const symbol = GAME_DATA.symbols.find((entry) => entry.id === symbolId);
    if (!symbol) return null;

    let factor = 1;
    let add = 0;

    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect;
      if (!effect || effect.symbolId !== symbolId) return;

      if (effect.type === "symbol_value_mult") {
        factor *= Number(effect.factor) || 1;
      }
      if (effect.type === "symbol_value") {
        add += Number(effect.amount) || 0;
      }
    });

    const current = (symbol.value * factor) + add;
    const ratio = symbol.value > 0 ? current / symbol.value : 1;

    return {
      symbol,
      base: symbol.value,
      factor,
      add,
      current,
      ratio,
      changed: Math.abs(current - symbol.value) > 0.0001,
      modifierText: this.formatModifierExpression(factor, add)
    };
  };

  Game.getPatternValueState = function (key) {
    const pattern = GAME_DATA.patterns[key];
    if (!pattern) return null;

    let factor = 1;
    let add = 0;

    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect;
      if (!effect || !effect.keys?.includes(key)) return;

      if (effect.type === "pattern_mult") {
        factor *= Number(effect.factor) || 1;
      }
      if (effect.type === "pattern_add") {
        add += Number(effect.amount) || 0;
      }
    });

    const current = (pattern.baseValue * factor) + add;
    const ratio = pattern.baseValue > 0 ? current / pattern.baseValue : 1;

    return {
      key,
      pattern,
      base: pattern.baseValue,
      factor,
      add,
      current,
      ratio,
      changed: Math.abs(current - pattern.baseValue) > 0.0001,
      modifierText: this.formatModifierExpression(factor, add)
    };
  };

  Game.getValueTierClass = function (ratio, changed) {
    if (!changed) return "value-tier-0";
    if (ratio < 1) return "value-tier-down";
    if (ratio >= 2.5) return "value-tier-4";
    if (ratio >= 1.75) return "value-tier-3";
    if (ratio >= 1.35) return "value-tier-2";
    return "value-tier-1";
  };

  Game.renderDynamicReferenceTables = function () {
    if (this.symbolValueTable) {
      const chance = this.getCurrentSymbolProbability();
      const chanceText = `${chance.toFixed(1)}%`;

      this.symbolValueTable.innerHTML = GAME_DATA.symbols.map((symbol) => {
        const state = this.getSymbolValueState(symbol.id);
        const tierClass = this.getValueTierClass(state.ratio, state.changed);
        const modifier = state.modifierText
          ? `<small class="reference-modifier">${state.modifierText}</small>`
          : "";

        return `
          <div class="reference-row symbol-reference-row ${tierClass}" data-symbol="${symbol.id}">
            <span class="reference-symbol-dot" aria-hidden="true"></span>
            <span class="reference-probability">${chanceText}</span>
            <span class="reference-name">${symbol.name}</span>
            <strong class="reference-current-value">$${this.formatReferenceNumber(state.current)} ${modifier}</strong>
          </div>
        `;
      }).join("");
    }

    if (this.patternValueTable) {
      this.patternValueTable.innerHTML = PATTERN_ORDER_73.map((key) => {
        const state = this.getPatternValueState(key);
        const tierClass = this.getValueTierClass(state.ratio, state.changed);
        const modifier = state.modifierText
          ? `<small class="reference-modifier">${state.modifierText}</small>`
          : "";

        return `
          <div class="reference-row pattern-reference-row ${tierClass}">
            <span>${PATTERN_SHORT_LABELS_73[key]}</span>
            <strong class="reference-current-value">×${this.formatReferenceNumber(state.current)} ${modifier}</strong>
          </div>
        `;
      }).join("");
    }
  };

  Game.renderReferenceRail = function () {
    this.renderDynamicReferenceTables();
    this.updateStatsRail?.();
  };

  // 표와 실제 계산이 같은 보정 순서를 사용하도록 통일합니다.
  // 현재 아이템 수치는 기존 Stage 7과 동일하게 계산되며,
  // 추후 symbol_value_mult / pattern_add 아이템도 즉시 실제 점수에 반영됩니다.
  Game.calculatePatternScore = function (pattern) {
    let symbolValueFactor = 1;
    let symbolValueAdd = 0;
    let patternValueFactor = 1;
    let patternValueAdd = 0;

    const symbolMultiplier = pattern.symbol.multiplier ?? 1;
    const count = pattern.coords.length;
    let patternMultiplier = GAME_DATA.scoring.patternMultiplier;
    let globalMultiplier = GAME_DATA.scoring.globalMultiplier;
    const itemEffects = [];

    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect;
      if (!effect) return;

      if (effect.type === "symbol_value" && effect.symbolId === pattern.symbol.id) {
        symbolValueAdd += Number(effect.amount) || 0;
        itemEffects.push(`${item.name} +${this.formatReferenceNumber(effect.amount)} VALUE`);
        return;
      }

      if (effect.type === "symbol_value_mult" && effect.symbolId === pattern.symbol.id) {
        symbolValueFactor *= Number(effect.factor) || 1;
        itemEffects.push(`${item.name} ×${this.formatReferenceNumber(effect.factor)} VALUE`);
        return;
      }

      if (effect.type === "pattern_mult" && effect.keys?.includes(pattern.key)) {
        patternValueFactor *= Number(effect.factor) || 1;
        itemEffects.push(`${item.name} ×${this.formatReferenceNumber(effect.factor)}`);
        return;
      }

      if (effect.type === "pattern_add" && effect.keys?.includes(pattern.key)) {
        patternValueAdd += Number(effect.amount) || 0;
        itemEffects.push(`${item.name} +${this.formatReferenceNumber(effect.amount)} PATTERN`);
        return;
      }

      if (effect.type === "global_mult") {
        globalMultiplier *= Number(effect.factor) || 1;
        itemEffects.push(`${item.name} ×${this.formatReferenceNumber(effect.factor)}`);
        return;
      }

      if (
        effect.type === "conditional_mult" &&
        this.itemConditionMatches(effect.condition)
      ) {
        globalMultiplier *= Number(effect.factor) || 1;
        itemEffects.push(`${item.name} ×${this.formatReferenceNumber(effect.factor)}`);
      }
    });

    const base = (pattern.symbol.value * symbolValueFactor) + symbolValueAdd;
    const patternBaseValue = (pattern.baseValue * patternValueFactor) + patternValueAdd;

    const raw =
      base *
      symbolMultiplier *
      count *
      patternBaseValue *
      patternMultiplier *
      globalMultiplier;
    const amount = Math.round(raw);

    return {
      ...pattern,
      base,
      symbolMultiplier,
      count,
      patternBaseValue,
      patternMultiplier,
      globalMultiplier,
      raw,
      amount,
      itemEffects
    };
  };

  Game.init = function () {
    previousInit.call(this);
    this.stage = 7;
    this.status = "DYNAMIC_REFERENCE_VALUES";
    this.renderDynamicReferenceTables();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.7.3 dynamic reference values loaded.`);
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    this.renderDynamicReferenceTables();
  };
})();
