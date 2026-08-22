// DEADLINE — v0.8.0 Stage 8 트리거 / 연쇄 시스템
"use strict";

(() => {
  // Stage 8 데이터는 기존 Stage 7 데이터를 보존한 채 마지막 레이어에서 확장합니다.
  GAME_DATA.version = "v0.8.0";
  GAME_DATA.stage = 8;
  GAME_DATA.triggers = {
    maxDepth: 4,
    maxActivationsPerPattern: 12
  };

  const STAGE8_ITEMS = [
    {
      id: "echo_chip",
      name: "에코 칩",
      category: "트리거",
      price: 3,
      note: "[연쇄] 패턴 당첨 시 원본 점수의 15% 추가 지급",
      effect: { type: "trigger_pattern_bonus", ratio: 0.15 }
    },
    {
      id: "horizontal_relay",
      name: "가로 릴레이",
      category: "트리거",
      price: 3,
      note: "[연쇄] 가로 패턴 당첨 시 원본 점수의 25% 추가 지급",
      effect: { type: "trigger_pattern_bonus", keys: ["H3", "H4", "H5"], ratio: 0.25 }
    },
    {
      id: "diamond_echo",
      name: "다이아 에코",
      category: "트리거",
      price: 4,
      note: "[연쇄] 다이아 패턴 당첨 시 원본 점수의 35% 추가 지급",
      effect: { type: "trigger_pattern_bonus", symbolIds: ["DM"], ratio: 0.35 }
    },
    {
      id: "jackpot_capacitor",
      name: "잭팟 축전기",
      category: "트리거",
      price: 5,
      note: "[연쇄] 잭팟 정산 시 원본 점수의 75% 추가 지급",
      effect: { type: "trigger_pattern_bonus", keys: ["JACKPOT"], ratio: 0.75 }
    },
    {
      id: "amplifier_coil",
      name: "증폭 코일",
      category: "트리거",
      price: 4,
      note: "[연쇄] 다른 트리거가 만든 보너스의 50%를 다시 추가 지급",
      effect: { type: "trigger_bonus_amplify", ratio: 0.5 }
    },
    {
      id: "chain_relay",
      name: "연쇄 계전기",
      category: "트리거",
      price: 4,
      note: "[연쇄] 같은 패턴에서 트리거 2회 이상 이어지면 원본 점수의 25% 추가 지급",
      effect: { type: "trigger_chain_threshold", threshold: 2, ratio: 0.25 }
    }
  ];

  const existingItemIds = new Set((GAME_DATA.items || []).map((item) => item.id));
  STAGE8_ITEMS.forEach((item) => {
    if (!existingItemIds.has(item.id)) GAME_DATA.items.push(item);
  });

  Game.stage = 8;
  Game.status = "TRIGGER_CHAIN_SYSTEM";

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousRestartRun = Game.restartRun;
  const previousUpdateStatsRail = Game.updateStatsRail;

  Game.ensureTriggerStats = function () {
    if (!this.runStats) this.runStats = {};
    if (!Number.isFinite(this.runStats.triggerActivations)) this.runStats.triggerActivations = 0;
    if (!Number.isFinite(this.runStats.triggerBonusEarned)) this.runStats.triggerBonusEarned = 0;
    if (!Number.isFinite(this.runStats.bestChain)) this.runStats.bestChain = 0;
  };

  Game.ensureTriggerUI = function () {
    if (!this.scoreBreakdown || !this.reelsEl) return;

    if (!this.triggerFeed) {
      const feed = document.createElement("div");
      feed.id = "triggerFeed";
      feed.className = "trigger-feed";
      feed.hidden = true;
      feed.setAttribute("aria-live", "polite");
      this.scoreBreakdown.insertAdjacentElement("beforebegin", feed);
      this.triggerFeed = feed;
    }

    if (!this.triggerChainHud) {
      const shell = this.reelsEl.closest(".reels-shell");
      if (shell) {
        const hud = document.createElement("div");
        hud.id = "triggerChainHud";
        hud.className = "trigger-chain-hud";
        hud.hidden = true;
        hud.innerHTML = `<span>CHAIN</span><strong>x1</strong><small>+$0</small>`;
        shell.appendChild(hud);
        this.triggerChainHud = hud;
      }
    }
  };

  Game.clearTriggerUI = function ({ keepSummary = false } = {}) {
    this.ensureTriggerUI();
    if (!keepSummary && this.triggerFeed) {
      this.triggerFeed.innerHTML = "";
      this.triggerFeed.hidden = true;
      this.triggerFeed.classList.remove("is-final-summary");
    }
    if (this.triggerChainHud) {
      this.triggerChainHud.hidden = true;
      this.triggerChainHud.classList.remove("is-hot");
    }
    this.reelsEl?.closest(".reels-shell")?.classList.remove("trigger-chain-pulse");
  };

  Game.getOwnedTriggerItems = function () {
    return (this.ownedItems || []).filter((item) =>
      String(item.effect?.type || "").startsWith("trigger_")
    );
  };

  Game.triggerItemMatchesEvent = function (item, event, context) {
    const effect = item.effect;
    if (!effect) return false;
    if (context.firedInstances.has(item.instanceId)) return false;
    if (event.depth > GAME_DATA.triggers.maxDepth) return false;

    if (effect.type === "trigger_pattern_bonus") {
      if (event.type !== "PATTERN_SETTLED") return false;
      if (effect.keys?.length && !effect.keys.includes(context.rootPattern.key)) return false;
      if (effect.symbolIds?.length && !effect.symbolIds.includes(context.rootPattern.symbol.id)) return false;
      return true;
    }

    if (effect.type === "trigger_bonus_amplify") {
      return event.type === "BONUS_GRANTED";
    }

    if (effect.type === "trigger_chain_threshold") {
      return (
        event.type === "BONUS_GRANTED" &&
        context.triggerCount >= (effect.threshold || 2)
      );
    }

    return false;
  };

  Game.getTriggerBonusAmount = function (item, event, context) {
    const effect = item.effect || {};
    let basis = 0;

    if (effect.type === "trigger_pattern_bonus") basis = context.rootAmount;
    if (effect.type === "trigger_bonus_amplify") basis = event.amount;
    if (effect.type === "trigger_chain_threshold") basis = context.rootAmount;

    if (!Number.isFinite(basis) || basis <= 0) return 0;
    return Math.max(1, Math.round(basis * (Number(effect.ratio) || 0)));
  };

  Game.renderTriggerActivation = function (item, bonus, depth, activationIndex, context) {
    this.ensureTriggerUI();
    if (!this.triggerFeed) return;

    this.triggerFeed.hidden = false;
    this.triggerFeed.classList.remove("is-final-summary");

    const chip = document.createElement("div");
    chip.className = `trigger-feed-chip trigger-depth-${Math.min(depth, 4)}`;
    chip.style.setProperty("--trigger-depth", String(depth));
    chip.innerHTML = `
      <span class="trigger-feed-index">${activationIndex}</span>
      <strong>${item.name}</strong>
      <small>${depth > 1 ? "연쇄" : "발동"}</small>
      <b>+$${bonus.toLocaleString("ko-KR")}</b>
    `;
    this.triggerFeed.appendChild(chip);

    while (this.triggerFeed.children.length > 5) {
      this.triggerFeed.firstElementChild?.remove();
    }

    if (this.triggerChainHud) {
      this.triggerChainHud.hidden = false;
      this.triggerChainHud.querySelector("strong").textContent = `x${context.triggerCount}`;
      this.triggerChainHud.querySelector("small").textContent = `+$${context.bonusTotal.toLocaleString("ko-KR")}`;
      this.triggerChainHud.classList.toggle("is-hot", context.triggerCount >= 3);
    }

    const shell = this.reelsEl?.closest(".reels-shell");
    if (shell) {
      shell.classList.remove("trigger-chain-pulse");
      void shell.offsetWidth;
      shell.classList.add("trigger-chain-pulse");
    }
  };

  Game.playTriggerTone = function (depth, activationIndex) {
    if (typeof this.playCasinoBell !== "function") return;
    const base = 698.46 * Math.pow(2, Math.min(activationIndex - 1, 8) / 36);
    this.playCasinoBell({
      frequency: base * Math.pow(2, Math.min(depth, 3) / 12),
      duration: 0.12 + Math.min(depth, 3) * 0.025,
      volume: 0.024 + Math.min(depth, 3) * 0.005,
      richness: Math.min(3, 1 + depth)
    });
  };

  Game.playTriggerActivation = async function (
    item,
    bonus,
    eventDepth,
    context,
    runningTotal,
    oldWallet,
    creditWallet
  ) {
    const nextTotal = runningTotal + bonus;
    this.renderTriggerActivation(
      item,
      bonus,
      eventDepth,
      context.triggerCount,
      context
    );
    this.playTriggerTone(eventDepth, context.triggerCount);

    this.readoutDetail.textContent =
      `${item.name} 발동 · CHAIN x${context.triggerCount} · +$${bonus.toLocaleString("ko-KR")}`;

    const animations = [
      EffectsManager.animateNumber(this.payoutValue, runningTotal, nextTotal, {
        duration: context.triggerCount > 5 ? 100 : 145,
        prefix: "+ $ "
      })
    ];

    if (creditWallet) {
      this.wallet = oldWallet + nextTotal;
      EffectsManager.pulseWallet(this.walletValue);
      animations.push(
        EffectsManager.animateNumber(this.walletValue, oldWallet + runningTotal, oldWallet + nextTotal, {
          duration: context.triggerCount > 5 ? 100 : 145,
          prefix: "$ "
        })
      );
    }

    await Promise.all(animations);
    await this.wait(context.triggerCount > 5 ? 55 : 90);
    return nextTotal;
  };

  Game.runTriggerQueueForPattern = async function (
    pattern,
    runningTotal,
    oldWallet,
    creditWallet
  ) {
    const triggerItems = this.getOwnedTriggerItems();
    if (!triggerItems.length) {
      return {
        runningTotal,
        bonusTotal: 0,
        activations: 0,
        maxDepth: 0,
        truncated: false
      };
    }

    this.clearTriggerUI();

    const context = {
      rootPattern: pattern,
      rootAmount: pattern.amount,
      firedInstances: new Set(),
      triggerCount: 0,
      bonusTotal: 0,
      maxDepthSeen: 0,
      truncated: false
    };

    const queue = [{
      type: "PATTERN_SETTLED",
      amount: pattern.amount,
      depth: 0,
      sourceItemInstanceId: null
    }];

    while (queue.length > 0) {
      const event = queue.shift();
      if (!event || event.depth > GAME_DATA.triggers.maxDepth) continue;

      for (const item of triggerItems) {
        if (context.triggerCount >= GAME_DATA.triggers.maxActivationsPerPattern) {
          context.truncated = true;
          queue.length = 0;
          break;
        }

        if (!this.triggerItemMatchesEvent(item, event, context)) continue;

        const bonus = this.getTriggerBonusAmount(item, event, context);
        context.firedInstances.add(item.instanceId);
        if (bonus <= 0) continue;

        context.triggerCount += 1;
        context.bonusTotal += bonus;
        const activationDepth = Math.min(GAME_DATA.triggers.maxDepth, event.depth + 1);
        context.maxDepthSeen = Math.max(context.maxDepthSeen, activationDepth);

        runningTotal = await this.playTriggerActivation(
          item,
          bonus,
          activationDepth,
          context,
          runningTotal,
          oldWallet,
          creditWallet
        );

        if (activationDepth < GAME_DATA.triggers.maxDepth) {
          queue.push({
            type: "BONUS_GRANTED",
            amount: bonus,
            depth: activationDepth,
            sourceItemInstanceId: item.instanceId
          });
        }
      }
    }

    return {
      runningTotal,
      bonusTotal: context.bonusTotal,
      activations: context.triggerCount,
      maxDepth: context.maxDepthSeen,
      truncated: context.truncated
    };
  };

  Game.renderTriggerFinalSummary = function (activations, bonusTotal, bestChain, truncated) {
    this.ensureTriggerUI();
    if (!this.triggerFeed) return;

    if (activations <= 0) {
      this.triggerFeed.innerHTML = "";
      this.triggerFeed.hidden = true;
      return;
    }

    this.triggerFeed.hidden = false;
    this.triggerFeed.classList.add("is-final-summary");
    this.triggerFeed.innerHTML = `
      <div class="trigger-final-chip">
        <span>TRIGGER</span>
        <strong>${activations}회 발동</strong>
        <b>+$${bonusTotal.toLocaleString("ko-KR")}</b>
        <small>최대 CHAIN x${bestChain}${truncated ? " · LIMIT" : ""}</small>
      </div>
    `;

    if (this.triggerChainHud) this.triggerChainHud.hidden = true;
  };

  // Stage 7.4의 패턴 단위 순차 정산 사이에 Stage 8 트리거 큐를 삽입합니다.
  Game.evaluateAndRenderScore = async function ({ creditWallet = false, testLabel = "" } = {}) {
    const options = { creditWallet, testLabel };
    this.itemScoringContext = options;

    try {
      this.ensureTriggerStats();
      this.clearPatternImpactState();
      this.clearTriggerUI();

      const patterns = this.detectPatterns();
      this.lastPatterns = patterns;

      if (creditWallet) this.runStats.totalRerolls += 1;

      if (patterns.length === 0) {
        this.payoutValue.textContent = "+ $ 0";
        this.patternList.innerHTML = '<span class="pattern-empty">일치 패턴 없음</span>';
        this.scoreBreakdown.textContent = "이번 회전 지급액: $ 0";
        this.readoutDetail.textContent = testLabel || "이번 결과에는 점수가 발생하지 않았습니다.";
        this.updateStatsRail();
        return 0;
      }

      const { scored, total: baseTotal } = this.scorePatterns(patterns);
      const sequence = this.getSequentialPatterns(scored);
      const timing = this.getPatternRevealTiming(sequence.length);
      const oldWallet = this.wallet;

      let runningTotal = 0;
      let triggerBonusTotal = 0;
      let triggerActivations = 0;
      let bestChain = 0;
      let anyTruncated = false;
      let jackpotCount = 0;

      this.machinePanel?.classList.add("is-pattern-revealing", "is-pattern-sequence-v74");

      for (let index = 0; index < sequence.length; index += 1) {
        const pattern = sequence[index];
        if (pattern.key === "JACKPOT") jackpotCount += 1;

        runningTotal = await this.playSinglePatternImpact(
          pattern,
          index,
          sequence.length,
          timing,
          runningTotal,
          oldWallet,
          creditWallet
        );

        const triggerResult = await this.runTriggerQueueForPattern(
          pattern,
          runningTotal,
          oldWallet,
          creditWallet
        );

        runningTotal = triggerResult.runningTotal;
        triggerBonusTotal += triggerResult.bonusTotal;
        triggerActivations += triggerResult.activations;
        bestChain = Math.max(bestChain, triggerResult.activations);
        anyTruncated ||= triggerResult.truncated;
      }

      if (jackpotCount > 0) await this.playJackpotFinish();

      const finalTotal = runningTotal;
      this.clearPatternImpactState({ keepFinalHits: true });
      this.highlightPatterns(patterns);
      this.patternList.innerHTML = sequence.map((pattern) => this.patternChipHTML72(pattern)).join("");
      this.scoreBreakdown.innerHTML =
        sequence.map((pattern) => this.breakdownHTML(pattern)).join("") +
        (triggerBonusTotal > 0
          ? `<div class="trigger-score-summary"><span>트리거 보너스</span><strong>+$${triggerBonusTotal.toLocaleString("ko-KR")}</strong></div>`
          : "");
      this.payoutValue.textContent = `+ $ ${finalTotal.toLocaleString("ko-KR")}`;

      if (creditWallet) {
        this.wallet = oldWallet + finalTotal;
        this.updateEconomyUI(false);
        this.runStats.winningRerolls += 1;
        this.runStats.totalEarned += finalTotal;
        this.runStats.bestPayout = Math.max(this.runStats.bestPayout, finalTotal);
        this.runStats.jackpots += jackpotCount;
        this.runStats.triggerActivations += triggerActivations;
        this.runStats.triggerBonusEarned += triggerBonusTotal;
        this.runStats.bestChain = Math.max(this.runStats.bestChain, bestChain);
      }

      this.renderTriggerFinalSummary(
        triggerActivations,
        triggerBonusTotal,
        bestChain,
        anyTruncated
      );

      this.readoutDetail.textContent = testLabel || (
        triggerActivations > 0
          ? `${sequence.length}개 패턴 · 트리거 ${triggerActivations}회 · 기본 $${baseTotal.toLocaleString("ko-KR")} + 연쇄 $${triggerBonusTotal.toLocaleString("ko-KR")}`
          : `${sequence.length}개 패턴 순차 정산 완료 · +$${finalTotal.toLocaleString("ko-KR")}`
      );

      this.updateStatsRail();
      return finalTotal;
    } finally {
      this.itemScoringContext = null;
      this.machinePanel?.classList.remove("is-pattern-revealing", "is-pattern-sequence-v74", "pattern-jackpot-finish");
      this.ensurePatternFxLayer()?.classList.remove("is-active", "is-special", "is-jackpot", "is-jackpot-finish");
    }
  };

  Game.updateStatsRail = function () {
    previousUpdateStatsRail?.call(this);
    this.ensureTriggerStats();
    if (!this.runStatsGrid) return;

    const extraRows = [
      ["트리거 발동", this.runStats.triggerActivations.toLocaleString("ko-KR")],
      ["연쇄 보너스", `$${this.runStats.triggerBonusEarned.toLocaleString("ko-KR")}`],
      ["최대 연쇄", `x${this.runStats.bestChain}`]
    ];

    this.runStatsGrid.insertAdjacentHTML(
      "beforeend",
      extraRows.map(([label, value]) => `
        <div class="stat-reference-row trigger-stat-row">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `).join("")
    );
  };

  Game.init = function () {
    previousInit.call(this);
    this.ensureTriggerStats();
    this.ensureTriggerUI();
    this.stage = 8;
    this.status = "TRIGGER_CHAIN_SYSTEM";
    this.stageStatus.textContent = this.roundPreparation
      ? "8단계 · 라운드 준비"
      : "8단계 · 트리거 연쇄";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 8 trigger chain system loaded.`);
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    this.ensureTriggerStats();

    if (this.gameOver) {
      this.stageStatus.textContent = "8단계 · GAME OVER";
    } else if (this.runComplete) {
      this.stageStatus.textContent = "8단계 · CLEAR";
    } else if (this.shopOpen) {
      this.stageStatus.textContent = "8단계 · 상점";
    } else if (this.roundPreparation) {
      this.stageStatus.textContent = "8단계 · 라운드 준비";
    } else if (this.roundStarted) {
      this.stageStatus.textContent = "8단계 · 트리거 연쇄";
    }
  };

  Game.restartRun = function () {
    this.clearTriggerUI();
    previousRestartRun.call(this);
    this.ensureTriggerStats();
    this.updateStatsRail();
  };
})();
