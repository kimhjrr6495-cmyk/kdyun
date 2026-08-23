// DEADLINE — v1.3.3 multiplier / vault / shop economy
"use strict";
(() => {
  const prev={
    price:Game.getStage110PriceMultiplier,
    pattern:Game.getStage110PatternMultiplier,
    weights:Game.getStage90SymbolWeightMap,
    score:Game.calculatePatternScore,
    vaultRate:Game.getVaultCurrentRate,
    vaultRound:Game.advanceVaultRound,
    resolveRound:Game.resolveRound,
    generate:Game.generateShopOffers,
    renderShop:Game.renderShop
  };

  Game.getStage110PriceMultiplier=function(...args){
    const base=prev.price?prev.price.apply(this,args):1;
    return Math.max(0,Number(base)||0)*this.s133Factors().price;
  };
  Game.getStage110PatternMultiplier=function(...args){
    const base=prev.pattern?prev.pattern.apply(this,args):1;
    return Math.max(0,Number(base)||0)*this.s133Factors().pattern;
  };
  Game.getStage90SymbolWeightMap=function(...args){
    const w=prev.weights?(prev.weights.apply(this,args)||{}):{};
    const f=this.s133Factors().error;
    if(f!==1&&Object.prototype.hasOwnProperty.call(w,"ER"))w.ER=Math.max(.000001,Number(w.ER)*f);
    return w;
  };
  Game.calculatePatternScore=function(pattern){
    const r=prev.score.call(this,pattern);if(!r)return r;
    const f=this.s133Factors().payout;if(Math.abs(f-1)<.0001)return r;
    const raw=Math.max(0,Number(r.raw)||Number(r.amount)||0)*f;
    return {...r,raw,amount:raw<=0?0:Math.max(1,Math.round(raw)),itemEffects:[...(r.itemEffects||[]),`🔒 티켓 보유 지급 ×${f.toFixed(2)}`],stage133TicketPayoutFactor:f};
  };

  Game.getVaultCurrentRate=function(...args){
    const base=prev.vaultRate?prev.vaultRate.apply(this,args):0;
    const b=this.s133VaultBoost();
    return Math.max(0,(Math.max(0,Number(base)||0)+b.bonus)*b.factor);
  };
  Game.advanceVaultRound=function(...args){
    if(!prev.vaultRound)return null;
    const live=this.getVaultCurrentRate;
    if(prev.vaultRate)this.getVaultCurrentRate=prev.vaultRate;
    let ev;
    try{ev=prev.vaultRound.apply(this,args);}finally{this.getVaultCurrentRate=live;}
    if(!ev||ev.stage133Adjusted)return ev;
    const b=this.s133VaultBoost();
    const rate=Math.max(0,(Math.max(0,Number(ev.rate)||0)+b.bonus)*b.factor);
    const wanted=Math.max(0,Math.floor((Number(ev.before)||0)*rate));
    const extra=Math.max(0,wanted-Math.max(0,Number(ev.interest)||0));
    if(extra>0){
      ev.interest=wanted;ev.after=Math.max(0,Number(ev.after)||0)+extra;
      if(ev.type==="MATURED"){
        this.wallet=Math.max(0,Number(this.wallet)||0)+extra;
        ev.walletAfterMaturity=Math.max(0,Number(ev.walletAfterMaturity)||0)+extra;
      }else if(this.vaultDeposit){
        this.vaultDeposit.currentAmount=Math.max(0,Number(this.vaultDeposit.currentAmount)||0)+extra;
        this.bank=this.vaultDeposit.currentAmount;
      }
    }
    ev.rate=rate;ev.stage133Adjusted=true;return ev;
  };

  Game.s133PiggyReward=function(key){
    this.stage133PiggyRoundKeys=this.stage133PiggyRoundKeys||new Set();
    if(this.stage133PiggyRoundKeys.has(key))return 0;
    this.stage133PiggyRoundKeys.add(key);
    let gain=0;
    for(const x of this.s133Owned("ticket_round_dividend")){
      const e=x.effect||{},n=Math.floor((Number(this.tickets)||0)/Math.max(1,Number(e.every)||10));
      gain+=Math.min(Math.max(1,Number(e.max)||3),n);
    }
    if(gain>0){this.tickets+=gain;this.showStage90Event?.("ticket","🐖 티켓 돼지저금통",`티켓 +${gain}`);}
    return gain;
  };
  Game.resolveRound=async function(...args){
    const key=`${this.deadlineIndex}:${this.round}`;
    const r=await prev.resolveRound.apply(this,args);
    if(this.s133PiggyReward(key)>0)this.updateAllUI?.();
    return r;
  };

  Game.s133ShopSurcharge=function(){return this.s133Owned("ticket_locked_wallet").reduce((s,x)=>s+Math.max(0,Number(x.effect?.purchaseSurcharge)||0),0);};
  Game.s133SyncOfferPrices=function(){
    const add=this.s133ShopSurcharge();
    for(const o of this.shopOffers||[]){
      if(!Number.isFinite(Number(o.stage133BasePrice)))o.stage133BasePrice=Math.max(0,Number(o.price)||0);
      o.price=Math.max(0,Number(o.stage133BasePrice)||0)+add;
    }
  };
  Game.generateShopOffers=function(...args){
    const r=prev.generate.apply(this,args);
    for(const o of this.shopOffers||[])o.stage133BasePrice=Math.max(0,Number(o.price)||0);
    this.s133SyncOfferPrices();return r;
  };
  Game.renderShop=function(...args){this.s133SyncOfferPrices();return prev.renderShop.apply(this,args);};
})();