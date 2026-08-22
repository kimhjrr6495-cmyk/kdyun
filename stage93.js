// DEADLINE — v0.9.3 심볼 희귀도 / 참조표 정리 / 우측 슬라이드 발동 카드
"use strict";

(() => {
  GAME_DATA.version = "v0.9.3";
  GAME_DATA.stage = 9;

  // 기본 가치가 높은 심볼일수록 희귀하게 설정합니다.
  // 합계 100이라 Luck 0 상태에서는 그대로 퍼센트로 읽을 수 있습니다.
  const BASE_SYMBOL_WEIGHTS_93 = {
    CH: 22,
    CO: 22,
    BL: 18,
    ST: 14,
    DM: 10,
    CR: 8,
    SV: 6
  };

  // Stage 9의 Luck 방향은 유지합니다. Luck이 높을수록 고가 심볼이 더 크게 보정됩니다.
  const SYMBOL_LUCK_FACTORS_93 = {
    CH: 0,
    CO: 0,
    BL: 0.15,
    ST: 0.35,
    DM: 0.65,
    CR: 0.9,
    SV: 1.2
  };

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousRenderDynamicReferenceTables = Game.renderDynamicReferenceTables;

  Game.resetStage93ActivationState = function () {
    this.stage93ActivationQueue = [];
    this.stage93ActivationBusy = false;
    this.stage93ActivationToken = (this.stage93ActivationToken || 0) + 1;
  };

  Game.getStage90SymbolWeightMap = function () {
    const luck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    const result = {};

    (GAME_DATA.symbols || []).forEach((symbol) => {
      const baseWeight = BASE_SYMBOL_WEIGHTS_93[symbol.id] || 1;
      const luckFactor = SYMBOL_LUCK_FACTORS_93[symbol.id] || 0;
      result[symbol.id] = Math.max(0.01, baseWeight * (1 + luck * luckFactor));
    });

    return result;
  };

  Game.applyStage93ReferencePolish = function () {
    this.forceStage91EmojiReference?.();

    const section = this.symbolValueTable?.closest(".reference-section");
    const helper = section?.querySelector(".reference-section-header small");
    if (helper) helper.textContent = "이모지 · 확률 · 가격";
  };

  Game.renderDynamicReferenceTables = function (...args) {
    const result = previousRenderDynamicReferenceTables.apply(this, args);
    this.applyStage93ReferencePolish();
    return result;
  };

  Game.ensureStage91ItemAlert = function () {
    const host = this.machinePanel || document.querySelector("#machinePanel");
    if (!host) return null;

    let card = document.querySelector("#stage91ItemAlert");
    if (!card) {
      card = document.createElement("div");
      card.id = "stage91ItemAlert";
      card.setAttribute("aria-live", "polite");
    }

    card.className = "stage91-item-alert stage93-activation-card";
    card.hidden = true;
    card.innerHTML = `
      <div class="stage93-activation-mark" aria-hidden="true">◆</div>
      <div class="stage93-activation-copy">
        <div class="stage93-activation-meta">
          <span class="stage93-activation-label">아이템 발동</span>
          <span class="stage93-activation-rarity">COMMON</span>
        </div>
        <strong class="stage93-activation-name">아이템</strong>
        <small class="stage93-activation-effect">효과 적용</small>
      </div>
    `;

    if (card.parentElement !== host) host.appendChild(card);
    this.stage91ItemAlert = card;
    return card;
  };

  Game.getStage93RarityLabel = function (item) {
    const rarity = String(item?.rarity || "COMMON").toUpperCase();
    return GAME_DATA.rarities?.[rarity]?.name || rarity;
  };

  Game.queueStage93ActivationCard = function (item) {
    if (!item) return;
    if (!Array.isArray(this.stage93ActivationQueue)) this.stage93ActivationQueue = [];
    this.stage93ActivationQueue.push(item);
    void this.runStage93ActivationQueue();
  };

  Game.runStage93ActivationQueue = async function () {
    if (this.stage93ActivationBusy) return;
    this.stage93ActivationBusy = true;
    const token = this.stage93ActivationToken;

    try {
      while (this.stage93ActivationQueue.length && token === this.stage93ActivationToken) {
        const item = this.stage93ActivationQueue.shift();
        const card = this.ensureStage91ItemAlert();
        if (!card || !item) continue;

        const rarity = String(item.rarity || "COMMON").toLowerCase();
        const rarityLabel = this.getStage93RarityLabel(item);
        const effectText = this.getItemDisplayNote?.(item) || item.note || "효과 적용";

        card.className = `stage91-item-alert stage93-activation-card rarity-${rarity}`;
        card.querySelector(".stage93-activation-mark").textContent = item.icon || "◆";
        card.querySelector(".stage93-activation-rarity").textContent = rarityLabel;
        card.querySelector(".stage93-activation-name").textContent = item.name || "아이템";
        card.querySelector(".stage93-activation-effect").textContent = effectText;
        card.hidden = false;

        card.classList.remove("is-open", "is-exiting");
        void card.offsetWidth;
        requestAnimationFrame(() => card.classList.add("is-open"));

        // 카드 자체는 충분히 읽히게 유지하지만 스핀은 이보다 먼저 시작할 수 있습니다.
        await this.wait?.(1050);
        if (token !== this.stage93ActivationToken) break;

        card.classList.remove("is-open");
        card.classList.add("is-exiting");
        await this.wait?.(190);
        card.hidden = true;
        card.classList.remove("is-exiting");
        await this.wait?.(55);
      }
    } finally {
      this.stage93ActivationBusy = false;
    }
  };

  // stage91의 스핀 로직은 이 함수를 await합니다.
  // 카드는 별도 큐에서 오래 보여주고 여기서는 0.22초만 기다려 리롤 템포를 유지합니다.
  Game.playStage91ItemAlert = async function (item) {
    this.queueStage93ActivationCard(item);
    await this.wait?.(220);
  };

  Game.init = function () {
    this.resetStage93ActivationState();
    previousInit.call(this);
    this.ensureStage91ItemAlert();
    this.applyStage93ReferencePolish();
    this.stage = 9;
    this.status = "WEIGHTED_SYMBOLS_SLIDE_ACTIVATION_REFERENCE_POLISH";
    this.stageStatus.textContent = this.roundPreparation
      ? "9단계 · 라운드 준비"
      : "9단계 · 아이템 시스템";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.3 weighted symbols / slide activation cards loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage93ActivationState();
    const result = previousRestartRun.apply(this, args);
    this.resetStage93ActivationState();
    this.ensureStage91ItemAlert();
    this.applyStage93ReferencePolish();
    return result;
  };
})();
