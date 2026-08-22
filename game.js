// DEADLINE — Stage 2
// 현재 단계 목표: 5×3 결과에서 패턴을 정확히 찾아내고 임시 강조합니다.
// 실제 점수 계산, 지갑 반영, 최종 당첨 연출은 아직 연결하지 않습니다.

"use strict";

const Game = {
  stage: 2,
  status: "PATTERN_DETECTION",
  isSpinning: false,
  testSpinCount: 0,
  patternTestIndex: 0,
  currentColumns: [],
  lastPatterns: [],

  init() {
    this.reelsEl = document.querySelector("#reels");
    this.spinButton = document.querySelector("#spinButton");
    this.patternTestButton = document.querySelector("#patternTestButton");
    this.spinStatus = document.querySelector("#spinStatus");
    this.stageStatus = document.querySelector("#stageStatus");
    this.patternCount = document.querySelector("#patternCount");
    this.patternList = document.querySelector("#patternList");
    this.readoutDetail = document.querySelector("#readoutDetail");

    this.currentColumns = Array.from(
      { length: GAME_DATA.board.columns },
      () => this.randomColumn()
    );

    this.renderReels();
    this.bindInputs();
    this.evaluateAndRenderPatterns();

    console.info(`DEADLINE ${GAME_DATA.version}: pattern detection loaded.`);
  },

  bindInputs() {
    this.spinButton.addEventListener("click", () => this.spin());
    this.patternTestButton.addEventListener("click", () => this.showNextPatternTest());

    window.addEventListener("keydown", (event) => {
      if (event.code !== "Space") return;
      if (event.repeat) return;

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
        <small>${symbol.name}</small>
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
    this.clearPatternDisplay();
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
    this.stageStatus.textContent = "STAGE 2 · PATTERN DETECTION";
    this.evaluateAndRenderPatterns();

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

    const matches = coords.every(
      ([col, row]) => this.symbolAt(col, row)?.id === first.id
    );

    return matches ? first : null;
  },

  makePattern(key, coords, symbol) {
    const definition = GAME_DATA.patterns[key];
    return {
      key,
      name: definition.name,
      multiplier: definition.multiplier,
      coords,
      symbol
    };
  },

  detectPatterns() {
    const found = [];
    const { columns, rows } = GAME_DATA.board;

    // 가로: 하나의 연속 구간에서는 가장 큰 패턴만 인정합니다.
    // 세븐 5연속은 일반 H5 대신 JACKPOT으로 승격합니다.
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
          let key;
          if (length >= 5 && symbol?.id === "SV") key = "JACKPOT";
          else if (length >= 5) key = "H5";
          else if (length === 4) key = "H4";
          else key = "H3";

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

    // 3칸 대각선: ↘ / ↗ 방향 모두 검사합니다.
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

    // 5×3 전용 특수 패턴.
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
        // X는 네 모서리 + 중앙 칸으로 정의합니다.
        key: "X",
        coords: [[0, 0], [4, 0], [2, 1], [0, 2], [4, 2]]
      }
    ];

    specialShapes.forEach(({ key, coords }) => {
      const symbol = this.matchCoordinates(coords);
      if (symbol) found.push(this.makePattern(key, coords, symbol));
    });

    return found;
  },

  clearPatternDisplay() {
    this.lastPatterns = [];
    this.patternCount.textContent = "판정 중";
    this.patternList.innerHTML = "";
    this.reelsEl
      .querySelectorAll(".pattern-hit")
      .forEach((cell) => cell.classList.remove("pattern-hit"));
  },

  evaluateAndRenderPatterns(testLabel = "") {
    const patterns = this.detectPatterns();
    this.lastPatterns = patterns;

    this.reelsEl
      .querySelectorAll(".pattern-hit")
      .forEach((cell) => cell.classList.remove("pattern-hit"));

    const hitKeys = new Set();
    patterns.forEach((pattern) => {
      pattern.coords.forEach(([col, row]) => {
        hitKeys.add(`${col}:${row}`);
      });
    });

    hitKeys.forEach((key) => {
      const [col, row] = key.split(":");
      const cell = this.reelsEl.querySelector(
        `.reel-symbol[data-col="${col}"][data-row="${row}"]`
      );
      if (cell) cell.classList.add("pattern-hit");
    });

    if (patterns.length === 0) {
      this.patternCount.textContent = "0 PATTERN";
      this.patternList.innerHTML = '<span class="pattern-empty">일치 패턴 없음</span>';
      this.readoutDetail.textContent = testLabel || "이번 결과에는 패턴이 없습니다.";
      return;
    }

    const hasJackpot = patterns.some((pattern) => pattern.key === "JACKPOT");
    this.patternCount.textContent = hasJackpot
      ? "JACKPOT"
      : `${patterns.length} PATTERN`;

    this.patternList.innerHTML = patterns
      .map(
        (pattern) =>
          `<span class="pattern-chip">${pattern.name} · ${pattern.symbol.name}</span>`
      )
      .join("");

    this.readoutDetail.textContent =
      testLabel ||
      (hasJackpot
        ? "세븐 5연속 JACKPOT 감지 · 전용 연출은 후속 단계에서 추가"
        : "민트색 칸이 현재 감지된 패턴에 포함된 칸입니다.");
  },

  makePatternTestBoard(test) {
    const target = GAME_DATA.symbols.find(
      (symbol) => symbol.id === test.symbolId
    );
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

  showNextPatternTest() {
    if (this.isSpinning) return;

    const tests = GAME_DATA.patternTests;
    const test = tests[this.patternTestIndex % tests.length];
    const definition = GAME_DATA.patterns[test.key];

    this.patternTestIndex = (this.patternTestIndex + 1) % tests.length;
    this.currentColumns = this.makePatternTestBoard(test);
    this.renderReels();
    this.evaluateAndRenderPatterns(
      `테스트 보드: ${definition.name} · 버튼을 다시 누르면 다음 패턴`
    );

    this.patternTestButton.textContent =
      `패턴 테스트 ${this.patternTestIndex + 1}/${tests.length}`;
    this.spinStatus.textContent = "PATTERN TEST";
  }
};

window.addEventListener("DOMContentLoaded", () => Game.init());
