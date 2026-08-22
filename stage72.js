// DEADLINE — v0.7.2 심볼 컬러 / 순차 당첨 연출 / 우측 참조표 / 임시 스탯
"use strict";

(() => {
  Game.stage = 7;
  Game.status = "PATTERN_REVEAL_UI";

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousRestartRun = Game.restartRun;

  const makeEmptyStats = () => ({
    totalRerolls: 0,
    winningRerolls: 0,
    totalEarned: 0,
    bestPayout: 0,
    jackpots: 0
  });

  const PATTERN_GROUPS = [
    { id: "H", label: "가로", keys: ["H3", "H4", "H5"] },
    { id: "V3", label: "세로", keys: ["V3"] },
    { id: "DIAG", label: "대각선", keys: ["DIAG"] },
    { id: "VSHAPE", label: "V 패턴", keys: ["V", "INV_V"] },
    { id: "X", label: "X 패턴", keys: ["X"] },
    { id: "JACKPOT", label: "잭팟", keys: ["JACKPOT"] }
  ];

  const PATTERN_SHORT_LABELS = {
    H3: "가로 3",
    H4: "가로 4",
    H5: "가로 5",
    V3: "세로 3",
    DIAG: "대각선",
    V: "V",
    INV_V: "역 V",
    X: "X",
    JACKPOT: "잭팟"
  };

  Game.init = function () {
    this.runStats = makeEmptyStats();
    this.symbolValueTable = document.querySelector("#symbolValueTable");
    this.patternValueTable = document.querySelector("#patternValueTable");
    this.runStatsGrid = document.querySelector("#runStatsGrid");

    previousInit.call(this);

    this.renderReferenceRail();
    this.stageStatus.textContent = this.roundPreparation
      ? "7단계 · 라운드 준비"
      : "7단계 · 패턴 연출";
    this.updateAllUI();

    console.info(`DEADLINE ${GAME_DATA.version}: v0.7.2 pattern reveal UI loaded.`);
  };

  Game.renderReferenceRail = function () {
    if (this.symbolValueTable) {
      this.symbolValueTable.innerHTML = GAME_DATA.symbols.map((symbol) => `
        <div class="reference-row symbol-reference-row" data-symbol="${symbol.id}">
          <span class="reference-symbol-dot" aria-hidden="true"></span>
          <span>${symbol.name}</span>
          <strong>$${symbol.value}</strong>
        </div>
      `).join("");
    }

    if (this.patternValueTable) {
      const order = ["H3", "H4", "H5", "V3", "DIAG", "V", "INV_V", "X", "JACKPOT"];
      this.patternValueTable.innerHTML = order.map((key) => {
        const pattern = GAME_DATA.patterns[key];
        return `
          <div class="reference-row pattern-reference-row">
            <span>${PATTERN_SHORT_LABELS[key]}</span>
            <strong>×${this.formatMultiplier(pattern.baseValue)}</strong>
          </div>
        `;
      }).join("");
    }

    this.updateStatsRail();
  };

  Game.updateStatsRail = function () {
    if (!this.runStatsGrid) return;
    const stats = this.runStats || makeEmptyStats();
    const values = [
      ["총 리롤", stats.totalRerolls.toLocaleString("ko-KR")],
      ["당첨 리롤", stats.winningRerolls.toLocaleString("ko-KR")],
      ["총 획득금", `$${stats.totalEarned.toLocaleString("ko-KR")}`],
      ["최고 지급", `$${stats.bestPayout.toLocaleString("ko-KR")}`],
      ["잭팟", stats.jackpots.toLocaleString("ko-KR")],
      ["보유 아이템", `${(this.ownedItems || []).length} / ${GAME_DATA.shop.maxOwnedItems}`]
    ];

    this.runStatsGrid.innerHTML = values.map(([label, value]) => `
      <div class="stat-reference-row">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join("");
  };

  Game.getRevealGroups = function (scoredPatterns) {
    return PATTERN_GROUPS.map((definition) => {
      const patterns = scoredPatterns.filter((pattern) => definition.keys.includes(pattern.key));
      return {
        ...definition,
        patterns,
        total: patterns.reduce((sum, pattern) => sum + pattern.amount, 0)
      };
    }).filter((group) => group.patterns.length > 0);
  };

  Game.highlightRevealPatterns = function (patterns) {
    this.reelsEl
      .querySelectorAll(".pattern-hit, .pattern-sequence-hit")
      .forEach((cell) => cell.classList.remove("pattern-hit", "pattern-sequence-hit"));

    const hitKeys = new Set();
    patterns.forEach((pattern) => {
      pattern.coords.forEach(([col, row]) => hitKeys.add(`${col}:${row}`));
    });

    hitKeys.forEach((key) => {
      const [col, row] = key.split(":");
      const cell = this.reelsEl.querySelector(
        `.reel-symbol[data-col="${col}"][data-row="${row}"]`
      );
      if (cell) cell.classList.add("pattern-sequence-hit");
    });
  };

  Game.patternChipHTML72 = function (pattern) {
    return `<span class="pattern-chip pattern-chip-sequence" data-symbol="${pattern.symbol.id}">${pattern.name} · ${pattern.symbol.name} +$${pattern.amount.toLocaleString("ko-KR")}</span>`;
  };

  Game.evaluateAndRenderScore = async function ({ creditWallet = false, testLabel = "" } = {}) {
    const options = { creditWallet, testLabel };
    this.itemScoringContext = options;

    try {
      const patterns = this.detectPatterns();
      this.lastPatterns = patterns;

      if (creditWallet) {
        this.runStats.totalRerolls += 1;
      }

      if (patterns.length === 0) {
        this.reelsEl
          .querySelectorAll(".pattern-hit, .pattern-sequence-hit")
          .forEach((cell) => cell.classList.remove("pattern-hit", "pattern-sequence-hit"));
        this.payoutValue.textContent = "+ $ 0";
        this.patternList.innerHTML = '<span class="pattern-empty">일치 패턴 없음</span>';
        this.scoreBreakdown.textContent = "이번 회전 지급액: $ 0";
        this.readoutDetail.textContent = testLabel || "이번 결과에는 점수가 발생하지 않았습니다.";
        this.updateStatsRail();
        return 0;
      }

      const { scored, total } = this.scorePatterns(patterns);
      const revealGroups = this.getRevealGroups(scored);
      const jackpotCount = scored.filter((pattern) => pattern.key === "JACKPOT").length;
      const oldWallet = this.wallet;
      let runningTotal = 0;

      EffectsManager.flashWin(this.machinePanel);
      this.machinePanel.classList.add("is-pattern-revealing");

      for (const group of revealGroups) {
        this.highlightRevealPatterns(group.patterns);
        this.patternList.innerHTML = group.patterns.map((pattern) => this.patternChipHTML72(pattern)).join("");
        this.scoreBreakdown.innerHTML = group.patterns.map((pattern) => this.breakdownHTML(pattern)).join("");
        this.readoutDetail.textContent = `${group.label} 당첨 · ${group.patterns.length}개 패턴 · +$${group.total.toLocaleString("ko-KR")}`;

        const nextTotal = runningTotal + group.total;
        const animations = [
          EffectsManager.animateNumber(this.payoutValue, runningTotal, nextTotal, {
            duration: 280,
            prefix: "+ $ "
          })
        ];

        if (creditWallet) {
          this.wallet = oldWallet + nextTotal;
          EffectsManager.pulseWallet(this.walletValue);
          animations.push(
            EffectsManager.animateNumber(this.walletValue, oldWallet + runningTotal, oldWallet + nextTotal, {
              duration: 280,
              prefix: "$ "
            })
          );
        }

        await Promise.all(animations);
        runningTotal = nextTotal;
        await this.wait(revealGroups.length >= 5 ? 220 : 360);
      }

      this.machinePanel.classList.remove("is-pattern-revealing");
      this.reelsEl
        .querySelectorAll(".pattern-sequence-hit")
        .forEach((cell) => cell.classList.remove("pattern-sequence-hit"));
      this.highlightPatterns(patterns);
      this.patternList.innerHTML = scored.map((pattern) => this.patternChipHTML72(pattern)).join("");
      this.scoreBreakdown.innerHTML = scored.map((pattern) => this.breakdownHTML(pattern)).join("");
      this.payoutValue.textContent = `+ $ ${total.toLocaleString("ko-KR")}`;

      if (creditWallet) {
        this.wallet = oldWallet + total;
        this.updateEconomyUI(false);
        this.runStats.winningRerolls += 1;
        this.runStats.totalEarned += total;
        this.runStats.bestPayout = Math.max(this.runStats.bestPayout, total);
        this.runStats.jackpots += jackpotCount;
      }

      this.readoutDetail.textContent = testLabel ||
        `${revealGroups.map((group) => group.label).join(" → ")} 순서 정산 완료 · +$${total.toLocaleString("ko-KR")}`;
      this.updateStatsRail();
      return total;
    } finally {
      this.itemScoringContext = null;
      this.machinePanel?.classList.remove("is-pattern-revealing");
    }
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    this.updateStatsRail();
  };

  Game.restartRun = function () {
    this.runStats = makeEmptyStats();
    previousRestartRun.call(this);
    this.updateStatsRail();
  };
})();
