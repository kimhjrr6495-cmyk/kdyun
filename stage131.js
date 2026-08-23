// DEADLINE — v1.3.1 board-local feedback FX
"use strict";

(() => {
  GAME_DATA.version = "v1.3.1";

  const prev = {
    init: Game.init,
    restartRun: Game.restartRun,
    renderReels: Game.renderReels,
    rollChance: Game.rollStage90Chance,
    rollModifiers: Game.rollStage90ModifiersForSymbol,
    processModifiers: Game.processStage90PatternModifiers,
    retriggerCount: Game.getStage90RetriggerCount,
    processErrors: Game.processStage94Errors,
    oilCan: Game.applyStage90OilCan,
    brokenMagnet: Game.applyStage90BrokenMagnet,
    prophecy: Game.applyStage90MarketProphecy
  };

  const css = `
#stage90Feed,#stage91ItemAlert{display:none!important}
.reels-shell{position:relative;overflow:visible}.reel-symbol{position:relative;isolation:isolate}
.stage131-fx-layer{position:absolute;inset:0;z-index:70;pointer-events:none;overflow:visible}
.stage131-fx{position:absolute;display:block;transform:translate(-50%,-50%);opacity:0;pointer-events:none;user-select:none;white-space:nowrap;will-change:transform,opacity,filter}.stage131-fx.is-visible{opacity:1}
.stage131-item-icon{z-index:4;font-size:clamp(25px,3vw,38px);line-height:1;filter:drop-shadow(0 3px 5px rgba(0,0,0,.24));animation:s131Item .43s cubic-bezier(.18,.9,.22,1.25) both}
.stage131-float{z-index:5;font-weight:900;font-size:clamp(15px,1.7vw,22px);letter-spacing:-.03em;text-shadow:0 2px 0 rgba(255,255,255,.95),0 3px 8px rgba(0,0,0,.17);animation:s131Float .69s cubic-bezier(.2,.75,.2,1) both}
.stage131-ticket{color:#e45f7e}.stage131-cash{color:#149452}
.reel-symbol.s131-glitch{z-index:7;animation:s131Glitch .18s steps(2,end) both}.reel-symbol.s131-glitch .symbol-emoji{animation:s131EmojiGlitch .18s steps(2,end) both}
.reel-symbol.s131-pulse{z-index:5;animation:s131Pulse .18s ease-out both}.reel-symbol.s131-ticket-cell{box-shadow:inset 0 0 0 3px rgba(228,95,126,.48),0 0 16px rgba(228,95,126,.22)}
.reel-symbol.s131-pattern{z-index:5;animation:s131Pattern .19s ease-out both}
@keyframes s131Item{0%{opacity:0;transform:translate(-50%,-42%) scale(.58) rotate(-8deg)}42%{opacity:1;transform:translate(-50%,-63%) scale(1.22) rotate(3deg)}72%{opacity:1;transform:translate(-50%,-70%) scale(.98)}100%{opacity:0;transform:translate(-50%,-92%) scale(.9)}}
@keyframes s131Float{0%{opacity:0;transform:translate(-50%,-20%) scale(.82)}18%{opacity:1;transform:translate(-50%,-42%) scale(1.04)}70%{opacity:1;transform:translate(-50%,-92%) scale(1)}100%{opacity:0;transform:translate(-50%,-132%) scale(.96)}}
@keyframes s131Glitch{0%{transform:translate(0);filter:none}18%{transform:translate(-3px,1px) skewX(-4deg);filter:contrast(1.25) saturate(1.25)}36%{transform:translate(4px,-1px) skewX(5deg);filter:contrast(1.5) hue-rotate(18deg)}54%{transform:translate(-2px,-1px) skewX(-3deg);filter:contrast(1.35) hue-rotate(-20deg)}72%{transform:translate(2px,1px) skewX(2deg);filter:contrast(1.2)}100%{transform:translate(0);filter:none}}
@keyframes s131EmojiGlitch{25%{text-shadow:-3px 0 rgba(255,60,105,.6),3px 0 rgba(52,190,220,.55)}50%{text-shadow:3px 1px rgba(255,60,105,.6),-3px -1px rgba(52,190,220,.55)}75%{text-shadow:-2px -1px rgba(255,60,105,.5),2px 1px rgba(52,190,220,.45)}}
@keyframes s131Pulse{50%{transform:scale(1.045);filter:brightness(1.12)}}
@keyframes s131Pattern{48%{transform:scale(1.035);box-shadow:inset 0 0 0 3px rgba(32,32,32,.22),0 0 12px rgba(32,32,32,.12)}}
@media(prefers-reduced-motion:reduce){.stage131-fx,.reel-symbol.s131-glitch,.reel-symbol.s131-glitch .symbol-emoji,.reel-symbol.s131-pulse,.reel-symbol.s131-pattern{animation-duration:1ms!important}}
`;

  const wait = (g, ms) => g.wait ? g.wait(ms) : new Promise((r) => setTimeout(r, ms));
  const uniq = (items) => {
    const seen = new Set();
    return (items || []).filter((item) => {
      if (!item) return false;
      const key = item.instanceId || item.id || `${item.name}:${item.icon}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  Game.s131Reset = function () {
    this.s131Queue = Promise.resolve();
    this.s131Collect = false;
    this.s131Events = [];
    this.s131Items = [];
    this.s131EventCoords = null;
    this.s131SuppressEvent = false;
    this.s131SuppressChance = false;
    this.s131ModifierCapture = null;
    this.s131RetriggerCapture = null;
  };

  Game.s131Layer = function () {
    const host = document.querySelector(".reels-shell");
    if (!host) return null;
    let layer = host.querySelector("#stage131FxLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "stage131FxLayer";
      layer.className = "stage131-fx-layer";
      layer.setAttribute("aria-hidden", "true");
      host.appendChild(layer);
    }
    return layer;
  };

  Game.s131Cell = function (col, row) {
    return this.reelsEl?.querySelector(`.reel-symbol[data-col="${col}"][data-row="${row}"]`) || null;
  };

  Game.s131Point = function (coords) {
    const host = document.querySelector(".reels-shell");
    if (!host) return { x: 0, y: 0 };
    const hr = host.getBoundingClientRect();
    const cells = (coords || []).map(([c,r]) => this.s131Cell(c,r)).filter(Boolean);
    if (!cells.length) return { x: hr.width / 2, y: hr.height / 2 };
    const points = cells.map((cell) => {
      const r = cell.getBoundingClientRect();
      return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height / 2 };
    });
    return { x: points.reduce((s,p)=>s+p.x,0)/points.length, y: points.reduce((s,p)=>s+p.y,0)/points.length };
  };

  Game.s131Enqueue = function (fn, gap = 55) {
    if (!this.s131Queue?.then) this.s131Queue = Promise.resolve();
    this.s131Queue = this.s131Queue.catch(()=>{}).then(async()=>{ await fn(); if (gap) await wait(this,gap); });
    return this.s131Queue;
  };

  Game.s131Spawn = function (text, coords, cls, duration = 620) {
    const layer = this.s131Layer();
    if (!layer || !text) return;
    const p = this.s131Point(coords);
    const node = document.createElement("span");
    node.className = `stage131-fx ${cls}`;
    node.textContent = text;
    node.style.left = `${p.x}px`;
    node.style.top = `${p.y}px`;
    layer.appendChild(node);
    requestAnimationFrame(()=>node.classList.add("is-visible"));
    setTimeout(()=>node.remove(), duration + 120);
  };

  Game.s131Icon = async function (item, coords) {
    const icon = typeof item === "string" ? item : (item?.icon || "◆");
    this.s131Spawn(icon, coords, "stage131-item-icon", 430);
    await wait(this, 115);
  };

  Game.s131Float = async function (text, coords, kind) {
    this.s131Spawn(text, coords, `stage131-float ${kind === "ticket" ? "stage131-ticket" : "stage131-cash"}`, 620);
    await wait(this, 95);
  };

  Game.s131Pulse = async function (coords, cls = "s131-pulse", ms = 170) {
    const cells = (coords || []).map(([c,r])=>this.s131Cell(c,r)).filter(Boolean);
    cells.forEach((cell)=>cell.classList.add(cls));
    await wait(this, ms);
    cells.forEach((cell)=>cell.classList.remove(cls));
  };

  Game.s131Glitch = async function (coords) {
    const cells = (coords || []).map(([c,r])=>this.s131Cell(c,r)).filter(Boolean);
    cells.forEach((cell,i)=>setTimeout(()=>cell.classList.add("s131-glitch"), i*35));
    await wait(this, 190 + Math.min(160, cells.length*35));
    cells.forEach((cell)=>cell.classList.remove("s131-glitch"));
  };

  Game.s131Clone = function () {
    return (this.currentColumns || []).map((col)=>col.map((s)=>({ ...s, modifiers:Array.isArray(s?.modifiers)?[...s.modifiers]:undefined })));
  };

  Game.s131Changed = function (before) {
    const out = [];
    (this.currentColumns || []).forEach((col,c)=>col.forEach((s,r)=>{
      const a = before?.[c]?.[r];
      const am = Array.isArray(a?.modifiers) ? a.modifiers.join("|") : "";
      const bm = Array.isArray(s?.modifiers) ? s.modifiers.join("|") : "";
      if (a?.id !== s?.id || am !== bm) out.push([c,r]);
    }));
    return out;
  };

  Game.s131TicketText = function (title="", detail="") {
    const m = `${detail} ${title}`.match(/(?:\+\s*)?(\d+)\s*(?:T|티켓)?/i);
    return `🎟️ +${m ? Number(m[1]) : 1}`;
  };

  Game.s131CashText = function (title="", detail="") {
    const m = `${detail} ${title}`.match(/\+?\s*\$\s*([\d,]+)/);
    return m ? `+$${m[1]}` : (detail || title);
  };

  Game.showStage90Event = function (kind, title, detail="") {
    if (this.s131Collect) { this.s131Events.push({kind,title,detail}); return; }
    if (this.s131SuppressEvent || /ERROR EVENT/i.test(String(title))) return;
    if (kind === "ticket") {
      void this.s131Enqueue(()=>this.s131Float(this.s131TicketText(title,detail), this.s131EventCoords, "ticket"));
    } else if (kind === "cash") {
      void this.s131Enqueue(()=>this.s131Float(this.s131CashText(title,detail), this.s131EventCoords, "cash"));
    }
  };

  Game.queueStage93ActivationCard = function (item) {
    if (!item) return;
    if (this.s131Collect) { this.s131Items.push(item); return; }
    void this.s131Enqueue(()=>this.s131Icon(item, this.s131EventCoords));
  };
  Game.runStage93ActivationQueue = async function () { if (this.stage91ItemAlert) this.stage91ItemAlert.hidden = true; this.stage93ActivationQueue = []; };
  Game.playStage91ItemAlert = async function (item) { this.queueStage93ActivationCard(item); await wait(this,180); };

  Game.rollStage90Chance = function (item, ...args) {
    const ok = prev.rollChance.call(this,item,...args);
    if (!ok || !item) return ok;
    if (Array.isArray(this.s131ModifierCapture)) { this.s131ModifierCapture.push(item); return ok; }
    if (Array.isArray(this.s131RetriggerCapture)) { this.s131RetriggerCapture.push(item); return ok; }
    if (!this.s131Collect && !this.s131SuppressChance) void this.s131Enqueue(()=>this.s131Icon(item, this.s131EventCoords));
    return ok;
  };

  Game.rollStage90ModifiersForSymbol = function (symbol) {
    const old = this.s131ModifierCapture;
    this.s131ModifierCapture = [];
    let mods = [];
    try { mods = prev.rollModifiers.call(this,symbol) || []; }
    finally {
      const hits = this.s131ModifierCapture || [];
      this.s131ModifierCapture = old;
      if (symbol && mods.length) {
        symbol.s131Sources = symbol.s131Sources || {};
        hits.forEach((item)=>{ const m=item.effect?.modifier; if (m && mods.includes(m) && !symbol.s131Sources[m]) symbol.s131Sources[m]={id:item.id,name:item.name,icon:item.icon}; });
      }
    }
    return mods;
  };

  Game.s131ModifierSource = function (symbol, modifier) {
    return symbol?.s131Sources?.[modifier] || (this.ownedItems || []).find((item)=>{
      const e=item.effect||{}; return e.type==="modifier_generator" && e.modifier===modifier && (!e.symbolIds?.length || e.symbolIds.includes(symbol?.id));
    }) || null;
  };

  Game.renderReels = function (...args) {
    const out = prev.renderReels.apply(this,args);
    this.s131Layer();
    if (this.roundStarted && this.isSpinning) requestAnimationFrame(()=>{
      (this.currentColumns||[]).forEach((col,c)=>col.forEach((s,r)=>{
        if (!s?.s131Sources) return;
        s.s131Shown = s.s131Shown || {};
        Object.entries(s.s131Sources).forEach(([m,item])=>{
          if (s.s131Shown[m]) return;
          s.s131Shown[m]=true;
          void this.s131Enqueue(async()=>{ await this.s131Icon(item,[[c,r]]); await this.s131Pulse([[c,r]]); });
        });
      }));
    });
    return out;
  };

  Game.processStage90PatternModifiers = function (pattern, resolved, creditWallet) {
    const before = { ticket:new Set(resolved?.ticket||[]), repeat:new Set(resolved?.repeat||[]) };
    const oldCoords=this.s131EventCoords, oldSuppress=this.s131SuppressEvent;
    this.s131EventCoords=pattern?.coords||null; this.s131SuppressEvent=true;
    let result;
    try { result=prev.processModifiers.call(this,pattern,resolved,creditWallet); }
    finally { this.s131EventCoords=oldCoords; this.s131SuppressEvent=oldSuppress; }
    if (!creditWallet || !pattern?.coords?.length || !result) return result;

    const newTickets=[];
    pattern.coords.forEach(([c,r])=>{
      const key=`${c}:${r}`;
      if ((this.getStage90CellModifiers?.(c,r)||[]).includes("TICKET") && !before.ticket.has(key) && resolved.ticket?.has(key)) newTickets.push([c,r]);
    });
    newTickets.slice(0,Math.max(0,Number(result.ticketGain)||0)).forEach(([c,r])=>{
      const s=this.currentColumns?.[c]?.[r], source=this.s131ModifierSource(s,"TICKET")||{icon:"🎟️"};
      void this.s131Enqueue(async()=>{ await this.s131Icon(source,[[c,r]]); await this.s131Pulse([[c,r]],"s131-ticket-cell",130); await this.s131Float("🎟️ +1",[[c,r]],"ticket"); },85);
    });
    return result;
  };

  Game.getStage90RetriggerCount = function (pattern, context={}) {
    const old=this.s131RetriggerCapture; this.s131RetriggerCapture=[];
    let count=0, chance=[];
    try { count=prev.retriggerCount.call(this,pattern,context); chance=[...(this.s131RetriggerCapture||[])]; }
    finally { this.s131RetriggerCapture=old; }
    if (!count || !pattern?.coords?.length) return count;
    const sources=[];
    if ((Number(context.modifierRepeats)||0)>0) pattern.coords.forEach(([c,r])=>{
      const s=this.currentColumns?.[c]?.[r]; if ((this.getStage90CellModifiers?.(c,r)||[]).includes("REPEAT")) { const src=this.s131ModifierSource(s,"REPEAT"); if(src)sources.push(src); }
    });
    this.getStage90ItemsByEffect?.("retrigger_every").forEach((item)=>{ const every=Math.max(1,Number(item.effect?.every)||7); if(context.spinOrdinal>0 && context.spinOrdinal%every===0)sources.push(item); });
    if (context.isHighest) this.getStage90ItemsByEffect?.("retrigger_highest").forEach((item)=>sources.push(item));
    sources.push(...chance);
    const visible=uniq(sources).slice(0,Math.max(1,Number(count)||1));
    void this.s131Enqueue(async()=>{ for(const item of visible) await this.s131Icon(item,pattern.coords); if(!visible.length) await this.s131Icon("↻",pattern.coords); await this.s131Pulse(pattern.coords,"s131-pattern",185); },80);
    return count;
  };

  Game.s131BoardMutation = async function (fn,args,itemId) {
    const before=this.s131Clone(), liveRender=this.renderReels;
    const oldE=this.s131SuppressEvent, oldC=this.s131SuppressChance;
    this.s131SuppressEvent=true; this.s131SuppressChance=true; this.renderReels=()=>{};
    let result, thrown;
    try { result=await fn.apply(this,args); } catch(e){ thrown=e; }
    this.renderReels=liveRender; this.s131SuppressEvent=oldE; this.s131SuppressChance=oldC;
    const changed=this.s131Changed(before);
    if(changed.length){ const item=(this.ownedItems||[]).find((x)=>x.id===itemId)||{icon:"◆"}; await this.s131Icon(item,changed); await this.s131Glitch(changed); liveRender.call(this); await wait(this,55); await this.s131Pulse(changed); }
    if(thrown)throw thrown; return result;
  };

  if (prev.oilCan) Game.applyStage90OilCan=function(...args){return this.s131BoardMutation(prev.oilCan,args,"oil_can");};
  if (prev.brokenMagnet) Game.applyStage90BrokenMagnet=function(...args){return this.s131BoardMutation(prev.brokenMagnet,args,"broken_magnet");};
  if (prev.prophecy) Game.applyStage90MarketProphecy=function(...args){return this.s131BoardMutation(prev.prophecy,args,"market_prophecy");};

  Game.processStage94Errors = async function (...args) {
    const credit=Boolean(args?.[0]?.creditWallet);
    if(!credit || !prev.processErrors) return prev.processErrors?.apply(this,args);
    const before=this.s131Clone(), errors=[];
    before.forEach((col,c)=>col.forEach((s,r)=>{if(s?.id===(GAME_DATA.stage94?.errorId||"ER"))errors.push([c,r]);}));
    if(!errors.length) return prev.processErrors.apply(this,args);

    const liveRender=this.renderReels, oldCollect=this.s131Collect, oldEvents=this.s131Events, oldItems=this.s131Items, oldChance=this.s131SuppressChance;
    this.s131Collect=true; this.s131Events=[]; this.s131Items=[]; this.s131SuppressChance=true; this.renderReels=()=>{};
    let result, thrown;
    try { result=await prev.processErrors.apply(this,args); } catch(e){ thrown=e; }
    const events=[...this.s131Events], items=uniq(this.s131Items);
    this.renderReels=liveRender; this.s131Collect=oldCollect; this.s131Events=oldEvents; this.s131Items=oldItems; this.s131SuppressChance=oldChance;

    const changed=this.s131Changed(before), anchors=changed.length?changed:errors;
    if(!thrown){
      for(let i=0;i<items.length;i+=1){ await this.s131Icon(items[i],anchors.length?[anchors[i%anchors.length]]:null); await wait(this,40); }
      if(changed.length){ await this.s131Glitch(changed); liveRender.call(this); await wait(this,60); await this.s131Pulse(changed); } else liveRender.call(this);
      let i=0;
      for(const ev of events){ if(/ERROR EVENT/i.test(String(ev.title)))continue; const at=anchors.length?[anchors[i++%anchors.length]]:null; if(ev.kind==="ticket")await this.s131Float(this.s131TicketText(ev.title,ev.detail),at,"ticket"); else if(ev.kind==="cash")await this.s131Float(this.s131CashText(ev.title,ev.detail),at,"cash"); }
    } else liveRender.call(this);
    if(thrown)throw thrown; return result;
  };

  Game.init = function (...args) {
    if (!document.querySelector("#stage131Style")) { const style=document.createElement("style"); style.id="stage131Style"; style.textContent=css; document.head.appendChild(style); }
    this.s131Reset();
    const out=prev.init.apply(this,args);
    this.s131Layer();
    document.querySelectorAll(".topbar .eyebrow,.top-status .status-chip").forEach((el)=>{ el.innerHTML=el.innerHTML.replace(/v1\.3\.0/g,"v1.3.1"); });
    if(this.stage90Feed)this.stage90Feed.hidden=true; if(this.stage91ItemAlert)this.stage91ItemAlert.hidden=true;
    console.info("DEADLINE v1.3.1 board-local feedback FX loaded.");
    return out;
  };

  Game.restartRun = function (...args) { const out=prev.restartRun.apply(this,args); this.s131Reset(); this.s131Layer(); return out; };
})();
