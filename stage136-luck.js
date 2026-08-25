// DEADLINE — v1.3.6 Clover-style LUCK / natural pattern generation rework
"use strict";
(() => {
  const V = "v1.3.6";
  const prev = {
    init: Game.init,
    restart: Game.restartRun,
    update: Game.updateAllUI,
    stats: Game.updateStatsRail,
    note: Game.getItemDisplayNote,
    evaluate: Game.evaluateAndRenderScore,
    deadlineSuccess: Game.showDeadlineSuccess,
    prepare: Game.prepareStage90SpinEffects
  };
  const NORMAL_EXCLUDED = new Set(["WD", "ER"]);

  Game.s136Items = function (type) {
    return (this.ownedItems || []).filter((item) => item?.effect?.type === type);
  };

  Game.s136RandInt = function (min, max) {
    const a = Math.ceil(Number(min) || 0), b = Math.floor(Number(max) || 0);
    return a + Math.floor(Math.random() * Math.max(1, b - a + 1));
  };

  Game.s136Reset = function () {
    this.stage136RollIndex = 0;
    this.stage136MissStreak = 0;
    this.stage136RollsSinceBurst = 0;
    this.stage136NextBurstAt = this.s136RandInt(4, 7);
    this.stage136LastLuck = { base:0, permanent:0, burst:0, pity:0, stored:0, effective:0 };
    this.stage136LastLuckySymbolId = null;
    this.stage136LastSpontaneous = 0;
    this.stage136LastHadPattern = false;
    this.stage136LastHadJackpot = false;
  };

  Game.s136GetPermanentLuck = function () {
    let value = 0;
    for (const item of this.ownedItems || []) {
      const e = item.effect || {};
      if (e.type === "s136_perm_luck") value += Math.max(0, Number(e.amount) || 0);
      if (e.type === "s136_ticket_luck") {
        const every = Math.max(1, Number(e.every) || 10);
        const step = Math.max(0, Number(e.step) || 1);
        const cap = Math.max(0, Number(e.max) || 4);
        value += Math.min(cap, Math.floor(Math.max(0, Number(this.tickets) || 0) / every) * step);
      }
      if (e.type === "s136_deadline_luck") value += Math.max(0, Number(item.stage136EngineLuck) || 0);
    }
    return value;
  };

  Game.s136GetPityLuck = function () {
    const streak = Math.max(0, Math.floor(Number(this.stage136MissStreak) || 0));
    if (streak >= 4) return 6;
    if (streak === 3) return 4;
    if (streak === 2) return 2;
    return 0;
  };

  Game.s136GetStoredLuck = function () {
    let value = 0;
    for (const item of this.ownedItems || []) {
      const e = item.effect || {};
      if (e.type === "s136_miss_store") value += Math.max(0, Number(item.stage136MissStored) || 0);
      if (e.type === "s136_jackpot_store") value += Math.max(0, Number(item.stage136JackpotStored) || 0);
    }
    return value;
  };

  Game.s136ConsumeNextBurst = function () {
    this.stage136RollIndex = Math.max(0, Number(this.stage136RollIndex) || 0) + 1;
    this.stage136RollsSinceBurst = Math.max(0, Number(this.stage136RollsSinceBurst) || 0) + 1;
    let burst = 0;
    let spontaneous = 0;

    if (this.stage136RollsSinceBurst >= Math.max(4, Number(this.stage136NextBurstAt) || 4)) {
      spontaneous = this.s136RandInt(3, 7);
      burst += spontaneous;
      this.stage136RollsSinceBurst = 0;
      this.stage136NextBurstAt = this.s136RandInt(4, 7);
    }

    for (const item of this.s136Items("s136_periodic_burst")) {
      const every = Math.max(1, Math.floor(Number(item.effect?.every) || 3));
      if (this.stage136RollIndex % every === 0) burst += Math.max(0, Number(item.effect?.amount) || 0);
    }

    for (const item of this.s136Items("s136_wild_next_luck")) {
      burst += Math.max(0, Number(item.stage136NextWildLuck) || 0);
      item.stage136NextWildLuck = 0;
    }

    this.stage136LastSpontaneous = spontaneous;
    return burst;
  };

  Game.s136LuckAmpFactor = function () {
    return this.s136Items("s136_temp_luck_amp")
      .reduce((factor, item) => factor * Math.max(1, Number(item.effect?.factor) || 1), 1);
  };

  Game.s136ApplyOverflow = function (luck) {
    let result = Math.max(0, Number(luck) || 0);
    for (const item of this.s136Items("s136_luck_overflow")) {
      const e = item.effect || {};
      const threshold = Math.max(0, Number(e.threshold) || 10);
      const factor = Math.max(1, Number(e.factor) || 2);
      const cap = Math.max(threshold, Number(e.cap) || 15);
      if (result > threshold) result = threshold + (result - threshold) * factor;
      result = Math.min(cap, result);
    }
    return Math.min(15, result);
  };

  Game.s136SymbolBonusFactor = function (symbolId) {
    const a = Math.max(1, Number(this.stage134Permanent?.symbolWeightFactors?.[symbolId]) || 1);
    const b = 1 + Math.max(0, Number(this.stage110Permanent?.symbolWeightBonus?.[symbolId]) || 0);
    return a * b;
  };

  Game.s136LuckyFocusIds = function () {
    if (!this.s136Items("s136_lucky_focus").length) return new Set();
    const normals = (GAME_DATA.symbols || []).filter((s) => s && !NORMAL_EXCLUDED.has(s.id));
    let best = 1;
    const factors = normals.map((s) => [s.id, this.s136SymbolBonusFactor(s.id)]);
    factors.forEach(([, f]) => { if (f > best) best = f; });
    if (best <= 1.000001) return new Set();
    return new Set(factors.filter(([, f]) => Math.abs(f - best) < 1e-6).map(([id]) => id));
  };

  Game.s136PickLuckySymbol = function () {
    const weights = this.getStage90SymbolWeightMap?.() || {};
    const normals = (GAME_DATA.symbols || []).filter((s) =>
      s && !NORMAL_EXCLUDED.has(s.id) && (Number(weights[s.id]) || 0) > 0.00001
    );
    if (!normals.length) return null;
    const focusIds = this.s136LuckyFocusIds();
    const focusFactor = this.s136Items("s136_lucky_focus")
      .reduce((factor, item) => factor * Math.max(1, Number(item.effect?.factor) || 1), 1);
    const weighted = normals.map((s) => ({
      symbol:s,
      weight:Math.max(0, Number(weights[s.id]) || 0) * (focusIds.has(s.id) ? focusFactor : 1)
    }));
    const total = weighted.reduce((sum, x) => sum + x.weight, 0);
    if (total <= 0) return normals[Math.floor(Math.random() * normals.length)] || null;
    let cursor = Math.random() * total;
    for (const entry of weighted) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.symbol;
    }
    return weighted.at(-1)?.symbol || null;
  };

  Game.s136MakeLuckySymbol = function (target) {
    if (!target) return null;
    if (typeof this.makeStage120ForcedSymbol === "function") return this.makeStage120ForcedSymbol(target);
    const clone = { ...target };
    delete clone.modifiers;
    const mods = this.rollStage90ModifiersForSymbol?.(clone) || [];
    if (mods.length) clone.modifiers = [...mods];
    return clone;
  };

  Game.s136ShowLuckPop = function (text, level = 0) {
    const shell = document.querySelector(".reels-shell");
    if (!shell || !text) return;
    let el = shell.querySelector(".stage136-luck-pop");
    if (!el) {
      el = document.createElement("div");
      el.className = "stage136-luck-pop";
      shell.appendChild(el);
    }
    el.textContent = text;
    el.dataset.level = level >= 13 ? "max" : level >= 10 ? "high" : "normal";
    el.classList.remove("is-show");
    void el.offsetWidth;
    el.classList.add("is-show");
  };

  Game.s136EnsureStyle = function () {
    if (document.querySelector("#stage136Style")) return;
    const style = document.createElement("style");
    style.id = "stage136Style";
    style.textContent = `
      .reels-shell{position:relative}
      .stage136-luck-pop{position:absolute;left:50%;top:8%;z-index:24;transform:translate(-50%,-8px) scale(.94);opacity:0;pointer-events:none;padding:7px 12px;border:1px solid rgba(190,255,190,.55);border-radius:999px;background:rgba(4,22,9,.86);box-shadow:0 0 18px rgba(95,255,130,.25);font-weight:900;letter-spacing:.04em;white-space:nowrap;color:#dfffe5}
      .stage136-luck-pop[data-level="high"]{box-shadow:0 0 26px rgba(95,255,130,.48)}
      .stage136-luck-pop[data-level="max"]{box-shadow:0 0 38px rgba(140,255,160,.72);font-size:1.08em}
      .stage136-luck-pop.is-show{animation:stage136LuckPop 1.05s ease both}
      @keyframes stage136LuckPop{0%{opacity:0;transform:translate(-50%,-8px) scale(.92)}18%{opacity:1;transform:translate(-50%,0) scale(1.04)}72%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,5px) scale(.98)}}
    `;
    document.head.appendChild(style);
  };

  Game.s136NaturalBoard = function () {
    return Array.from({ length: GAME_DATA.board.columns }, () =>
      Array.from({ length: GAME_DATA.board.rows }, () => this.randomSymbol())
    );
  };

  // v1.3.6: direct H5/V/X/JACKPOT rolls are gone. Build a normal board first,
  // then replace N distinct random cells with one weighted Lucky Symbol.
  Game.s136BuildLuckBoardCore = function (incomingLuck) {
    const columns = this.s136NaturalBoard();

    const shinyPermanent = Math.max(0, (this.getStage96ShinyItems?.("LUCK") || []).length);
    const incoming = Math.max(0, Number(incomingLuck) || 0);
    const externalBurst = Math.max(0, incoming - shinyPermanent);
    const permanent = shinyPermanent + this.s136GetPermanentLuck();
    let burst = externalBurst + this.s136ConsumeNextBurst();
    let pity = this.s136GetPityLuck();
    const amp = this.s136LuckAmpFactor();
    burst *= amp;
    pity *= amp;
    const stored = this.s136GetStoredLuck();
    const beforeOverflow = permanent + burst + pity + stored;
    const effective = this.s136ApplyOverflow(beforeOverflow);
    const guarantee = Math.max(0, Math.min(15, Math.floor(effective + 1e-9)));
    const target = guarantee > 0 ? this.s136PickLuckySymbol() : null;

    this.stage120LastLuck = effective;
    this.stage120LastGuarantee = guarantee;
    this.stage120LastTargetId = target?.id || null;
    this.stage136LastLuckySymbolId = target?.id || null;
    this.stage136LastLuck = { base:incoming, permanent, burst, pity, stored, effective };

    if (target && guarantee > 0) {
      const positions = [];
      for (let col = 0; col < GAME_DATA.board.columns; col += 1) {
        for (let row = 0; row < GAME_DATA.board.rows; row += 1) positions.push([col, row]);
      }
      for (let i = positions.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      positions.slice(0, guarantee).forEach(([col, row]) => {
        const forced = this.s136MakeLuckySymbol(target);
        if (forced) columns[col][row] = forced;
      });
    }

    if (this.stage136LastSpontaneous > 0) this.s136ShowLuckPop(`🍀 LUCK SURGE +${this.stage136LastSpontaneous}`, effective);
    else if (pity > 0) this.s136ShowLuckPop(`🍀 PITY LUCK +${Number.isInteger(pity) ? pity : pity.toFixed(1)}`, effective);
    else if (effective >= 13) this.s136ShowLuckPop(`🍀 LUCK ${effective.toFixed(1)}`, effective);
    return columns;
  };

  Game.buildStage120LuckBoard = function (incomingLuck) {
    if (this.stage136SuppressNestedBuild) {
      const current = this.currentColumns;
      if (Array.isArray(current) && current.length === GAME_DATA.board.columns) {
        return current.map((column) => (column || []).map((symbol) => ({ ...symbol, modifiers:Array.isArray(symbol?.modifiers) ? [...symbol.modifiers] : undefined })));
      }
      return this.s136NaturalBoard();
    }
    return this.s136BuildLuckBoardCore(incomingLuck);
  };

  Game.prepareStage90SpinEffects = function (...args) {
    this.stage136SuppressNestedBuild = true;
    let result;
    try {
      result = prev.prepare.apply(this, args);
    } finally {
      this.stage136SuppressNestedBuild = false;
    }
    const incomingLuck = Math.max(0, Number(this.stage90ActiveLuck) || 0);
    this.stage120PreparedColumns = this.s136BuildLuckBoardCore(incomingLuck);
    this.stage120PreparedColumnIndex = 0;
    return result;
  };

  Game.evaluateAndRenderScore = async function (...args) {
    const options = args[0] || {};
    const result = await prev.evaluate.apply(this, args);
    if (!options.creditWallet) return result;

    const patterns = Array.isArray(this.lastPatterns) ? this.lastPatterns : [];
    const hadPattern = patterns.length > 0;
    const hadJackpot = patterns.some((pattern) => pattern?.key === "JACKPOT");
    this.stage136LastHadPattern = hadPattern;
    this.stage136LastHadJackpot = hadJackpot;

    if (hadPattern) this.stage136MissStreak = 0;
    else this.stage136MissStreak = Math.max(0, Number(this.stage136MissStreak) || 0) + 1;

    for (const item of this.s136Items("s136_miss_store")) {
      const e = item.effect || {};
      if (hadPattern) item.stage136MissStored = 0;
      else item.stage136MissStored = Math.min(Math.max(0, Number(e.max) || 6), Math.max(0, Number(item.stage136MissStored) || 0) + Math.max(0, Number(e.step) || 2));
    }

    let wildCount = 0;
    for (const column of this.currentColumns || []) for (const symbol of column || []) if (symbol?.id === "WD") wildCount += 1;
    for (const item of this.s136Items("s136_wild_next_luck")) {
      const e = item.effect || {};
      item.stage136NextWildLuck = Math.min(Math.max(0, Number(e.max) || 4), wildCount * Math.max(0, Number(e.perWild) || 1));
    }

    const effective = Math.max(0, Number(this.stage136LastLuck?.effective) || 0);
    for (const item of this.s136Items("s136_jackpot_store")) {
      const e = item.effect || {};
      if (hadJackpot) item.stage136JackpotStored = 0;
      else if (effective >= Math.max(0, Number(e.threshold) || 8)) {
        item.stage136JackpotStored = Math.min(Math.max(0, Number(e.max) || 5), Math.max(0, Number(item.stage136JackpotStored) || 0) + Math.max(0, Number(e.step) || 1));
      }
    }

    this.updateStatsRail?.();
    return result;
  };

  Game.showDeadlineSuccess = function (...args) {
    const result = prev.deadlineSuccess.apply(this, args);
    for (const item of this.s136Items("s136_deadline_luck")) {
      const e = item.effect || {};
      const before = Math.max(0, Number(item.stage136EngineLuck) || 0);
      item.stage136EngineLuck = Math.min(Math.max(0, Number(e.max) || 5), before + Math.max(0, Number(e.step) || 1));
      if (item.stage136EngineLuck > before) this.s136ShowLuckPop(`🍀 ${item.name} +${item.stage136EngineLuck.toFixed(0)}`, item.stage136EngineLuck);
    }
    this.updateStatsRail?.();
    return result;
  };

  Game.getItemDisplayNote = function (item) {
    const base = prev.note ? prev.note.call(this, item) : (item?.note || "");
    const e = item?.effect || {};
    const extras = [];
    if (e.type === "s136_periodic_burst") extras.push(`ROLL ${Math.max(0, Number(this.stage136RollIndex)||0) % Math.max(1,Number(e.every)||3)} / ${Math.max(1,Number(e.every)||3)}`);
    if (e.type === "s136_miss_store") extras.push(`저장 LUCK +${Math.max(0,Number(item.stage136MissStored)||0)}`);
    if (e.type === "s136_ticket_luck") {
      const n = Math.min(Math.max(0,Number(e.max)||4), Math.floor(Math.max(0,Number(this.tickets)||0)/Math.max(1,Number(e.every)||10))*(Number(e.step)||1));
      extras.push(`현재 LUCK +${n}`);
    }
    if (e.type === "s136_wild_next_luck" && (Number(item.stage136NextWildLuck)||0)>0) extras.push(`다음 ROLL +${Number(item.stage136NextWildLuck)||0}`);
    if (e.type === "s136_jackpot_store") extras.push(`저장 LUCK +${Math.max(0,Number(item.stage136JackpotStored)||0)}`);
    if (e.type === "s136_deadline_luck") extras.push(`현재 Permanent LUCK +${Math.max(0,Number(item.stage136EngineLuck)||0)}`);
    return `${base}${extras.length ? ` · ${extras.join(" · ")}` : ""}`;
  };

  Game.s136VersionUI = function () {
    GAME_DATA.version = V;
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = `CONTROLLED MARKET SYSTEM · VERSION ${V}`;
    const chip = document.querySelector(".top-status .status-chip strong");
    if (chip) chip.textContent = V;
  };

  Game.updateStatsRail = function (...args) {
    const result = prev.stats?.apply(this, args);
    const grid = this.runStatsGrid || document.querySelector("#runStatsGrid");
    if (!grid) return result;
    grid.querySelector(".stage135-pattern-rate-stat")?.remove();
    grid.querySelector(".stage136-luck-stat")?.remove();
    const l = this.stage136LastLuck || { permanent:0, burst:0, pity:0, stored:0, effective:0 };
    const symbolId = this.stage136LastLuckySymbolId;
    const icon = symbolId ? (this.getSymbolEmoji?.(symbolId) || symbolId) : "-";
    const fmt = (n) => Number.isInteger(Number(n)) ? String(Number(n)||0) : (Number(n)||0).toFixed(1);
    grid.insertAdjacentHTML("beforeend", `<div class="stat-reference-row stage136-luck-stat" title="패턴별 직접 확률이 아니라 LUCK N만큼 서로 다른 랜덤 칸을 Lucky Symbol로 바꾼 뒤 자연 패턴을 판정합니다."><span>🍀 LUCK</span><strong>${fmt(l.effective)} · 영구 ${fmt(l.permanent)} · 폭발 ${fmt(l.burst)} · Pity ${fmt(l.pity)} · 저장 ${fmt(l.stored)} · Lucky ${icon}</strong></div>`);
    return result;
  };

  Game.updateAllUI = function (...args) {
    const result = prev.update.apply(this, args);
    this.s136VersionUI();
    return result;
  };

  Game.init = function (...args) {
    this.s136Reset();
    this.patchStage136LuckData?.();
    const result = prev.init.apply(this, args);
    this.s136EnsureStyle();
    this.s136VersionUI();
    this.updateStatsRail?.();
    console.info("DEADLINE v1.3.6: Clover-style LUCK rework loaded.");
    return result;
  };

  Game.restartRun = function (...args) {
    this.s136Reset();
    const result = prev.restart.apply(this, args);
    this.s136Reset();
    this.patchStage136LuckData?.();
    this.s136EnsureStyle();
    this.s136VersionUI();
    this.updateStatsRail?.();
    return result;
  };

  Game.patchStage136LuckData?.();
  Game.s136VersionUI();
})();
