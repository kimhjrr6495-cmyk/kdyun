// DEADLINE — Stage 3
// 패턴 점수를 계산하고 실제 회전 보상을 지갑에 반영합니다.
// v0.3.2: 겹쳐 성립하는 패턴은 모두 합산하며 JACKPOT도 추가 보너스로 계산합니다.

"use strict";

const Game = {
  stage: 3,
  status: "SCORE_SYSTEM",
  isSpinning: false,
  testSpinCount: 0,
  patternTestIndex: 0,
  currentColumns: [],
  lastPatterns: [],
  wallet: 0,
  deadlineTarget: 80,

  init() {
    this.reelsEl = document.querySelector("#reels");
    this.spinButton = document.querySelector("#spinButton");
    this.patternTestButton = document.querySelector("#patternTestButton");
    this.spinStatus = document.querySelector("#spinStatus");
    this.stageStatus = document.querySelector("#stageStatus");
    this.payoutValue = document.querySelector("#payoutValue");
    this.patternList = document.querySelector("#patternList");
    this.scoreBreakdown = document.querySelector("#scoreBreakdown");
    this.readoutDetail = document.querySelector("#readoutDetail");
    this.walletValue = document.querySelector("#walletValue");
    this.progressFill = document.querySelector("#progressFill");
    this.progressCopy = document.querySelector("#progressCopy");
    this.machinePanel = document.querySelector("#machinePanel");

    this.currentColumns = Array.from(
      { length: GAME_DATA.board.columns },
      () => this.randomColumn()
    );

    this.renderReels();
    this.bindInputs();
    this.updateWalletUI(false);

    console.info(`DEADLINE ${GAME_DATA.version}: score system loaded.`);
  },

  bindInputs() {
    this.spinButton.addEventListener("click", () => this.spin());
    this.patternTestButton.addEventListener("click", () => this.showNextPatternTest());

    window.addEventListener("keydown", (event) => {
      if (event.code !== "Space" || event.repeat) return;

      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isTyping) return;
      event.preventDefault();
      this.spin();
    });
  },

  randomSymbol() {
    const list = GAME_DATA.symbols;
    return list[Math.floor(Math.random() * list.length)];
  },

  randomColumn() {
    return Array.from(
      { length: GAME_DATA.board.rows },
      () => this.randomSymbol()
    );
  },

  symbolHTML(symbol, col = null, row = null) {
    const coordinateAttrs =
      Number.isInteger(col) && Number.isInteger(row)
        ? ` data-col="${col}" data-row="${row}"`
        : "";

    return `
      <div class="reel-symbol" data-symbol="${symbol.id}"${coordinateAttrs}>
        <b>${symbol.code}</b>
        <small>${symbol.name} · ${symbol.value}</small>
      </div>
    `;
  },

  renderReels() {
    this.reelsEl.innerHTML = this.currentColumns
      .map((column, col) => `
        <div class="reel" data-reel-index="${col}">
          <div class="reel-track">
            ${column
              .map((symbol, row) => this.symbolHTML(symbol, col, row))
              .join("")}
          </div>
        </div>
      `)
      .join("");
  },

  async spin() {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.spinButton.textContent = "회전 중";
    this.clearScoreDisplay();
    this.readoutDetail.textContent = "시장 데이터 동기화 중...";

    const reels = [...this.reelsEl.querySelectorAll(".reel")];
    const nextColumns = Array.from(
      { length: GAME_DATA.board.columns },
      () => this.randomColumn()
    );

    await Promise.all(
      reels.map((reel, index) =>
        this.animateReel(reel, index, nextColumns[index])
      )
    );

    this.currentColumns = nextColumns;
    this.renderReels();
    this.testSpinCount += 1;
    this.spinStatus.textContent = `TEST ${this.testSpinCount}`;
    this.stageStatus.textContent = "STAGE 3 · SCORE SYSTEM";

    await this.evaluateAndRenderScore({ creditWallet: true });

    this.spinButton.disabled = false;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "회전";
    this.isSpinning = false;
  },

  animateReel(reel, index, finalColumn) {
    const track = reel.querySelector(".reel-track");
    const config = GAME_DATA.reelMotion;
    const symbolHeight = reel.clientHeight / GAME_DATA.board.rows;
    const startColumn = this.currentColumns[index];
    const middle = Array.from(
      { length: config.travelSymbols },
      () => this.randomSymbol()
    );
    const sequence = [...startColumn, ...middle, ...finalColumn];

    track.style.transition = "none";
    track.style.transform = "translate3d(0, 0, 0)";
    track.innerHTML = sequence.map((symbol) => this.symbolHTML(symbol)).join("");

    const finalStartIndex = sequence.length - GAME_DATA.board.rows;
    const distance = finalStartIndex * symbolHeight;
    const duration = config.baseDuration + index * config.stopGap;

    void track.offsetHeight;

    return new Promise((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        track.removeEventListener("transitionend", onEnd);
        track.style.transition = "none";
        track.style.transform = "translate3d(0, 0, 0)";
        track.innerHTML = finalColumn
          .map((symbol, row) => this.symbolHTML(symbol, index, row))
          .join("");
        reel.classList.add("reel-settled");
        window.setTimeout(() => reel.classList.remove("reel-settled"), 90);
        resolve();
      };

      const onEnd = (event) => {
        if (event.propertyName === "transform") finish();
      };

      track.addEventListener("transitionend", onEnd);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = `transform ${duration}ms ${config.easing}`;
          track.style.transform = `translate3d(0, -${distance}px, 0)`;
        });
      });

      window.setTimeout(finish, duration + 120);
    });
  },

  symbolAt(col, row) {
    return this.currentColumns[col]?.[row] ?? null;
  },

  matchCoordinates(coords) {
    if (!coords.length) return null;
    const first = this.symbolAt(coords[0][0], coords[0][1]);
    if (!first) return null;

    return coords.every(
      ([col, row]) => this.symbolAt(col, row)?.id === first.id
    )
      ? first
      : null;
  },

  makePattern(key, coords, symbol) {
    const definition = GAME_DATA.patterns[key];
    return {
      key,
      name: definition.name,
      baseValue: definition.baseValue,
      coords,
      symbol
    };
  },

  detectPatterns() {
    const found = [];
    const { columns, rows } = GAME_DATA.board;

    // JACKPOT 여부는 먼저 기억만 해두고, 일반 패턴을 전부 검사한 뒤 마지막에 추가합니다.
    // 따라서 15칸 동일 심볼이면 가로/세로/대각선/V/역V/X + JACKPOT이 모두 합산됩니다.
    const allCoords = [];
    for (let col = 0; col < columns; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        allCoords.push([col, row]);
      }
    }
    const jackpotSymbol = this.matchCoordinates(allCoords);

    // 가로: 같은 연속 구간 안에서는 가장 큰 가로 패턴만 인정합니다.
    // 예: 5연속은 H5 하나이며 H3/H4를 추가로 만들지 않습니다.
    for (let row = 0; row < rows; row += 1) {
      let col = 0;
      while (col < columns) {
        const start = col;
        const symbol = this.symbolAt(col, row);
        col += 1;

        while (
          col < columns &&
          this.symbolAt(col, row)?.id === symbol?.id
        ) {
          col += 1;
        }

        const length = col - start;
        if (length >= 3) {
          const key = length >= 5 ? "H5" : length === 4 ? "H4" : "H3";
          const coords = Array.from(
            { length },
            (_, offset) => [start + offset, row]
          );
          found.push(this.makePattern(key, coords, symbol));
        }
      }
    }

    // 세로 3
    for (let col = 0; col < columns; col += 1) {
      const coords = [[col, 0], [col, 1], [col, 2]];
      const symbol = this.matchCoordinates(coords);
      if (symbol) found.push(this.makePattern("V3", coords, symbol));
    }

    // 대각선 3칸: 가능한 ↘ / ↗ 구간을 모두 검사합니다.
    for (let startCol = 0; startCol <= columns - 3; startCol += 1) {
      const down = [
        [startCol, 0],
        [startCol + 1, 1],
        [startCol + 2, 2]
      ];
      const up = [
        [startCol, 2],
        [startCol + 1, 1],
        [startCol + 2, 0]
      ];

      const downSymbol = this.matchCoordinates(down);
      const upSymbol = this.matchCoordinates(up);
      if (downSymbol) found.push(this.makePattern("DIAG", down, downSymbol));
      if (upSymbol) found.push(this.makePattern("DIAG", up, upSymbol));
    }

    // V와 역V는 구성 대각선과 별개로 추가 점수를 받습니다.
    const specialShapes = [
      {
        key: "V",
        coords: [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]]
      },
      {
        key: "INV_V",
        coords: [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]]
      },
      {
        key: "X",
        coords: [[0, 0], [4, 0], [2, 1], [0, 2], [4, 2]]
      }
    ];

    specialShapes.forEach(({ key, coords }) => {
      const symbol = this.matchCoordinates(coords);
      if (symbol) found.push(this.makePattern(key, coords, symbol));
    });

    // JACKPOT은 일반 패턴을 대체하지 않고 마지막 보너스 패턴으로 추가합니다.
    if (jackpotSymbol) {
      found.push(this.makePattern("JACKPOT", allCoords, jackpotSymbol));
    }

    return found;
  },

  calculatePatternScore(pattern) {
    const base = pattern.symbol.value;
    const symbolMultiplier = pattern.symbol.multiplier ?? 1;
    const count = pattern.coords.length;
    const patternBaseValue = pattern.baseValue;
    const patternMultiplier = GAME_DATA.scoring.patternMultiplier;
    const globalMultiplier = GAME_DATA.scoring.globalMultiplier;
    const raw =
      base *
      symbolMultiplier *
      count *
      patternBaseValue *
      patternMultiplier *
      globalMultiplier;
    const amount = Math.round(raw);

    return {
      ...pattern,
      base,
      symbolMultiplier,
      count,
      patternBaseValue,
      patternMultiplier,
      globalMultiplier,
      raw,
      amount
    };
  },

  scorePatterns(patterns) {
    const scored = patterns.map((pattern) => this.calculatePatternScore(pattern));
    const total = scored.reduce((sum, pattern) => sum + pattern.amount, 0);
    return { scored, total };
  },

  highlightPatterns(patterns) {
    this.reelsEl
      .querySelectorAll(".pattern-hit")
      .forEach((cell) => cell.classList.remove("pattern-hit"));

    const hitKeys = new Set();
    patterns.forEach((pattern) => {
      pattern.coords.forEach(([col, row]) => hitKeys.add(`${col}:${row}`));
    });

    hitKeys.forEach((key) => {
      const [col, row] = key.split(":");
      const cell = this.reelsEl.querySelector(
        `.reel-symbol[data-col="${col}"][data-row="${row}"]`
      );
      if (cell) cell.classList.add("pattern-hit");
    });
  },

  clearScoreDisplay() {
    this.lastPatterns = [];
    this.payoutValue.textContent = "+ $ 0";
    this.patternList.innerHTML = "";
    this.scoreBreakdown.textContent = "판정 중...";
    this.reelsEl
      .querySelectorAll(".pattern-hit")
      .forEach((cell) => cell.classList.remove("pattern-hit"));
  },

  formatMultiplier(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  },

  breakdownHTML(pattern) {
    const rawText = Number.isInteger(pattern.raw)
      ? `$ ${pattern.amount.toLocaleString("ko-KR")}`
      : `${pattern.raw.toFixed(1)} → $ ${pattern.amount.toLocaleString("ko-KR")}`;

    return `
      <div class="score-line">
        <span>${pattern.name} · ${pattern.symbol.name}</span>
        <code>VALUE ${pattern.base} × SYMBOL ×${this.formatMultiplier(pattern.symbolMultiplier)} × COUNT ${pattern.count} × PATTERN VALUE ${this.formatMultiplier(pattern.patternBaseValue)} × PATTERN MULT ${this.formatMultiplier(pattern.patternMultiplier)} × GLOBAL ${this.formatMultiplier(pattern.globalMultiplier)} = ${rawText}</code>
      </div>
    `;
  },

  async evaluateAndRenderScore({ creditWallet = false, testLabel = "" } = {}) {
    const patterns = this.detectPatterns();
    this.lastPatterns = patterns;
    this.highlightPatterns(patterns);

    if (patterns.length === 0) {
      this.payoutValue.textContent = "+ $ 0";
      this.patternList.innerHTML = '<span class="pattern-empty">일치 패턴 없음</span>';
      this.scoreBreakdown.textContent = "이번 회전 지급액: $ 0";
      this.readoutDetail.textContent =
        testLabel || "이번 결과에는 점수가 발생하지 않았습니다.";
      return 0;
    }

    const { scored, total } = this.scorePatterns(patterns);
    const jackpot = scored.some((pattern) => pattern.key === "JACKPOT");

    this.patternList.innerHTML = scored
      .map(
        (pattern) =>
          `<span class="pattern-chip">${pattern.name} · ${pattern.symbol.name} +$${pattern.amount.toLocaleString("ko-KR")}</span>`
      )
      .join("");

    this.scoreBreakdown.innerHTML = scored
      .map((pattern) => this.breakdownHTML(pattern))
      .join("");

    const oldWallet = this.wallet;
    const newWallet = creditWallet ? oldWallet + total : oldWallet;
    if (creditWallet) this.wallet = newWallet;

    if (total > 0) {
      EffectsManager.flashWin(this.machinePanel);

      const animations = [
        EffectsManager.animateNumber(this.payoutValue, 0, total, {
          duration: GAME_DATA.scoring.countUpDuration,
          prefix: "+ $ "
        })
      ];

      if (creditWallet) {
        EffectsManager.pulseWallet(this.walletValue);
        animations.push(
          EffectsManager.animateNumber(this.walletValue, oldWallet, newWallet, {
            duration: GAME_DATA.scoring.countUpDuration,
            prefix: "$ "
          })
        );
      }

      await Promise.all(animations);
    }

    if (creditWallet) {
      this.updateWalletUI(false);
      this.readoutDetail.textContent = jackpot
        ? `JACKPOT + 모든 성립 패턴 합산 완료 · 지갑 +$${total.toLocaleString("ko-KR")}`
        : `정산 완료 · 패턴 배율 ×${this.formatMultiplier(GAME_DATA.scoring.patternMultiplier)} 적용 · 지갑 +$${total.toLocaleString("ko-KR")}`;
    } else {
      this.readoutDetail.textContent =
        testLabel || `테스트 점수 +$${total.toLocaleString("ko-KR")} · 지갑 미반영`;
    }

    return total;
  },

  updateWalletUI(updateText = true) {
    if (updateText) {
      this.walletValue.textContent = `$ ${this.wallet.toLocaleString("ko-KR")}`;
    }

    const ratio = Math.min(1, this.wallet / this.deadlineTarget);
    this.progressFill.style.width = `${ratio * 100}%`;
    this.progressCopy.textContent =
      `$ ${this.wallet.toLocaleString("ko-KR")} / $ ${this.deadlineTarget.toLocaleString("ko-KR")}`;
  },

  makePatternTestBoard(test) {
    const target = GAME_DATA.symbols.find(
      (symbol) => symbol.id === test.symbolId
    );

    if (test.fullBoard) {
      return Array.from(
        { length: GAME_DATA.board.columns },
        () => Array.from({ length: GAME_DATA.board.rows }, () => target)
      );
    }

    const fillerSymbols = GAME_DATA.symbols.filter(
      (symbol) => symbol.id !== target.id
    );

    const board = Array.from(
      { length: GAME_DATA.board.columns },
      (_, col) =>
        Array.from(
          { length: GAME_DATA.board.rows },
          (_, row) => fillerSymbols[(col + row * 2) % fillerSymbols.length]
        )
    );

    test.coords.forEach(([col, row]) => {
      board[col][row] = target;
    });

    return board;
  },

  async showNextPatternTest() {
    if (this.isSpinning) return;

    const tests = GAME_DATA.patternTests;
    const test = tests[this.patternTestIndex % tests.length];
    const definition = GAME_DATA.patterns[test.key];

    this.patternTestIndex = (this.patternTestIndex + 1) % tests.length;
    this.currentColumns = this.makePatternTestBoard(test);
    this.renderReels();

    await this.evaluateAndRenderScore({
      creditWallet: false,
      testLabel: test.fullBoard
        ? "JACKPOT 테스트 · 모든 일반 패턴 점수 + JACKPOT 보너스를 합산합니다."
        : `테스트: ${definition.name} · 겹쳐 성립하는 패턴도 모두 합산 · 지갑 미반영`
    });

    this.patternTestButton.textContent =
      `패턴 테스트 ${this.patternTestIndex + 1}/${tests.length}`;
    this.spinStatus.textContent = "PATTERN TEST";
  }
};

window.addEventListener("DOMContentLoaded", () => Game.init());
