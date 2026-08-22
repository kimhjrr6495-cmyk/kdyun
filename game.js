// DEADLINE — Stage 4
// 패턴/점수 시스템 위에 라운드 선택, 회전 제한, 마감 성공/실패 루프를 연결합니다.
// 금고/이자/실제 마감 정산/조기상환/상점은 후속 단계에서 구현합니다.

"use strict";

const Game = {
  stage: 4,
  status: "DEADLINE_LOOP",
  isSpinning: false,
  isResolvingRound: false,
  patternTestIndex: 0,
  currentColumns: [],
  lastPatterns: [],

  wallet: 0,
  bank: 0,
  tickets: 0,
  deadlineIndex: 0,
  round: 1,
  currentMode: null,
  spinsRemaining: 0,
  spinsTotal: 0,
  gameOver: false,
  runComplete: false,

  init() {
    this.reelsEl = document.querySelector("#reels");
    this.spinButton = document.querySelector("#spinButton");
    this.patternTestButton = document.querySelector("#patternTestButton");
    this.deadlineStatus = document.querySelector("#deadlineStatus");
    this.roundStatus = document.querySelector("#roundStatus");
    this.spinStatus = document.querySelector("#spinStatus");
    this.ticketStatus = document.querySelector("#ticketStatus");
    this.modeStatus = document.querySelector("#modeStatus");
    this.stageStatus = document.querySelector("#stageStatus");
    this.payoutValue = document.querySelector("#payoutValue");
    this.patternList = document.querySelector("#patternList");
    this.scoreBreakdown = document.querySelector("#scoreBreakdown");
    this.readoutDetail = document.querySelector("#readoutDetail");
    this.walletValue = document.querySelector("#walletValue");
    this.bankValue = document.querySelector("#bankValue");
    this.deadlineTargetValue = document.querySelector("#deadlineTargetValue");
    this.progressFill = document.querySelector("#progressFill");
    this.progressCopy = document.querySelector("#progressCopy");
    this.panelNote = document.querySelector("#panelNote");
    this.machinePanel = document.querySelector("#machinePanel");

    this.flowOverlay = document.querySelector("#flowOverlay");
    this.flowEyebrow = document.querySelector("#flowEyebrow");
    this.flowTitle = document.querySelector("#flowTitle");
    this.flowText = document.querySelector("#flowText");
    this.flowOptions = document.querySelector("#flowOptions");
    this.flowFooter = document.querySelector("#flowFooter");

    this.currentColumns = Array.from(
      { length: GAME_DATA.board.columns },
      () => this.randomColumn()
    );

    this.renderReels();
    this.bindInputs();
    this.updateAllUI();
    this.showRoundChoice();

    console.info(`DEADLINE ${GAME_DATA.version}: deadline loop loaded.`);
  },

  get deadlineNumber() {
    return this.deadlineIndex + 1;
  },

  get deadlineTarget() {
    return GAME_DATA.deadline.targets[this.deadlineIndex];
  },

  get roundsPerDeadline() {
    return GAME_DATA.deadline.roundsPerDeadline;
  },

  bindInputs() {
    this.spinButton.addEventListener("click", () => this.spin());
    this.patternTestButton.addEventListener("click", () => this.showNextPatternTest());

    this.flowOptions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      if (action === "start-round") this.startRound(button.dataset.mode);
      if (action === "next-deadline") this.advanceDeadline();
      if (action === "restart-run") this.restartRun();
    });

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
    if (
      this.isSpinning ||
      this.isResolvingRound ||
      this.gameOver ||
      this.runComplete ||
      !this.currentMode ||
      this.spinsRemaining <= 0 ||
      this.flowOverlay.classList.contains("is-open")
    ) {
      return;
    }

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

    await this.evaluateAndRenderScore({ creditWallet: true });

    this.spinsRemaining = Math.max(0, this.spinsRemaining - 1);
    this.updateAllUI();

    this.isSpinning = false;

    if (this.spinsRemaining <= 0) {
      this.isResolvingRound = true;
      this.spinButton.disabled = true;
      this.patternTestButton.disabled = true;
      this.spinButton.textContent = "정산 중";
      await this.wait(420);
      this.resolveRound();
      return;
    }

    this.spinButton.disabled = false;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "회전";
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

    // JACKPOT은 일반 패턴을 대체하지 않고 마지막 보너스로 추가됩니다.
    const allCoords = [];
    for (let col = 0; col < columns; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        allCoords.push([col, row]);
      }
    }
    const jackpotSymbol = this.matchCoordinates(allCoords);

    // 같은 가로 연속 구간에서는 가장 큰 가로 패턴만 인정합니다.
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

    for (let col = 0; col < columns; col += 1) {
      const coords = [[col, 0], [col, 1], [col, 2]];
      const symbol = this.matchCoordinates(coords);
      if (symbol) found.push(this.makePattern("V3", coords, symbol));
    }

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
      this.updateEconomyUI(false);
      this.readoutDetail.textContent = jackpot
        ? `JACKPOT 포함 정산 완료 · 지갑 +$${total.toLocaleString("ko-KR")}`
        : `정산 완료 · 지갑 +$${total.toLocaleString("ko-KR")}`;
    } else {
      this.readoutDetail.textContent =
        testLabel || `테스트 점수 +$${total.toLocaleString("ko-KR")} · 지갑 미반영`;
    }

    return total;
  },

  startRound(modeId) {
    if (this.gameOver || this.runComplete || this.isSpinning) return;

    const mode = GAME_DATA.deadline.modes[modeId];
    if (!mode) return;

    this.currentMode = mode;
    this.spinsRemaining = mode.spins;
    this.spinsTotal = mode.spins;
    this.tickets += mode.tickets;
    this.isResolvingRound = false;

    this.closeFlowOverlay();
    this.clearScoreDisplay();
    this.scoreBreakdown.textContent =
      `${mode.name} 시작 · ${mode.spins}회전 · 티켓 +${mode.tickets}`;
    this.readoutDetail.textContent =
      `마감 ${this.deadlineNumber} · 라운드 ${this.round}/${this.roundsPerDeadline}`;

    this.spinButton.disabled = false;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "회전";
    this.updateAllUI();
  },

  resolveRound() {
    this.isResolvingRound = false;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();

    if (this.wallet >= this.deadlineTarget) {
      this.showDeadlineSuccess();
      return;
    }

    if (this.round < this.roundsPerDeadline) {
      this.round += 1;
      this.showRoundChoice();
      return;
    }

    this.showGameOver();
  },

  showRoundChoice() {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "회전";
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();

    const normal = GAME_DATA.deadline.modes.NORMAL;
    const risk = GAME_DATA.deadline.modes.RISK;

    this.flowEyebrow.textContent =
      `DEADLINE ${this.deadlineNumber} · ROUND ${this.round} / ${this.roundsPerDeadline}`;
    this.flowTitle.textContent = "라운드 방식 선택";
    this.flowText.textContent =
      `목표 $${this.deadlineTarget.toLocaleString("ko-KR")} · 현재 $${this.wallet.toLocaleString("ko-KR")}`;
    this.flowOptions.innerHTML = `
      <button class="flow-choice" data-action="start-round" data-mode="NORMAL">
        <span>${normal.name}</span>
        <strong>${normal.spins} SPINS</strong>
        <small>티켓 +${normal.tickets} · 안정적인 선택</small>
      </button>
      <button class="flow-choice risk" data-action="start-round" data-mode="RISK">
        <span>${risk.name}</span>
        <strong>${risk.spins} SPINS</strong>
        <small>티켓 +${risk.tickets} · 적은 회전, 높은 보상</small>
      </button>
    `;
    this.flowFooter.textContent =
      "라운드가 끝날 때 목표 달성 여부를 확인합니다.";
    this.openFlowOverlay();
  },

  showDeadlineSuccess() {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 4 · DEADLINE CLEARED";

    const isLast = this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1;

    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} CLEARED`;
    this.flowTitle.textContent = "마감 목표 달성";
    this.flowText.textContent =
      `$${this.wallet.toLocaleString("ko-KR")} / $${this.deadlineTarget.toLocaleString("ko-KR")}`;

    if (isLast) {
      this.runComplete = true;
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="restart-run">
          <span>STAGE 4 LOOP CLEAR</span>
          <strong>처음부터 다시 테스트</strong>
        </button>
      `;
      this.flowFooter.textContent =
        "최종 엔딩/Endless는 Stage 12에서 구현합니다.";
    } else {
      const nextTarget = GAME_DATA.deadline.targets[this.deadlineIndex + 1];
      this.flowOptions.innerHTML = `
        <button class="flow-primary" data-action="next-deadline">
          <span>NEXT DEADLINE</span>
          <strong>다음 목표 $${nextTarget.toLocaleString("ko-KR")}</strong>
        </button>
      `;
      this.flowFooter.textContent =
        "Stage 4에서는 목표액을 지갑에서 차감하지 않습니다. 실제 마감 정산은 Stage 5에서 연결합니다.";
    }

    this.openFlowOverlay();
  },

  showGameOver() {
    this.gameOver = true;
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 4 · GAME OVER";

    const shortfall = Math.max(0, this.deadlineTarget - this.wallet);
    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} FAILED`;
    this.flowTitle.textContent = "GAME OVER";
    this.flowText.textContent =
      `목표까지 $${shortfall.toLocaleString("ko-KR")} 부족합니다.`;
    this.flowOptions.innerHTML = `
      <button class="flow-primary danger" data-action="restart-run">
        <span>RESTART</span>
        <strong>처음부터 다시 시작</strong>
      </button>
    `;
    this.flowFooter.textContent =
      `${this.roundsPerDeadline}라운드를 모두 사용했습니다.`;
    this.openFlowOverlay();
  },

  advanceDeadline() {
    if (this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1) return;

    this.deadlineIndex += 1;
    this.round = 1;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;
    this.stageStatus.textContent = "STAGE 4 · DEADLINE LOOP";
    this.updateAllUI();
    this.showRoundChoice();
  },

  restartRun() {
    this.wallet = 0;
    this.bank = 0;
    this.tickets = 0;
    this.deadlineIndex = 0;
    this.round = 1;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.gameOver = false;
    this.runComplete = false;
    this.isSpinning = false;
    this.isResolvingRound = false;
    this.patternTestIndex = 0;

    this.currentColumns = Array.from(
      { length: GAME_DATA.board.columns },
      () => this.randomColumn()
    );
    this.renderReels();
    this.clearScoreDisplay();
    this.stageStatus.textContent = "STAGE 4 · DEADLINE LOOP";
    this.patternTestButton.textContent = `패턴 테스트 1/${GAME_DATA.patternTests.length}`;
    this.updateAllUI();
    this.showRoundChoice();
  },

  updateAllUI() {
    this.deadlineStatus.textContent = String(this.deadlineNumber);
    this.roundStatus.textContent = `${this.round} / ${this.roundsPerDeadline}`;
    this.ticketStatus.textContent = String(this.tickets);
    this.modeStatus.textContent = this.currentMode?.name ?? "-";

    if (this.currentMode) {
      this.spinStatus.textContent = `${this.spinsRemaining} / ${this.spinsTotal}`;
    } else if (this.gameOver) {
      this.spinStatus.textContent = "GAME OVER";
    } else if (this.runComplete) {
      this.spinStatus.textContent = "CLEAR";
    } else {
      this.spinStatus.textContent = "선택 대기";
    }

    this.deadlineTargetValue.textContent =
      `$ ${this.deadlineTarget.toLocaleString("ko-KR")}`;
    this.updateEconomyUI(true);
  },

  updateEconomyUI(updateWalletText = true) {
    if (updateWalletText) {
      this.walletValue.textContent = `$ ${this.wallet.toLocaleString("ko-KR")}`;
    }
    this.bankValue.textContent = `$ ${this.bank.toLocaleString("ko-KR")}`;

    const totalForTarget = this.wallet + this.bank;
    const ratio = Math.min(1, totalForTarget / this.deadlineTarget);
    this.progressFill.style.width = `${ratio * 100}%`;
    this.progressCopy.textContent =
      `$ ${totalForTarget.toLocaleString("ko-KR")} / $ ${this.deadlineTarget.toLocaleString("ko-KR")}`;
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
    if (this.isSpinning || this.isResolvingRound || this.gameOver || this.runComplete) return;

    const tests = GAME_DATA.patternTests;
    const test = tests[this.patternTestIndex % tests.length];
    const definition = GAME_DATA.patterns[test.key];

    this.patternTestIndex = (this.patternTestIndex + 1) % tests.length;
    this.currentColumns = this.makePatternTestBoard(test);
    this.renderReels();

    await this.evaluateAndRenderScore({
      creditWallet: false,
      testLabel: `개발 테스트: ${definition.name} · 지갑/회전 수 미반영`
    });

    this.patternTestButton.textContent =
      `패턴 테스트 ${this.patternTestIndex + 1}/${tests.length}`;
  },

  openFlowOverlay() {
    this.flowOverlay.classList.add("is-open");
  },

  closeFlowOverlay() {
    this.flowOverlay.classList.remove("is-open");
  },

  wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
};

window.addEventListener("DOMContentLoaded", () => Game.init());
