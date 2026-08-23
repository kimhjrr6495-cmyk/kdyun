// DEADLINE — v1.3.2 ordered activation / retrigger replay
"use strict";

(() => {
  GAME_DATA.version = "v1.3.2";

  const prev = {
    init: Game.init,
    restartRun: Game.restartRun,
    updateAllUI: Game.updateAllUI,
    renderReels: Game.renderReels,
    spin: Game.spin,
    prepareSpinEffects: Game.prepareStage90SpinEffects,
    rollChance: Game.rollStage90Chance,
    processModifiers: Game.processStage90PatternModifiers,
    retriggerCount: Game.getStage90RetriggerCount,
    playPatternImpact: Game.playSinglePatternImpact,
    runTriggerQueue: Game.runTriggerQueueForPattern,
    evaluateScore: Game.evaluateAndRenderScore
  };

  const wait = (game, ms) =>
    game.wait ? game.wait(ms) : new Promise((resolve) => setTimeout(resolve, ms));

  const css = `
.stage132-board-sweep{
  position:absolute;
  z-index:68;
  pointer-events:none;
  overflow:visible;
  filter:drop-shadow(0 0 7px rgba(44,205,112,.56));
}
.stage132-board-sweep .s132-base{
  fill:none;
  stroke:rgba(60,211,125,.24);
  stroke-width:2.2;
  vector-effect:non-scaling-stroke;
  animation:s132BoardAura .56s ease-out both;
}
.stage132-board-sweep .s132-runner{
  fill:none;
  stroke:#42d77c;
  stroke-width:4;
  stroke-linecap:round;
  vector-effect:non-scaling-stroke;
  stroke-dasharray:16 84;
  stroke-dashoffset:100;
  animation:s132BoardSweep .56s cubic-bezier(.2,.74,.24,1) both;
}
.stage132-modifier-text{
  z-index:6;
  font-weight:900;
  font-size:clamp(14px,1.55vw,20px);
  letter-spacing:-.03em;
  text-shadow:0 2px 0 rgba(255,255,255,.96),0 3px 8px rgba(0,0,0,.16);
  animation:s131Float .69s cubic-bezier(.2,.75,.2,1) both;
}
.stage132-chain{color:#7c61d9}
.stage132-golden{color:#c18a08}
.stage132-repeat-cell{
  box-shadow:inset 0 0 0 3px rgba(126,93,218,.42),0 0 16px rgba(126,93,218,.22);
}
@keyframes s132BoardSweep{
  0%{opacity:0;stroke-dashoffset:100}
  12%{opacity:1}
  82%{opacity:1}
  100%{opacity:0;stroke-dashoffset:0}
}
@keyframes s132BoardAura{
  0%{opacity:0}
  28%{opacity:1}
  100%{opacity:0}
}
@media(prefers-reduced-motion:reduce){
  .stage132-board-sweep .s132-base,
  .stage132-board-sweep .s132-runner{animation-duration:1ms!important}
}
`;

  const uniqItems = (items) => {
    const seen = new Set();
    return (items || []).filter((item) => {
      if (!item) return false;
      const key = item.instanceId || item.id || `${item.name}:${item.icon}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  Game.s132VersionUI = function () {
    GAME_DATA.version = "v1.3.2";
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.3.2";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.3.2";
  };

  Game.s132InstallStyle = function () {
    if (document.querySelector("#stage132Style")) return;
    const style = document.createElement("style");
    style.id = "stage132Style";
    style.textContent = css;
    document.head.appendChild(style);
  };

  Game.s132Reset = function () {
    this.s132PreSpinLock = false;
    this.s132SkipNextPrepare = false;
    this.s132CapturingPreRoll = false;
    this.s132PreRollHits = [];
    this.s132CapturingRetrigger = false;
    this.s132RetriggerChanceHits = [];
    this.s132PendingRetriggerSources = [];
    this.s132ReplayNoRepeat = false;
  };

  Game.s132FloatModifier = async function (text, coords, kind = "chain") {
    this.s131Spawn?.(
      text,
      coords,
      `stage132-modifier-text stage132-${kind}`,
      620
    );
    await wait(this, 105);
  };

  Game.s132BoardSweep = async function (item) {
    const host = document.querySelector(".reels-shell");
    const reels = this.reelsEl || document.querySelector("#reels");
    if (!host || !reels) return;

    const hostRect = host.getBoundingClientRect();
    const reelsRect = reels.getBoundingClientRect();
    const width = Math.max(1, reelsRect.width);
    const height = Math.max(1, reelsRect.height);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("stage132-board-sweep");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-hidden", "true");
    svg.style.left = `${reelsRect.left - hostRect.left}px`;
    svg.style.top = `${reelsRect.top - hostRect.top}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;

    const makeRect = (cls) => {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", "3");
      rect.setAttribute("y", "3");
      rect.setAttribute("width", String(Math.max(1, width - 6)));
      rect.setAttribute("height", String(Math.max(1, height - 6)));
      rect.setAttribute("rx", "14");
      rect.setAttribute("ry", "14");
      rect.setAttribute("pathLength", "100");
      rect.setAttribute("class", cls);
      return rect;
    };

    svg.append(makeRect("s132-base"), makeRect("s132-runner"));
    host.appendChild(svg);

    if (item) {
      await this.s131Icon?.(item, null);
      this.s131Sound?.("item");
    }
    await wait(this, 455);
    svg.remove();
  };

  // v1.3.1은 Modifier가 생성된 순간에도 아이템 이모지를 띄웠습니다.
  // v1.3.2부터는 실제 당첨 패턴에서 Modifier가 처리될 때만 이펙트를 냅니다.
  Game.renderReels = function (...args) {
    (this.currentColumns || []).forEach((column) => {
      (column || []).forEach((symbol) => {
        if (!symbol?.s131Sources) return;
        symbol.s131Shown = symbol.s131Shown || {};
        Object.keys(symbol.s131Sources).forEach((modifier) => {
          symbol.s131Shown[modifier] = true;
        });
      });
    });
    return prev.renderReels.apply(this, args);
  };

  Game.rollStage90Chance = function (item, ...args) {
    const ok = prev.rollChance.call(this, item, ...args);
    if (!ok || !item) return ok;

    if (
      this.s132CapturingPreRoll &&
      ["chance_spin_luck", "chance_spin_mult"].includes(item.effect?.type)
    ) {
      this.s132PreRollHits.push(item);
    }

    if (
      this.s132CapturingRetrigger &&
      item.effect?.type === "pattern_retrigger_chance"
    ) {
      this.s132RetriggerChanceHits.push(item);
    }

    return ok;
  };

  Game.s132PrepareSpinOnce = function () {
    const oldSuppress = this.s131SuppressChance;
    this.s131SuppressChance = true;
    this.s132CapturingPreRoll = true;
    this.s132PreRollHits = [];
    let result;
    try {
      result = prev.prepareSpinEffects?.call(this);
    } finally {
      this.s132CapturingPreRoll = false;
      this.s131SuppressChance = oldSuppress;
    }
    this.s132SkipNextPrepare = true;
    return result;
  };

  Game.prepareStage90SpinEffects = function (...args) {
    if (this.s132SkipNextPrepare) {
      this.s132SkipNextPrepare = false;
      return;
    }
    return prev.prepareSpinEffects?.apply(this, args);
  };

  Game.spin = async function (...args) {
    const actualSpin = Boolean(
      this.roundStarted &&
      this.currentMode &&
      this.spinsRemaining > 0 &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      !this.gameOver &&
      !this.runComplete &&
      !this.shopOpen &&
      !this.flowOverlay?.classList.contains("is-open")
    );

    if (!actualSpin) return prev.spin.apply(this, args);
    if (this.s132PreSpinLock) return;

    this.s132PreSpinLock = true;
    if (this.spinButton) this.spinButton.disabled = true;

    try {
      this.s132PrepareSpinOnce();
      const hits = uniqItems(this.s132PreRollHits);
      for (const item of hits) {
        await this.s132BoardSweep(item);
        await wait(this, 55);
      }
      return await prev.spin.apply(this, args);
    } finally {
      this.s132PreSpinLock = false;
      this.s132PreRollHits = [];
      if (this.s132SkipNextPrepare) this.s132SkipNextPrepare = false;
    }
  };

  Game.s132WithSilentStage131 = function (fn) {
    const oldEnqueue = this.s131Enqueue;
    this.s131Enqueue = () => Promise.resolve();
    try {
      return fn();
    } finally {
      this.s131Enqueue = oldEnqueue;
    }
  };

  Game.s132ModifierSourceOrIcon = function (symbol, modifier) {
    return (
      this.s131ModifierSource?.(symbol, modifier) ||
      { icon: GAME_DATA.modifiers?.[modifier]?.icon || modifier }
    );
  };

  Game.processStage90PatternModifiers = function (pattern, resolved, creditWallet) {
    const safeResolved = resolved || {
      golden: new Set(),
      ticket: new Set(),
      chain: new Set(),
      repeat: new Set()
    };

    const before = {
      golden: new Set(safeResolved.golden || []),
      ticket: new Set(safeResolved.ticket || []),
      chain: new Set(safeResolved.chain || []),
      repeat: new Set(safeResolved.repeat || [])
    };
    const symbolId = pattern?.symbol?.id;
    const beforeSymbolGrowth = Math.max(0, Number(this.symbolGrowth?.[symbolId]) || 0);
    const beforePatternGrowth = Math.max(0, Number(this.patternGrowth?.[pattern?.key]) || 0);

    const oldGetModifiers = this.getStage90CellModifiers;
    if (this.s132ReplayNoRepeat && typeof oldGetModifiers === "function") {
      this.getStage90CellModifiers = function (col, row) {
        return (oldGetModifiers.call(this, col, row) || []).filter(
          (modifier) => modifier !== "REPEAT"
        );
      };
    }

    let result;
    try {
      result = this.s132WithSilentStage131(() =>
        prev.processModifiers.call(this, pattern, safeResolved, creditWallet)
      );
    } finally {
      if (this.s132ReplayNoRepeat && oldGetModifiers) {
        this.getStage90CellModifiers = oldGetModifiers;
      }
    }

    if (!creditWallet || !pattern?.coords?.length || !result) return result;

    const newGolden = [];
    const newTickets = [];
    const newChains = [];

    pattern.coords.forEach(([col, row]) => {
      const cellKey = `${col}:${row}`;
      const mods = this.getStage90CellModifiers?.(col, row) || [];

      if (
        mods.includes("GOLDEN") &&
        !before.golden.has(cellKey) &&
        safeResolved.golden?.has(cellKey)
      ) {
        newGolden.push([col, row]);
      }

      if (
        mods.includes("TICKET") &&
        !before.ticket.has(cellKey) &&
        safeResolved.ticket?.has(cellKey)
      ) {
        newTickets.push([col, row]);
      }

      const chainKey = `${cellKey}:${pattern.key}`;
      if (
        mods.includes("CHAIN") &&
        !before.chain.has(chainKey) &&
        safeResolved.chain?.has(chainKey)
      ) {
        newChains.push([col, row]);
      }
    });

    const afterSymbolGrowth = Math.max(0, Number(this.symbolGrowth?.[symbolId]) || 0);
    const afterPatternGrowth = Math.max(0, Number(this.patternGrowth?.[pattern?.key]) || 0);
    const goldenPerCell = newGolden.length
      ? (afterSymbolGrowth - beforeSymbolGrowth) / newGolden.length
      : 0;
    const chainPerCell = newChains.length
      ? (afterPatternGrowth - beforePatternGrowth) / newChains.length
      : 0;

    const ticketVisuals = newTickets.slice(
      0,
      Math.max(0, Number(result.ticketGain) || 0)
    );

    pattern.coords.forEach(([col, row]) => {
      const symbol = this.currentColumns?.[col]?.[row];

      if (newGolden.some(([c, r]) => c === col && r === row)) {
        const source = this.s132ModifierSourceOrIcon(symbol, "GOLDEN");
        void this.s131Enqueue(async () => {
          await this.s131Icon(source, [[col, row]]);
          await this.s131Pulse([[col, row]], "s131-pulse", 145);
          if (goldenPerCell > 0) {
            await this.s132FloatModifier(
              `✨ +${this.formatReferenceNumber?.(goldenPerCell) ?? goldenPerCell}`,
              [[col, row]],
              "golden"
            );
          }
        }, 70);
      }

      if (ticketVisuals.some(([c, r]) => c === col && r === row)) {
        const source = this.s132ModifierSourceOrIcon(symbol, "TICKET");
        void this.s131Enqueue(async () => {
          await this.s131Icon(source, [[col, row]]);
          await this.s131Pulse([[col, row]], "s131-ticket-cell", 135);
          await this.s131Float("🎟️ +1", [[col, row]], "ticket");
        }, 75);
      }

      if (newChains.some(([c, r]) => c === col && r === row)) {
        const source = this.s132ModifierSourceOrIcon(symbol, "CHAIN");
        void this.s131Enqueue(async () => {
          await this.s131Icon(source, [[col, row]]);
          await this.s131Pulse([[col, row]], "s131-pulse", 145);
          if (chainPerCell > 0) {
            await this.s132FloatModifier(
              `⛓️ +${this.formatReferenceNumber?.(chainPerCell) ?? chainPerCell}`,
              [[col, row]],
              "chain"
            );
          }
        }, 70);
      }
    });

    return result;
  };

  Game.getStage90RetriggerCount = function (pattern, context = {}) {
    const oldEnqueue = this.s131Enqueue;
    this.s131Enqueue = () => Promise.resolve();
    this.s132CapturingRetrigger = true;
    this.s132RetriggerChanceHits = [];

    let count = 0;
    try {
      count = prev.retriggerCount.call(this, pattern, context);
    } finally {
      this.s132CapturingRetrigger = false;
      this.s131Enqueue = oldEnqueue;
    }

    if (!count || !pattern?.coords?.length) {
      this.s132PendingRetriggerSources = [];
      return count;
    }

    const sources = [];
    let modifierBudget = Math.max(0, Number(context.modifierRepeats) || 0);

    pattern.coords.forEach(([col, row]) => {
      if (modifierBudget <= 0) return;
      const mods = this.getStage90CellModifiers?.(col, row) || [];
      if (!mods.includes("REPEAT")) return;
      sources.push({
        kind: "modifier",
        icon: "↻",
        coords: [[col, row]]
      });
      modifierBudget -= 1;
    });

    (this.getStage90ItemsByEffect?.("retrigger_every") || []).forEach((item) => {
      const every = Math.max(1, Number(item.effect?.every) || 7);
      if (context.spinOrdinal > 0 && context.spinOrdinal % every === 0) {
        sources.push({ kind: "item", item, coords: pattern.coords });
      }
    });

    if (context.isHighest) {
      (this.getStage90ItemsByEffect?.("retrigger_highest") || []).forEach((item) => {
        const amount = Math.max(0, Number(item.effect?.count) || 1);
        for (let i = 0; i < amount; i += 1) {
          sources.push({ kind: "item", item, coords: pattern.coords });
        }
      });
    }

    uniqItems(this.s132RetriggerChanceHits).forEach((item) => {
      sources.push({ kind: "item", item, coords: pattern.coords });
    });

    while (sources.length < count) {
      sources.push({ kind: "modifier", icon: "↻", coords: pattern.coords });
    }

    this.s132PendingRetriggerSources = sources.slice(0, count);
    return count;
  };

  Game.s132ShowRetriggerSource = async function (source, pattern) {
    const coords = source?.coords?.length ? source.coords : pattern?.coords;
    if (source?.kind === "item" && source.item) {
      await this.s131Icon(source.item, coords);
      await this.s131Pulse(coords, "s131-pattern", 160);
      return;
    }

    await this.s131Icon(source?.icon || "↻", coords);
    await this.s131Pulse(coords, "stage132-repeat-cell", 150);
  };

  Game.playSinglePatternImpact = async function (pattern, ...args) {
    if (this.s131Queue?.then) await this.s131Queue;

    if (pattern?.isRetrigger) {
      const source = this.s132PendingRetriggerSources?.shift() || {
        kind: "modifier",
        icon: "↻",
        coords: pattern.coords
      };
      await this.s132ShowRetriggerSource(source, pattern);
      await wait(this, 55);
    }

    const result = await prev.playPatternImpact.call(this, pattern, ...args);

    if (pattern?.isRetrigger) {
      const creditWallet = Boolean(args[5]);
      const replayResolved = {
        golden: new Set(),
        ticket: new Set(),
        chain: new Set(),
        repeat: new Set()
      };
      this.s132ReplayNoRepeat = true;
      try {
        this.processStage90PatternModifiers(
          pattern,
          replayResolved,
          creditWallet
        );
      } finally {
        this.s132ReplayNoRepeat = false;
      }
    }

    return result;
  };

  if (typeof prev.runTriggerQueue === "function") {
    Game.runTriggerQueueForPattern = async function (...args) {
      if (this.s131Queue?.then) await this.s131Queue;
      return prev.runTriggerQueue.apply(this, args);
    };
  }

  Game.evaluateAndRenderScore = async function (...args) {
    const result = await prev.evaluateScore.apply(this, args);
    if (this.s131Queue?.then) await this.s131Queue;
    return result;
  };

  Game.updateAllUI = function (...args) {
    const result = prev.updateAllUI.apply(this, args);
    this.s132VersionUI();
    return result;
  };

  Game.init = function (...args) {
    this.s132InstallStyle();
    this.s132Reset();
    const result = prev.init.apply(this, args);
    GAME_DATA.version = "v1.3.2";
    this.s132VersionUI();
    console.info("DEADLINE v1.3.2 ordered activation / retrigger replay loaded.");
    return result;
  };

  Game.restartRun = function (...args) {
    const result = prev.restartRun.apply(this, args);
    this.s132Reset();
    GAME_DATA.version = "v1.3.2";
    this.s132VersionUI();
    return result;
  };
})();
