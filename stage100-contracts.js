// DEADLINE — v1.0.0 Stage 10 Contracts runtime
"use strict";

(() => {
  GAME_DATA.version = "v1.0.0";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousShowDeadlineSuccess = Game.showDeadlineSuccess;
  const previousShowGameOver = Game.showGameOver;
  const previousShowRoundChoice = Game.showRoundChoice;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousGetShopRerollCost = Game.getShopRerollCost;
  const previousRerollShop = Game.rerollShop;
  const previousOpenPrepShop = Game.openPrepShop;
  const previousRenderShop = Game.renderShop;
  const previousBuyShopOffer = Game.buyShopOffer;
  const previousCanSellItemsNow = Game.canSellItemsNow;
  const previousGetMaxOwnedItems = Game.getMaxOwnedItems;
  const previousApplyStage96ShinyRoll = Game.applyStage96ShinyRoll;
  const previousGenerateShopOffers = Game.generateShopOffers;
  const previousGetStage96ShinyItems = Game.getStage96ShinyItems;
  const previousGetStage90SymbolWeightMap = Game.getStage90SymbolWeightMap;
  const previousCalculatePatternScore = Game.calculatePatternScore;
  const previousDetectPatterns = Game.detectPatterns;
  const previousGetSequentialPatterns = Game.getSequentialPatterns;
  const previousGetStage90RetriggerCount = Game.getStage90RetriggerCount;
  const previousGetStage90RetriggerMultiplier = Game.getStage90RetriggerMultiplier;
  const previousRollStage90ModifiersForSymbol = Game.rollStage90ModifiersForSymbol;
  const previousGetStage90CellModifiers = Game.getStage90CellModifiers;
  const previousRunTriggerQueueForPattern = Game.runTriggerQueueForPattern;
  const previousGetTriggerBonusAmount = Game.getTriggerBonusAmount;
  const previousProcessStage94Errors = Game.processStage94Errors;
  const previousCanFundVault = Game.canFundVault;
  const previousSelectVaultTerm = Game.selectVaultTerm;
  const previousDepositVaultUnit = Game.depositVaultUnit;
  const previousRenderVaultControls = Game.renderVaultControls;
  const previousTogglePreparedMode = Game.togglePreparedMode;
  const previousBeginPreparedRound = Game.beginPreparedRound;
  const previousDepositDeadlineUnit = Game.depositDeadlineUnit;

  const EMPTY_BONUSES = () => ({ shinyBonus:0, freeRerolls:0, extraOffers:0, rareGuarantee:0, interestBonus:0 });
  const HIGH_SYMBOLS = new Set(["DM","CR","SV"]);
  const LOW_SYMBOLS = new Set(["CH","CO"]);
  const TRIGGER_TYPES = new Set(["trigger_pattern_bonus","trigger_bonus_amplify","trigger_chain_threshold"]);
  const RETRIGGER_TYPES = new Set(["pattern_retrigger_chance","retrigger_every","retrigger_highest","retrigger_mult","retrigger_round_ramp"]);

  Game.resetStage100State = function () {
    this.stage100ActiveContract = null;
    this.stage100ContractOffers = [];
    this.stage100OfferDeadlineKey = null;
    this.stage100ContractStreak = 0;
    this.stage100RewardedDeadlineKeys = new Set();
    this.stage100RecentContractIds = [];
    this.stage100PendingNextBonuses = EMPTY_BONUSES();
    this.stage100DeadlineBonuses = EMPTY_BONUSES();
    this.stage100ShopVisits = 0;
    this.stage100DepositedThisDeadline = false;
    this.stage100ChaosFactors = {};
    this.stage100FrozenCash = 0;
    this.stage100PendingSupplyCount = 0;
    this.stage100SupplyChoices = [];
    this.stage100ContractResultSummary = [];
  };

  Game.getStage100Effects = function (type) {
    return (this.stage100ActiveContract?.effects || []).filter((effect) => effect?.type === type);
  };

  Game.getStage100Effect = function (type) {
    return this.getStage100Effects(type)[0] || null;
  };

  Game.hasStage100Effect = function (type) {
    return this.getStage100Effects(type).length > 0;
  };

  Game.getStage100EffectMultiplier = function (type, fallback = 1) {
    const effects = this.getStage100Effects(type);
    if (!effects.length) return fallback;
    return effects.reduce((factor, effect) => factor * (Number(effect.factor) || 1), fallback);
  };

  Game.escapeStage100HTML = function (value) {
    return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  };

  Game.highlightStage100Text = function (value) {
    const escaped = this.escapeStage100HTML(value);
    return escaped.replace(/(ERROR|WILD|JACKPOT|SHINY|Trigger|Retrigger|Round\s*[123]|[+-]?\d+(?:\.\d+)?%|[×x]\d+(?:\.\d+)?|\d+회)/g,'<strong class="stage100-inline-emphasis">$1</strong>');
  };

  Game.getStage100BuildProfile = function () {
    const items = this.ownedItems || [];
    const profile = { trigger:0, retrigger:0, modifier:0, shiny:0, wild:0, error:0, items:items.length };
    items.forEach((item) => {
      const effect = item.effect || {};
      if (TRIGGER_TYPES.has(effect.type)) profile.trigger += 1;
      if (RETRIGGER_TYPES.has(effect.type) || (effect.type === "modifier_generator" && effect.modifier === "REPEAT")) profile.retrigger += 1;
      if (effect.type === "modifier_generator" || effect.type === "modifier_slots") profile.modifier += 1;
      if (item.shiny) profile.shiny += 1;
      if (effect.type?.includes("wild") || item.shinyTraitId === "VARIANT") profile.wild += 1;
      if (effect.type?.startsWith("error_") || Number(effect.errorWeightAdd) > 0) profile.error += 1;
    });
    return profile;
  };

  Game.isStage100ContractEligible = function (contract, profile = this.getStage100BuildProfile()) {
    if (!contract) return false;
    const requires = contract.requires || [];
    if (requires.includes("vault") && this.deadlineNumber < (GAME_DATA.economy?.vaultUnlockDeadline || 3)) return false;
    if (requires.includes("trigger") && profile.trigger <= 0) return false;
    if (requires.includes("retrigger") && profile.retrigger <= 0) return false;
    if (requires.includes("modifier") && profile.modifier <= 0) return false;
    if (requires.includes("shiny") && profile.shiny <= 0) return false;
    if (requires.includes("items3") && profile.items < 3) return false;
    if (requires.includes("sellable") && profile.items <= 0) return false;
    return true;
  };

  Game.getStage100ContractWeight = function (contract, profile, usedCategories = new Set()) {
    let weight = 1;
    if (usedCategories.has(contract.category)) weight *= 0.58;
    if (this.stage100RecentContractIds.includes(contract.id)) weight *= 0.18;
    (contract.tags || []).forEach((tag) => {
      if ((tag === "wild" && profile.wild > 0) || (tag === "error" && profile.error > 0)) weight *= 2.1;
    });
    if (contract.tier === "EXTREME" && this.deadlineNumber <= 2) weight *= 0.78;
    return Math.max(0.01, weight);
  };

  Game.pickStage100WeightedContract = function (pool, profile, usedIds, usedCategories) {
    const candidates = pool.filter((contract) => !usedIds.has(contract.id));
    if (!candidates.length) return null;
    const weighted = candidates.map((contract) => ({ contract, weight:this.getStage100ContractWeight(contract, profile, usedCategories) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0) || 1;
    let cursor = Math.random() * total;
    for (const entry of weighted) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.contract;
    }
    return weighted.at(-1)?.contract || null;
  };

  Game.generateStage100ContractOffers = function () {
    const profile = this.getStage100BuildProfile();
    const eligible = (GAME_DATA.contracts || []).filter((contract) => this.isStage100ContractEligible(contract, profile));
    const usedIds = new Set();
    const usedCategories = new Set();
    const offers = [];
    const takeTier = (tier, count) => {
      const pool = eligible.filter((contract) => contract.tier === tier);
      for (let i=0;i<count;i+=1) {
        const picked = this.pickStage100WeightedContract(pool, profile, usedIds, usedCategories);
        if (!picked) break;
        offers.push(picked); usedIds.add(picked.id); usedCategories.add(picked.category);
      }
    };
    takeTier("STANDARD",2); takeTier("RISK",1); takeTier("EXTREME",1);
    while (offers.length < 4) {
      const picked = this.pickStage100WeightedContract(eligible, profile, usedIds, usedCategories);
      if (!picked) break;
      offers.push(picked); usedIds.add(picked.id); usedCategories.add(picked.category);
    }
    this.stage100ContractOffers = offers;
    this.stage100OfferDeadlineKey = String(this.deadlineIndex);
    this.stage100RecentContractIds = [...this.stage100RecentContractIds, ...offers.map((entry) => entry.id)].slice(-12);
    return offers;
  };

  Game.formatStage100Reward = function (entry) {
    if (!entry) return "";
    const amount = Number(entry.amount) || 0;
    if (entry.type === "TICKETS") return `🎟️ +${amount}`;
    if (entry.type === "SHINY_BONUS") return `다음 마감 SHINY +${Math.round(amount*100)}%p`;
    if (entry.type === "FREE_REROLL") return `다음 마감 무료 새로고침 ${amount}회`;
    if (entry.type === "EXTRA_OFFER") return `다음 상점 제안 +${amount}`;
    if (entry.type === "RARE_GUARANTEE") return `다음 상점 RARE+ ${amount}칸 보장`;
    if (entry.type === "INTEREST_BONUS") return `다음 마감 계좌 이자 +${Math.round(amount*100)}%p`;
    if (entry.type === "SUPPLY") return `계약 보급품 선택 ${amount}회`;
    return entry.type;
  };

  Game.getStage100TierMeta = function (tier) {
    return GAME_DATA.contractTiers?.[tier] || { label:tier, icon:"•" };
  };

  Game.renderStage100ContractCard = function (contract) {
    const tier = this.getStage100TierMeta(contract.tier);
    const rewardText = (contract.rewards || []).map((entry) => this.formatStage100Reward(entry)).join(" · ");
    return `<button class="stage100-contract-card tier-${contract.tier.toLowerCase()}" data-contract-action="select" data-contract-id="${contract.id}" type="button"><div class="stage100-contract-topline"><span class="stage100-contract-tier">${tier.icon} ${tier.label}</span><span class="stage100-contract-category">${this.escapeStage100HTML(contract.category)}</span></div><div class="stage100-contract-title-row"><span class="stage100-contract-icon" aria-hidden="true">${contract.icon || "📄"}</span><strong>${this.escapeStage100HTML(contract.name)}</strong></div><p>${this.highlightStage100Text(contract.note)}</p><div class="stage100-contract-reward"><span>성공 보상</span><strong>${this.escapeStage100HTML(rewardText)}</strong></div></button>`;
  };

  Game.describeStage100DeadlineBonuses = function () {
    const bonus = this.stage100DeadlineBonuses || EMPTY_BONUSES();
    const parts = [];
    if (bonus.shinyBonus > 0) parts.push(`SHINY +${Math.round(bonus.shinyBonus*100)}%p`);
    if (bonus.freeRerolls > 0) parts.push(`무료 새로고침 ${bonus.freeRerolls}회`);
    if (bonus.extraOffers > 0) parts.push(`상점 제안 +${bonus.extraOffers}`);
    if (bonus.rareGuarantee > 0) parts.push(`RARE+ ${bonus.rareGuarantee}칸`);
    if (bonus.interestBonus > 0) parts.push(`계좌 이자 +${Math.round(bonus.interestBonus*100)}%p`);
    return parts.join(" · ");
  };

  Game.showStage100ContractOffer = function () {
    if (this.deadlineNumber < 2 || this.gameOver || this.runComplete || this.finalPaymentPhase) return;
    const offers = this.generateStage100ContractOffers();
    if (!offers.length) return;
    this.shopOpen = false;
    this.flowOverlay?.classList.remove("is-shop-modal");
    this.flowOverlay?.classList.add("is-contract-modal");
    this.flowOptions?.classList.remove("shop-layout","mode-only","has-vault-setup");
    this.flowOptions?.classList.add("stage100-contract-layout");
    if (this.shopCloseButton) this.shopCloseButton.hidden = true;
    this.flowEyebrow.textContent = `STAGE 10 · 마감 ${this.deadlineNumber}`;
    this.flowTitle.textContent = "계약 선택";
    const activeBonus = this.describeStage100DeadlineBonuses();
    this.flowText.innerHTML = `<span class="stage100-contract-intro">이번 마감에 적용할 추가 조건을 최대 1개 선택합니다.</span>${activeBonus ? `<span class="stage100-carry-bonus">이전 계약 보너스 · ${this.escapeStage100HTML(activeBonus)}</span>` : ""}`;
    this.flowOptions.innerHTML = `<div class="stage100-contract-grid">${offers.map((contract) => this.renderStage100ContractCard(contract)).join("")}</div><button class="stage100-contract-skip" type="button" data-contract-action="skip">계약 없이 진행</button>`;
    this.flowFooter.textContent = "계약을 선택하지 않아도 기존 연승은 유지됩니다.";
    this.openFlowOverlay();
  };

  Game.closeStage100ContractOverlay = function () {
    this.flowOverlay?.classList.remove("is-contract-modal");
    this.flowOptions?.classList.remove("stage100-contract-layout");
    this.closeFlowOverlay?.();
  };

  Game.selectStage100Contract = function (id) {
    const contract = (this.stage100ContractOffers || []).find((entry) => entry.id === id);
    if (!contract) return;
    this.stage100ActiveContract = contract;
    this.stage100DepositedThisDeadline = false;
    this.stage100ShopVisits = 0;
    this.stage100ChaosFactors = {};
    const freeze = this.getStage100Effect("FREEZE_WALLET_RATIO");
    if (freeze) {
      const amount = Math.max(0, Math.floor((Number(this.wallet)||0) * Math.max(0,Number(freeze.ratio)||0)));
      this.stage100FrozenCash = amount;
      this.wallet = Math.max(0, this.wallet - amount);
    }
    this.closeStage100ContractOverlay();
    this.readoutDetail.textContent = `계약 체결 · ${contract.name}`;
    this.updateAllUI?.();
  };

  Game.skipStage100Contract = function () {
    this.stage100ActiveContract = null;
    this.stage100FrozenCash = 0;
    this.closeStage100ContractOverlay();
    this.readoutDetail.textContent = "계약 없이 이번 마감을 진행합니다.";
    this.updateAllUI?.();
  };

  Game.ensureStage100StatusChips = function () {
    const host = document.querySelector(".top-status");
    if (!host) return;
    if (!this.stage100ContractChip) {
      const chip = document.createElement("div"); chip.id="stage100ContractChip"; chip.className="status-chip stage100-contract-status"; chip.hidden=true;
      host.insertBefore(chip, document.querySelector("#deadlineRiskChip") || null); this.stage100ContractChip=chip;
    }
    if (!this.stage100StreakChip) {
      const chip = document.createElement("div"); chip.id="stage100StreakChip"; chip.className="status-chip stage100-streak-status"; chip.hidden=true;
      host.insertBefore(chip, document.querySelector("#deadlineRiskChip") || null); this.stage100StreakChip=chip;
    }
  };

  Game.updateStage100StatusChips = function () {
    this.ensureStage100StatusChips();
    const contract = this.stage100ActiveContract;
    if (this.stage100ContractChip) {
      this.stage100ContractChip.hidden = !contract;
      if (contract) {
        const tier = this.getStage100TierMeta(contract.tier);
        this.stage100ContractChip.className = `status-chip stage100-contract-status tier-${contract.tier.toLowerCase()}`;
        this.stage100ContractChip.textContent = `${tier.icon} ${contract.name}`;
        this.stage100ContractChip.title = contract.note;
      }
    }
    if (this.stage100StreakChip) {
      this.stage100StreakChip.hidden = (this.stage100ContractStreak||0) <= 0;
      this.stage100StreakChip.textContent = `CONTRACT STREAK ×${this.stage100ContractStreak||0}`;
    }
  };

  Game.getShopRerollCost = function (...args) {
    if ((this.stage100DeadlineBonuses?.freeRerolls||0) > 0) return 0;
    const base = previousGetShopRerollCost.apply(this,args);
    const factor = this.getStage100EffectMultiplier("SHOP_REROLL_MULT",1);
    return base <= 0 ? base : Math.max(1,Math.round(base*factor));
  };

  Game.rerollShop = function (...args) {
    if (this.hasStage100Effect("NO_SHOP_REROLL")) { this.readoutDetail.textContent="계약 제한 · 이번 마감은 상점 새로고침을 사용할 수 없습니다."; return; }
    const beforeCount = Number(this.stage96DeadlineShopRerolls)||0;
    const nativeFree = Boolean(this.isStage96NextShopRerollFree?.());
    const contractFree = (this.stage100DeadlineBonuses?.freeRerolls||0)>0;
    const result = previousRerollShop.apply(this,args);
    const afterCount = Number(this.stage96DeadlineShopRerolls)||0;
    if (afterCount>beforeCount && contractFree && !nativeFree) this.stage100DeadlineBonuses.freeRerolls=Math.max(0,this.stage100DeadlineBonuses.freeRerolls-1);
    return result;
  };

  Game.openPrepShop = function (...args) {
    const maxVisit = this.getStage100Effect("SHOP_MAX_VISITS");
    if (maxVisit && this.stage100ShopVisits >= Math.max(1,Number(maxVisit.count)||1)) { this.readoutDetail.textContent="계약 제한 · 이번 마감의 상점 이용 횟수를 모두 사용했습니다."; return; }
    if (this.hasStage100Effect("SHOP_REQUIRES_DEPOSIT") && !this.stage100DepositedThisDeadline) { this.readoutDetail.textContent="계약 제한 · 이번 마감에서 마감 계좌에 먼저 납부해야 합니다."; return; }
    const wasOpen=Boolean(this.shopOpen); const result=previousOpenPrepShop.apply(this,args); if (!wasOpen && this.shopOpen) this.stage100ShopVisits+=1; return result;
  };

  Game.canSellItemsNow = function (...args) { if (this.hasStage100Effect("NO_SELL")) return false; return previousCanSellItemsNow.apply(this,args); };

  Game.isStage100OfferPurchaseBlocked = function (offer) {
    if (!offer) return false;
    const rarityBlock=this.getStage100Effect("BLOCK_RARITIES");
    if (rarityBlock?.rarities?.includes(offer.rarity)) return true;
    if (this.hasStage100Effect("BLOCK_SHINY_PURCHASE") && offer.shiny) return true;
    return false;
  };

  Game.buyShopOffer = function (index,...args) {
    const offer=this.shopOffers?.[index];
    if (this.isStage100OfferPurchaseBlocked(offer)) { this.readoutDetail.textContent=`계약 제한 · ${offer?.name || "이 아이템"}은 이번 마감에 구매할 수 없습니다.`; return; }
    return previousBuyShopOffer.call(this,index,...args);
  };

  Game.renderShop = function (...args) {
    const result=previousRenderShop.apply(this,args); if (!this.shopOpen) return result;
    const reroll=this.flowOptions?.querySelector("button[data-shop-action='reroll']");
    if (reroll && this.hasStage100Effect("NO_SHOP_REROLL")) { reroll.disabled=true; reroll.textContent="↻ 새로고침 · 계약 금지"; reroll.classList.add("stage100-contract-blocked"); }
    this.flowOptions?.querySelectorAll("button[data-offer-index]").forEach((button)=>{ const index=Number(button.dataset.offerIndex); const offer=this.shopOffers?.[index]; if (!this.isStage100OfferPurchaseBlocked(offer)) return; button.disabled=true; button.classList.add("stage100-contract-blocked"); const price=button.querySelector(".stage99-card-price"); if (price) price.textContent="계약 제한"; });
    return result;
  };

  Game.getMaxOwnedItems = function (...args) {
    const base=previousGetMaxOwnedItems.apply(this,args);
    const reduction=this.getStage100Effects("INVENTORY_CAP_MINUS").reduce((sum,effect)=>sum+Math.max(0,Number(effect.amount)||0),0);
    return Math.max(1,base-reduction);
  };

  Game.applyStage96ShinyRoll = function (offer) {
    const baseChance=Number(GAME_DATA.shop.shinyChance)||0.04;
    const bonus=Math.max(0,Number(this.stage100DeadlineBonuses?.shinyBonus)||0);
    GAME_DATA.shop.shinyChance=Math.min(0.35,baseChance+bonus);
    try { return previousApplyStage96ShinyRoll.call(this,offer); } finally { GAME_DATA.shop.shinyChance=baseChance; }
  };

  Game.getStage100RareSupplyCandidate = function (blockedIds=new Set()) {
    const candidates=(GAME_DATA.items||[]).filter((item)=>item && !blockedIds.has(item.id) && ["RARE","EPIC","LEGENDARY"].includes(item.rarity) && !this.isStage90ItemBlockedFromShop?.(item) && !(this.ownedItems||[]).some((owned)=>owned.id===item.id));
    if (!candidates.length) return null;
    return {...candidates[Math.floor(Math.random()*candidates.length)]};
  };

  Game.generateShopOffers = function (...args) {
    const baseCount=Number(GAME_DATA.shop.offerCount)||6;
    const extra=Math.max(0,Number(this.stage100DeadlineBonuses?.extraOffers)||0);
    GAME_DATA.shop.offerCount=Math.min(8,baseCount+extra);
    let result;
    try { result=previousGenerateShopOffers.apply(this,args); } finally { GAME_DATA.shop.offerCount=baseCount; }
    let guarantees=Math.max(0,Number(this.stage100DeadlineBonuses?.rareGuarantee)||0);
    if (guarantees>0 && Array.isArray(this.shopOffers)) {
      const blocked=new Set(this.shopOffers.map((offer)=>offer?.id).filter(Boolean));
      for (let index=0;index<this.shopOffers.length && guarantees>0;index+=1) {
        if (this.shopOffers[index]?.rarity!=="COMMON") continue;
        const replacement=this.getStage100RareSupplyCandidate(blocked); if (!replacement) break;
        this.applyStage96ShinyRoll?.(replacement); this.shopOffers[index]=replacement; blocked.add(replacement.id); guarantees-=1;
      }
    }
    return result;
  };

  Game.getStage96ShinyItems = function (traitId=null) { if (this.hasStage100Effect("DISABLE_SHINY_TRAITS")) return []; return previousGetStage96ShinyItems.call(this,traitId); };

  Game.getStage90SymbolWeightMap = function (...args) {
    const weights=previousGetStage90SymbolWeightMap.apply(this,args);
    this.getStage100Effects("BAN_SYMBOL").forEach((effect)=>{ if (Object.prototype.hasOwnProperty.call(weights,effect.symbolId)) weights[effect.symbolId]=0.000001; });
    const highMult=this.getStage100EffectMultiplier("HIGH_WEIGHT_MULT",1), lowMult=this.getStage100EffectMultiplier("LOW_WEIGHT_MULT",1), errorMult=this.getStage100EffectMultiplier("ERROR_WEIGHT_MULT",1);
    Object.keys(weights).forEach((id)=>{ if (HIGH_SYMBOLS.has(id)) weights[id]=Math.max(0.000001,weights[id]*highMult); if (LOW_SYMBOLS.has(id)) weights[id]=Math.max(0.000001,weights[id]*lowMult); if (id==="ER") weights[id]=Math.max(0.000001,weights[id]*errorMult); if (this.hasStage100Effect("CHAOS_WEIGHTS")) weights[id]=Math.max(0.000001,weights[id]*(Number(this.stage100ChaosFactors?.[id])||1)); });
    return weights;
  };

  Game.calculatePatternScore = function (pattern) {
    const result=previousCalculatePatternScore.call(this,pattern);
    let factor=this.getStage100EffectMultiplier("SCORE_GLOBAL_MULT",1);
    if (HIGH_SYMBOLS.has(pattern.symbol?.id)) factor*=this.getStage100EffectMultiplier("HIGH_SYMBOL_SCORE_MULT",1);
    if (LOW_SYMBOLS.has(pattern.symbol?.id)) factor*=this.getStage100EffectMultiplier("LOW_SYMBOL_SCORE_MULT",1);
    if ((pattern.coords?.length||0)===3) factor*=this.getStage100EffectMultiplier("THREE_CELL_MULT",1);
    if ((pattern.coords?.length||0)>=5) factor*=this.getStage100EffectMultiplier("FIVE_PLUS_MULT",1);
    this.getStage100Effects("ROUND_SCORE_MULT").forEach((effect)=>{ if (Object.prototype.hasOwnProperty.call(effect.rounds||{},this.round)) factor*=Number(effect.rounds[this.round]); });
    if (factor===1) return result;
    const amount=factor<=0 ? 0 : Math.max(1,Math.round((Number(result.amount)||0)*factor));
    return {...result,raw:(Number(result.raw)||0)*factor,amount,itemEffects:[...(result.itemEffects||[]),`📄 ${this.stage100ActiveContract?.name || "계약"} ×${factor.toFixed(2)}`]};
  };

  Game.detectPatterns = function (...args) {
    let patterns=previousDetectPatterns.apply(this,args)||[];
    const banned=new Set(this.getStage100Effects("BAN_PATTERN_KEYS").flatMap((effect)=>effect.keys||[]));
    if (banned.size) patterns=patterns.filter((pattern)=>!banned.has(pattern.key));
    const allowedEffects=this.getStage100Effects("ALLOW_PATTERN_KEYS");
    if (allowedEffects.length) { const allowed=new Set(allowedEffects.flatMap((effect)=>effect.keys||[])); patterns=patterns.filter((pattern)=>allowed.has(pattern.key)); }
    return patterns;
  };

  Game.getSequentialPatterns = function (...args) {
    let sequence=previousGetSequentialPatterns.apply(this,args)||[];
    if (this.hasStage100Effect("HIGHEST_ONLY") && sequence.length) { let best=sequence[0]; sequence.forEach((pattern)=>{ if ((Number(pattern.amount)||0)>(Number(best.amount)||0)) best=pattern; }); sequence=[best]; }
    if (this.hasStage100Effect("UNIQUE_PATTERN_ONLY") && sequence.length) { const bestByKey=new Map(); sequence.forEach((pattern)=>{ const previous=bestByKey.get(pattern.key); if (!previous || (Number(pattern.amount)||0)>(Number(previous.amount)||0)) bestByKey.set(pattern.key,pattern); }); sequence=sequence.filter((pattern)=>bestByKey.get(pattern.key)===pattern); }
    this.stage96LastSequentialPattern=sequence.at(-1)||null; return sequence;
  };

  Game.getStage90RetriggerCount = function (pattern,context={}) { if (this.hasStage100Effect("NO_RETRIGGER")) return 0; return previousGetStage90RetriggerCount.call(this,pattern,context); };
  Game.getStage90RetriggerMultiplier = function (...args) { return previousGetStage90RetriggerMultiplier.apply(this,args)*this.getStage100EffectMultiplier("RETRIGGER_MULT",1); };
  Game.rollStage90ModifiersForSymbol = function (symbol) { if (this.hasStage100Effect("NO_MODIFIERS")) return []; return previousRollStage90ModifiersForSymbol.call(this,symbol); };
  Game.getStage90CellModifiers = function (col,row) { let modifiers=previousGetStage90CellModifiers.call(this,col,row)||[]; const blocked=new Set(this.getStage100Effects("BLOCK_MODIFIER").map((effect)=>effect.modifier)); if (blocked.size) modifiers=modifiers.filter((modifier)=>!blocked.has(modifier)); return modifiers; };

  Game.runTriggerQueueForPattern = async function (...args) {
    const caps=this.getStage100Effects("TRIGGER_CAP"); if (!caps.length) return previousRunTriggerQueueForPattern.apply(this,args);
    const oldCap=GAME_DATA.triggers.maxActivationsPerPattern;
    const contractCap=Math.min(...caps.map((effect)=>Math.max(1,Number(effect.count)||oldCap)));
    GAME_DATA.triggers.maxActivationsPerPattern=Math.min(oldCap,contractCap);
    try { return await previousRunTriggerQueueForPattern.apply(this,args); } finally { GAME_DATA.triggers.maxActivationsPerPattern=oldCap; }
  };

  Game.getTriggerBonusAmount = function (...args) { const base=previousGetTriggerBonusAmount.apply(this,args); return Math.max(0,Math.round(base*this.getStage100EffectMultiplier("TRIGGER_BONUS_MULT",1))); };

  Game.processStage94Errors = async function (...args) {
    const result=await previousProcessStage94Errors.apply(this,args);
    const factor=this.getStage100EffectMultiplier("ERROR_CASH_MULT",1);
    if (factor!==1 && (Number(this.stage94PendingCash)||0)>0) { const before=Number(this.stage94PendingCash)||0; this.stage94PendingCash=Math.max(0,Math.round(before*factor)); this.showStage90Event?.("error","📄 계약 ERROR 증폭",`×${factor.toFixed(2)}`); }
    return result;
  };

  Game.applyStage95DeadlineInterest = function () {
    const baseRate=Number(GAME_DATA.economy.deadlineAccountRoundRate)||0.10;
    const shinyBonus=this.hasStage100Effect("DISABLE_SHINY_TRAITS") ? 0 : Math.min(0.05,(previousGetStage96ShinyItems.call(this,"COMPOUND")||[]).length*0.01);
    const rewardBonus=Math.max(0,Number(this.stage100DeadlineBonuses?.interestBonus)||0);
    let rate=baseRate+shinyBonus+rewardBonus;
    const setEffect=this.getStage100Effect("INTEREST_SET"); if (setEffect) rate=Math.max(0,Number(setEffect.rate)||0);
    rate*=this.getStage100EffectMultiplier("INTEREST_MULT",1);
    const before=Math.max(0,Number(this.deadlinePaid)||0), interest=Math.max(0,Math.floor(before*rate)), after=before+interest;
    this.deadlinePaid=after; this.paymentCommitted=after; this.stage95PendingDeadlineInterest={before,interest,after,rate};
    if (interest>0) { EffectsManager.showCurrencyGain?.(this.deadlinePaidValue,interest); this.animateCurrency?.(this.deadlinePaidValue,before,after); }
    this.updateAllUI?.(); return this.stage95PendingDeadlineInterest;
  };

  Game.canFundVault = function (...args) { if (this.hasStage100Effect("VAULT_DISABLED")) return false; return previousCanFundVault.apply(this,args); };
  Game.selectVaultTerm = function (...args) { if (this.hasStage100Effect("VAULT_DISABLED")) return; return previousSelectVaultTerm.apply(this,args); };
  Game.depositVaultUnit = function (...args) { if (this.hasStage100Effect("VAULT_DISABLED")) return; return previousDepositVaultUnit.apply(this,args); };
  Game.renderVaultControls = function (...args) { const result=previousRenderVaultControls.apply(this,args); if (this.hasStage100Effect("VAULT_DISABLED") && this.vaultControls) this.vaultControls.innerHTML='<div class="stage100-vault-contract-lock">🔒 계약으로 이번 마감 신규 예치 불가</div>'; return result; };

  Game.getStage100ForcedMode = function () { return this.getStage100Effect("FORCE_MODE")?.modeId || null; };
  Game.togglePreparedMode = function (modeId) { const forced=this.getStage100ForcedMode(); if (forced && modeId!==forced) { this.readoutDetail.textContent=`계약 제한 · ${forced==="RISK" ? "3회" : "7회"} 리롤 모드만 선택할 수 있습니다.`; return; } return previousTogglePreparedMode.call(this,modeId); };
  Game.beginPreparedRound = function (...args) { const forced=this.getStage100ForcedMode(); if (forced && this.selectedRoundModeId!==forced) { this.readoutDetail.textContent=`계약 제한 · ${forced==="RISK" ? "3회" : "7회"} 리롤 모드를 선택하세요.`; return; } if (this.hasStage100Effect("CHAOS_WEIGHTS")) { this.stage100ChaosFactors={}; (GAME_DATA.symbols||[]).forEach((symbol)=>{ this.stage100ChaosFactors[symbol.id]=0.55+Math.random(); }); } else this.stage100ChaosFactors={}; return previousBeginPreparedRound.apply(this,args); };
  Game.depositDeadlineUnit = async function (...args) { const before=Math.max(0,Number(this.deadlinePaid)||0); const result=await previousDepositDeadlineUnit.apply(this,args); if ((Number(this.deadlinePaid)||0)>before) this.stage100DepositedThisDeadline=true; return result; };

  Game.failStage100Contract = function (reason) {
    const contract=this.stage100ActiveContract; this.stage100ContractStreak=0; this.gameOver=true; this.finalPaymentPhase=false; this.roundStarted=false; this.currentMode=null; this.spinsRemaining=0; this.spinsTotal=0; this.isResolvingRound=false;
    this.spinButton.disabled=true; this.patternTestButton.disabled=true; this.stageStatus.textContent="10단계 · 계약 실패";
    this.flowOverlay?.classList.remove("is-shop-modal","is-contract-modal"); this.flowOptions?.classList.remove("shop-layout","stage100-contract-layout");
    this.flowEyebrow.textContent=`마감 ${this.deadlineNumber} · 계약 실패`; this.flowTitle.textContent=contract ? `${contract.icon || "📄"} ${contract.name}` : "마감 실패"; this.flowText.textContent=reason || "계약 조건을 충족하지 못했습니다.";
    this.flowOptions.innerHTML='<button class="flow-primary danger" data-action="restart-run"><span>RESTART</span><strong>처음부터 다시 시작</strong></button>'; this.flowFooter.textContent="계약 연승이 초기화되었습니다."; this.openFlowOverlay(); this.updateAllUI?.();
  };

  Game.showRoundChoice = function (...args) { const early=this.getStage100Effect("CLEAR_BY_ROUND"); if (early && this.round>Math.max(1,Number(early.round)||2) && this.deadlinePaid<this.deadlineTarget) { this.failStage100Contract(`Round ${early.round}까지 마감 목표를 달성하지 못했습니다.`); return; } return previousShowRoundChoice.apply(this,args); };
  Game.showGameOver = function (...args) { if (this.hasStage100Effect("NO_FINAL_PAYMENT") && !this.finalPaymentPhase && !this.lastSettlement && this.round>=this.roundsPerDeadline && this.deadlinePaid<this.deadlineTarget) { this.failStage100Contract("0라운드 최종 납부가 계약으로 금지되어 마감에 실패했습니다."); return; } const result=previousShowGameOver.apply(this,args); if (this.gameOver && !this.runComplete) this.stage100ContractStreak=0; return result; };

  Game.applyStage100RewardEntry = function (entry,summary) {
    const amount=Number(entry?.amount)||0; if (!entry) return;
    if (entry.type==="TICKETS") { const streakFactor=this.stage100ContractStreak>=3 ? 1.2 : 1; const granted=Math.max(0,Math.round(amount*streakFactor)); this.tickets+=granted; summary.push(`🎟️ +${granted}${streakFactor>1 ? " · 연승 +20%" : ""}`); return; }
    if (entry.type==="SHINY_BONUS") { this.stage100PendingNextBonuses.shinyBonus+=Math.max(0,amount); summary.push(`다음 마감 SHINY +${Math.round(amount*100)}%p`); return; }
    if (entry.type==="FREE_REROLL") { this.stage100PendingNextBonuses.freeRerolls+=Math.max(0,Math.round(amount)); summary.push(`다음 마감 무료 새로고침 ${Math.round(amount)}회`); return; }
    if (entry.type==="EXTRA_OFFER") { this.stage100PendingNextBonuses.extraOffers+=Math.max(0,Math.round(amount)); summary.push(`다음 상점 제안 +${Math.round(amount)}`); return; }
    if (entry.type==="RARE_GUARANTEE") { this.stage100PendingNextBonuses.rareGuarantee+=Math.max(0,Math.round(amount)); summary.push(`다음 상점 RARE+ ${Math.round(amount)}칸`); return; }
    if (entry.type==="INTEREST_BONUS") { this.stage100PendingNextBonuses.interestBonus+=Math.max(0,amount); summary.push(`다음 마감 계좌 이자 +${Math.round(amount*100)}%p`); return; }
    if (entry.type==="SUPPLY") { this.stage100PendingSupplyCount+=Math.max(0,Math.round(amount)); summary.push("계약 보급품 선택"); }
  };

  Game.grantStage100ContractReward = function () {
    const contract=this.stage100ActiveContract, key=String(this.deadlineIndex); if (!contract || this.stage100RewardedDeadlineKeys.has(key)) return [];
    this.stage100RewardedDeadlineKeys.add(key); this.stage100ContractStreak+=1; const summary=[]; (contract.rewards||[]).forEach((entry)=>this.applyStage100RewardEntry(entry,summary));
    if (this.stage100ContractStreak===5) { this.stage100PendingNextBonuses.shinyBonus+=0.03; summary.push("5연승 보너스 · 다음 마감 SHINY +3%p"); }
    this.stage100ContractResultSummary=summary; return summary;
  };

  Game.restoreStage100FrozenCash = function () { const amount=Math.max(0,Math.round(Number(this.stage100FrozenCash)||0)); if (amount<=0) return 0; this.wallet+=amount; this.stage100FrozenCash=0; return amount; };

  Game.makeStage100SupplyChoices = function () {
    if ((this.stage100PendingSupplyCount||0)<=0 || (this.ownedItems||[]).length>=this.getMaxOwnedItems()) return [];
    const blocked=new Set((this.ownedItems||[]).map((item)=>item.id));
    const candidates=(GAME_DATA.items||[]).filter((item)=>item && !blocked.has(item.id) && !this.isStage90InstantItem?.(item) && !this.isStage90ItemBlockedFromShop?.(item));
    const picks=[], pool=[...candidates]; while (picks.length<3 && pool.length) { const index=Math.floor(Math.random()*pool.length); picks.push({...pool.splice(index,1)[0]}); }
    this.stage100SupplyChoices=picks; return picks;
  };

  Game.renderStage100SupplyPanel = function () {
    const choices=this.makeStage100SupplyChoices();
    if (!choices.length) { if (this.stage100PendingSupplyCount>0) { this.stage100PendingSupplyCount=0; this.tickets+=2; this.stage100ContractResultSummary.push("보급품 공간 부족 → 🎟️ +2"); this.updateAllUI?.(); } return false; }
    this.flowOptions?.insertAdjacentHTML("beforeend",`<section class="stage100-supply-panel"><div class="stage100-supply-heading"><span>계약 보급품</span><strong>1개 선택</strong></div><div class="stage100-supply-grid">${choices.map((item,index)=>`<button type="button" data-contract-action="supply" data-supply-index="${index}"><span>${item.icon || "◆"}</span><strong>${this.escapeStage100HTML(item.name)}</strong><small>${this.escapeStage100HTML(item.note || "")}</small></button>`).join("")}</div></section>`); return true;
  };

  Game.takeStage100Supply = function (index) {
    const item=this.stage100SupplyChoices?.[index]; if (!item || (this.ownedItems||[]).length>=this.getMaxOwnedItems()) return;
    this.itemInstanceSeed=Math.max(0,Number(this.itemInstanceSeed)||0)+1; const instance={...item,instanceId:`item-${this.itemInstanceSeed}`}; this.ensureStage90ItemState?.(instance); this.ownedItems.push(instance); this.stage100PendingSupplyCount=0; this.stage100SupplyChoices=[];
    const panel=this.flowOptions?.querySelector(".stage100-supply-panel"); if (panel) panel.innerHTML=`<div class="stage100-supply-picked">🎁 ${this.escapeStage100HTML(instance.name)} 획득</div>`; this.updateAllUI?.();
    window.clearTimeout(this.autoAdvanceTimer); this.autoAdvanceTimer=window.setTimeout(()=>{ if (!this.gameOver && !this.runComplete && this.lastSettlement) this.advanceDeadline(); },700);
  };

  Game.showDeadlineSuccess = function (settlement) {
    const contract=this.stage100ActiveContract; const returnedCash=this.restoreStage100FrozenCash(); const summary=this.grantStage100ContractReward(); const result=previousShowDeadlineSuccess.call(this,settlement);
    if (contract) { const panel=this.flowOptions?.querySelector(".auto-advance-panel") || this.flowOptions; panel?.insertAdjacentHTML("beforeend",`<div class="stage100-contract-result tier-${contract.tier.toLowerCase()}"><span>📄 계약 성공 · ${this.escapeStage100HTML(contract.name)}</span><strong>${this.escapeStage100HTML(summary.join(" · ") || "보상 적용")}</strong>${returnedCash>0 ? `<small>동결 자금 +$${returnedCash.toLocaleString("ko-KR")} 반환</small>` : ""}<small>CONTRACT STREAK ×${this.stage100ContractStreak}</small></div>`); }
    if (this.stage100PendingSupplyCount>0 && !this.runComplete) { window.clearTimeout(this.autoAdvanceTimer); this.autoAdvanceTimer=null; const waiting=this.renderStage100SupplyPanel(); if (!waiting) this.autoAdvanceTimer=window.setTimeout(()=>{ if (!this.gameOver && !this.runComplete && this.lastSettlement) this.advanceDeadline(); },700); }
    this.updateAllUI?.(); return result;
  };

  Game.activateStage100PendingBonuses = function () {
    this.stage100DeadlineBonuses={ shinyBonus:Math.max(0,Number(this.stage100PendingNextBonuses?.shinyBonus)||0), freeRerolls:Math.max(0,Math.round(Number(this.stage100PendingNextBonuses?.freeRerolls)||0)), extraOffers:Math.max(0,Math.round(Number(this.stage100PendingNextBonuses?.extraOffers)||0)), rareGuarantee:Math.max(0,Math.round(Number(this.stage100PendingNextBonuses?.rareGuarantee)||0)), interestBonus:Math.max(0,Number(this.stage100PendingNextBonuses?.interestBonus)||0) };
    this.stage100PendingNextBonuses=EMPTY_BONUSES();
  };

  Game.advanceDeadline = function (...args) {
    this.stage100ActiveContract=null; this.stage100ContractOffers=[]; this.stage100OfferDeadlineKey=null; this.stage100ShopVisits=0; this.stage100DepositedThisDeadline=false; this.stage100ChaosFactors={}; this.stage100FrozenCash=0; this.stage100SupplyChoices=[];
    const result=previousAdvanceDeadline.apply(this,args); this.activateStage100PendingBonuses(); this.updateAllUI?.();
    if (!this.gameOver && !this.runComplete && this.deadlineNumber>=2) requestAnimationFrame(()=>this.showStage100ContractOffer());
    return result;
  };

  Game.updateAllUI = function (...args) {
    const result=previousUpdateAllUI.apply(this,args); this.updateStage100StatusChips();
    const forced=this.getStage100ForcedMode(); this.roundPrepPanel?.querySelectorAll("button[data-prep-mode]").forEach((button)=>{ const blocked=Boolean(forced && button.dataset.prepMode!==forced); if (blocked) { button.disabled=true; button.classList.add("stage100-mode-blocked"); button.title="현재 계약으로 선택할 수 없습니다."; } else button.classList.remove("stage100-mode-blocked"); });
    if (this.stageStatus?.textContent?.startsWith("9단계")) this.stageStatus.textContent=this.stageStatus.textContent.replace(/^9단계/,"10단계");
    return result;
  };

  Game.bindStage100ContractInputs = function () {
    if (!this.flowOptions || this.flowOptions.dataset.stage100Bound==="1") return;
    this.flowOptions.dataset.stage100Bound="1";
    this.flowOptions.addEventListener("click",(event)=>{ const button=event.target.closest("button[data-contract-action]"); if (!button) return; const action=button.dataset.contractAction; if (action==="select") this.selectStage100Contract(button.dataset.contractId); if (action==="skip") this.skipStage100Contract(); if (action==="supply") this.takeStage100Supply(Number(button.dataset.supplyIndex)); });
  };

  Game.init = function () {
    this.resetStage100State(); previousInit.call(this); this.bindStage100ContractInputs(); this.ensureStage100StatusChips(); this.stage=10; this.status="CONTRACTS_STAGE10"; if (this.stageStatus) this.stageStatus.textContent=this.roundPreparation ? "10단계 · 라운드 준비" : "10단계 · 계약 시스템"; this.updateAllUI?.(); console.info(`DEADLINE ${GAME_DATA.version}: Stage 10 Contracts loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage100State(); const result=previousRestartRun.apply(this,args); this.resetStage100State(); this.bindStage100ContractInputs(); this.ensureStage100StatusChips(); this.stage=10; this.updateAllUI?.(); return result;
  };
})();
