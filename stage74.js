// DEADLINE — v0.7.4 패턴 단위 순차 정산 / 임팩트 라인 / 점수 팝 / 절차형 성공음
"use strict";

(() => {
  Game.stage = 7;
  Game.status = "SEQUENTIAL_PATTERN_IMPACT";

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousRestartRun = Game.restartRun;

  const CATEGORY_ORDER = {
    H3: 0,
    H4: 0,
    H5: 0,
    V3: 1,
    DIAG: 2,
    V: 3,
    INV_V: 4,
    X: 5,
    JACKPOT: 6
  };

  const SPECIAL_KEYS = new Set(["V", "INV_V", "X"]);

  Game.ensurePatternFxLayer = function () {
    const shell = this.reelsEl?.closest(".reels-shell");
    if (!shell) return null;

    let layer = shell.querySelector("#patternFxLayer");
    if (layer) return layer;

    layer = document.createElement("div");
    layer.id = "patternFxLayer";
    layer.className = "pattern-fx-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = `
      <svg class="pattern-fx-svg" aria-hidden="true">
        <g class="pattern-fx-lines"></g>
        <g class="pattern-fx-nodes"></g>
      </svg>
      <div class="pattern-impact-banner" hidden>
        <small class="pattern-impact-step">1 / 1</small>
        <strong class="pattern-impact-name">패턴</strong>
        <b class="pattern-impact-value">+$0</b>
      </div>
      <div class="pattern-fx-sparks" aria-hidden="true"></div>
      <div class="pattern-jackpot-flare" aria-hidden="true"></div>
    `;
    shell.appendChild(layer);
    return layer;
  };

  Game.getPatternSpatialOrder = function (pattern) {
    if (["H3", "H4", "H5"].includes(pattern.key)) {
      const row = Math.min(...pattern.coords.map(([, y]) => y));
      const col = Math.min(...pattern.coords.map(([x]) => x));
      return row * 10 + col;
    }

    if (pattern.key === "V3") {
      return Math.min(...pattern.coords.map(([x]) => x));
    }

    if (pattern.key === "DIAG") {
      const minCol = Math.min(...pattern.coords.map(([x]) => x));
      const first = pattern.coords.reduce((best, coord) => coord[0] < best[0] ? coord : best, pattern.coords[0]);
      const direction = first[1] === 0 ? 0 : 1;
      return minCol * 2 + direction;
    }

    return 0;
  };

  Game.getSequentialPatterns = function (scoredPatterns) {
    return scoredPatterns
      .map((pattern, sourceIndex) => ({ pattern, sourceIndex }))
      .sort((a, b) => {
        const categoryDelta = (CATEGORY_ORDER[a.pattern.key] ?? 99) - (CATEGORY_ORDER[b.pattern.key] ?? 99);
        if (categoryDelta !== 0) return categoryDelta;

        const spatialDelta = this.getPatternSpatialOrder(a.pattern) - this.getPatternSpatialOrder(b.pattern);
        if (spatialDelta !== 0) return spatialDelta;

        return a.sourceIndex - b.sourceIndex;
      })
      .map(({ pattern }) => pattern);
  };

  Game.getPatternSequenceLabel = function (pattern) {
    if (["H3", "H4", "H5"].includes(pattern.key)) {
      const row = Math.min(...pattern.coords.map(([, y]) => y));
      return `${pattern.name} · ${row + 1}번째 줄`;
    }
    if (pattern.key === "V3") {
      const col = Math.min(...pattern.coords.map(([x]) => x));
      return `${pattern.name} · ${col + 1}번째 열`;
    }
    return pattern.name;
  };

  Game.getPatternRevealTiming = function (count) {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return { draw: 50, count: 80, hold: 30 };
    if (count > 12) return { draw: 125, count: 145, hold: 70 };
    if (count > 6) return { draw: 155, count: 175, hold: 95 };
    return { draw: 205, count: 225, hold: 145 };
  };

  Game.clearPatternImpactState = function ({ keepFinalHits = false } = {}) {
    this.reelsEl
      ?.querySelectorAll(".pattern-fx-hit, .pattern-fx-muted, .pattern-fx-impact, .pattern-sequence-hit")
      .forEach((cell) => {
        cell.classList.remove("pattern-fx-hit", "pattern-fx-muted", "pattern-fx-impact", "pattern-sequence-hit");
        if (!keepFinalHits) cell.classList.remove("pattern-hit");
      });

    const layer = this.ensurePatternFxLayer();
    if (!layer) return;
    layer.classList.remove("is-active", "is-special", "is-jackpot", "is-jackpot-finish");
    layer.querySelector(".pattern-fx-lines")?.replaceChildren();
    layer.querySelector(".pattern-fx-nodes")?.replaceChildren();
    layer.querySelector(".pattern-fx-sparks")?.replaceChildren();
    const banner = layer.querySelector(".pattern-impact-banner");
    if (banner) banner.hidden = true;
  };

  Game.getPatternPoint = function (coord) {
    const layer = this.ensurePatternFxLayer();
    const shell = layer?.parentElement;
    const cell = this.reelsEl?.querySelector(`.reel-symbol[data-col="${coord[0]}"][data-row="${coord[1]}"]`);
    if (!shell || !cell) return null;

    const shellRect = shell.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    return {
      x: rect.left - shellRect.left + rect.width / 2,
      y: rect.top - shellRect.top + rect.height / 2
    };
  };

  Game.getPatternAccent = function (pattern) {
    const first = pattern.coords?.[0];
    if (!first) return "#00D492";
    const cell = this.reelsEl?.querySelector(`.reel-symbol[data-col="${first[0]}"][data-row="${first[1]}"]`);
    if (!cell) return "#00D492";
    const value = getComputedStyle(cell).getPropertyValue("--symbol-accent").trim();
    return value || "#00D492";
  };

  Game.buildPatternLineSegments = function (pattern) {
    if (pattern.key === "JACKPOT") return [];

    if (pattern.key === "X") {
      return [
        [[0, 0], [2, 1], [4, 2]],
        [[4, 0], [2, 1], [0, 2]]
      ];
    }

    return [pattern.coords];
  };

  Game.renderPatternTrace = function (pattern, drawDuration) {
    const layer = this.ensurePatternFxLayer();
    const svg = layer?.querySelector(".pattern-fx-svg");
    const lines = layer?.querySelector(".pattern-fx-lines");
    const nodes = layer?.querySelector(".pattern-fx-nodes");
    const shell = layer?.parentElement;
    if (!layer || !svg || !lines || !nodes || !shell) return;

    const width = Math.max(1, shell.clientWidth);
    const height = Math.max(1, shell.clientHeight);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    lines.replaceChildren();
    nodes.replaceChildren();

    const accent = this.getPatternAccent(pattern);
    layer.style.setProperty("--pattern-accent", accent);

    this.buildPatternLineSegments(pattern).forEach((coords, segmentIndex) => {
      const points = coords.map((coord) => this.getPatternPoint(coord)).filter(Boolean);
      if (points.length < 2) return;

      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("points", points.map((point) => `${point.x},${point.y}`).join(" "));
      polyline.setAttribute("class", "pattern-fx-line");
      lines.appendChild(polyline);

      const length = Math.max(1, polyline.getTotalLength());
      polyline.style.strokeDasharray = String(length);
      polyline.style.strokeDashoffset = String(length);
      polyline.style.transitionDuration = `${drawDuration + segmentIndex * 20}ms`;
      requestAnimationFrame(() => {
        polyline.style.strokeDashoffset = "0";
      });
    });

    const unique = new Map();
    pattern.coords.forEach((coord) => unique.set(`${coord[0]}:${coord[1]}`, coord));
    unique.forEach((coord, key) => {
      const point = this.getPatternPoint(coord);
      if (!point) return;
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(point.x));
      circle.setAttribute("cy", String(point.y));
      circle.setAttribute("r", "4.5");
      circle.setAttribute("class", "pattern-fx-node");
      circle.style.animationDelay = `${Number(key.split(":")[0]) * 12}ms`;
      nodes.appendChild(circle);
    });
  };

  Game.spawnPatternSparks = function (pattern, intensity = 1) {
    const layer = this.ensurePatternFxLayer();
    const host = layer?.querySelector(".pattern-fx-sparks");
    if (!host) return;
    host.replaceChildren();

    const points = pattern.coords.map((coord) => this.getPatternPoint(coord)).filter(Boolean);
    if (!points.length) return;
    const center = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    center.x /= points.length;
    center.y /= points.length;

    const count = intensity >= 3 ? 20 : intensity === 2 ? 12 : 7;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + (i % 2) * 0.11;
      const distance = (intensity >= 3 ? 72 : intensity === 2 ? 50 : 34) + (i % 3) * 8;
      const spark = document.createElement("span");
      spark.className = "pattern-fx-spark";
      spark.style.left = `${center.x}px`;
      spark.style.top = `${center.y}px`;
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      spark.style.animationDelay = `${(i % 4) * 12}ms`;
      host.appendChild(spark);
    }
  };

  Game.focusSinglePattern = function (pattern) {
    const hitKeys = new Set(pattern.coords.map(([x, y]) => `${x}:${y}`));
    this.reelsEl?.querySelectorAll(".reel-symbol[data-col][data-row]").forEach((cell) => {
      const key = `${cell.dataset.col}:${cell.dataset.row}`;
      cell.classList.remove("pattern-hit", "pattern-fx-hit", "pattern-fx-muted", "pattern-fx-impact");
      cell.classList.add(hitKeys.has(key) ? "pattern-fx-hit" : "pattern-fx-muted");
    });

    requestAnimationFrame(() => {
      this.reelsEl?.querySelectorAll(".pattern-fx-hit").forEach((cell) => {
        cell.classList.add("pattern-fx-impact");
      });
    });
  };

  Game.showPatternImpactBanner = function (pattern, index, total) {
    const layer = this.ensurePatternFxLayer();
    const banner = layer?.querySelector(".pattern-impact-banner");
    if (!banner) return;

    banner.hidden = false;
    banner.classList.remove("is-pop");
    banner.querySelector(".pattern-impact-step").textContent = `${index + 1} / ${total}`;
    banner.querySelector(".pattern-impact-name").textContent = `${this.getPatternSequenceLabel(pattern)} · ${pattern.symbol.name}`;
    banner.querySelector(".pattern-impact-value").textContent = `+$${pattern.amount.toLocaleString("ko-KR")}`;
    void banner.offsetWidth;
    banner.classList.add("is-pop");
  };

  Game.getPatternIntensity = function (pattern) {
    if (pattern.key === "JACKPOT") return 3;
    if (SPECIAL_KEYS.has(pattern.key)) return 2;
    return 1;
  };

  Game.playPatternTone = function (index, total, intensity = 1) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.patternAudioContext) this.patternAudioContext = new AudioCtx();
      const context = this.patternAudioContext;
      if (context.state === "suspended") context.resume().catch(() => {});

      const now = context.currentTime;
      const base = 330 + Math.min(index, 14) * 26;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(intensity === 3 ? 0.075 : intensity === 2 ? 0.055 : 0.035, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (intensity === 3 ? 0.24 : 0.12));
      gain.connect(context.destination);

      const frequencies = intensity === 3
        ? [base, base * 1.25, base * 1.5]
        : intensity === 2
          ? [base, base * 1.5]
          : [base];

      frequencies.forEach((frequency, oscillatorIndex) => {
        const oscillator = context.createOscillator();
        oscillator.type = oscillatorIndex === 0 ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.connect(gain);
        oscillator.start(now + oscillatorIndex * 0.012);
        oscillator.stop(now + (intensity === 3 ? 0.25 : 0.13));
      });
    } catch (_) {
      // 오디오가 차단되어도 시각 연출과 게임 진행은 그대로 유지합니다.
    }
  };

  Game.playSinglePatternImpact = async function (pattern, index, total, timing, runningTotal, oldWallet, creditWallet) {
    const layer = this.ensurePatternFxLayer();
    const intensity = this.getPatternIntensity(pattern);

    layer?.classList.add("is-active");
    layer?.classList.toggle("is-special", intensity >= 2);
    layer?.classList.toggle("is-jackpot", intensity === 3);

    this.focusSinglePattern(pattern);
    this.renderPatternTrace(pattern, timing.draw);
    this.spawnPatternSparks(pattern, intensity);
    this.showPatternImpactBanner(pattern, index, total);
    this.playPatternTone(index, total, intensity);

    this.patternList.innerHTML = this.patternChipHTML72(pattern);
    this.scoreBreakdown.innerHTML = this.breakdownHTML(pattern);
    this.readoutDetail.textContent = `${this.getPatternSequenceLabel(pattern)} 당첨 · +$${pattern.amount.toLocaleString("ko-KR")}`;

    const nextTotal = runningTotal + pattern.amount;
    const animations = [
      EffectsManager.animateNumber(this.payoutValue, runningTotal, nextTotal, {
        duration: timing.count,
        prefix: "+ $ "
      })
    ];

    if (creditWallet) {
      this.wallet = oldWallet + nextTotal;
      EffectsManager.pulseWallet(this.walletValue);
      animations.push(
        EffectsManager.animateNumber(this.walletValue, oldWallet + runningTotal, oldWallet + nextTotal, {
          duration: timing.count,
          prefix: "$ "
        })
      );
    }

    await Promise.all(animations);
    await this.wait(timing.hold + (intensity === 3 ? 170 : intensity === 2 ? 55 : 0));
    return nextTotal;
  };

  Game.playJackpotFinish = async function () {
    const layer = this.ensurePatternFxLayer();
    if (!layer) return;
    layer.classList.add("is-jackpot-finish");
    this.machinePanel?.classList.add("pattern-jackpot-finish");
    await this.wait(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 80 : 380);
    layer.classList.remove("is-jackpot-finish");
    this.machinePanel?.classList.remove("pattern-jackpot-finish");
  };

  Game.evaluateAndRenderScore = async function ({ creditWallet = false, testLabel = "" } = {}) {
    const options = { creditWallet, testLabel };
    this.itemScoringContext = options;

    try {
      this.clearPatternImpactState();
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

      const { scored, total } = this.scorePatterns(patterns);
      const sequence = this.getSequentialPatterns(scored);
      const timing = this.getPatternRevealTiming(sequence.length);
      const oldWallet = this.wallet;
      let runningTotal = 0;
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
      }

      if (jackpotCount > 0) await this.playJackpotFinish();

      this.clearPatternImpactState({ keepFinalHits: true });
      this.highlightPatterns(patterns);
      this.patternList.innerHTML = sequence.map((pattern) => this.patternChipHTML72(pattern)).join("");
      this.scoreBreakdown.innerHTML = sequence.map((pattern) => this.breakdownHTML(pattern)).join("");
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
        `${sequence.length}개 패턴 순차 정산 완료 · +$${total.toLocaleString("ko-KR")}`;
      this.updateStatsRail();
      return total;
    } finally {
      this.itemScoringContext = null;
      this.machinePanel?.classList.remove("is-pattern-revealing", "is-pattern-sequence-v74", "pattern-jackpot-finish");
      this.ensurePatternFxLayer()?.classList.remove("is-active", "is-special", "is-jackpot", "is-jackpot-finish");
    }
  };

  Game.init = function () {
    previousInit.call(this);
    this.ensurePatternFxLayer();
    this.stage = 7;
    this.status = "SEQUENTIAL_PATTERN_IMPACT";
    this.stageStatus.textContent = this.roundPreparation
      ? "7단계 · 라운드 준비"
      : "7단계 · 패턴 임팩트";
    console.info(`DEADLINE ${GAME_DATA.version}: v0.7.4 sequential pattern impact loaded.`);
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
  };

  Game.restartRun = function () {
    this.clearPatternImpactState();
    previousRestartRun.call(this);
  };
})();
