// DEADLINE — v1.3.3 ticket hoard build mechanics
"use strict";
(() => {
  const prev={
    init:Game.init,restart:Game.restartRun,update:Game.updateAllUI,stats:Game.updateStatsRail,
    note:Game.getItemDisplayNote,rollMods:Game.rollStage90ModifiersForSymbol,processMods:Game.processStage90PatternModifiers
  };

  Game.s133Reset=function(){this.stage133PiggyRoundKeys=new Set();};
  Game.s133ChargeInk=function(n){
    n=Math.max(0,Math.floor(Number(n)||0));if(!n)return;
    for(const x of this.s133Owned("ticket_modifier_recycler")){
      const t=Math.max(1,Number(x.effect?.threshold)||3);
      x.stage133InkProgress=Math.max(0,Number(x.stage133InkProgress)||0)+n;
      while(x.stage133InkProgress>=t){x.stage133InkProgress-=t;x.stage133InkCharges=Math.max(0,Number(x.stage133InkCharges)||0)+1;}
    }
  };
  Game.s133ConsumeInk=function(){
    const x=this.s133Owned("ticket_modifier_recycler").find(v=>(Number(v.stage133InkCharges)||0)>0);
    if(!x)return null;x.stage133InkCharges=Math.max(0,Number(x.stage133InkCharges)||0)-1;return x;
  };
  Game.processStage90PatternModifiers=function(pattern,resolved,creditWallet){
    const before=Math.max(0,Number(this.tickets)||0);
    const r=prev.processMods.call(this,pattern,resolved,creditWallet);
    if(creditWallet&&r){const reported=Math.max(0,Number(r.ticketGain)||0),actual=Math.max(0,(Number(this.tickets)||0)-before);this.s133ChargeInk(Math.max(reported,actual));}
    return r;
  };
  Game.rollStage90ModifiersForSymbol=function(symbol){
    const mods=prev.rollMods.call(this,symbol)||[];
    if(!symbol||["WD","ER"].includes(symbol.id))return mods;
    const src=this.s133ConsumeInk();if(!src)return mods;
    const out=[...mods];if(!out.includes("TICKET")){if(out.length)out[0]="TICKET";else out.push("TICKET");}
    symbol.s131Sources=symbol.s131Sources||{};
    symbol.s131Sources.TICKET={id:src.id,name:src.name,icon:src.icon};
    return out;
  };

  Game.getItemDisplayNote=function(item){
    const base=prev.note?prev.note.call(this,item):(item?.note||""),e=item?.effect||{},a=[];
    if(e.type==="ticket_pattern_hold")a.push(`현재 패턴 ×${(1+this.s133TicketStacks(e.every)*(Number(e.step)||0)).toFixed(2)}`);
    if(e.type==="ticket_price_hold")a.push(`현재 심볼 ×${(1+this.s133TicketStacks(e.every)*(Number(e.step)||0)).toFixed(2)}`);
    if(e.type==="ticket_vault_rate")a.push(`현재 이자 +${Math.round(this.s133TicketStacks(e.every)*(Number(e.step)||0)*100)}%p`);
    if(e.type==="ticket_investment"){
      const n=this.s133TicketStacks(e.every||10);
      a.push(`현재 심볼 ×${(1+n*(Number(e.priceStep)||0)).toFixed(2)}`);
      a.push(`패턴 ×${(1+n*(Number(e.patternStep)||0)).toFixed(2)}`);
      a.push(`이자 +${Math.round(n*(Number(e.vaultStep)||0)*100)}%p`);
    }
    if(e.type==="ticket_golden_admission"){
      const f=1+this.s133TicketStacks(e.every||5)*(Number(e.step)||0);a.push(`현재 심볼·패턴 ×${f.toFixed(2)}`);
      if((Number(this.tickets)||0)>=(Number(e.vaultThreshold)||20))a.push("금고 이자 ×2 활성");
    }
    if(e.type==="ticket_locked_wallet")a.push(`현재 지급 ×${(1+this.s133TicketStacks(e.every||5)*(Number(e.payoutStep)||0)).toFixed(2)}`);
    if(e.type==="ticket_modifier_recycler"){
      a.push(`진행 ${Math.max(0,Number(item.stage133InkProgress)||0)} / ${Math.max(1,Number(e.threshold)||3)}`);
      if((Number(item.stage133InkCharges)||0)>0)a.push(`확정 대기 ${Math.floor(Number(item.stage133InkCharges)||0)}회`);
    }
    return `${base}${a.length?` · ${a.join(" · ")}`:""}`;
  };

  Game.updateStatsRail=function(...args){
    const r=prev.stats?.apply(this,args),grid=this.runStatsGrid||document.querySelector("#runStatsGrid");if(!grid)return r;
    grid.querySelector(".stage133-ticket-build-stat")?.remove();
    if(!(this.ownedItems||[]).some(x=>String(x.effect?.type||"").startsWith("ticket_")))return r;
    const f=this.s133Factors(),v=this.s133VaultBoost();
    grid.insertAdjacentHTML("beforeend",`<div class="stat-reference-row stage133-ticket-build-stat"><span>🎟️ 티켓 빌드</span><strong>${Math.max(0,Number(this.tickets)||0)}T · 심볼 ×${f.price.toFixed(2)} · 패턴 ×${f.pattern.toFixed(2)} · 금고 +${Math.round(v.bonus*100)}%p${v.factor>1?` ×${v.factor.toFixed(0)}`:""}</strong></div>`);
    return r;
  };
  Game.updateAllUI=function(...args){const r=prev.update.apply(this,args);this.s133VersionUI();return r;};
  Game.init=function(...args){
    this.s133Reset();const r=prev.init.apply(this,args);this.patchStage133Data();
    if(Array.isArray(this.shopOffers)&&this.shopOffers.length)this.generateShopOffers?.();
    this.s133VersionUI();this.updateAllUI?.();
    console.info("DEADLINE v1.3.3: high-impact multipliers / ticket hoard build loaded.");return r;
  };
  Game.restartRun=function(...args){this.s133Reset();const r=prev.restart.apply(this,args);this.patchStage133Data();this.s133VersionUI();this.updateAllUI?.();return r;};
})();