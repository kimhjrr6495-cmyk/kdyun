// DEADLINE — v1.3.3 item overhaul data
"use strict";
(() => {
  const V="v1.3.3";
  const removed=new Set(["horizontal_wire","vertical_wire","diagonal_ruler","v_frame","x_bridge","jackpot_fuse"]);
  const newItems=[
    {id:"ticket_savings_certificate",name:"티켓 적립증",icon:"🎫",category:"티켓 보유",rarity:"COMMON",price:2,note:"보유 🎟️ 5개마다 모든 패턴 가치 +0.50배",effect:{type:"ticket_pattern_hold",every:5,step:.5}},
    {id:"ticket_bond_bundle",name:"증권 묶음",icon:"📚",category:"티켓 보유",rarity:"RARE",price:4,note:"보유 🎟️ 5개마다 모든 심볼 가격 +0.50배",effect:{type:"ticket_price_hold",every:5,step:.5}},
    {id:"preferred_deposit",name:"예치 우대권",icon:"🏦",category:"티켓 보유",rarity:"RARE",price:4,note:"보유 🎟️ 5개마다 금고 라운드 이자 +5%p",effect:{type:"ticket_vault_rate",every:5,step:.05}},
    {id:"ink_cartridge",name:"잉크 카트리지",icon:"🖨️",category:"티켓 보유",rarity:"RARE",price:4,note:"🎟️ Modifier 실제 발동 3회마다 다음 정상 심볼 1개에 🎟️ 확정 부여",effect:{type:"ticket_modifier_recycler",threshold:3}},
    {id:"ticket_investment_company",name:"티켓 투자회사",icon:"💳",category:"티켓 보유",rarity:"EPIC",price:7,note:"보유 🎟️ 10개마다 심볼 가격 +0.35배 · 패턴 가치 +0.35배 · 금고 이자 +5%p",effect:{type:"ticket_investment",every:10,priceStep:.35,patternStep:.35,vaultStep:.05}},
    {id:"ticket_piggy_bank",name:"티켓 돼지저금통",icon:"🐖",category:"티켓 보유",rarity:"EPIC",price:6,note:"라운드 종료 시 보유 🎟️ 10/20/30개 이상이면 각각 🎟️ +1/+2/+3",effect:{type:"ticket_round_dividend",every:10,max:3}},
    {id:"sealed_wallet",name:"봉인된 지갑",icon:"🔒",category:"티켓 보유",rarity:"EPIC",price:6,note:"아이템 구매 티켓 비용 +2 · 보유 🎟️ 5개마다 모든 패턴 지급액 +0.20배",effect:{type:"ticket_locked_wallet",every:5,payoutStep:.2,purchaseSurcharge:2}},
    {id:"golden_admission",name:"황금 입장권",icon:"🎟️",category:"티켓 보유",rarity:"LEGENDARY",price:10,note:"보유 🎟️ 5개마다 모든 심볼 가격·패턴 가치 +0.75배 · 🎟️20개 이상이면 금고 이자 ×2",unique:true,effect:{type:"ticket_golden_admission",every:5,step:.75,vaultThreshold:20,vaultFactor:2}}
  ];

  Game.patchStage133Data=function(){
    GAME_DATA.version=V;
    const a=GAME_DATA.items||(GAME_DATA.items=[]);
    for(let i=a.length-1;i>=0;i--)if(removed.has(a[i]?.id))a.splice(i,1);
    const p=(id,data)=>{const x=a.find(v=>v.id===id);if(!x)return;Object.assign(x,data);if(data.effect)x.effect={...data.effect};};
    p("small_index_fund",{note:"모든 심볼 가격 ×1.50",effect:{type:"s133_price",factor:1.5}});
    p("pattern_manual",{note:"모든 패턴 가치 ×1.50",effect:{type:"s133_pattern",factor:1.5}});
    p("market_index",{note:"모든 심볼 가격 ×2.00",effect:{type:"s133_price",factor:2}});
    p("settlement_formula",{note:"모든 패턴 가치 ×2.00",effect:{type:"s133_pattern",factor:2}});
    p("balanced_portfolio",{note:"모든 심볼 가격 ×1.60 · 모든 패턴 가치 ×1.60",effect:{type:"s133_both",priceFactor:1.6,patternFactor:1.6}});
    p("bull_market",{note:"모든 심볼 가격 ×3.00 · ERROR 등장 가중치 ×1.50",effect:{type:"s133_price_risk",factor:3,errorFactor:1.5}});
    p("pattern_learner",{note:"실제 당첨 패턴 5개마다 모든 패턴 가치 +0.25",effect:{type:"pattern_learning",threshold:5,step:.25}});
    p("compound_growth_fund",{note:"마감 성공마다 모든 심볼 가격 배수 +0.30 · 모든 패턴 가치 배수 +0.30",effect:{type:"deadline_global_growth",priceStep:.3,patternStep:.3}});
    p("world_market_index",{note:"모든 심볼 가격 ×5.00",effect:{type:"s133_price",factor:5}});
    p("completed_formula",{note:"모든 패턴 가치 ×5.00",effect:{type:"s133_pattern",factor:5}});
    p("market_dominance",{note:"모든 심볼 가격 ×3.50 · 모든 패턴 가치 ×3.50",effect:{type:"s133_both",priceFactor:3.5,patternFactor:3.5}});
    p("refresh_coupon",{note:"상점 새로고침 $ 비용 -20%"});
    const rc=a.find(x=>x.id==="refresh_coupon");if(rc)rc.stage96RerollDiscount=.2;
    p("points_card",{note:"유료 상점 새로고침 3회마다 다음 새로고침 $ 비용 0"});
    p("overload_shelf",{note:"보유 아이템 최대치 +3 · 상점 새로고침 $ 비용 +10%"});
    for(const d of newItems){const x=a.find(v=>v.id===d.id);if(x)Object.assign(x,d,{effect:{...d.effect}});else a.push({...d,effect:{...d.effect}});}
  };

  Game.s133TicketStacks=function(e=5){return Math.max(0,Math.floor((Number(this.tickets)||0)/Math.max(1,Number(e)||1)));};
  Game.s133Owned=function(type){return (this.ownedItems||[]).filter(x=>x?.effect?.type===type);};
  Game.s133Factors=function(){
    let price=1,pattern=1,payout=1,error=1;
    for(const x of this.ownedItems||[]){const e=x.effect||{};
      if(e.type==="s133_price")price*=Number(e.factor)||1;
      if(e.type==="s133_pattern")pattern*=Number(e.factor)||1;
      if(e.type==="s133_both"){price*=Number(e.priceFactor)||1;pattern*=Number(e.patternFactor)||1;}
      if(e.type==="s133_price_risk"){price*=Number(e.factor)||1;error*=Number(e.errorFactor)||1;}
      if(e.type==="ticket_pattern_hold")pattern*=1+this.s133TicketStacks(e.every)*(Number(e.step)||0);
      if(e.type==="ticket_price_hold")price*=1+this.s133TicketStacks(e.every)*(Number(e.step)||0);
      if(e.type==="ticket_investment"){const n=this.s133TicketStacks(e.every||10);price*=1+n*(Number(e.priceStep)||0);pattern*=1+n*(Number(e.patternStep)||0);}
      if(e.type==="ticket_golden_admission"){const f=1+this.s133TicketStacks(e.every||5)*(Number(e.step)||0);price*=f;pattern*=f;}
      if(e.type==="ticket_locked_wallet")payout*=1+this.s133TicketStacks(e.every||5)*(Number(e.payoutStep)||0);
    }
    return {price,pattern,payout,error};
  };
  Game.s133VaultBoost=function(){
    let bonus=0,factor=1;
    for(const x of this.ownedItems||[]){const e=x.effect||{};
      if(e.type==="ticket_vault_rate")bonus+=this.s133TicketStacks(e.every||5)*(Number(e.step)||0);
      if(e.type==="ticket_investment")bonus+=this.s133TicketStacks(e.every||10)*(Number(e.vaultStep)||0);
      if(e.type==="ticket_golden_admission"&&(Number(this.tickets)||0)>=(Number(e.vaultThreshold)||20))factor*=Number(e.vaultFactor)||2;
    }
    return {bonus,factor};
  };
  Game.s133VersionUI=function(){GAME_DATA.version=V;const a=document.querySelector(".brand-block .eyebrow"),b=document.querySelector(".top-status .status-chip strong");if(a)a.textContent=`CONTROLLED MARKET SYSTEM · VERSION ${V}`;if(b)b.textContent=V;};
  Game.patchStage133Data();
})();