// DEADLINE — v0.9.0 대형 아이템 / 등급 / 확률 / Modifier / 재발동 시스템
"use strict";

(() => {
  GAME_DATA.version = "v0.9.0";
  GAME_DATA.stage = 9;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousAnimateReel = Game.animateReel;
  const previousCalculatePatternScore = Game.calculatePatternScore;
  const previousGetSymbolValueState = Game.getSymbolValueState;
  const previousGetPatternValueState = Game.getPatternValueState;
  const previousRenderDynamicReferenceTables = Game.renderDynamicReferenceTables;
  const previousBeginPreparedRound = Game.beginPreparedRound;
  const previousSpin = Game.spin;
  const previousGetShopRerollCost = Game.getShopRerollCost;
  const previousOpenItemSellPopover = Game.openItemSellPopover;
  const previousSellOwnedItem = Game.sellOwnedItem;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousUpdateStatsRail = Game.updateStatsRail;
  const previousGetTriggerBonusAmount = Game.getTriggerBonusAmount;

  const SYMBOL_LUCK_FACTORS = {
    CH: 0,
    CO: 0,
    BL: 0.15,
    ST: 0.35,
    DM: 0.65,
    CR: 0.9,
    SV: 1.2
  };

  const RARITY_WEIGHT_TABLE = [
    { maxDeadline: 2, weights: { COMMON: 78, RARE: 20, EPIC: 2, LEGENDARY: 0 } },
    { maxDeadline: 4, weights: { COMMON: 62, RARE: 30, EPIC: 7, LEGENDARY: 1 } },
    { maxDeadline: 6, weights: { COMMON: 48, RARE: 36, EPIC: 13, LEGENDARY: 3 } },
    { maxDeadline: 8, weights: { COMMON: 38, RARE: 38, EPIC: 18, LEGENDARY: 6 } },
    { maxDeadline: 10, weights: { COMMON: 30, RARE: 40, EPIC: 22, LEGENDARY: 8 } }
  ];

  Game.resetStage90RunState = function () {
    this.inventoryCapacityBonus = 0;
    this.shopRerollSurcharge = 0;
    this.stage90RunFlags = new Set();
    this.stage90PendingRemovalIds = new Set();
    this.symbolGrowth = {};
    this.patternGrowth = {};
    this.stage90MissStreak = 0;
    this.stage90RoundFirstWinPending = true;
    this.stage90RoundRetriggerCount = 0;
    this.stage90SpinPayoutMultiplier = 1;
    this.stage90ActiveLuck = 0;
    this.stage90GlobalFactor = 1;
    this.stage90GeneratingTravel = false;
    this.stage90CurrentSpinOrdinal = 0;
    this.stage90AdaptiveSymbolId = null;
    this.stage90AdaptiveSymbolStreak = 0;
    this.stage90ModifierTicketCount = 0;
    this.stage90Stats = {
      chanceProcs: 0,
      retriggers: 0,
      modifierProcs: 0
    };
  };

  Game.ensureStage90ItemState = function (item) {
    if (!item) return item;
    const effect = item.effect || {};
    if (Number.isFinite(effect.charges) && !Number.isFinite(item.stage90ChargesRemaining)) {
      item.stage90ChargesRemaining = effect.charges;
    }
    if (!Number.isFinite(item.stage90StoredCash)) item.stage90StoredCash = 0;
    if (!Number.isFinite(item.stage90Growth)) item.stage90Growth = 0;
    if (!Number.isFinite(item.stage90ChanceBonus)) item.stage90ChanceBonus = 0;
    return item;
  };

  Game.getStage90ItemsByEffect = function (type) {
    return (this.ownedItems || [])
      .filter((item) => item.effect?.type === type)
      .map((item) => this.ensureStage90ItemState(item));
  };

  Game.getMaxOwnedItems = function () {
    const base = GAME_DATA.shop.baseMaxOwnedItems || GAME_DATA.shop.maxOwnedItems || 6;
    const cap = GAME_DATA.shop.maxExpandedItems || 12;
    return Math.min(cap, base + (this.inventoryCapacityBonus || 0));
  };

  Game.getItemDisplayNote = function (item) {
    if (!item) return "";
    this.ensureStage90ItemState(item);
    const effect = item.effect || {};
    const extras = [];

    if (Number.isFinite(effect.charges) && Number.isFinite(item.stage90ChargesRemaining)) {
      extras.push(`남은 발동 ${item.stage90ChargesRemaining}`);
    }
    if (effect.type === "spin_bank" || effect.type === "miss_bank") {
      extras.push(`저장 $${Math.max(0, item.stage90StoredCash || 0).toLocaleString("ko-KR")}`);
    }
    if (effect.type === "chance_growth" && item.stage90Growth > 0) {
      extras.push(`현재 +${Math.round(item.stage90Growth * 100)}%`);
    }
    if (
      effect.type === "pattern_retrigger_chance" &&
      Number.isFinite(item.stage90ChanceBonus) &&
      item.stage90ChanceBonus > 0
    ) {
      extras.push(`현재 ${Math.round((effect.chance + item.stage90ChanceBonus) * 100)}%`);
    }

    return extras.length ? `${item.note} · ${extras.join(" · ")}` : item.note;
  };

  Game.ensureStage90UI = function () {
    if (!this.scoreBreakdown) return;
    if (this.stage90Feed) return;

    const feed = document.createElement("div");
    feed.id = "stage90Feed";
    feed.className = "stage90-feed";
    feed.hidden = true;
    feed.setAttribute("aria-live", "polite");

    const anchor = this.triggerFeed || this.scoreBreakdown;
    anchor.insertAdjacentElement("beforebegin", feed);
    this.stage90Feed = feed;
  };

  Game.clearStage90Feed = function () {
    this.ensureStage90UI();
    if (!this.stage90Feed) return;
    this.stage90Feed.innerHTML = "";
    this.stage90Feed.hidden = true;
  };

  Game.showStage90Event = function (kind, title, detail = "") {
    this.ensureStage90UI();
    if (!this.stage90Feed) return;
    this.stage90Feed.hidden = false;

    const chip = document.createElement("div");
    chip.className = `stage90-event stage90-event-${kind}`;
    chip.innerHTML = `<strong>${title}</strong>${detail ? `<small>${detail}</small>` : ""}`;
    this.stage90Feed.appendChild(chip);

    while (this.stage90Feed.children.length > 4) {
      this.stage90Feed.firstElementChild?.remove();
    }
  };

  Game.getStage90ChanceMultiplier = function () {
    return this.getStage90ItemsByEffect("chance_multiplier")
      .reduce((factor, item) => factor * (Number(item.effect?.factor) || 1), 1);
  };

  Game.getStage90ChanceExtraAttempts = function () {
    return this.getStage90ItemsByEffect("chance_extra_roll")
      .reduce((sum, item) => sum + Math.max(0, Number(item.effect?.attempts) || 0), 0);
  };

  Game.registerStage90ChanceProc = function (sourceItem) {
    if (this.stage90Stats) this.stage90Stats.chanceProcs += 1;

    this.getStage90ItemsByEffect("chance_growth").forEach((cat) => {
      const step = Number(cat.effect?.step) || 0;
      cat.stage90Growth = Math.min(2, (cat.stage90Growth || 0) + step);
    });

    if (sourceItem?.name) {
      this.showStage90Event("chance", "확률 발동", sourceItem.name);
    }
  };

  Game.rollStage90Chance = function (item, baseChance = null) {
    if (!item) return false;
    this.ensureStage90ItemState(item);
    const effect = item.effect || {};
    if (Number.isFinite(effect.charges) && item.stage90ChargesRemaining <= 0) return false;
    const rawChance = Number.isFinite(baseChance) ? baseChance : (Number(effect.chance) || 0);
    const chance = Math.min(
      0.95,
      Math.max(0, (rawChance + (item.stage90ChanceBonus || 0)) * this.getStage90ChanceMultiplier())
    );
    const attempts = 1 + this.getStage90ChanceExtraAttempts();

    let success = false;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (Math.random() < chance) {
        success = true;
        break;
      }
    }

    if (success) {
      if (effect.resetOnSuccess) {
        item.stage90ChanceBonus = 0;
      } else if (Number(effect.growthOnSuccess) > 0) {
        item.stage90ChanceBonus = Math.min(0.75, item.stage90ChanceBonus + Number(effect.growthOnSuccess));
      }
      this.registerStage90ChanceProc(item);
    } else if (Number(effect.failGrowth) > 0) {
      item.stage90ChanceBonus = Math.min(0.75, item.stage90ChanceBonus + Number(effect.failGrowth));
    }

    return success;
  };

  Game.spendStage90Charge = function (item) {
    if (!item || !Number.isFinite(item.effect?.charges)) return;
    this.ensureStage90ItemState(item);
    item.stage90ChargesRemaining = Math.max(0, item.stage90ChargesRemaining - 1);
    if (item.stage90ChargesRemaining <= 0 && item.instanceId) {
      this.stage90PendingRemovalIds.add(item.instanceId);
    }
  };

  Game.flushStage90Removals = function () {
    if (!this.stage90PendingRemovalIds?.size) return;
    const names = [];
    this.ownedItems = (this.ownedItems || []).filter((item) => {
      if (!this.stage90PendingRemovalIds.has(item.instanceId)) return true;
      names.push(item.name);
      return false;
    });
    this.stage90PendingRemovalIds.clear();
    if (names.length) {
      this.showStage90Event("consume", "소모 완료", names.join(" · "));
    }
  };

  Game.getStage90SymbolWeightMap = function () {
    const luck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    const result = {};
    (GAME_DATA.symbols || []).forEach((symbol) => {
      result[symbol.id] = Math.max(0.05, 1 + luck * (SYMBOL_LUCK_FACTORS[symbol.id] || 0));
    });
    return result;
  };

  Game.getStage90SymbolProbabilityMap = function () {
    const weights = this.getStage90SymbolWeightMap();
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;
    return Object.fromEntries(
      Object.entries(weights).map(([key, value]) => [key, (value / total) * 100])
    );
  };

  Game.getStage90ModifierLimit = function () {
    const maxItem = this.getStage90ItemsByEffect("modifier_slots")
      .reduce((max, item) => Math.max(max, Number(item.effect?.max) || 1), 1);
    return Math.max(1, Math.min(2, maxItem));
  };

  Game.rollStage90ModifiersForSymbol = function (symbol) {
    if (this.stage90GeneratingTravel) return [];
    const successes = [];

    this.getStage90ItemsByEffect("modifier_generator").forEach((item) => {
      const effect = item.effect || {};
      if (effect.symbolIds?.length && !effect.symbolIds.includes(symbol.id)) return;
      if (this.rollStage90Chance(item, Number(effect.chance) || 0)) {
        if (effect.modifier && !successes.includes(effect.modifier)) successes.push(effect.modifier);
      }
    });

    for (let i = successes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [successes[i], successes[j]] = [successes[j], successes[i]];
    }

    return successes.slice(0, this.getStage90ModifierLimit());
  };

  Game.randomSymbol = function () {
    const symbols = GAME_DATA.symbols || [];
    const weights = this.getStage90SymbolWeightMap();
    const total = symbols.reduce((sum, symbol) => sum + (weights[symbol.id] || 1), 0) || 1;
    let cursor = Math.random() * total;
    let picked = symbols[0];

    for (const symbol of symbols) {
      cursor -= weights[symbol.id] || 1;
      if (cursor <= 0) {
        picked = symbol;
        break;
      }
    }

    if (!picked) return null;
    const clone = { ...picked };
    const modifiers = this.rollStage90ModifiersForSymbol(clone);
    if (modifiers.length) clone.modifiers = modifiers;
    return clone;
  };

  Game.symbolHTML = function (symbol, col = null, row = null) {
    const coordinateAttrs =
      Number.isInteger(col) && Number.isInteger(row)
        ? ` data-col="${col}" data-row="${row}"`
        : "";
    const emoji = this.getSymbolEmoji?.(symbol.id) || symbol.code || "?";
    const modifiers = Array.isArray(symbol.modifiers) ? [...new Set(symbol.modifiers)] : [];
    const modifierNames = modifiers.map((key) => GAME_DATA.modifiers?.[key]?.name).filter(Boolean);
    const label = modifierNames.length ? `${symbol.name} · ${modifierNames.join(" · ")}` : symbol.name;
    const badges = modifiers.map((key) => {
      const modifier = GAME_DATA.modifiers?.[key];
      if (!modifier) return "";
      return `<span class="symbol-modifier-badge modifier-${key.toLowerCase()}" title="${modifier.name}">${modifier.icon}</span>`;
    }).join("");

    return `
      <div class="reel-symbol" data-symbol="${symbol.id}"${coordinateAttrs} aria-label="${label}">
        <b class="symbol-emoji" aria-hidden="true">${emoji}</b>
        ${badges ? `<span class="symbol-modifier-stack" aria-hidden="true">${badges}</span>` : ""}
      </div>
    `;
  };

  Game.animateReel = function (...args) {
    this.stage90GeneratingTravel = true;
    try {
      return previousAnimateReel.apply(this, args);
    } finally {
      this.stage90GeneratingTravel = false;
    }
  };

  Game.getSymbolValueState = function (symbolId) {
    const state = previousGetSymbolValueState.call(this, symbolId);
    if (!state) return state;
    const growth = Number(this.symbolGrowth?.[symbolId]) || 0;
    if (!growth) return state;
    const current = state.current + growth;
    return {
      ...state,
      current,
      ratio: state.base > 0 ? current / state.base : 1,
      changed: true,
      modifierText: `${state.modifierText || ""}${state.modifierText ? " " : ""}(성장 +${this.formatReferenceNumber(growth)})`
    };
  };

  Game.getPatternValueState = function (key) {
    const state = previousGetPatternValueState.call(this, key);
    if (!state) return state;
    const growth = Number(this.patternGrowth?.[key]) || 0;
    if (!growth) return state;
    const current = state.current + growth;
    return {
      ...state,
      current,
      ratio: state.base > 0 ? current / state.base : 1,
      changed: true,
      modifierText: `${state.modifierText || ""}${state.modifierText ? " " : ""}(연쇄 +${this.formatReferenceNumber(growth)})`
    };
  };

  Game.renderDynamicReferenceTables = function () {
    previousRenderDynamicReferenceTables.call(this);
    const probabilities = this.getStage90SymbolProbabilityMap();
    this.symbolValueTable?.querySelectorAll(".symbol-reference-row[data-symbol]").forEach((row) => {
      const value = probabilities[row.dataset.symbol];
      const probabilityEl = row.querySelector(".reference-probability");
      if (probabilityEl && Number.isFinite(value)) probabilityEl.textContent = `${value.toFixed(1)}%`;
    });
  };

  Game.calculatePatternScore = function (pattern) {
    const result = previousCalculatePatternScore.call(this, pattern);
    const symbolGrowth = Number(this.symbolGrowth?.[pattern.symbol.id]) || 0;
    const patternGrowth = Number(this.patternGrowth?.[pattern.key]) || 0;
    const base = result.base + symbolGrowth;
    const patternBaseValue = result.patternBaseValue + patternGrowth;
    const globalMultiplier = result.globalMultiplier * (Number(this.stage90GlobalFactor) || 1);
    const raw = base * result.symbolMultiplier * result.count * patternBaseValue * result.patternMultiplier * globalMultiplier;
    const amount = Math.round(raw);
    const itemEffects = [...(result.itemEffects || [])];

    if (symbolGrowth > 0) itemEffects.push(`심볼 성장 +${this.formatReferenceNumber(symbolGrowth)}`);
    if (patternGrowth > 0) itemEffects.push(`연쇄 성장 +${this.formatReferenceNumber(patternGrowth)}`);
    if ((Number(this.stage90GlobalFactor) || 1) !== 1) itemEffects.push(`특수 효과 ×${this.formatReferenceNumber(this.stage90GlobalFactor)}`);

    return { ...result, base, patternBaseValue, globalMultiplier, raw, amount, itemEffects };
  };

  Game.getStage90RarityWeights = function () {
    const deadline = Math.max(1, this.deadlineNumber || 1);
    return (RARITY_WEIGHT_TABLE.find((entry) => deadline <= entry.maxDeadline) || RARITY_WEIGHT_TABLE.at(-1)).weights;
  };

  Game.rollStage90Rarity = function (weights) {
    const entries = Object.entries(weights || {});
    const total = entries.reduce((sum, [, value]) => sum + Math.max(0, value), 0) || 1;
    let cursor = Math.random() * total;
    for (const [rarity, value] of entries) {
      cursor -= Math.max(0, value);
      if (cursor <= 0) return rarity;
    }
    return "COMMON";
  };

  Game.isStage90InstantItem = function (item) {
    return Boolean(item?.consumableOnPurchase || item?.effect?.type === "inventory_capacity");
  };

  Game.isStage90ItemBlockedFromShop = function (item) {
    if (!item) return true;
    if (item.unique && (this.ownedItems || []).some((owned) => owned.id === item.id)) return true;
    if (item.unique && this.stage90RunFlags?.has(item.id)) return true;
    return false;
  };

  Game.generateShopOffers = function () {
    const weights = this.getStage90RarityWeights();
    const selected = [];
    const target = GAME_DATA.shop.offerCount || 6;

    while (selected.length < target) {
      const available = (GAME_DATA.items || []).filter((item) =>
        !selected.some((entry) => entry.id === item.id) && !this.isStage90ItemBlockedFromShop(item)
      );
      if (!available.length) break;

      const rarity = this.rollStage90Rarity(weights);
      let candidates = available.filter((item) => item.rarity === rarity);
      if (!candidates.length) candidates = available;
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      selected.push({ ...picked, sold: false });
    }

    this.shopOffers = selected;
  };

  Game.getShopRerollCost = function () {
    const base = previousGetShopRerollCost.call(this);
    const pointCards = this.getStage90ItemsByEffect("shop_reroll_free_every");
    const free = pointCards.some((item) => {
      const every = Math.max(1, Number(item.effect?.every) || 3);
      return this.shopRerollCount > 0 && this.shopRerollCount % every === 0;
    });
    if (free) return 0;
    return Math.max(0, base + (this.shopRerollSurcharge || 0));
  };

  Game.renderShop = function () {
    if (!this.shopOpen) return;
    const maxOwned = this.getMaxOwnedItems();
    const isFull = this.ownedItems.length >= maxOwned;
    const rerollCost = this.getShopRerollCost();

    this.flowText.innerHTML = `
      <span class="shop-ticket-balance">T ${this.tickets}</span>
      <span class="shop-owned-count">보유 ${this.ownedItems.length} / ${maxOwned} · 제안 ${this.shopOffers.length}개</span>
    `;

    const offerHTML = this.shopOffers.map((offer, index) => {
      const instant = this.isStage90InstantItem(offer);
      const cannotBuy = offer.sold || (!instant && isFull) || this.tickets < offer.price;
      const stateText = offer.sold ? "구매 완료" : (!instant && isFull) ? "보유 한도" : `T ${offer.price}`;
      const rarity = offer.rarity || "COMMON";
      const rarityLabel = GAME_DATA.rarities?.[rarity]?.label || rarity;
      return `
        <button class="shop-offer-card rarity-${rarity.toLowerCase()} ${offer.sold ? "is-sold" : ""}"
          data-shop-action="buy" data-offer-index="${index}" ${cannotBuy ? "disabled" : ""}>
          <span class="shop-rarity-badge">${rarityLabel}</span>
          <span class="shop-item-mark" aria-hidden="true">${offer.icon || "◆"}</span>
          <strong>${offer.name}</strong>
          <small>${offer.note}</small>
          <b>${stateText}</b>
        </button>
      `;
    }).join("");

    const ownedHTML = Array.from({ length: maxOwned }, (_, index) => {
      const item = this.ownedItems[index];
      if (!item) return `<div class="shop-owned-card is-empty"><span>빈 슬롯</span></div>`;
      const sellValue = this.getItemSellValue(item);
      const rarity = item.rarity || "COMMON";
      return `
        <button class="shop-owned-card rarity-${rarity.toLowerCase()}" data-shop-owned-item="${item.instanceId}" type="button">
          <span class="shop-owned-mark" aria-hidden="true">${item.icon || "◆"}</span>
          <div><strong>${item.name}</strong><small>${this.getItemDisplayNote(item)}</small></div>
          <b>판매 T ${sellValue}</b>
        </button>
      `;
    }).join("");

    this.flowOptions.innerHTML = `
      <section class="shop-main-section">
        <div class="shop-section-heading shop-main-heading">
          <div><span>아이템 제안 · ${this.shopOffers.length}개</span><small>3 × 2 · 등급별 등장 확률 적용</small></div>
          <button class="shop-reroll-compact" data-shop-action="reroll" ${this.tickets < rerollCost ? "disabled" : ""}>
            ↻ 새로고침 · ${rerollCost === 0 ? "무료" : `T ${rerollCost}`}
          </button>
        </div>
        <div class="shop-offer-grid">${offerHTML}</div>
      </section>
      <section class="shop-owned-panel">
        <div class="shop-section-heading">
          <div><span>보유 아이템</span><small>기본 6칸 · 확장 최대 ${GAME_DATA.shop.maxExpandedItems || 12}칸</small></div>
          <strong>${this.ownedItems.length} / ${maxOwned}</strong>
        </div>
        <div class="shop-owned-large-grid">${ownedHTML}</div>
      </section>
    `;
  };

  Game.buyShopOffer = function (index) {
    const offer = this.shopOffers[index];
    if (!offer || offer.sold) return;
    const instant = this.isStage90InstantItem(offer);
    const maxOwned = this.getMaxOwnedItems();
    if (!instant && this.ownedItems.length >= maxOwned) return;
    if (this.tickets < offer.price) return;

    this.tickets -= offer.price;
    offer.sold = true;
    if (instant) {
      const effect = offer.effect || {};
      this.inventoryCapacityBonus = Math.min(
        (GAME_DATA.shop.maxExpandedItems || 12) - (GAME_DATA.shop.baseMaxOwnedItems || 6),
        (this.inventoryCapacityBonus || 0) + Math.max(0, Number(effect.amount) || 0)
      );
      this.shopRerollSurcharge += Math.max(0, Number(effect.rerollSurcharge) || 0);
      this.stage90RunFlags.add(offer.id);
      this.readoutDetail.textContent = `${offer.name} 적용 · 보유 한도 ${this.getMaxOwnedItems()}칸`;
      this.showStage90Event("inventory", "보유 공간 확장", `${this.getMaxOwnedItems()}칸`);
    } else {
      this.itemInstanceSeed += 1;
      const instance = { ...offer, sold: undefined, instanceId: `item-${this.itemInstanceSeed}` };
      this.ensureStage90ItemState(instance);
      this.ownedItems.push(instance);
      this.readoutDetail.textContent = `${offer.name} 구매 · 티켓 -${offer.price}`;
    }
    this.renderShop();
    this.updateAllUI();
  };

  Game.openItemSellPopover = function (instanceId) {
    previousOpenItemSellPopover.call(this, instanceId);
    const item = (this.ownedItems || []).find((entry) => entry.instanceId === instanceId);
    if (!item || !this.itemSellPopover || this.itemSellPopover.hidden) return;
    this.itemSellEffect.textContent = this.getItemDisplayNote(item);
  };

  Game.sellOwnedItem = function (instanceId) {
    const item = (this.ownedItems || []).find((entry) => entry.instanceId === instanceId);
    const storedCash = item?.effect?.type === "spin_bank" ? Math.max(0, Number(item.stage90StoredCash) || 0) : 0;
    previousSellOwnedItem.call(this, instanceId);
    if (storedCash > 0) {
      this.wallet += storedCash;
      this.updateEconomyUI?.(false);
      this.readoutDetail.textContent = `${item.name} 판매 · 저장금 $${storedCash.toLocaleString("ko-KR")} 회수`;
      this.showStage90Event("cash", "저금통 회수", `+$${storedCash.toLocaleString("ko-KR")}`);
    }
  };

  Game.renderOwnedItemsDrawer = function () {
    if (!this.drawerItemCount || !this.drawerEmptySlots) return;
    const maxOwned = this.getMaxOwnedItems();
    this.drawerItemCount.textContent = `보유 아이템 ${this.ownedItems.length} / ${maxOwned}`;
    this.drawerEmptySlots.innerHTML = Array.from({ length: maxOwned }, (_, index) => {
      const item = this.ownedItems[index];
      return item
        ? `<div class="owned-drawer-item"><strong>${item.icon || "◆"} ${item.name}</strong><small>${this.getItemDisplayNote(item)}</small></div>`
        : "<div>비어 있음</div>";
    }).join("");
  };

  Game.prepareStage90SpinEffects = function () {
    this.stage90ActiveLuck = 0;
    this.stage90SpinPayoutMultiplier = 1;
    this.stage90ModifierTicketCount = 0;
    (this.ownedItems || []).slice().forEach((item) => {
      this.ensureStage90ItemState(item);
      const effect = item.effect || {};
      if (effect.type === "chance_spin_luck" && this.rollStage90Chance(item)) {
        this.stage90ActiveLuck += Number(effect.luck) || 0;
        this.spendStage90Charge(item);
        this.showStage90Event("luck", "LUCK 상승", item.name);
      }
      if (effect.type === "chance_spin_mult" && this.rollStage90Chance(item)) {
        this.stage90SpinPayoutMultiplier *= Number(effect.factor) || 1;
        this.spendStage90Charge(item);
        this.showStage90Event("boost", "이번 리롤 증폭", `${item.name} ×${effect.factor}`);
      }
    });
  };

  Game.beginPreparedRound = function (...args) {
    const wasStarted = Boolean(this.roundStarted);
    const result = previousBeginPreparedRound.apply(this, args);
    if (!wasStarted && this.roundStarted) {
      this.stage90RoundFirstWinPending = true;
      this.stage90RoundRetriggerCount = 0;
      let ticketBonus = 0;
      this.getStage90ItemsByEffect("round_start_ticket_chance").forEach((item) => {
        if (this.rollStage90Chance(item)) ticketBonus += Math.max(0, Number(item.effect?.amount) || 0);
      });
      if (ticketBonus > 0) {
        this.tickets += ticketBonus;
        this.showStage90Event("ticket", "라운드 시작 보너스", `티켓 +${ticketBonus}`);
        this.updateAllUI();
      }
    }
    return result;
  };

  Game.spin = async function (...args) {
    const actualSpin = Boolean(
      this.roundStarted && this.currentMode && this.spinsRemaining > 0 && !this.isSpinning &&
      !this.isResolvingRound && !this.gameOver && !this.runComplete && !this.shopOpen &&
      !this.flowOverlay?.classList.contains("is-open")
    );
    if (!actualSpin) return previousSpin.apply(this, args);
    this.clearStage90Feed();
    this.prepareStage90SpinEffects();
    this.renderDynamicReferenceTables?.();
    try {
      return await previousSpin.apply(this, args);
    } finally {
      this.stage90ActiveLuck = 0;
      this.stage90SpinPayoutMultiplier = 1;
      this.flushStage90Removals();
      this.renderDynamicReferenceTables?.();
      this.updateAllUI();
    }
  };

  Game.getStage90GlobalFactor = function (originalPatternCount, creditWallet) {
    let factor = Number(this.stage90SpinPayoutMultiplier) || 1;
    if (!creditWallet) return factor;
    if (this.stage90RoundFirstWinPending) {
      this.getStage90ItemsByEffect("first_win_mult").forEach((item) => { factor *= Number(item.effect?.factor) || 1; });
    }
    this.getStage90ItemsByEffect("miss_streak_mult").forEach((item) => {
      const threshold = Math.max(1, Number(item.effect?.threshold) || 2);
      if (this.stage90MissStreak >= threshold) factor *= Number(item.effect?.factor) || 1;
    });
    this.getStage90ItemsByEffect("exact_pattern_mult").forEach((item) => {
      if (originalPatternCount === (Number(item.effect?.count) || 1)) factor *= Number(item.effect?.factor) || 1;
    });
    this.getStage90ItemsByEffect("chance_growth").forEach((item) => { factor *= 1 + Math.max(0, Number(item.stage90Growth) || 0); });
    return factor;
  };

  Game.applyStage90PatternRamp = function (sequence) {
    const ramps = this.getStage90ItemsByEffect("pattern_ramp");
    if (!ramps.length) return sequence;
    sequence.forEach((pattern, index) => {
      let factor = 1;
      ramps.forEach((item) => {
        const startAt = Math.max(1, Number(item.effect?.startAt) || 3);
        if (index + 1 < startAt) return;
        const steps = index - (startAt - 1) + 1;
        factor *= 1 + Math.max(0, Number(item.effect?.step) || 0) * steps;
      });
      if (factor === 1) return;
      pattern.raw *= factor;
      pattern.amount = Math.max(0, Math.round(pattern.amount * factor));
      pattern.itemEffects = [...(pattern.itemEffects || []), `증식 버섯 ×${this.formatReferenceNumber(factor)}`];
    });
    return sequence;
  };

  Game.applyStage90JackpotConsumables = function (sequence) {
    const amps = this.getStage90ItemsByEffect("next_jackpot_mult");
    if (!amps.length || !sequence.some((pattern) => pattern.key === "JACKPOT")) return;
    sequence.forEach((pattern) => {
      if (pattern.key !== "JACKPOT") return;
      let factor = 1;
      amps.forEach((item) => {
        factor *= Number(item.effect?.factor) || 1;
        if (item.instanceId) this.stage90PendingRemovalIds.add(item.instanceId);
      });
      pattern.raw *= factor;
      pattern.amount = Math.round(pattern.amount * factor);
      pattern.itemEffects = [...(pattern.itemEffects || []), `일회용 증폭 ×${this.formatReferenceNumber(factor)}`];
    });
  };

  Game.getStage90CellModifiers = function (col, row) {
    const symbol = this.currentColumns?.[col]?.[row];
    return Array.isArray(symbol?.modifiers) ? symbol.modifiers : [];
  };

  Game.processStage90PatternModifiers = function (pattern, resolved, creditWallet) {
    if (!creditWallet) return { repeatCount: 0, ticketGain: 0 };
    let repeatCount = 0;
    let ticketGain = 0;
    const forgeFactor = this.getStage90ItemsByEffect("chain_growth_mult")
      .reduce((factor, item) => factor * (Number(item.effect?.factor) || 1), 1);

    pattern.coords.forEach(([col, row]) => {
      const cellKey = `${col}:${row}`;
      this.getStage90CellModifiers(col, row).forEach((modifier) => {
        if (modifier === "GOLDEN" && !resolved.golden.has(cellKey)) {
          resolved.golden.add(cellKey);
          const baseSymbol = GAME_DATA.symbols.find((entry) => entry.id === pattern.symbol.id);
          const growth = Math.max(1, Math.round((baseSymbol?.value || pattern.symbol.value || 1) * 0.5));
          this.symbolGrowth[pattern.symbol.id] = (this.symbolGrowth[pattern.symbol.id] || 0) + growth;
          this.stage90Stats.modifierProcs += 1;
          this.showStage90Event("golden", "✨ 황금", `${pattern.symbol.name} 가치 +${growth}`);
        }
        if (modifier === "TICKET" && !resolved.ticket.has(cellKey)) {
          resolved.ticket.add(cellKey);
          if (this.stage90ModifierTicketCount < 2) {
            this.stage90ModifierTicketCount += 1;
            this.tickets += 1;
            ticketGain += 1;
            this.stage90Stats.modifierProcs += 1;
            this.showStage90Event("ticket", "🎟️ 티켓", "+1T");
          }
        }
        if (modifier === "CHAIN") {
          const chainKey = `${cellKey}:${pattern.key}`;
          if (!resolved.chain.has(chainKey)) {
            resolved.chain.add(chainKey);
            const growth = 0.25 * forgeFactor;
            this.patternGrowth[pattern.key] = (this.patternGrowth[pattern.key] || 0) + growth;
            this.stage90Stats.modifierProcs += 1;
            this.showStage90Event("chain", "⛓️ 연쇄 성장", `${pattern.name} +${this.formatReferenceNumber(growth)}`);
          }
        }
        if (modifier === "REPEAT") {
          const repeatKey = `${cellKey}:${pattern.key}`;
          if (!resolved.repeat.has(repeatKey)) {
            resolved.repeat.add(repeatKey);
            repeatCount += 1;
            this.stage90Stats.modifierProcs += 1;
          }
        }
      });
    });
    return { repeatCount: Math.min(2, repeatCount), ticketGain };
  };

  Game.getStage90RetriggerCount = function (pattern, context) {
    if (!context.creditWallet) return context.modifierRepeats || 0;
    let count = Math.max(0, context.modifierRepeats || 0);
    this.getStage90ItemsByEffect("retrigger_every").forEach((item) => {
      const every = Math.max(1, Number(item.effect?.every) || 7);
      if (context.spinOrdinal > 0 && context.spinOrdinal % every === 0) count += 1;
    });
    if (context.isHighest) {
      this.getStage90ItemsByEffect("retrigger_highest").forEach((item) => { count += Math.max(0, Number(item.effect?.count) || 1); });
    }
    (this.ownedItems || []).slice().forEach((item) => {
      if (item.effect?.type !== "pattern_retrigger_chance") return;
      this.ensureStage90ItemState(item);
      if (!this.rollStage90Chance(item)) return;
      count += 1;
      this.spendStage90Charge(item);
    });
    return Math.min(6, count);
  };

  Game.getStage90RetriggerMultiplier = function () {
    return this.getStage90ItemsByEffect("retrigger_mult")
      .reduce((factor, item) => factor * (Number(item.effect?.factor) || 1), 1);
  };

  Game.getStage90PerpetualMultiplier = function () {
    let factor = 1;
    this.getStage90ItemsByEffect("retrigger_round_ramp").forEach((item) => {
      factor *= 1 + Math.max(0, Number(item.effect?.step) || 0) * this.stage90RoundRetriggerCount;
    });
    return factor;
  };

  Game.getTriggerBonusAmount = function (item, event, context) {
    let amount = previousGetTriggerBonusAmount.call(this, item, event, context);
    if (amount <= 0) return amount;
    this.getStage90ItemsByEffect("trigger_chain_scale").forEach((circuit) => {
      const step = Math.max(0, Number(circuit.effect?.step) || 0);
      amount *= 1 + step * Math.max(0, context.triggerCount || 0);
    });
    return Math.max(1, Math.round(amount));
  };

  Game.waitStage90Frames = function () {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  };

  Game.normalizeStage90ReelsBeforeScore = async function () {
    const reels = [...(this.reelsEl?.querySelectorAll(".reel") || [])];
    reels.forEach((reel, index) => this.normalizeReelTrack?.(reel, this.currentColumns[index], index));
    await this.waitStage90Frames();
  };

  Game.applyStage90OilCan = async function (patterns, spinOrdinal, creditWallet) {
    if (!creditWallet) return patterns;
    const items = this.getStage90ItemsByEffect("periodic_column_reroll");
    let changed = false;
    let currentPatterns = patterns;
    for (const item of items) {
      const every = Math.max(1, Number(item.effect?.every) || 5);
      if (spinOrdinal <= 0 || spinOrdinal % every !== 0) continue;
      const winningCols = new Set(currentPatterns.flatMap((pattern) => pattern.coords.map(([col]) => col)));
      const candidates = Array.from({ length: GAME_DATA.board.columns }, (_, col) => col).filter((col) => !winningCols.has(col));
      if (!candidates.length) continue;
      const col = candidates[Math.floor(Math.random() * candidates.length)];
      this.currentColumns[col] = this.randomColumn();
      changed = true;
      this.showStage90Event("board", "🛢️ 오일 캔", `${col + 1}번 릴 재추첨`);
      currentPatterns = this.detectPatterns();
    }
    if (changed) {
      this.renderReels();
      await this.wait(90);
      return this.detectPatterns();
    }
    return currentPatterns;
  };

  Game.applyStage90BrokenMagnet = async function (patterns, creditWallet) {
    if (!creditWallet || patterns.length) return patterns;
    let currentPatterns = patterns;
    let changed = false;
    for (const item of this.getStage90ItemsByEffect("miss_reroll_lowest")) {
      if (!this.rollStage90Chance(item)) continue;
      let minValue = Infinity;
      const cells = [];
      this.currentColumns.forEach((column, col) => {
        column.forEach((symbol, row) => {
          const value = Number(symbol?.value) || 0;
          if (value < minValue) {
            minValue = value;
            cells.length = 0;
            cells.push([col, row]);
          } else if (value === minValue) cells.push([col, row]);
        });
      });
      if (!cells.length) continue;
      const [col, row] = cells[Math.floor(Math.random() * cells.length)];
      this.currentColumns[col][row] = this.randomSymbol();
      changed = true;
      this.showStage90Event("board", "🧲 고장난 자석", "저가 심볼 1개 재추첨");
      currentPatterns = this.detectPatterns();
      if (currentPatterns.length) break;
    }
    if (changed) {
      this.renderReels();
      await this.wait(90);
      return this.detectPatterns();
    }
    return currentPatterns;
  };

  Game.applyStage90MarketProphecy = async function (patterns, creditWallet) {
    if (!creditWallet || patterns.length !== 1) return patterns;
    const prophecy = this.getStage90ItemsByEffect("single_pattern_conversion")[0];
    if (!prophecy) return patterns;
    const root = patterns[0];
    const occupied = new Set(root.coords.map(([col, row]) => `${col}:${row}`));
    const candidates = new Map();
    root.coords.forEach(([col, row]) => {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          if (dx === 0 && dy === 0) continue;
          const x = col + dx;
          const y = row + dy;
          if (x < 0 || y < 0 || x >= GAME_DATA.board.columns || y >= GAME_DATA.board.rows) continue;
          const key = `${x}:${y}`;
          if (!occupied.has(key)) candidates.set(key, [x, y]);
        }
      }
    });
    const list = [...candidates.values()];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    const count = Math.min(list.length, Math.max(1, Number(prophecy.effect?.count) || 2));
    if (!count) return patterns;
    for (let i = 0; i < count; i += 1) {
      const [col, row] = list[i];
      const base = GAME_DATA.symbols.find((entry) => entry.id === root.symbol.id) || root.symbol;
      this.currentColumns[col][row] = { ...base };
    }
    this.renderReels();
    this.showStage90Event("legendary", "👁️ 시장 예언서", `${root.symbol.name} 주변 ${count}칸 변환`);
    await this.wait(100);
    return this.detectPatterns();
  };

  Game.creditStage90CashBonus = async function (label, amount, runningTotal, oldWallet, creditWallet) {
    if (!Number.isFinite(amount) || amount <= 0) return runningTotal;
    const nextTotal = runningTotal + Math.round(amount);
    this.showStage90Event("cash", label, `+$${Math.round(amount).toLocaleString("ko-KR")}`);
    const animations = [EffectsManager.animateNumber(this.payoutValue, runningTotal, nextTotal, { duration: 150, prefix: "+ $ " })];
    if (creditWallet) {
      this.wallet = oldWallet + nextTotal;
      animations.push(EffectsManager.animateNumber(this.walletValue, oldWallet + runningTotal, oldWallet + nextTotal, { duration: 150, prefix: "$ " }));
    }
    await Promise.all(animations);
    return nextTotal;
  };

  Game.updateStage90AdaptiveGrowth = function (patterns) {
    const chips = this.getStage90ItemsByEffect("repeat_symbol_growth");
    if (!chips.length || !patterns.length) return;
    const symbolIds = [...new Set(patterns.map((pattern) => pattern.symbol.id))];
    symbolIds.sort((a, b) => {
      const av = GAME_DATA.symbols.find((entry) => entry.id === a)?.value || 0;
      const bv = GAME_DATA.symbols.find((entry) => entry.id === b)?.value || 0;
      return bv - av;
    });
    const id = symbolIds[0];
    if (!id) return;
    if (this.stage90AdaptiveSymbolId === id) this.stage90AdaptiveSymbolStreak += 1;
    else {
      this.stage90AdaptiveSymbolId = id;
      this.stage90AdaptiveSymbolStreak = 1;
    }
    const threshold = Math.min(...chips.map((item) => Math.max(1, Number(item.effect?.threshold) || 3)));
    if (this.stage90AdaptiveSymbolStreak < threshold) return;
    const growth = chips.reduce((sum, item) => sum + Math.max(0, Number(item.effect?.amount) || 0), 0);
    this.symbolGrowth[id] = (this.symbolGrowth[id] || 0) + growth;
    this.stage90AdaptiveSymbolStreak = 0;
    const symbol = GAME_DATA.symbols.find((entry) => entry.id === id);
    this.showStage90Event("growth", "🧬 적응형 칩", `${symbol?.name || id} 가치 +${growth}`);
  };

  Game.evaluateAndRenderScore = async function ({ creditWallet = false, testLabel = "" } = {}) {
    const options = { creditWallet, testLabel };
    this.itemScoringContext = options;
    this.stage90GlobalFactor = 1;
    try {
      await this.normalizeStage90ReelsBeforeScore();
      this.ensureTriggerStats?.();
      this.ensureStage90UI();
      this.clearPatternImpactState?.();
      this.clearTriggerUI?.();

      if (creditWallet) {
        this.runStats.totalRerolls += 1;
        this.stage90CurrentSpinOrdinal = this.runStats.totalRerolls;
        this.getStage90ItemsByEffect("spin_bank").forEach((item) => {
          item.stage90StoredCash += Math.max(0, Number(item.effect?.amount) || 0);
        });
      }

      let patterns = this.detectPatterns();
      patterns = await this.applyStage90OilCan(patterns, this.stage90CurrentSpinOrdinal, creditWallet);
      patterns = await this.applyStage90BrokenMagnet(patterns, creditWallet);
      const originalPatternCount = patterns.length;
      patterns = await this.applyStage90MarketProphecy(patterns, creditWallet);
      this.lastPatterns = patterns;

      if (patterns.length === 0) {
        if (creditWallet) {
          this.stage90MissStreak += 1;
          this.getStage90ItemsByEffect("miss_bank").forEach((item) => {
            item.stage90StoredCash += Math.max(0, Number(item.effect?.amount) || 0);
          });
        }
        this.payoutValue.textContent = "+ $ 0";
        this.patternList.innerHTML = '<span class="pattern-empty">일치 패턴 없음</span>';
        this.scoreBreakdown.textContent = "이번 회전 지급액: $ 0";
        this.readoutDetail.textContent = testLabel || "당첨 없음 · 다음 리롤 준비";
        this.updateStatsRail?.();
        return 0;
      }

      this.stage90GlobalFactor = this.getStage90GlobalFactor(originalPatternCount, creditWallet);
      const { scored } = this.scorePatterns(patterns);
      const sequence = this.getSequentialPatterns(scored);
      this.applyStage90PatternRamp(sequence);
      if (creditWallet) this.applyStage90JackpotConsumables(sequence);

      const baseTotal = sequence.reduce((sum, pattern) => sum + pattern.amount, 0);
      const timing = this.getPatternRevealTiming(sequence.length);
      const oldWallet = this.wallet;
      const highestAmount = Math.max(...sequence.map((pattern) => pattern.amount));
      const resolvedModifiers = { golden: new Set(), ticket: new Set(), chain: new Set(), repeat: new Set() };

      let runningTotal = 0;
      let triggerBonusTotal = 0;
      let triggerActivations = 0;
      let bestChain = 0;
      let anyTruncated = false;
      let jackpotCount = 0;
      let retriggerPatternTotal = 0;
      let retriggerCount = 0;

      this.machinePanel?.classList.add("is-pattern-revealing", "is-pattern-sequence-v74");
      for (let index = 0; index < sequence.length; index += 1) {
        const pattern = sequence[index];
        if (pattern.key === "JACKPOT") jackpotCount += 1;
        runningTotal = await this.playSinglePatternImpact(pattern, index, sequence.length, timing, runningTotal, oldWallet, creditWallet);
        const modifierResult = this.processStage90PatternModifiers(pattern, resolvedModifiers, creditWallet);
        const triggerResult = await this.runTriggerQueueForPattern(pattern, runningTotal, oldWallet, creditWallet);
        runningTotal = triggerResult.runningTotal;
        triggerBonusTotal += triggerResult.bonusTotal;
        triggerActivations += triggerResult.activations;
        bestChain = Math.max(bestChain, triggerResult.activations);
        anyTruncated ||= triggerResult.truncated;

        const repeats = this.getStage90RetriggerCount(pattern, {
          creditWallet,
          modifierRepeats: modifierResult.repeatCount,
          spinOrdinal: this.stage90CurrentSpinOrdinal,
          isHighest: pattern.amount === highestAmount
        });
        if (repeats > 0) this.showStage90Event("repeat", "↻ 패턴 재발동", `${this.getPatternSequenceLabel(pattern)} · ${repeats}회`);

        for (let repeatIndex = 0; repeatIndex < repeats; repeatIndex += 1) {
          const repeatMultiplier = this.getStage90RetriggerMultiplier() * this.getStage90PerpetualMultiplier();
          const repeatAmount = Math.max(1, Math.round(pattern.amount * repeatMultiplier));
          const retriggerPattern = {
            ...pattern,
            amount: repeatAmount,
            raw: repeatAmount,
            isRetrigger: true,
            itemEffects: [...(pattern.itemEffects || []), `재발동 ×${this.formatReferenceNumber(repeatMultiplier)}`]
          };
          runningTotal = await this.playSinglePatternImpact(retriggerPattern, index, sequence.length, timing, runningTotal, oldWallet, creditWallet);
          retriggerPatternTotal += repeatAmount;
          retriggerCount += 1;
          this.stage90RoundRetriggerCount += 1;
          const repeatedTrigger = await this.runTriggerQueueForPattern(retriggerPattern, runningTotal, oldWallet, creditWallet);
          runningTotal = repeatedTrigger.runningTotal;
          triggerBonusTotal += repeatedTrigger.bonusTotal;
          triggerActivations += repeatedTrigger.activations;
          bestChain = Math.max(bestChain, repeatedTrigger.activations);
          anyTruncated ||= repeatedTrigger.truncated;
        }
      }

      let storedRelease = 0;
      if (creditWallet) {
        this.getStage90ItemsByEffect("miss_bank").forEach((item) => {
          storedRelease += Math.max(0, Number(item.stage90StoredCash) || 0);
          item.stage90StoredCash = 0;
        });
        if (storedRelease > 0) {
          runningTotal = await this.creditStage90CashBonus("🫙 잔돈통 지급", storedRelease, runningTotal, oldWallet, creditWallet);
        }
      }

      if (jackpotCount > 0) await this.playJackpotFinish?.();
      const finalTotal = runningTotal;
      this.clearPatternImpactState?.({ keepFinalHits: true });
      this.highlightPatterns(patterns);
      this.patternList.innerHTML = sequence.map((pattern) => this.patternChipHTML72(pattern)).join("");
      this.scoreBreakdown.innerHTML =
        sequence.map((pattern) => this.breakdownHTML(pattern)).join("") +
        (retriggerPatternTotal > 0 ? `<div class="trigger-score-summary"><span>재발동 지급</span><strong>+$${retriggerPatternTotal.toLocaleString("ko-KR")}</strong></div>` : "") +
        (triggerBonusTotal > 0 ? `<div class="trigger-score-summary"><span>트리거 보너스</span><strong>+$${triggerBonusTotal.toLocaleString("ko-KR")}</strong></div>` : "") +
        (storedRelease > 0 ? `<div class="trigger-score-summary"><span>저장금 지급</span><strong>+$${storedRelease.toLocaleString("ko-KR")}</strong></div>` : "");
      this.payoutValue.textContent = `+ $ ${finalTotal.toLocaleString("ko-KR")}`;

      if (creditWallet) {
        this.wallet = oldWallet + finalTotal;
        this.updateEconomyUI?.(false);
        this.runStats.winningRerolls += 1;
        this.runStats.totalEarned += finalTotal;
        this.runStats.bestPayout = Math.max(this.runStats.bestPayout, finalTotal);
        this.runStats.jackpots += jackpotCount;
        this.runStats.triggerActivations += triggerActivations;
        this.runStats.triggerBonusEarned += triggerBonusTotal;
        this.runStats.bestChain = Math.max(this.runStats.bestChain, bestChain);
        this.stage90Stats.retriggers += retriggerCount;
        this.stage90RoundFirstWinPending = false;
        this.stage90MissStreak = 0;
        this.updateStage90AdaptiveGrowth(patterns);
      }

      this.renderTriggerFinalSummary?.(triggerActivations, triggerBonusTotal, bestChain, anyTruncated);
      this.readoutDetail.textContent = testLabel || (
        retriggerCount > 0 || triggerActivations > 0
          ? `${sequence.length}개 패턴 · 재발동 ${retriggerCount}회 · 트리거 ${triggerActivations}회 · +$${finalTotal.toLocaleString("ko-KR")}`
          : `${sequence.length}개 패턴 정산 완료 · +$${finalTotal.toLocaleString("ko-KR")}`
      );
      this.flushStage90Removals();
      this.renderDynamicReferenceTables?.();
      this.updateStatsRail?.();
      return finalTotal;
    } finally {
      this.stage90GlobalFactor = 1;
      this.itemScoringContext = null;
      this.machinePanel?.classList.remove("is-pattern-revealing", "is-pattern-sequence-v74", "pattern-jackpot-finish");
      this.ensurePatternFxLayer?.()?.classList.remove("is-active", "is-special", "is-jackpot", "is-jackpot-finish");
    }
  };

  Game.updateStatsRail = function () {
    previousUpdateStatsRail?.call(this);
    if (!this.runStatsGrid || !this.stage90Stats) return;
    const rows = [
      ["확률 발동", this.stage90Stats.chanceProcs.toLocaleString("ko-KR")],
      ["패턴 재발동", this.stage90Stats.retriggers.toLocaleString("ko-KR")],
      ["Modifier", this.stage90Stats.modifierProcs.toLocaleString("ko-KR")]
    ];
    this.runStatsGrid.insertAdjacentHTML("beforeend", rows.map(([label, value]) => `
      <div class="stat-reference-row stage90-stat-row"><span>${label}</span><strong>${value}</strong></div>
    `).join(""));
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    if (this.shopOpen) this.renderShop();
    this.renderOwnedItemsDrawer?.();
  };

  Game.init = function () {
    this.resetStage90RunState();
    previousInit.call(this);
    this.ensureStage90UI();
    this.stage = 9;
    this.status = "RARITY_MODIFIER_RETRIGGER_SYSTEM";
    this.stageStatus.textContent = this.roundPreparation ? "9단계 · 라운드 준비" : "9단계 · 아이템 확장";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.0 rarity / modifier / retrigger system loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage90RunState();
    const result = previousRestartRun.apply(this, args);
    this.resetStage90RunState();
    this.ensureStage90UI();
    this.updateAllUI();
    return result;
  };
})();
