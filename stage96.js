// DEADLINE — v0.9.6 SHINY / 코인 상점 리롤 / 다크 모드
"use strict";

(() => {
  GAME_DATA.version = "v0.9.6";
  GAME_DATA.stage = 9;

  GAME_DATA.shop.shinyChance = 0.04;
  GAME_DATA.shop.rerollBaseTargetRatio = 0.15;
  GAME_DATA.shop.rerollStepTargetRatio = 0.05;

  GAME_DATA.shinyTraits = {
    AMPLIFY: {
      id: "AMPLIFY",
      name: "증폭",
      icon: "✨",
      note: "모든 패턴 지급액 +5%"
    },
    LUCK: {
      id: "LUCK",
      name: "행운",
      icon: "🍀",
      note: "매 리롤 기본 행운 +0.12"
    },
    COMPOUND: {
      id: "COMPOUND",
      name: "복리",
      icon: "📈",
      note: "마감 계좌 라운드 이자 +1%p"
    },
    OBSESSION: {
      id: "OBSESSION",
      name: "집착",
      icon: "🔁",
      note: "마지막 당첨 패턴 8% 확률 재발동"
    },
    VARIANT: {
      id: "VARIANT",
      name: "변칙",
      icon: "🃏",
      note: "WILD 등장 가중치 +0.5"
    },
    MERCHANT: {
      id: "MERCHANT",
      name: "상인",
      icon: "🛒",
      note: "매 Deadline 첫 상점 리롤 비용 -30%"
    },
    DIVIDEND: {
      id: "DIVIDEND",
      name: "배당",
      icon: "🎟️",
      note: "Deadline 성공 시 티켓 +1"
    }
  };

  const refreshCoupon = (GAME_DATA.items || []).find((item) => item.id === "refresh_coupon");
  if (refreshCoupon) {
    refreshCoupon.note = "상점 새로고침 비용 -20%";
    refreshCoupon.stage96RerollDiscount = 0.20;
  }

  const overloadShelf = (GAME_DATA.items || []).find((item) => item.id === "overload_shelf");
  if (overloadShelf) {
    overloadShelf.note = "보유 아이템 최대치 +3 · 상점 새로고침 비용 +10%";
    overloadShelf.stage96RerollSurchargeRate = 0.10;
  }

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousGenerateShopOffers = Game.generateShopOffers;
  const previousBuyShopOffer = Game.buyShopOffer;
  const previousGetItemDisplayNote = Game.getItemDisplayNote;
  const previousPrepareStage90SpinEffects = Game.prepareStage90SpinEffects;
  const previousCalculatePatternScore = Game.calculatePatternScore;
  const previousApplyStage95DeadlineInterest = Game.applyStage95DeadlineInterest;
  const previousGetStage90SymbolWeightMap = Game.getStage90SymbolWeightMap;
  const previousGetSequentialPatterns = Game.getSequentialPatterns;
  const previousGetStage90RetriggerCount = Game.getStage90RetriggerCount;
  const previousShowDeadlineSuccess = Game.showDeadlineSuccess;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.resetStage96State = function () {
    this.stage96DeadlineShopRerolls = 0;
    this.stage96LastSequentialPattern = null;
    this.stage96DividendAwarded = new Set();
  };

  Game.getStage96ShinyTrait = function (item) {
    return item?.shiny && item?.shinyTraitId
      ? GAME_DATA.shinyTraits?.[item.shinyTraitId] || null
      : null;
  };

  Game.getStage96ShinyItems = function (traitId = null) {
    return (this.ownedItems || []).filter((item) => {
      if (!item?.shiny || !item.shinyTraitId) return false;
      return traitId ? item.shinyTraitId === traitId : true;
    });
  };

  Game.canStage96ItemBeShiny = function (item) {
    if (!item) return false;
    if (this.isStage90InstantItem?.(item)) return false;
    return !item.consumableOnPurchase;
  };

  Game.rollStage96ShinyTrait = function () {
    const traits = Object.values(GAME_DATA.shinyTraits || {});
    if (!traits.length) return null;
    return traits[Math.floor(Math.random() * traits.length)] || null;
  };

  Game.applyStage96ShinyRoll = function (offer) {
    if (!this.canStage96ItemBeShiny(offer)) return offer;
    if (offer.shiny && offer.shinyTraitId) return offer;
    if (Math.random() >= (Number(GAME_DATA.shop.shinyChance) || 0.04)) return offer;

    const trait = this.rollStage96ShinyTrait();
    if (!trait) return offer;
    offer.shiny = true;
    offer.shinyTraitId = trait.id;
    return offer;
  };

  Game.generateShopOffers = function (...args) {
    const result = previousGenerateShopOffers.apply(this, args);
    (this.shopOffers || []).forEach((offer) => this.applyStage96ShinyRoll(offer));
    return result;
  };

  Game.getItemDisplayNote = function (item) {
    const base = previousGetItemDisplayNote.call(this, item);
    const trait = this.getStage96ShinyTrait(item);
    return trait ? `${base} · ${trait.icon} SHINY ${trait.name}: ${trait.note}` : base;
  };

  Game.getStage96RerollDiscountRate = function () {
    let discount = 0;

    if ((this.ownedItems || []).some((item) => item.id === "refresh_coupon")) {
      discount += 0.20;
    }

    if ((this.stage96DeadlineShopRerolls || 0) === 0) {
      discount += Math.min(0.50, this.getStage96ShinyItems("MERCHANT").length * 0.30);
    }

    return Math.min(0.75, Math.max(0, discount));
  };

  Game.isStage96NextShopRerollFree = function () {
    const count = Math.max(0, Number(this.stage96DeadlineShopRerolls) || 0);
    return this.getStage90ItemsByEffect?.("shop_reroll_free_every").some((item) => {
      const every = Math.max(1, Number(item.effect?.every) || 3);
      return count > 0 && count % every === 0;
    }) || false;
  };

  Game.getShopRerollCost = function () {
    if (this.isStage96NextShopRerollFree()) return 0;

    const target = Math.max(1, Number(this.deadlineTarget) || 1);
    const count = Math.max(0, Number(this.stage96DeadlineShopRerolls) || 0);
    const baseRatio = Number(GAME_DATA.shop.rerollBaseTargetRatio) || 0.15;
    const stepRatio = Number(GAME_DATA.shop.rerollStepTargetRatio) || 0.05;
    let cost = target * (baseRatio + stepRatio * count);

    if ((Number(this.shopRerollSurcharge) || 0) > 0) {
      cost *= 1 + 0.10 * Math.max(0, Number(this.shopRerollSurcharge) || 0);
    }

    cost *= 1 - this.getStage96RerollDiscountRate();
    return Math.max(1, Math.round(cost));
  };

  Game.rerollShop = function () {
    if (!this.shopOpen) return;
    const cost = this.getShopRerollCost();
    if (cost > 0 && this.wallet < cost) return;

    const beforeWallet = this.wallet;
    if (cost > 0) this.wallet -= cost;

    this.stage96DeadlineShopRerolls = Math.max(0, Number(this.stage96DeadlineShopRerolls) || 0) + 1;
    this.shopRerollCount = Math.max(0, Number(this.shopRerollCount) || 0) + 1;
    this.generateShopOffers();

    this.readoutDetail.textContent = cost === 0
      ? `상점 새로고침 · 무료 · 이번 마감 ${this.stage96DeadlineShopRerolls}회`
      : `상점 새로고침 · $${cost.toLocaleString("ko-KR")} · 이번 마감 ${this.stage96DeadlineShopRerolls}회`;

    this.renderShop();
    this.updateAllUI();
    if (cost > 0) this.animateCurrency?.(this.walletValue, beforeWallet, this.wallet);
  };

  Game.renderShop = function () {
    if (!this.shopOpen) return;
    const maxOwned = this.getMaxOwnedItems();
    const isFull = this.ownedItems.length >= maxOwned;
    const rerollCost = this.getShopRerollCost();
    const canReroll = rerollCost === 0 || this.wallet >= rerollCost;

    this.flowText.innerHTML = `
      <span class="shop-ticket-balance">T ${this.tickets}</span>
      <span class="stage96-shop-wallet">지갑 $${this.wallet.toLocaleString("ko-KR")}</span>
      <span class="shop-owned-count">보유 ${this.ownedItems.length} / ${maxOwned} · 이번 마감 리롤 ${this.stage96DeadlineShopRerolls}회</span>
    `;

    const offerHTML = (this.shopOffers || []).map((offer, index) => {
      const instant = this.isStage90InstantItem(offer);
      const cannotBuy = offer.sold || (!instant && isFull) || this.tickets < offer.price;
      const stateText = offer.sold ? "구매 완료" : (!instant && isFull) ? "보유 한도" : `T ${offer.price}`;
      const rarity = offer.rarity || "COMMON";
      const rarityLabel = GAME_DATA.rarities?.[rarity]?.label || rarity;
      const trait = this.getStage96ShinyTrait(offer);
      const shinyClass = trait ? "is-shiny" : "";
      const shinyHTML = trait ? `
        <span class="shop-shiny-badge">✨ SHINY</span>
        <span class="shop-shiny-trait"><b>${trait.icon} ${trait.name}</b><small>${trait.note}</small></span>
      ` : "";

      return `
        <button class="shop-offer-card rarity-${rarity.toLowerCase()} ${shinyClass} ${offer.sold ? "is-sold" : ""}"
          data-shop-action="buy" data-offer-index="${index}" ${cannotBuy ? "disabled" : ""}>
          <span class="shop-rarity-badge">${rarityLabel}</span>
          ${shinyHTML}
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
      const trait = this.getStage96ShinyTrait(item);
      return `
        <button class="shop-owned-card rarity-${rarity.toLowerCase()} ${trait ? "is-shiny" : ""}" data-shop-owned-item="${item.instanceId}" type="button">
          ${trait ? `<span class="shop-shiny-mini">✨ ${trait.name}</span>` : ""}
          <span class="shop-owned-mark" aria-hidden="true">${item.icon || "◆"}</span>
          <div><strong>${item.name}</strong><small>${this.getItemDisplayNote(item)}</small></div>
          <b>판매 T ${sellValue}</b>
        </button>
      `;
    }).join("");

    const nextRatio = Math.round(((Number(GAME_DATA.shop.rerollBaseTargetRatio) || 0.15) + (Number(GAME_DATA.shop.rerollStepTargetRatio) || 0.05) * this.stage96DeadlineShopRerolls) * 100);
    this.flowOptions.innerHTML = `
      <section class="shop-main-section">
        <div class="shop-section-heading shop-main-heading">
          <div><span>아이템 제안 · ${this.shopOffers.length}개</span><small>SHINY 기본 4% · 리롤 기준 ${nextRatio}%</small></div>
          <button class="shop-reroll-compact stage96-coin-reroll" data-shop-action="reroll" ${canReroll ? "" : "disabled"}>
            ↻ 새로고침 · ${rerollCost === 0 ? "무료" : `$${rerollCost.toLocaleString("ko-KR")}`}
          </button>
        </div>
        <div class="shop-offer-grid">${offerHTML}</div>
      </section>
      <section class="shop-owned-panel">
        <div class="shop-section-heading">
          <div><span>보유 아이템</span><small>아이템 구매는 티켓 · 새로고침은 지갑 코인</small></div>
          <strong>${this.ownedItems.length} / ${maxOwned}</strong>
        </div>
        <div class="shop-owned-large-grid">${ownedHTML}</div>
      </section>
    `;
  };

  Game.buyShopOffer = function (index) {
    const offer = this.shopOffers?.[index];
    const wasShiny = Boolean(offer?.shiny && offer?.shinyTraitId);
    const name = offer?.name;
    const result = previousBuyShopOffer.call(this, index);

    if (wasShiny && name) {
      const owned = [...(this.ownedItems || [])].reverse().find((item) => item.name === name && item.shiny && item.shinyTraitId);
      if (owned) {
        const trait = this.getStage96ShinyTrait(owned);
        this.showStage90Event?.("shiny", "✨ SHINY 획득", `${owned.name} · ${trait?.name || "부가 옵션"}`);
      }
    }
    return result;
  };

  Game.prepareStage90SpinEffects = function (...args) {
    const result = previousPrepareStage90SpinEffects.apply(this, args);
    const bonus = this.getStage96ShinyItems("LUCK").length * 0.12;
    if (bonus > 0) this.stage90ActiveLuck += bonus;
    return result;
  };

  Game.calculatePatternScore = function (pattern) {
    const result = previousCalculatePatternScore.call(this, pattern);
    const count = this.getStage96ShinyItems("AMPLIFY").length;
    if (!count) return result;

    const factor = Math.pow(1.05, count);
    return {
      ...result,
      raw: result.raw * factor,
      amount: Math.max(1, Math.round(result.amount * factor)),
      itemEffects: [...(result.itemEffects || []), `✨ SHINY 증폭 ×${factor.toFixed(2)}`]
    };
  };

  Game.applyStage95DeadlineInterest = function () {
    if (!previousApplyStage95DeadlineInterest) return null;

    const baseRate = Number(GAME_DATA.economy.deadlineAccountRoundRate) || 0.10;
    const shinyBonus = Math.min(0.05, this.getStage96ShinyItems("COMPOUND").length * 0.01);
    const rate = baseRate + shinyBonus;
    const before = Math.max(0, Number(this.deadlinePaid) || 0);
    const interest = Math.max(0, Math.floor(before * rate));
    const after = before + interest;

    this.deadlinePaid = after;
    this.paymentCommitted = after;
    this.stage95PendingDeadlineInterest = { before, interest, after, rate };

    if (interest > 0) {
      EffectsManager.showCurrencyGain?.(this.deadlinePaidValue, interest);
      this.animateCurrency?.(this.deadlinePaidValue, before, after);
    }
    this.updateAllUI?.();
    return this.stage95PendingDeadlineInterest;
  };

  Game.getStage90SymbolWeightMap = function (...args) {
    const weights = previousGetStage90SymbolWeightMap.apply(this, args);
    const bonus = this.getStage96ShinyItems("VARIANT").length * 0.5;
    if (bonus > 0 && Object.prototype.hasOwnProperty.call(weights, "WD")) {
      weights.WD = Math.max(0.01, Number(weights.WD) || 0) + bonus;
    }
    return weights;
  };

  Game.getSequentialPatterns = function (...args) {
    const sequence = previousGetSequentialPatterns.apply(this, args) || [];
    this.stage96LastSequentialPattern = sequence.at(-1) || null;
    return sequence;
  };

  Game.getStage90RetriggerCount = function (pattern, context = {}) {
    let count = previousGetStage90RetriggerCount.call(this, pattern, context);
    if (!context.creditWallet || pattern !== this.stage96LastSequentialPattern) return count;

    let shinyRepeats = 0;
    this.getStage96ShinyItems("OBSESSION").forEach(() => {
      if (Math.random() < 0.08) shinyRepeats += 1;
    });

    if (shinyRepeats > 0) {
      count = Math.min(6, count + shinyRepeats);
      this.showStage90Event?.("shiny", "✨ SHINY 집착", `마지막 패턴 +${shinyRepeats}회`);
    }
    return count;
  };

  Game.showDeadlineSuccess = function (settlement) {
    const key = String(this.deadlineIndex);
    const dividendCount = this.getStage96ShinyItems("DIVIDEND").length;
    let bonus = 0;

    if (dividendCount > 0 && !this.stage96DividendAwarded?.has(key)) {
      bonus = dividendCount;
      this.stage96DividendAwarded.add(key);
      this.tickets += bonus;
      if (settlement) settlement.stage96DividendTickets = bonus;
    }

    const result = previousShowDeadlineSuccess.call(this, settlement);
    if (bonus > 0) {
      const panel = this.flowOptions?.querySelector(".auto-advance-panel");
      panel?.insertAdjacentHTML("beforeend", `<span class="stage96-dividend-line">✨ SHINY 배당 · 티켓 +${bonus}</span>`);
      this.updateAllUI?.();
    }
    return result;
  };

  Game.ensureStage96ThemeToggle = function () {
    const host = document.querySelector(".top-status");
    if (!host) return null;
    let button = document.querySelector("#stage96ThemeToggle");
    if (button) return button;

    button = document.createElement("button");
    button.id = "stage96ThemeToggle";
    button.className = "status-chip stage96-theme-toggle";
    button.type = "button";
    button.addEventListener("click", () => {
      const dark = !document.body.classList.contains("theme-dark");
      this.applyStage96Theme(dark ? "dark" : "light", true);
    });
    host.appendChild(button);
    return button;
  };

  Game.applyStage96Theme = function (theme, persist = false) {
    const dark = theme === "dark";
    document.body.classList.toggle("theme-dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";

    const button = this.ensureStage96ThemeToggle();
    if (button) {
      button.textContent = dark ? "☀️ 라이트" : "🌙 다크";
      button.setAttribute("aria-pressed", dark ? "true" : "false");
      button.title = dark ? "라이트 모드로 변경" : "다크 모드로 변경";
    }

    if (persist) {
      try { localStorage.setItem("deadline-theme", dark ? "dark" : "light"); } catch (_) {}
    }
  };

  Game.loadStage96Theme = function () {
    let saved = null;
    try { saved = localStorage.getItem("deadline-theme"); } catch (_) {}
    this.applyStage96Theme(saved === "light" ? "light" : "dark", false);
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    if (this.shopOpen) this.renderShop();
    return result;
  };

  Game.advanceDeadline = function (...args) {
    this.stage96DeadlineShopRerolls = 0;
    this.stage96LastSequentialPattern = null;
    return previousAdvanceDeadline.apply(this, args);
  };

  Game.init = function () {
    this.resetStage96State();
    previousInit.call(this);
    this.ensureStage96ThemeToggle();
    this.loadStage96Theme();
    this.stage = 9;
    this.status = "SHINY_COIN_REROLL_DARK_MODE";
    this.stageStatus.textContent = this.roundPreparation
      ? "9단계 · 라운드 준비"
      : "9단계 · SHINY 상점";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.6 SHINY / coin reroll / dark mode loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage96State();
    const result = previousRestartRun.apply(this, args);
    this.resetStage96State();
    this.ensureStage96ThemeToggle();
    this.loadStage96Theme();
    this.updateAllUI?.();
    return result;
  };
})();
