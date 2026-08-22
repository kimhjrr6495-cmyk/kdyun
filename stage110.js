// DEADLINE — v1.1.0 BUILD IDENTITY UPDATE
"use strict";

(() => {
  GAME_DATA.version = "v1.1.0";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousUpdateStatsRail = Game.updateStatsRail;
  const previousRenderDynamicReferenceTables = Game.renderDynamicReferenceTables;
  const previousGetStage90SymbolWeightMap = Game.getStage90SymbolWeightMap;
  const previousCalculatePatternScore = Game.calculatePatternScore;
  const previousGetMaxOwnedItems = Game.getMaxOwnedItems;
  const previousIsStage90InstantItem = Game.isStage90InstantItem;
  const previousBuyShopOffer = Game.buyShopOffer;
  const previousGetItemDisplayNote = Game.getItemDisplayNote;
  const previousEvaluateAndRenderScore = Game.evaluateAndRenderScore;
  const previousShowDeadlineSuccess = Game.showDeadlineSuccess;
  const previousResolveRound = Game.resolveRound;
  const previousSelectStage100Contract = Game.selectStage100Contract;
  const previousSkipStage100Contract = Game.skipStage100Contract;
  const previousGetStage100Effects = Game.getStage100Effects;
  const previousFormatStage100Reward = Game.formatStage100Reward;
  const previousApplyStage100RewardEntry = Game.applyStage100RewardEntry;
  const previousGrantStage100ContractReward = Game.grantStage100ContractReward;
  const previousIsStage100ContractEligible = Game.isStage100ContractEligible;
  const previousShowStage100ContractOffer = Game.showStage100ContractOffer;
  const previousShowStage90Event = Game.showStage90Event;
  const previousRenderTriggerActivation = Game.renderTriggerActivation;
  const previousSpin = Game.spin;

  const SYMBOL_LABELS = {
    CH: "🍒 체리",
    CO: "🪙 코인",
    BL: "🔔 벨",
    ST: "⭐ 스타",
    DM: "💎 다이아",
    CR: "👑 크라운",
    SV: "7️⃣ 세븐",
    WD: "🃏 WILD",
    ER: "⚠️ ERROR"
  };

  const STAGE110_ITEMS = [
    {
      id: "ticket_arbitrage", name: "티켓 차익권", icon: "🎟️", category: "즉발", rarity: "COMMON", price: 2,
      note: "구매 즉시 🎟️ 4 획득 · 보유 슬롯을 차지하지 않음",
      consumableOnPurchase: true,
      effect: { type: "instant_ticket_exchange", amount: 4 }
    },
    {
      id: "warehouse_permit", name: "창고 확장 허가증", icon: "🗄️", category: "즉발", rarity: "COMMON", price: 3,
      note: "구매 즉시 보유 아이템 최대치 +1 · 최대 12칸 · 보유 슬롯을 차지하지 않음",
      consumableOnPurchase: true,
      effect: { type: "inventory_capacity", amount: 1 }
    },
    {
      id: "small_index_fund", name: "소형 지수펀드", icon: "📈", category: "가격 배수", rarity: "COMMON", price: 2,
      note: "모든 심볼 가격 배수 +0.08",
      effect: { type: "global_price_mult_add", amount: 0.08 }
    },
    {
      id: "pattern_manual", name: "패턴 교본", icon: "📑", category: "패턴 배수", rarity: "COMMON", price: 2,
      note: "모든 패턴 배수 +0.08",
      effect: { type: "global_pattern_mult_add", amount: 0.08 }
    },
    {
      id: "market_index", name: "시장 지수", icon: "🏦", category: "가격 배수", rarity: "RARE", price: 4,
      note: "모든 심볼 가격 배수 +0.15",
      effect: { type: "global_price_mult_add", amount: 0.15 }
    },
    {
      id: "settlement_formula", name: "정산 공식", icon: "🧮", category: "패턴 배수", rarity: "RARE", price: 4,
      note: "모든 패턴 배수 +0.15",
      effect: { type: "global_pattern_mult_add", amount: 0.15 }
    },
    {
      id: "balanced_portfolio", name: "균형 포트폴리오", icon: "⚖️", category: "전역 배수", rarity: "RARE", price: 5,
      note: "모든 심볼 가격 배수 +0.08 · 모든 패턴 배수 +0.08",
      effect: { type: "global_both_mult_add", priceAmount: 0.08, patternAmount: 0.08 }
    },
    {
      id: "bull_market", name: "강세장", icon: "🐂", category: "고위험", rarity: "EPIC", price: 7,
      note: "모든 심볼 가격 배수 +0.30 · ERROR 등장 가중치 ×1.20",
      effect: { type: "global_price_error_tradeoff", amount: 0.30, errorFactor: 1.20 }
    },
    {
      id: "pattern_learner", name: "패턴 학습기", icon: "🧬", category: "성장", rarity: "EPIC", price: 7,
      note: "실제 당첨 패턴 5개마다 모든 패턴 배수 +0.05",
      effect: { type: "pattern_learning", threshold: 5, step: 0.05 }
    },
    {
      id: "compound_growth_fund", name: "복합 성장 펀드", icon: "♻️", category: "성장", rarity: "EPIC", price: 8,
      note: "마감 성공마다 모든 심볼 가격 배수 +0.10 · 모든 패턴 배수 +0.10",
      effect: { type: "deadline_global_growth", priceStep: 0.10, patternStep: 0.10 }
    },
    {
      id: "world_market_index", name: "세계 시장 지수", icon: "🌐", category: "가격 배수", rarity: "LEGENDARY", price: 10,
      note: "모든 심볼 가격 배수 +0.50",
      effect: { type: "global_price_mult_add", amount: 0.50 }
    },
    {
      id: "completed_formula", name: "완성된 공식", icon: "🧠", category: "패턴 배수", rarity: "LEGENDARY", price: 10,
      note: "모든 패턴 배수 +0.50",
      effect: { type: "global_pattern_mult_add", amount: 0.50 }
    },
    {
      id: "market_dominance", name: "시장 지배권", icon: "👑", category: "전역 배수", rarity: "LEGENDARY", price: 12,
      note: "모든 심볼 가격 배수 +0.30 · 모든 패턴 배수 +0.30",
      effect: { type: "global_both_mult_add", priceAmount: 0.30, patternAmount: 0.30 }
    }
  ];

  const STAGE110_LONG_CONTRACTS = [
    {
      id: "three_round_recession", tier: "RISK", category: "ROUND", icon: "📉", name: "3라운드 침체",
      note: "앞으로 실제 3라운드 동안 모든 지급액이 18% 감소합니다.",
      completionMode: "ROUNDS", durationRounds: 3,
      effects: [{ type: "SCORE_GLOBAL_MULT", factor: 0.82 }],
      rewards: [{ type: "TICKETS", amount: 3 }, { type: "PERM_SYMBOL_WEIGHT", symbolId: "CH", amount: 0.20 }],
      stage110RewardAssigned: true
    },
    {
      id: "three_round_error_storm", tier: "EXTREME", category: "SYMBOL", icon: "⚠️", name: "3라운드 오류 폭풍",
      note: "앞으로 실제 3라운드 동안 ERROR 등장 가중치가 80% 증가합니다.",
      completionMode: "ROUNDS", durationRounds: 3,
      effects: [{ type: "ERROR_WEIGHT_MULT", factor: 1.80 }],
      rewards: [{ type: "TICKETS", amount: 4 }, { type: "PERM_PRICE_MULT", amount: 0.12 }],
      stage110RewardAssigned: true
    },
    {
      id: "three_round_storage_squeeze", tier: "RISK", category: "SHOP", icon: "🗄️", name: "3라운드 창고 압박",
      note: "앞으로 실제 3라운드 동안 보유 아이템 한도가 1칸 감소합니다.",
      completionMode: "ROUNDS", durationRounds: 3,
      effects: [{ type: "INVENTORY_CAP_MINUS", amount: 1 }],
      rewards: [{ type: "TICKETS", amount: 3 }, { type: "PERM_INVENTORY", amount: 1 }],
      stage110RewardAssigned: true
    },
    {
      id: "three_round_pattern_tax", tier: "STANDARD", category: "PATTERN", icon: "📐", name: "3라운드 패턴세",
      note: "앞으로 실제 3라운드 동안 모든 지급액이 10% 감소합니다.",
      completionMode: "ROUNDS", durationRounds: 3,
      effects: [{ type: "SCORE_GLOBAL_MULT", factor: 0.90 }],
      rewards: [{ type: "TICKETS", amount: 2 }, { type: "PERM_PATTERN_MULT", amount: 0.10 }],
      stage110RewardAssigned: true
    }
  ];

  Game.patchStage110Data = function () {
    const itemIds = new Set((GAME_DATA.items || []).map((item) => item.id));
    STAGE110_ITEMS.forEach((item) => {
      if (!itemIds.has(item.id)) GAME_DATA.items.push({ ...item, effect: { ...item.effect } });
    });

    (GAME_DATA.items || []).forEach((item) => {
      if (typeof item.note === "string") item.note = item.note.replace(/리롤/g, "ROLL");
    });

    const contractIds = new Set((GAME_DATA.contracts || []).map((contract) => contract.id));
    STAGE110_LONG_CONTRACTS.forEach((contract) => {
      if (!contractIds.has(contract.id)) GAME_DATA.contracts.push({
        ...contract,
        effects: contract.effects.map((effect) => ({ ...effect })),
        rewards: contract.rewards.map((reward) => ({ ...reward }))
      });
    });

    (GAME_DATA.contracts || []).forEach((contract) => {
      if (typeof contract.note === "string") contract.note = contract.note.replace(/리롤/g, "ROLL");
      if (contract.id === "no_reroll") contract.name = "새로고침 금지";
      this.patchStage110PermanentRewardForContract(contract);
    });
  };

  Game.patchStage110PermanentRewardForContract = function (contract) {
    if (!contract || contract.stage110RewardAssigned) return;
    contract.rewards = Array.isArray(contract.rewards) ? contract.rewards : [];
    if (contract.rewards.some((entry) => String(entry?.type || "").startsWith("PERM_"))) {
      contract.stage110RewardAssigned = true;
      return;
    }

    const tier = String(contract.tier || "STANDARD");
    const tierValue = (standard, risk, extreme) => tier === "EXTREME" ? extreme : tier === "RISK" ? risk : standard;
    let permanent = null;

    const symbolMap = {
      common_market: ["CH", 0.20],
      scarce_market: ["DM", 0.16],
      seven_ban: ["SV", 0.18],
      wild_ban: ["WD", 0.10],
      unstable_market: ["ER", 0.16],
      chaos_market: ["WD", 0.14],
      luxury_tax: ["CR", 0.16]
    };

    if (symbolMap[contract.id]) {
      const [symbolId, amount] = symbolMap[contract.id];
      permanent = { type: "PERM_SYMBOL_WEIGHT", symbolId, amount };
    } else if (contract.id === "one_visit") {
      permanent = { type: "PERM_SYMBOL_WEIGHT", symbolId: "CH", amount: 0.20 };
    } else if (contract.id === "narrow_storage") {
      permanent = { type: "PERM_INVENTORY", amount: 1 };
    } else if (contract.category === "PATTERN") {
      permanent = { type: "PERM_PATTERN_MULT", amount: tierValue(0.05, 0.08, 0.12) };
    } else if (contract.category === "ECONOMY") {
      permanent = { type: "PERM_PRICE_MULT", amount: tierValue(0.05, 0.08, 0.12) };
    } else if (contract.category === "SHOP") {
      permanent = { type: "PERM_PRICE_MULT", amount: tierValue(0.04, 0.07, 0.10) };
    } else if (contract.category === "CHAIN") {
      permanent = { type: "PERM_PATTERN_MULT", amount: tierValue(0.04, 0.07, 0.11) };
    } else if (contract.category === "ROUND") {
      permanent = { type: "PERM_PRICE_MULT", amount: tierValue(0.04, 0.07, 0.10) };
    } else if (contract.category === "SYMBOL") {
      permanent = { type: "PERM_SYMBOL_WEIGHT", symbolId: "ST", amount: tierValue(0.10, 0.15, 0.20) };
    } else {
      permanent = { type: "PERM_PATTERN_MULT", amount: tierValue(0.03, 0.05, 0.08) };
    }

    if (permanent) contract.rewards.push(permanent);
    contract.stage110RewardAssigned = true;
  };

  Game.resetStage110State = function () {
    this.stage110ContractLedger = [];
    this.stage110ContractSeed = 0;
    this.stage110Permanent = {
      symbolWeightBonus: {},
      priceBonus: 0,
      patternBonus: 0,
      inventoryBonus: 0
    };
    this.stage110DeadlineGrowthKeys = new Set();
    this.stage110ActivationQueue = [];
    this.stage110ActivationBusy = false;
    this.stage110ActivationRunning = false;
    this.stage110PendingRoll = false;
  };

  Game.getStage110ItemMultiplierBonuses = function () {
    let priceBonus = 0;
    let patternBonus = 0;
    let errorFactor = 1;

    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect || {};
      if (effect.type === "global_price_mult_add") priceBonus += Math.max(0, Number(effect.amount) || 0);
      if (effect.type === "global_pattern_mult_add") patternBonus += Math.max(0, Number(effect.amount) || 0);
      if (effect.type === "global_both_mult_add") {
        priceBonus += Math.max(0, Number(effect.priceAmount) || 0);
        patternBonus += Math.max(0, Number(effect.patternAmount) || 0);
      }
      if (effect.type === "global_price_error_tradeoff") {
        priceBonus += Math.max(0, Number(effect.amount) || 0);
        errorFactor *= Math.max(0.01, Number(effect.errorFactor) || 1);
      }
      if (effect.type === "pattern_learning") {
        patternBonus += Math.max(0, Number(item.stage110PatternGrowth) || 0);
      }
      if (effect.type === "deadline_global_growth") {
        priceBonus += Math.max(0, Number(item.stage110PriceGrowth) || 0);
        patternBonus += Math.max(0, Number(item.stage110PatternGrowth) || 0);
      }
    });

    return { priceBonus, patternBonus, errorFactor };
  };

  Game.getStage110PriceMultiplier = function () {
    const item = this.getStage110ItemMultiplierBonuses();
    return Math.max(0, 1 + Math.max(0, Number(this.stage110Permanent?.priceBonus) || 0) + item.priceBonus);
  };

  Game.getStage110PatternMultiplier = function () {
    const item = this.getStage110ItemMultiplierBonuses();
    return Math.max(0, 1 + Math.max(0, Number(this.stage110Permanent?.patternBonus) || 0) + item.patternBonus);
  };

  Game.formatStage110Multiplier = function (value) {
    return `×${Math.max(0, Number(value) || 0).toFixed(2)}`;
  };

  Game.formatStage104CompactNumber = function (value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return Math.round(number).toLocaleString("ko-KR");
  };

  Game.formatStage104Money = function (value) {
    return `$${this.formatStage104CompactNumber(value)}`;
  };

  Game.compactStage104MoneyText = function (text) {
    return String(text ?? "").replace(/([+-]?)\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, (match, sign, raw) => {
      const value = Number(String(raw).replace(/,/g, ""));
      if (!Number.isFinite(value)) return match;
      return `${sign}$${Math.round(value).toLocaleString("ko-KR")}`;
    });
  };

  Game.getStage90SymbolWeightMap = function (...args) {
    const weights = previousGetStage90SymbolWeightMap.apply(this, args) || {};
    const permanent = this.stage110Permanent?.symbolWeightBonus || {};
    Object.entries(permanent).forEach(([symbolId, bonus]) => {
      if (!Object.prototype.hasOwnProperty.call(weights, symbolId)) return;
      weights[symbolId] = Math.max(0.000001, Number(weights[symbolId]) * (1 + Math.max(0, Number(bonus) || 0)));
    });

    const { errorFactor } = this.getStage110ItemMultiplierBonuses();
    if (Object.prototype.hasOwnProperty.call(weights, "ER")) {
      weights.ER = Math.max(0.000001, Number(weights.ER) * errorFactor);
    }
    return weights;
  };

  Game.calculatePatternScore = function (pattern) {
    const result = previousCalculatePatternScore.call(this, pattern);
    if (!result) return result;
    const priceMultiplier = this.getStage110PriceMultiplier();
    const patternMultiplier = this.getStage110PatternMultiplier();
    const raw = Math.max(0, Number(result.raw) || Number(result.amount) || 0) * priceMultiplier * patternMultiplier;
    const amount = raw <= 0 ? 0 : Math.max(1, Math.round(raw));
    const itemEffects = [...(result.itemEffects || [])];
    if (Math.abs(priceMultiplier - 1) > 0.0001) itemEffects.push(`가격 배수 ${this.formatStage110Multiplier(priceMultiplier)}`);
    if (Math.abs(patternMultiplier - 1) > 0.0001) itemEffects.push(`패턴 배수 ${this.formatStage110Multiplier(patternMultiplier)}`);
    return { ...result, raw, amount, itemEffects, stage110PriceMultiplier: priceMultiplier, stage110PatternMultiplier: patternMultiplier };
  };

  Game.ensureStage110ReferenceMultiplierRows = function () {
    const symbolTable = this.symbolValueTable || document.querySelector("#symbolValueTable");
    const patternTable = this.patternValueTable || document.querySelector("#patternValueTable");
    const priceMultiplier = this.getStage110PriceMultiplier();
    const patternMultiplier = this.getStage110PatternMultiplier();

    const ensureFooter = (table, className, label, value) => {
      if (!table) return;
      let row = table.querySelector(`.${className}`);
      if (!row) {
        row = document.createElement("div");
        row.className = `stage110-global-mult-row ${className}`;
        row.innerHTML = `<span>${label}</span><strong></strong>`;
        table.appendChild(row);
      }
      const strong = row.querySelector("strong");
      if (strong) strong.textContent = this.formatStage110Multiplier(value);
    };

    ensureFooter(symbolTable, "stage110-price-mult-row", "가격 배수", priceMultiplier);
    ensureFooter(patternTable, "stage110-pattern-mult-row", "패턴 배수", patternMultiplier);

    const applyInline = (table, selectors, value) => {
      if (!table) return;
      let rows = [...table.querySelectorAll(selectors.join(","))].filter((row) => !row.classList.contains("stage110-global-mult-row"));
      if (!rows.length) {
        rows = [...table.children].filter((row) => !row.classList.contains("stage110-global-mult-row"));
      }
      rows.forEach((row) => {
        let badge = row.querySelector(":scope > .stage110-inline-global-mult");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "stage110-inline-global-mult";
          row.appendChild(badge);
        }
        badge.textContent = this.formatStage110Multiplier(value);
        badge.hidden = Math.abs(value - 1) < 0.0001;
      });
    };

    applyInline(symbolTable, ["[data-symbol]", ".symbol-reference-row"], priceMultiplier);
    applyInline(patternTable, ["[data-pattern]", "[data-pattern-key]", ".pattern-reference-row"], patternMultiplier);
  };

  Game.renderDynamicReferenceTables = function (...args) {
    const result = previousRenderDynamicReferenceTables?.apply(this, args);
    this.ensureStage110ReferenceMultiplierRows();
    return result;
  };

  Game.getMaxOwnedItems = function (...args) {
    const base = previousGetMaxOwnedItems.apply(this, args);
    const permanent = Math.max(0, Math.round(Number(this.stage110Permanent?.inventoryBonus) || 0));
    const cap = Number(GAME_DATA.shop?.maxExpandedItems) || 12;
    return Math.min(cap, Math.max(1, base + permanent));
  };

  Game.isStage90InstantItem = function (item) {
    if (item?.effect?.type === "instant_ticket_exchange") return true;
    return previousIsStage90InstantItem?.call(this, item) || Boolean(item?.consumableOnPurchase);
  };

  Game.buyShopOffer = function (index, ...args) {
    const offer = this.shopOffers?.[index];
    if (offer?.effect?.type !== "instant_ticket_exchange") {
      return previousBuyShopOffer.call(this, index, ...args);
    }

    if (!offer || offer.sold || this.tickets < (Number(offer.price) || 0)) return;
    if (this.isStage100OfferPurchaseBlocked?.(offer)) {
      this.readoutDetail.textContent = `계약 제한 · ${offer.name}은 이번 마감에 구매할 수 없습니다.`;
      return;
    }

    const price = Math.max(0, Math.round(Number(offer.price) || 0));
    const granted = Math.max(0, Math.round(Number(offer.effect?.amount) || 0));
    this.tickets -= price;
    this.tickets += granted;
    offer.sold = true;
    this.readoutDetail.textContent = `${offer.name} 즉시 발동 · 🎟️ -${price} → +${granted}`;
    this.showStage90Event?.("ticket", "🎟️ 티켓 차익권", `티켓 +${Math.max(0, granted - price)}`);
    this.renderShop?.();
    this.updateAllUI?.();
  };

  Game.getItemDisplayNote = function (item) {
    const base = previousGetItemDisplayNote.call(this, item);
    const effect = item?.effect || {};
    const extras = [];
    if (effect.type === "pattern_learning") {
      extras.push(`현재 패턴 배수 +${(Number(item.stage110PatternGrowth) || 0).toFixed(2)}`);
      extras.push(`진행 ${Math.max(0, Number(item.stage110PatternProgress) || 0)} / ${Math.max(1, Number(effect.threshold) || 5)}`);
    }
    if (effect.type === "deadline_global_growth") {
      extras.push(`가격 +${(Number(item.stage110PriceGrowth) || 0).toFixed(2)}`);
      extras.push(`패턴 +${(Number(item.stage110PatternGrowth) || 0).toFixed(2)}`);
    }
    return `${base}${extras.length ? ` · ${extras.join(" · ")}` : ""}`.replace(/리롤/g, "ROLL");
  };

  Game.updateStage110PatternLearners = function (patternCount) {
    if (!Number.isFinite(patternCount) || patternCount <= 0) return;
    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect || {};
      if (effect.type !== "pattern_learning") return;
      const threshold = Math.max(1, Math.round(Number(effect.threshold) || 5));
      const step = Math.max(0, Number(effect.step) || 0.05);
      item.stage110PatternProgress = Math.max(0, Number(item.stage110PatternProgress) || 0) + patternCount;
      let gained = 0;
      while (item.stage110PatternProgress >= threshold) {
        item.stage110PatternProgress -= threshold;
        item.stage110PatternGrowth = Math.max(0, Number(item.stage110PatternGrowth) || 0) + step;
        gained += step;
      }
      if (gained > 0) this.showStage90Event?.("growth", `🧬 ${item.name}`, `패턴 배수 +${gained.toFixed(2)}`);
    });
  };

  Game.evaluateAndRenderScore = async function (...args) {
    const options = args[0] || {};
    const result = await previousEvaluateAndRenderScore.apply(this, args);
    if (options.creditWallet) {
      const count = Math.max(0, Number(this.lastPatterns?.length) || 0);
      this.updateStage110PatternLearners(count);
      this.ensureStage110ReferenceMultiplierRows();
    }
    return result;
  };

  Game.applyStage110DeadlineGrowthItems = function () {
    const key = String(this.deadlineIndex);
    if (this.stage110DeadlineGrowthKeys?.has(key)) return;
    this.stage110DeadlineGrowthKeys?.add(key);
    (this.ownedItems || []).forEach((item) => {
      const effect = item.effect || {};
      if (effect.type !== "deadline_global_growth") return;
      const priceStep = Math.max(0, Number(effect.priceStep) || 0);
      const patternStep = Math.max(0, Number(effect.patternStep) || 0);
      item.stage110PriceGrowth = Math.max(0, Number(item.stage110PriceGrowth) || 0) + priceStep;
      item.stage110PatternGrowth = Math.max(0, Number(item.stage110PatternGrowth) || 0) + patternStep;
      this.showStage90Event?.("growth", `♻️ ${item.name}`, `가격 +${priceStep.toFixed(2)} · 패턴 +${patternStep.toFixed(2)}`);
    });
  };

  Game.showDeadlineSuccess = function (...args) {
    const contractBefore = this.stage100ActiveContract;
    const entryBefore = contractBefore?._stage110LedgerId
      ? (this.stage110ContractLedger || []).find((entry) => entry.id === contractBefore._stage110LedgerId)
      : null;
    this.applyStage110DeadlineGrowthItems();
    const result = previousShowDeadlineSuccess.apply(this, args);
    if (entryBefore?.completionMode === "ROUNDS" && entryBefore.state === "active") {
      const panel = [...(this.flowOptions?.querySelectorAll(".stage100-contract-result") || [])].at(-1);
      const title = panel?.querySelector("span");
      const summary = panel?.querySelector("strong");
      if (title) title.textContent = `📄 계약 지속 · ${entryBefore.contract?.name || "계약"}`;
      if (summary) summary.textContent = `실제 라운드 ${entryBefore.remainingRounds}회 남음 · 디버프와 성공 보상 유지`;
    }
    this.ensureStage110ReferenceMultiplierRows();
    this.renderStage110ContractLedger();
    return result;
  };

  Game.formatStage100Reward = function (entry) {
    if (!entry) return "";
    const amount = Math.max(0, Number(entry.amount) || 0);
    if (entry.type === "PERM_SYMBOL_WEIGHT") return `${SYMBOL_LABELS[entry.symbolId] || entry.symbolId} 등장 가중치 +${Math.round(amount * 100)}% · 영구`;
    if (entry.type === "PERM_PRICE_MULT") return `가격 배수 +${amount.toFixed(2)} · 영구`;
    if (entry.type === "PERM_PATTERN_MULT") return `패턴 배수 +${amount.toFixed(2)} · 영구`;
    if (entry.type === "PERM_INVENTORY") return `보유 아이템 슬롯 +${Math.round(amount)} · 영구`;
    return previousFormatStage100Reward.call(this, entry).replace(/리롤/g, "ROLL");
  };

  Game.applyStage100RewardEntry = function (entry, summary) {
    if (!entry) return;
    const amount = Math.max(0, Number(entry.amount) || 0);
    this.stage110Permanent = this.stage110Permanent || { symbolWeightBonus: {}, priceBonus: 0, patternBonus: 0, inventoryBonus: 0 };

    if (entry.type === "PERM_SYMBOL_WEIGHT") {
      const symbolId = entry.symbolId;
      if (!symbolId) return;
      this.stage110Permanent.symbolWeightBonus[symbolId] = Math.max(0, Number(this.stage110Permanent.symbolWeightBonus[symbolId]) || 0) + amount;
      summary?.push(`${SYMBOL_LABELS[symbolId] || symbolId} 가중치 +${Math.round(amount * 100)}% 영구`);
      return;
    }
    if (entry.type === "PERM_PRICE_MULT") {
      this.stage110Permanent.priceBonus += amount;
      summary?.push(`가격 배수 +${amount.toFixed(2)} 영구`);
      return;
    }
    if (entry.type === "PERM_PATTERN_MULT") {
      this.stage110Permanent.patternBonus += amount;
      summary?.push(`패턴 배수 +${amount.toFixed(2)} 영구`);
      return;
    }
    if (entry.type === "PERM_INVENTORY") {
      this.stage110Permanent.inventoryBonus += Math.max(0, Math.round(amount));
      summary?.push(`보유 아이템 슬롯 +${Math.round(amount)} 영구`);
      return;
    }
    return previousApplyStage100RewardEntry.call(this, entry, summary);
  };

  Game.renderStage100ContractCard = function (contract) {
    const tier = this.getStage100TierMeta?.(contract.tier) || { icon: "•", label: contract.tier || "계약" };
    const normalRewards = (contract.rewards || []).filter((entry) => !String(entry?.type || "").startsWith("PERM_"));
    const permanentRewards = (contract.rewards || []).filter((entry) => String(entry?.type || "").startsWith("PERM_"));
    const normalText = normalRewards.map((entry) => this.formatStage100Reward(entry)).filter(Boolean).join(" · ");
    const permanentText = permanentRewards.map((entry) => this.formatStage100Reward(entry)).filter(Boolean).join(" · ");
    const durationText = contract.completionMode === "ROUNDS"
      ? `실제 ${Math.max(1, Number(contract.durationRounds) || 3)}라운드 유지`
      : "이번 마감 성공 시 완료";
    return `<button class="stage100-contract-card tier-${String(contract.tier || "STANDARD").toLowerCase()}" data-contract-action="select" data-contract-id="${contract.id}" type="button">
      <div class="stage100-contract-topline"><span class="stage100-contract-tier">${tier.icon} ${tier.label}</span><span class="stage100-contract-category">${this.escapeStage100HTML?.(contract.category) || contract.category}</span></div>
      <div class="stage100-contract-title-row"><span class="stage100-contract-icon" aria-hidden="true">${contract.icon || "📄"}</span><strong>${this.escapeStage100HTML?.(contract.name) || contract.name}</strong></div>
      <p>${this.highlightStage100Text?.(contract.note) || contract.note}</p>
      <small class="stage110-contract-duration">${durationText}</small>
      ${normalText ? `<div class="stage100-contract-reward"><span>즉시/일반 보상</span><strong>${this.escapeStage100HTML?.(normalText) || normalText}</strong></div>` : ""}
      ${permanentText ? `<div class="stage110-permanent-reward"><span>영구 빌드 보상</span><strong>${this.escapeStage100HTML?.(permanentText) || permanentText}</strong></div>` : ""}
    </button>`;
  };

  Game.getStage110ActiveContractEntries = function () {
    return (this.stage110ContractLedger || []).filter((entry) => entry?.state === "active");
  };

  Game.getStage100Effects = function (type) {
    const entries = this.getStage110ActiveContractEntries();
    const effects = entries.flatMap((entry) => (entry.contract?.effects || []).filter((effect) => effect?.type === type));
    const current = this.stage100ActiveContract;
    const currentLedgerId = current?._stage110LedgerId;
    const alreadyTracked = currentLedgerId && (this.stage110ContractLedger || []).some((entry) => entry.id === currentLedgerId);
    if (current && !alreadyTracked) {
      effects.push(...(current.effects || []).filter((effect) => effect?.type === type));
    }
    if (effects.length) return effects;
    return current ? [] : (previousGetStage100Effects?.call(this, type) || []);
  };

  Game.isStage110ContractConflict = function (contract) {
    const active = this.getStage110ActiveContractEntries();
    if (active.some((entry) => entry.contract?.id === contract?.id)) return true;
    const activeForceModes = active.flatMap((entry) => entry.contract?.effects || []).filter((effect) => effect.type === "FORCE_MODE").map((effect) => effect.modeId);
    const nextForceModes = (contract?.effects || []).filter((effect) => effect.type === "FORCE_MODE").map((effect) => effect.modeId);
    if (activeForceModes.length && nextForceModes.length && activeForceModes.some((mode) => nextForceModes.some((next) => next !== mode))) return true;
    return false;
  };

  Game.isStage100ContractEligible = function (contract, profile) {
    if (!previousIsStage100ContractEligible.call(this, contract, profile)) return false;
    return !this.isStage110ContractConflict(contract);
  };

  Game.selectStage100Contract = function (id) {
    const selected = (this.stage100ContractOffers || []).find((entry) => entry.id === id);
    const result = previousSelectStage100Contract.call(this, id);
    if (!selected || !this.stage100ActiveContract) return result;

    this.stage110ContractSeed = Math.max(0, Number(this.stage110ContractSeed) || 0) + 1;
    const entryId = `contract-${this.stage110ContractSeed}`;
    const contract = {
      ...this.stage100ActiveContract,
      effects: (this.stage100ActiveContract.effects || []).map((effect) => ({ ...effect })),
      rewards: (this.stage100ActiveContract.rewards || []).map((reward) => ({ ...reward })),
      _stage110LedgerId: entryId
    };
    const completionMode = contract.completionMode === "ROUNDS" ? "ROUNDS" : "DEADLINE";
    const remainingRounds = completionMode === "ROUNDS"
      ? Math.max(1, Math.round(Number(contract.durationRounds) || 3))
      : Math.max(0, this.getStage104RoundsLeft?.() ?? 3);
    const entry = { id: entryId, contract, state: "active", completionMode, remainingRounds, startedDeadline: this.deadlineNumber };
    this.stage110ContractLedger.push(entry);
    this.stage100ActiveContract = contract;
    this.stage104ContractRoundsRemaining = remainingRounds;
    this.renderStage110ContractLedger();
    this.updateAllUI?.();
    return result;
  };

  Game.skipStage100Contract = function (...args) {
    const result = previousSkipStage100Contract.apply(this, args);
    this.renderStage110ContractLedger();
    return result;
  };

  Game.grantStage110EntryRewards = function (entry, reason = "계약 완료") {
    if (!entry || entry.state !== "active") return [];
    const summary = [];
    this.stage100ContractStreak = Math.max(0, Number(this.stage100ContractStreak) || 0) + 1;
    (entry.contract?.rewards || []).forEach((reward) => this.applyStage100RewardEntry(reward, summary));
    if (this.stage100ContractStreak === 5 && this.stage100PendingNextBonuses) {
      this.stage100PendingNextBonuses.shinyBonus += 0.03;
      summary.push("5연승 보너스 · 다음 마감 SHINY +3%p");
    }
    entry.state = "completed";
    entry.completedReason = reason;
    entry.remainingRounds = 0;
    if (this.stage100ActiveContract?._stage110LedgerId === entry.id) {
      this.stage100ActiveContract = null;
      this.stage104ContractRoundsRemaining = null;
    }
    this.showStage90Event?.("contract", `📄 ${entry.contract?.name || "계약"} 완료`, summary.join(" · ") || "영구 보상 적용");
    this.renderStage110ContractLedger();
    this.ensureStage110ReferenceMultiplierRows();
    return summary;
  };

  Game.grantStage100ContractReward = function (...args) {
    const current = this.stage100ActiveContract;
    const entry = current?._stage110LedgerId
      ? (this.stage110ContractLedger || []).find((candidate) => candidate.id === current._stage110LedgerId)
      : null;

    if (!entry) return previousGrantStage100ContractReward.apply(this, args);
    if (entry.completionMode === "ROUNDS" && entry.state === "active" && entry.remainingRounds > 0) {
      this.stage100ContractResultSummary = [`계약 지속 · ${entry.remainingRounds}라운드 남음`];
      return [...this.stage100ContractResultSummary];
    }

    const summary = previousGrantStage100ContractReward.apply(this, args) || [];
    if (entry.state === "active") {
      entry.state = "completed";
      entry.remainingRounds = 0;
      entry.completedReason = "마감 성공";
    }
    this.renderStage110ContractLedger();
    return summary;
  };

  Game.resolveRound = async function (...args) {
    const countedRound = Boolean(this.roundStarted && !this.finalPaymentPhase && !this.gameOver && !this.runComplete);
    const result = await previousResolveRound.apply(this, args);
    if (countedRound) {
      const active = [...this.getStage110ActiveContractEntries()];
      active.forEach((entry) => {
        entry.remainingRounds = Math.max(0, Math.round(Number(entry.remainingRounds) || 0) - 1);
        if (entry.completionMode === "ROUNDS" && entry.remainingRounds <= 0) {
          this.grantStage110EntryRewards(entry, "3라운드 완료");
        }
      });
      this.renderStage110ContractLedger();
    }
    return result;
  };

  Game.ensureStage110ContractLedger = function () {
    const panel = this.machinePanel || document.querySelector("#machinePanel");
    if (!panel) return null;
    let ledger = panel.querySelector("#stage110ContractLedger");
    if (!ledger) {
      ledger = document.createElement("div");
      ledger.id = "stage110ContractLedger";
      ledger.className = "stage110-contract-ledger";
      ledger.hidden = true;
      panel.appendChild(ledger);
    }
    return ledger;
  };

  Game.renderStage110ContractLedger = function () {
    const ledger = this.ensureStage110ContractLedger();
    if (!ledger) return;
    const entries = this.stage110ContractLedger || [];
    ledger.hidden = entries.length === 0;
    if (!entries.length) {
      ledger.replaceChildren();
      return;
    }

    ledger.innerHTML = entries.map((entry) => {
      const contract = entry.contract || {};
      const tier = String(contract.tier || "STANDARD").toLowerCase();
      const isActive = entry.state === "active";
      const permanent = (contract.rewards || []).filter((reward) => String(reward?.type || "").startsWith("PERM_")).map((reward) => this.formatStage100Reward(reward)).join(" · ");
      const normal = (contract.rewards || []).filter((reward) => !String(reward?.type || "").startsWith("PERM_")).map((reward) => this.formatStage100Reward(reward)).join(" · ");
      return `<div class="stage110-contract-token ${isActive ? `is-active tier-${tier}` : "is-completed"}">
        <span class="stage110-contract-token-icon" aria-hidden="true">${contract.icon || "📄"}${isActive ? `<b>${Math.max(0, Math.round(Number(entry.remainingRounds) || 0))}</b>` : ""}</span>
        <div class="stage110-contract-token-tooltip">
          <strong>${this.escapeStage100HTML?.(contract.name) || contract.name || "계약"}</strong>
          <span>${isActive ? (this.highlightStage100Text?.(contract.note) || contract.note || "") : "디버프 종료 · 영구 버프 활성화"}</span>
          ${isActive ? `<small>남은 기간 · ${Math.max(0, Math.round(Number(entry.remainingRounds) || 0))}라운드</small>` : ""}
          ${normal ? `<small>${this.escapeStage100HTML?.(normal) || normal}</small>` : ""}
          ${permanent ? `<b>영구 효과 · ${this.escapeStage100HTML?.(permanent) || permanent}</b>` : ""}
        </div>
      </div>`;
    }).join("");
  };

  Game.showStage100ContractOffer = function (...args) {
    const result = previousShowStage100ContractOffer.apply(this, args);
    if (this.flowOverlay?.classList.contains("is-contract-modal")) {
      const intro = this.flowText?.querySelector(".stage100-contract-intro");
      if (intro) intro.textContent = `이번 마감에 새 계약 1개를 선택할 수 있습니다. 현재 유지 중 계약 ${this.getStage110ActiveContractEntries().length}개.`;
    }
    return result;
  };

  Game.updateStatsRail = function (...args) {
    const result = previousUpdateStatsRail?.apply(this, args);
    const grid = this.runStatsGrid || document.querySelector("#runStatsGrid");
    if (!grid) return result;
    grid.querySelector(".stage110-luck-stat")?.remove();
    const shinyLuck = (this.getStage96ShinyItems?.("LUCK") || []).length * 0.12;
    const activeLuck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    const luck = shinyLuck + activeLuck;
    grid.insertAdjacentHTML("beforeend", `<div class="stat-reference-row stage110-luck-stat"><span>🍀 행운</span><strong>${luck.toFixed(2)}</strong></div>`);
    return result;
  };

  Game.ensureStage110ActivationLog = function () {
    const stage = document.querySelector(".machine-stage");
    if (!stage) return null;
    let host = stage.querySelector("#stage110ActivationLog");
    if (!host) {
      host = document.createElement("div");
      host.id = "stage110ActivationLog";
      host.className = "stage110-activation-log";
      host.hidden = true;
      stage.appendChild(host);
    }
    return host;
  };

  Game.enqueueStage110ActivationLog = function (kind, title, detail = "") {
    if (!title) return;
    this.stage110ActivationQueue = this.stage110ActivationQueue || [];
    this.stage110ActivationQueue.push({ kind: kind || "event", title: String(title), detail: String(detail || "") });
    this.stage110ActivationBusy = true;
    this.processStage110ActivationQueue();
  };

  Game.processStage110ActivationQueue = async function () {
    if (this.stage110ActivationRunning) return;
    this.stage110ActivationRunning = true;
    const host = this.ensureStage110ActivationLog();
    if (host) host.hidden = false;

    while ((this.stage110ActivationQueue || []).length) {
      const event = this.stage110ActivationQueue.shift();
      if (!event || !host) continue;
      const chip = document.createElement("div");
      chip.className = `stage110-activation-chip kind-${String(event.kind).replace(/[^a-z0-9_-]/gi, "")}`;
      chip.innerHTML = `<strong>${this.escapeStage100HTML?.(event.title) || event.title}</strong>${event.detail ? `<small>${this.escapeStage100HTML?.(event.detail) || event.detail}</small>` : ""}`;
      host.appendChild(chip);
      if (typeof this.wait === "function") await this.wait(430); else await new Promise((resolve) => setTimeout(resolve, 430));
      chip.classList.add("is-leaving");
      if (typeof this.wait === "function") await this.wait(150); else await new Promise((resolve) => setTimeout(resolve, 150));
      chip.remove();
    }

    if (host) host.hidden = true;
    this.stage110ActivationRunning = false;
    this.stage110ActivationBusy = false;
    this.flushStage110PendingRoll();
  };

  Game.flushStage110PendingRoll = function () {
    if (!this.stage110PendingRoll) return;
    if (this.stage110ActivationBusy || this.stage110ActivationRunning || this.isSpinning || this.isResolvingRound) {
      window.setTimeout(() => this.flushStage110PendingRoll(), 60);
      return;
    }
    const valid = Boolean(!this.gameOver && !this.runComplete && !this.finalPaymentPhase && this.currentMode && this.spinsRemaining > 0 && !this.shopOpen && !this.flowOverlay?.classList.contains("is-open"));
    this.stage110PendingRoll = false;
    this.syncStage110RollCopy();
    if (valid) this.spin();
  };

  Game.showStage90Event = function (kind, title, detail = "", ...rest) {
    const result = previousShowStage90Event?.call(this, kind, title, detail, ...rest);
    this.enqueueStage110ActivationLog(kind, title, detail);
    return result;
  };

  Game.renderTriggerActivation = function (item, bonus, depth, activationIndex, context) {
    const result = previousRenderTriggerActivation?.call(this, item, bonus, depth, activationIndex, context);
    if (item?.name) this.enqueueStage110ActivationLog("trigger", `${item.name} 발동`, `+$${Math.round(Number(bonus) || 0).toLocaleString("ko-KR")}`);
    return result;
  };

  Game.spin = async function (...args) {
    if (this.stage110ActivationBusy || this.stage110ActivationRunning) {
      const canReserve = Boolean(!this.gameOver && !this.runComplete && !this.finalPaymentPhase && this.currentMode && this.spinsRemaining > 0 && !this.shopOpen);
      if (canReserve) {
        this.stage110PendingRoll = true;
        this.syncStage110RollCopy();
      }
      return;
    }
    return await previousSpin.apply(this, args);
  };

  Game.syncStage110RollCopy = function () {
    const spinButton = this.spinButton || document.querySelector("#spinButton");
    if (spinButton) {
      if (this.isResolvingRound) spinButton.textContent = "정산 중";
      else if (this.stage110PendingRoll) spinButton.textContent = "↻ ROLL 예약됨";
      else if (this.isSpinning) spinButton.textContent = "↻ ROLL 중";
      else spinButton.textContent = "↻ ROLL";
    }

    this.roundPrepPanel?.querySelectorAll("button[data-prep-mode]").forEach((button) => {
      const strong = button.querySelector("strong");
      const mode = GAME_DATA.deadline?.modes?.[button.dataset.prepMode];
      if (strong && mode) strong.textContent = `↻ ROLL ${mode.spins}회`;
    });
  };

  Game.updateStage110VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.1.0";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.1.0";
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.syncStage110RollCopy();
    this.ensureStage110ReferenceMultiplierRows();
    this.renderStage110ContractLedger();
    this.updateStage110VersionUI();
    this.updateStatsRail?.();
    const oldDock = document.querySelector("#stage105SlotMeta .stage105-contract-dock");
    if (oldDock) oldDock.hidden = true;
    return result;
  };

  Game.init = function () {
    this.resetStage110State();
    this.patchStage110Data();
    const result = previousInit.call(this);
    this.patchStage110Data();
    this.ensureStage110ContractLedger();
    this.ensureStage110ActivationLog();
    this.ensureStage110ReferenceMultiplierRows();
    this.renderStage110ContractLedger();
    this.syncStage110RollCopy();
    this.updateStage110VersionUI();
    this.stage = 10;
    this.status = "BUILD_IDENTITY_110";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.1.0 Build Identity Update loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    this.resetStage110State();
    const result = previousRestartRun.apply(this, args);
    this.patchStage110Data();
    this.ensureStage110ContractLedger();
    this.ensureStage110ActivationLog();
    this.ensureStage110ReferenceMultiplierRows();
    this.renderStage110ContractLedger();
    this.syncStage110RollCopy();
    this.updateStage110VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };

  Game.patchStage110Data();
})();
