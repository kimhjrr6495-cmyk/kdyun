// DEADLINE — v1.0.0 Stage 10 final guards
"use strict";

(() => {
  const previousRenderStage100ContractCard = Game.renderStage100ContractCard;
  const previousGetStage90RetriggerCount = Game.getStage90RetriggerCount;
  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;

  const CATEGORY_LABELS = {
    ECONOMY: "경제",
    SYMBOL: "심볼",
    PATTERN: "패턴",
    SHOP: "상점",
    CHAIN: "연쇄",
    ROUND: "라운드"
  };

  Game.getStage100CategoryLabel = function (category) {
    return CATEGORY_LABELS[category] || category || "계약";
  };

  Game.renderStage100ContractCard = function (contract) {
    const html = previousRenderStage100ContractCard.call(this, contract);
    const raw = this.escapeStage100HTML?.(contract?.category) || contract?.category || "";
    const label = this.escapeStage100HTML?.(this.getStage100CategoryLabel(contract?.category)) || this.getStage100CategoryLabel(contract?.category);
    return html.replace(
      `<span class="stage100-contract-category">${raw}</span>`,
      `<span class="stage100-contract-category">${label}</span>`
    );
  };

  Game.getStage100CurrentRoundScoreFactor = function () {
    let factor = this.getStage100EffectMultiplier?.("SCORE_GLOBAL_MULT", 1) ?? 1;
    (this.getStage100Effects?.("ROUND_SCORE_MULT") || []).forEach((effect) => {
      if (Object.prototype.hasOwnProperty.call(effect.rounds || {}, this.round)) {
        factor *= Number(effect.rounds[this.round]);
      }
    });
    return Number.isFinite(factor) ? factor : 1;
  };

  Game.getStage90RetriggerCount = function (pattern, context = {}) {
    // 패턴 지급 자체가 0으로 봉인된 라운드에서 Math.max(1) 보정으로
    // 재발동이 $1을 만들어내는 예외를 막습니다.
    if (context.creditWallet && this.getStage100CurrentRoundScoreFactor() <= 0) return 0;
    return previousGetStage90RetriggerCount.call(this, pattern, context);
  };

  Game.init = function () {
    previousInit.call(this);
    this.stage = 10;
    this.updateAllUI?.();
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
