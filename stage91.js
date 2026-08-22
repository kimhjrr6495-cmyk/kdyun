// DEADLINE — v0.9.1 중복 제거 / 심볼표 이모지 고정 / 아이템 발동 알림 / 릴 템포 조정
"use strict";

(() => {
  GAME_DATA.version = "v0.9.1";
  GAME_DATA.stage = 9;

  // v0.9.1: 손맛은 유지하고 전체 회전 체감만 약간 빠르게 조정합니다.
  GAME_DATA.reelMotion.baseDuration = 1400;
  GAME_DATA.reelMotion.stopGap = 145;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousIsStage90ItemBlockedFromShop = Game.isStage90ItemBlockedFromShop;
  const previousBuyShopOffer = Game.buyShopOffer;
  const previousRenderDynamicReferenceTables = Game.renderDynamicReferenceTables;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousPrepareStage90SpinEffects = Game.prepareStage90SpinEffects;
  const previousRollStage90Chance = Game.rollStage90Chance;
  const previousSpin = Game.spin;

  const PRE_SPIN_ALERT_EFFECTS = new Set([
    "chance_spin_luck",
    "chance_spin_mult"
  ]);

  Game.resetStage91State = function () {
    this.stage91PreSpinBusy = false;
    this.stage91SkipPrepareOnce = false;
    this.stage91CapturePreSpin = false;
    this.stage91CapturedItems = [];
  };

  // 같은 아이템을 동시에 여러 개 보유하지 못하게 합니다.
  // 상점 생성 단계에서 이미 보유 중인 아이템은 후보 풀에서 제외됩니다.
  Game.isStage90ItemBlockedFromShop = function (item) {
    if (previousIsStage90ItemBlockedFromShop?.call(this, item)) return true;
    return Boolean((this.ownedItems || []).some((owned) => owned.id === item?.id));
  };

  // 이미 열린 상점 카드가 남아 있는 상황까지 방어합니다.
  Game.buyShopOffer = function (index) {
    const offer = this.shopOffers?.[index];
    if (
      offer &&
      !this.isStage90InstantItem?.(offer) &&
      (this.ownedItems || []).some((owned) => owned.id === offer.id)
    ) {
      this.readoutDetail.textContent = `${offer.name}은 이미 보유 중입니다.`;
      this.renderShop?.();
      return;
    }
    return previousBuyShopOffer.call(this, index);
  };

  Game.forceStage91EmojiReference = function () {
    if (!this.symbolValueTable) return;
    this.symbolValueTable
      .querySelectorAll(".symbol-reference-row[data-symbol]")
      .forEach((row) => {
        const id = row.dataset.symbol;
        const symbol = GAME_DATA.symbols.find((entry) => entry.id === id);
        const name = row.querySelector(".reference-name");
        if (!symbol || !name) return;
        name.textContent = this.getSymbolEmoji?.(id) || symbol.code;
        name.classList.add("reference-symbol-emoji");
        name.setAttribute("aria-label", symbol.name);
        name.title = symbol.name;
      });
  };

  Game.renderDynamicReferenceTables = function (...args) {
    const result = previousRenderDynamicReferenceTables.apply(this, args);
    this.forceStage91EmojiReference();
    return result;
  };

  Game.ensureStage91ItemAlert = function () {
    const shell = this.reelsEl?.closest(".reels-shell");
    if (!shell) return null;

    let alert = shell.querySelector("#stage91ItemAlert");
    if (alert) return alert;

    alert = document.createElement("div");
    alert.id = "stage91ItemAlert";
    alert.className = "stage91-item-alert";
    alert.hidden = true;
    alert.setAttribute("aria-live", "polite");
    alert.innerHTML = `
      <span class="stage91-item-alert-icon" aria-hidden="true">◆</span>
      <span class="stage91-item-alert-copy">
        <small>아이템 발동</small>
        <strong>아이템</strong>
      </span>
    `;
    shell.appendChild(alert);
    return alert;
  };

  Game.playStage91ItemAlert = async function (item) {
    const alert = this.ensureStage91ItemAlert();
    if (!alert || !item) return;

    const rarity = String(item.rarity || "COMMON").toLowerCase();
    alert.className = `stage91-item-alert rarity-${rarity}`;
    alert.querySelector(".stage91-item-alert-icon").textContent = item.icon || "◆";
    alert.querySelector("strong").textContent = item.name || "아이템";
    alert.hidden = false;
    void alert.offsetWidth;
    alert.classList.add("is-open");

    await this.wait?.(300);
    alert.classList.remove("is-open");
    await this.wait?.(75);
    alert.hidden = true;
  };

  // 확률 판정이 성공하면, 리롤 전에 보여줘야 하는 아이템만 수집합니다.
  Game.rollStage90Chance = function (item, baseChance = null) {
    const success = previousRollStage90Chance.call(this, item, baseChance);
    if (
      success &&
      this.stage91CapturePreSpin &&
      PRE_SPIN_ALERT_EFFECTS.has(item?.effect?.type) &&
      !this.stage91CapturedItems.some((entry) => entry.instanceId === item.instanceId)
    ) {
      this.stage91CapturedItems.push(item);
    }
    return success;
  };

  Game.prepareStage90SpinEffects = function () {
    if (this.stage91SkipPrepareOnce) {
      this.stage91SkipPrepareOnce = false;
      return;
    }

    this.stage91CapturedItems = [];
    this.stage91CapturePreSpin = true;
    try {
      return previousPrepareStage90SpinEffects.call(this);
    } finally {
      this.stage91CapturePreSpin = false;
    }
  };

  // Stage 9의 기존 스핀 전 처리와 릴 회전 사이에 짧은 아이템 발동 알림을 삽입합니다.
  Game.spin = async function (...args) {
    const actualSpin = Boolean(
      this.roundStarted &&
      this.currentMode &&
      this.spinsRemaining > 0 &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      !this.gameOver &&
      !this.runComplete &&
      !this.shopOpen &&
      !this.flowOverlay?.classList.contains("is-open")
    );

    if (!actualSpin || this.stage91PreSpinBusy) {
      return previousSpin.apply(this, args);
    }

    this.stage91PreSpinBusy = true;
    try {
      this.clearStage90Feed?.();
      this.prepareStage90SpinEffects();
      this.renderDynamicReferenceTables?.();

      const alerts = [...this.stage91CapturedItems];
      if (alerts.length) {
        if (this.spinButton) {
          this.spinButton.disabled = true;
          this.spinButton.textContent = "아이템 발동";
        }
        for (const item of alerts.slice(0, 3)) {
          await this.playStage91ItemAlert(item);
        }
      }

      // stage90의 spin()이 동일한 사전 효과를 다시 굴리지 않도록 한 번만 건너뜁니다.
      this.stage91SkipPrepareOnce = true;
      return await previousSpin.apply(this, args);
    } finally {
      this.stage91PreSpinBusy = false;
      this.forceStage91EmojiReference();
    }
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    this.forceStage91EmojiReference();
  };

  Game.init = function () {
    this.resetStage91State();
    previousInit.call(this);
    this.ensureStage91ItemAlert();
    this.forceStage91EmojiReference();
    this.stage = 9;
    this.status = "UNIQUE_ITEMS_EMOJI_LOCK_PROC_ALERTS";
    this.stageStatus.textContent = this.roundPreparation
      ? "9단계 · 라운드 준비"
      : "9단계 · 아이템 시스템";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.1 unique items / emoji lock / proc alerts loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage91State();
    const result = previousRestartRun.apply(this, args);
    this.resetStage91State();
    this.ensureStage91ItemAlert();
    this.forceStage91EmojiReference();
    return result;
  };
})();
