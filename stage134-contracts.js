// DEADLINE — v1.3.4 contract build-direction overhaul
"use strict";
(() => {
  const V = "v1.3.4";
  const SYMBOL_LABELS = {
    CH:"🍒 체리", CO:"🪙 코인", BL:"🔔 벨", ST:"⭐ 스타",
    DM:"💎 다이아", CR:"👑 크라운", SV:"7️⃣ 세븐", WD:"🃏 WILD", ER:"⚠️ ERROR"
  };
  const TIER_FACTOR = { STANDARD:1.25, RISK:1.5, EXTREME:2 };
  const TIER_TICKETS = { STANDARD:2, RISK:3, EXTREME:5 };

  const prev = {
    init: Game.init,
    restart: Game.restartRun,
    update: Game.updateAllUI,
    formatReward: Game.formatStage100Reward,
    applyReward: Game.applyStage100RewardEntry,
    weights: Game.getStage90SymbolWeightMap,
    priceMult: Game.getStage110PriceMultiplier,
    patternMult: Game.getStage110PatternMultiplier,
    score: Game.calculatePatternScore,
    vaultRate: Game.getVaultCurrentRate,
    vaultRound: Game.advanceVaultRound,
    shinyRoll: Game.applyStage96ShinyRoll,
    rarityWeights: Game.getStage90RarityWeights,
    rollChance: Game.rollStage90Chance,
    triggerBonus: Game.getTriggerBonusAmount
  };

  const NEW_CONTRACTS = [
    { id:"cherry_scarcity", tier:"STANDARD", category:"SYMBOL", icon:"🍒", name:"체리 품귀", note:"이번 마감 동안 🍒 등장 가중치가 50% 감소합니다.", effects:[{type:"SYMBOL_WEIGHT_MULT",symbolId:"CH",factor:.5}], rewards:[{type:"TICKETS",amount:2},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CH",factor:1.35}] },
    { id:"coin_control", tier:"STANDARD", category:"SYMBOL", icon:"🪙", name:"화폐 통제", note:"이번 마감 동안 🪙 등장 가중치가 50% 감소합니다.", effects:[{type:"SYMBOL_WEIGHT_MULT",symbolId:"CO",factor:.5}], rewards:[{type:"TICKETS",amount:2},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CO",factor:1.35}] },
    { id:"bell_shutdown", tier:"RISK", category:"SYMBOL", icon:"🔔", name:"종 생산 중단", note:"이번 마감 동안 🔔 등장 가중치가 65% 감소합니다.", effects:[{type:"SYMBOL_WEIGHT_MULT",symbolId:"BL",factor:.35}], rewards:[{type:"TICKETS",amount:3},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"BL",factor:1.6}] },
    { id:"starlight_regulation", tier:"RISK", category:"SYMBOL", icon:"⭐", name:"별빛 규제", note:"이번 마감 동안 ⭐ 등장 가중치가 65% 감소합니다.", effects:[{type:"SYMBOL_WEIGHT_MULT",symbolId:"ST",factor:.35}], rewards:[{type:"TICKETS",amount:3},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"ST",factor:1.6}] },
    { id:"diamond_blockade", tier:"EXTREME", category:"SYMBOL", icon:"💎", name:"다이아몬드 봉쇄", note:"이번 마감 동안 💎가 등장하지 않습니다.", effects:[{type:"BAN_SYMBOL",symbolId:"DM"}], rewards:[{type:"TICKETS",amount:5},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"DM",factor:2}] },
    { id:"crown_collapse", tier:"EXTREME", category:"SYMBOL", icon:"👑", name:"왕실 몰락", note:"이번 마감 동안 👑이 등장하지 않습니다.", effects:[{type:"BAN_SYMBOL",symbolId:"CR"}], rewards:[{type:"TICKETS",amount:5},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CR",factor:2}] },
    { id:"working_class_economy", tier:"RISK", category:"SYMBOL", icon:"🏭", name:"서민 경제", note:"이번 마감 동안 💎·👑·7️⃣ 등장 가중치가 70% 감소합니다.", effects:[{type:"HIGH_WEIGHT_MULT",factor:.3}], rewards:[{type:"TICKETS",amount:4},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CH",factor:1.5},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CO",factor:1.5},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"BL",factor:1.5}] },
    { id:"upper_class_market", tier:"EXTREME", category:"SYMBOL", icon:"🏛️", name:"상류층 시장", note:"이번 마감 동안 🍒·🪙·🔔이 등장하지 않습니다.", effects:[{type:"BAN_SYMBOL",symbolId:"CH"},{type:"BAN_SYMBOL",symbolId:"CO"},{type:"BAN_SYMBOL",symbolId:"BL"}], rewards:[{type:"TICKETS",amount:5},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"DM",factor:2},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CR",factor:2},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"SV",factor:2}] }
  ];

  const specificPermanentRewards = (c) => {
    const f = TIER_FACTOR[c.tier] || 1.25;
    switch (c.id) {
      case "common_market": return [{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CH",factor:1.35},{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"CO",factor:1.35}];
      case "scarce_market": return ["DM","CR","SV"].map(symbolId=>({type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId,factor:1.5}));
      case "seven_ban": return [{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"SV",factor:2}];
      case "wild_ban": return [{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"WD",factor:2}];
      case "unstable_market": return [{type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId:"ER",factor:1.6}];
      case "luxury_tax": return ["DM","CR","SV"].map(symbolId=>({type:"PERM_SYMBOL_WEIGHT_FACTOR",symbolId,factor:1.5}));
      case "chaos_market": return [{type:"PERM_PRICE_FACTOR",factor:2}];
      case "geometry_only": return [{type:"PERM_PATTERN_KEYS_FACTOR",keys:["V","INV_V","X","JACKPOT"],factor:2}];
      case "single_settlement": return [{type:"PERM_PATTERN_FACTOR",factor:2}];
      case "zero_interest": return [{type:"PERM_VAULT_RATE_ADD",amount:.15}];
      case "vault_lockdown": return [{type:"PERM_VAULT_RATE_FACTOR",factor:1.5}];
      case "compound_tax": return [{type:"PERM_VAULT_RATE_FACTOR",factor:2}];
      case "premium_market": return [{type:"PERM_PRICE_FACTOR",factor:2}];
      case "rarity_control": return [{type:"PERM_RARITY_FACTOR",factor:1.5}];
      case "shiny_suppression": return [{type:"PERM_SHINY_FACTOR",factor:1.5}];
      case "shiny_embargo": return [{type:"PERM_SHINY_FACTOR",factor:2}];
      case "one_visit": return [{type:"PERM_RARITY_FACTOR",factor:1.5}];
      case "narrow_storage": return [{type:"PERM_INVENTORY",amount:2}];
      case "no_retrigger": return [{type:"PERM_RETRIGGER_CHANCE_FACTOR",factor:1.5}];
      case "no_modifiers": return [{type:"PERM_MODIFIER_CHANCE_FACTOR",factor:1.6}];
      case "golden_regulation": return [{type:"PERM_MODIFIER_CHANCE_FACTOR",modifier:"GOLDEN",factor:1.3}];
      case "broken_chain": return [{type:"PERM_MODIFIER_CHANCE_FACTOR",modifier:"CHAIN",factor:1.3}];
      case "chain_limit":
      case "overload": return [{type:"PERM_TRIGGER_BONUS_FACTOR",factor:1.5}];
      case "compressed_chain": return [{type:"PERM_TRIGGER_BONUS_FACTOR",factor:2},{type:"PERM_RETRIGGER_CHANCE_FACTOR",factor:2}];
      default: break;
    }
    if (c.category === "PATTERN" || c.category === "ROUND") return [{type:"PERM_PATTERN_FACTOR",factor:f}];
    if (c.category === "ECONOMY") return c.tier === "EXTREME" ? [{type:"PERM_VAULT_RATE_FACTOR",factor:2}] : [{type:"PERM_VAULT_RATE_ADD",amount:c.tier === "RISK" ? .10 : .05}];
    if (c.category === "SHOP") return [{type:"PERM_SHINY_FACTOR",factor:f}];
    if (c.category === "CHAIN") return [{type:"PERM_TRIGGER_BONUS_FACTOR",factor:f}];
    if (c.category === "SYMBOL") return [{type:"PERM_PRICE_FACTOR",factor:f}];
    return [{type:"PERM_PATTERN_FACTOR",factor:f}];
  };

  Game.patchStage134Contracts = function () {
    GAME_DATA.version = V;
    const contracts = GAME_DATA.contracts || (GAME_DATA.contracts = []);
    for (const fresh of NEW_CONTRACTS) {
      if (!contracts.some(c=>c.id===fresh.id)) contracts.push({...fresh,effects:fresh.effects.map(e=>({...e})),rewards:fresh.rewards.map(r=>({...r}))});
    }
    const byId = new Map(contracts.map(c=>[c.id,c]));
    if (byId.get("seven_ban")) byId.get("seven_ban").tier = "EXTREME";
    if (byId.get("wild_ban")) byId.get("wild_ban").tier = "EXTREME";

    for (const c of contracts) {
      if (!c) continue;
      const minTickets = TIER_TICKETS[c.tier] || 2;
      const normal = (c.rewards || []).filter(r=>!String(r?.type||"").startsWith("PERM_"));
      let ticket = normal.find(r=>r?.type==="TICKETS");
      if (!ticket) { ticket={type:"TICKETS",amount:minTickets}; normal.unshift(ticket); }
      else ticket.amount = Math.max(minTickets, Number(ticket.amount)||0);
      const specificNew = NEW_CONTRACTS.find(n=>n.id===c.id);
      const permanent = specificNew
        ? specificNew.rewards.filter(r=>String(r?.type||"").startsWith("PERM_")).map(r=>({...r}))
        : specificPermanentRewards(c);
      c.rewards = [...normal, ...permanent];
      c.stage110RewardAssigned = true;
    }
  };

  Game.s134Reset = function () {
    this.stage134Permanent = {
      symbolWeightFactors:{}, priceFactor:1, patternFactor:1, patternKeyFactors:{},
      vaultRateAdd:0, vaultRateFactor:1, shinyFactor:1, rarityFactor:1,
      modifierChanceFactor:1, modifierFactors:{}, retriggerChanceFactor:1, triggerBonusFactor:1
    };
  };
  Game.s134Perm = function () {
    if (!this.stage134Permanent) this.s134Reset();
    return this.stage134Permanent;
  };

  Game.formatStage100Reward = function (entry) {
    if (!entry) return "";
    const f = Number(entry.factor)||1;
    if (entry.type === "PERM_SYMBOL_WEIGHT_FACTOR") return `${SYMBOL_LABELS[entry.symbolId]||entry.symbolId} 등장 가중치 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_PRICE_FACTOR") return `모든 심볼 가격 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_PATTERN_FACTOR") return `모든 패턴 가치 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_PATTERN_KEYS_FACTOR") return `${(entry.keys||[]).join("/")} 가치 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_VAULT_RATE_ADD") return `금고 이자 +${Math.round((Number(entry.amount)||0)*100)}%p · 영구`;
    if (entry.type === "PERM_VAULT_RATE_FACTOR") return `금고 이자 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_SHINY_FACTOR") return `SHINY 기본 확률 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_RARITY_FACTOR") return `EPIC/LEGENDARY 등장 가중치 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_MODIFIER_CHANCE_FACTOR") return `${entry.modifier ? entry.modifier : "모든 Modifier"} 생성 확률 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_RETRIGGER_CHANCE_FACTOR") return `재발동 확률 ×${f.toFixed(2)} · 영구`;
    if (entry.type === "PERM_TRIGGER_BONUS_FACTOR") return `Trigger 지급액 ×${f.toFixed(2)} · 영구`;
    return prev.formatReward ? prev.formatReward.call(this,entry) : String(entry.type||"");
  };

  Game.applyStage100RewardEntry = function (entry, summary) {
    if (!entry) return;
    const p = this.s134Perm();
    const f = Math.max(1,Number(entry.factor)||1);
    if (entry.type === "PERM_SYMBOL_WEIGHT_FACTOR") {
      const id=entry.symbolId;if(!id)return;p.symbolWeightFactors[id]=(Number(p.symbolWeightFactors[id])||1)*f;
      summary?.push(`${SYMBOL_LABELS[id]||id} 등장 가중치 ×${f.toFixed(2)} 영구`);return;
    }
    if (entry.type === "PERM_PRICE_FACTOR") { p.priceFactor*=f; summary?.push(`모든 심볼 가격 ×${f.toFixed(2)} 영구`); return; }
    if (entry.type === "PERM_PATTERN_FACTOR") { p.patternFactor*=f; summary?.push(`모든 패턴 가치 ×${f.toFixed(2)} 영구`); return; }
    if (entry.type === "PERM_PATTERN_KEYS_FACTOR") { for(const key of entry.keys||[]) p.patternKeyFactors[key]=(Number(p.patternKeyFactors[key])||1)*f; summary?.push(`${(entry.keys||[]).join("/")} ×${f.toFixed(2)} 영구`); return; }
    if (entry.type === "PERM_VAULT_RATE_ADD") { const a=Math.max(0,Number(entry.amount)||0);p.vaultRateAdd+=a;summary?.push(`금고 이자 +${Math.round(a*100)}%p 영구`);return; }
    if (entry.type === "PERM_VAULT_RATE_FACTOR") { p.vaultRateFactor*=f;summary?.push(`금고 이자 ×${f.toFixed(2)} 영구`);return; }
    if (entry.type === "PERM_SHINY_FACTOR") { p.shinyFactor*=f;summary?.push(`SHINY 확률 ×${f.toFixed(2)} 영구`);return; }
    if (entry.type === "PERM_RARITY_FACTOR") { p.rarityFactor*=f;summary?.push(`EPIC/LEGENDARY 가중치 ×${f.toFixed(2)} 영구`);return; }
    if (entry.type === "PERM_MODIFIER_CHANCE_FACTOR") { if(entry.modifier)p.modifierFactors[entry.modifier]=(Number(p.modifierFactors[entry.modifier])||1)*f;else p.modifierChanceFactor*=f;summary?.push(`${entry.modifier||"Modifier"} 생성 확률 ×${f.toFixed(2)} 영구`);return; }
    if (entry.type === "PERM_RETRIGGER_CHANCE_FACTOR") { p.retriggerChanceFactor*=f;summary?.push(`재발동 확률 ×${f.toFixed(2)} 영구`);return; }
    if (entry.type === "PERM_TRIGGER_BONUS_FACTOR") { p.triggerBonusFactor*=f;summary?.push(`Trigger 지급액 ×${f.toFixed(2)} 영구`);return; }
    return prev.applyReward?.call(this,entry,summary);
  };

  Game.getStage110PriceMultiplier = function (...args) {
    const base = prev.priceMult ? prev.priceMult.apply(this,args) : 1;
    return Math.max(0,Number(base)||0) * this.s134Perm().priceFactor;
  };
  Game.getStage110PatternMultiplier = function (...args) {
    const base = prev.patternMult ? prev.patternMult.apply(this,args) : 1;
    return Math.max(0,Number(base)||0) * this.s134Perm().patternFactor;
  };
  Game.getStage90SymbolWeightMap = function (...args) {
    const weights = prev.weights ? (prev.weights.apply(this,args)||{}) : {};
    const p = this.s134Perm();
    for (const [id,f] of Object.entries(p.symbolWeightFactors||{})) if(Object.prototype.hasOwnProperty.call(weights,id)) weights[id]=Math.max(.000001,Number(weights[id])*Math.max(0,Number(f)||1));
    for (const e of this.getStage100Effects?.("SYMBOL_WEIGHT_MULT")||[]) if(e?.symbolId&&Object.prototype.hasOwnProperty.call(weights,e.symbolId)) weights[e.symbolId]=Math.max(.000001,Number(weights[e.symbolId])*(Number(e.factor)||1));
    return weights;
  };
  Game.calculatePatternScore = function (pattern) {
    const r = prev.score ? prev.score.call(this,pattern) : null;if(!r)return r;
    const f=Math.max(1,Number(this.s134Perm().patternKeyFactors?.[pattern?.key])||1);if(f===1)return r;
    const raw=Math.max(0,Number(r.raw)||Number(r.amount)||0)*f;
    return {...r,raw,amount:raw<=0?0:Math.max(1,Math.round(raw)),itemEffects:[...(r.itemEffects||[]),`📄 영구 ${pattern.key} ×${f.toFixed(2)}`]};
  };

  Game.getVaultCurrentRate = function (...args) {
    const base=prev.vaultRate?prev.vaultRate.apply(this,args):0,p=this.s134Perm();
    return Math.max(0,(Math.max(0,Number(base)||0)+p.vaultRateAdd)*p.vaultRateFactor);
  };
  Game.advanceVaultRound = function (...args) {
    const ev=prev.vaultRound?prev.vaultRound.apply(this,args):null;if(!ev)return ev;
    const p=this.s134Perm(),rate=Math.max(0,(Math.max(0,Number(ev.rate)||0)+p.vaultRateAdd)*p.vaultRateFactor);
    const wanted=Math.max(0,Math.floor((Number(ev.before)||0)*rate)),extra=Math.max(0,wanted-Math.max(0,Number(ev.interest)||0));
    if(extra>0){ev.interest=wanted;ev.after=Math.max(0,Number(ev.after)||0)+extra;if(ev.type==="MATURED"){this.wallet=Math.max(0,Number(this.wallet)||0)+extra;ev.walletAfterMaturity=Math.max(0,Number(ev.walletAfterMaturity)||0)+extra;}else if(this.vaultDeposit){this.vaultDeposit.currentAmount=Math.max(0,Number(this.vaultDeposit.currentAmount)||0)+extra;this.bank=this.vaultDeposit.currentAmount;}}
    ev.rate=rate;return ev;
  };

  Game.applyStage96ShinyRoll = function (offer) {
    if(!prev.shinyRoll)return offer;const base=Number(GAME_DATA.shop.shinyChance)||.04,f=this.s134Perm().shinyFactor;GAME_DATA.shop.shinyChance=Math.min(.5,base*f);
    try{return prev.shinyRoll.call(this,offer);}finally{GAME_DATA.shop.shinyChance=base;}
  };
  Game.getStage90RarityWeights = function (...args) {
    const w={...(prev.rarityWeights?prev.rarityWeights.apply(this,args):{})},f=this.s134Perm().rarityFactor;
    if(f!==1){if(Number.isFinite(Number(w.EPIC)))w.EPIC*=f;if(Number.isFinite(Number(w.LEGENDARY)))w.LEGENDARY*=f;}
    return w;
  };
  Game.rollStage90Chance = function (item, baseChance=null) {
    if(!prev.rollChance)return false;const e=item?.effect||{};let chance=Number.isFinite(baseChance)?Number(baseChance):(Number(e.chance)||0),p=this.s134Perm();
    if(e.type==="modifier_generator") chance*=p.modifierChanceFactor*(Number(p.modifierFactors?.[e.modifier])||1);
    if(e.type==="pattern_retrigger_chance") chance*=p.retriggerChanceFactor;
    return prev.rollChance.call(this,item,chance);
  };
  Game.getTriggerBonusAmount = function (...args) {
    const base=prev.triggerBonus?prev.triggerBonus.apply(this,args):0;return Math.max(0,Math.round((Number(base)||0)*this.s134Perm().triggerBonusFactor));
  };

  Game.s134VersionUI = function () {
    GAME_DATA.version=V;
    const a=document.querySelector(".brand-block .eyebrow"),b=document.querySelector(".top-status .status-chip strong");
    if(a)a.textContent=`CONTROLLED MARKET SYSTEM · VERSION ${V}`;if(b)b.textContent=V;
  };
  Game.updateAllUI = function (...args) { const r=prev.update?.apply(this,args);this.s134VersionUI();return r; };
  Game.init = function (...args) { this.s134Reset();this.patchStage134Contracts();const r=prev.init?.apply(this,args);this.patchStage134Contracts();this.s134VersionUI();this.updateAllUI?.();console.info("DEADLINE v1.3.4: contract build-direction overhaul loaded.");return r; };
  Game.restartRun = function (...args) { this.s134Reset();const r=prev.restart?.apply(this,args);this.s134Reset();this.patchStage134Contracts();this.s134VersionUI();this.updateAllUI?.();return r; };

  Game.patchStage134Contracts();
})();