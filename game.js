// DEADLINE — Stage 1
// 현재 단계 목표: 5×3 릴 회전 감각만 구현합니다.
// 점수, 패턴 판정, 상점, 아이템, 당첨 연출은 아직 연결하지 않습니다.

"use strict";

const Game = {
  stage: 1,
  status: "REEL_MOTION",
  isSpinning: false,
  testSpinCount: 0,
  currentColumns: [],

  init() {
    this.reelsEl = document.querySelector("#reels");
    this.spinButton = document.querySelector("#spinButton");
    this.spinStatus = document.querySelector("#spinStatus");
    this.stageStatus = document.querySelector("#stageStatus");
    this.readoutDetail = document.querySelector("#readoutDetail");

    this.currentColumns = Array.from(
      { length: GAME_DATA.board.columns },
      () => this.randomColumn()
    );

    this.renderReels();
    this.bindInputs();

    console.info(`DEADLINE ${GAME_DATA.version}: reel motion loaded.`);
  },

  bindInputs() {
    this.spinButton.addEventListener("click", () => this.spin());

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

  symbolHTML(symbol) {
    return `
      <div class="reel-symbol" data-symbol="${symbol.id}">
        <b>${symbol.code}</b>
        <small>${symbol.name}</small>
      </div>
    `;
  },

  renderReels() {
    this.reelsEl.innerHTML = this.currentColumns
      .map((column, index) => `
        <div class="reel" data-reel-index="${index}">
          <div class="reel-track">
            ${column.map((symbol) => this.symbolHTML(symbol)).join("")}
          </div>
        </div>
      `)
      .join("");
  },

  async spin() {
    if (this.isSpinning) return;

    this.isSpinning = true;
    this.spinButton.disabled = true;
    this.spinButton.textContent = "회전 중";
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
    this.testSpinCount += 1;
    this.spinStatus.textContent = `TEST ${this.testSpinCount}`;
    this.stageStatus.textContent = "STAGE 1 · REEL MOTION";
    this.readoutDetail.textContent = "결과 생성 완료 · 점수 판정은 아직 미구현";

    this.spinButton.disabled = false;
    this.spinButton.textContent = "회전";
    this.isSpinning = false;
  },

  animateReel(reel, index, finalColumn) {
    const track = reel.querySelector(".reel-track");
    const config = GAME_DATA.reelMotion;
    const symbolHeight = reel.clientHeight / GAME_DATA.board.rows;

    const startColumn = this.currentColumns[index];
    const middleCount = config.travelSymbols;
    const middle = Array.from({ length: middleCount }, () => this.randomSymbol());
    const sequence = [...startColumn, ...middle, ...finalColumn];

    track.style.transition = "none";
    track.style.transform = "translate3d(0, 0, 0)";
    track.innerHTML = sequence.map((symbol) => this.symbolHTML(symbol)).join("");

    const finalStartIndex = sequence.length - GAME_DATA.board.rows;
    const distance = finalStartIndex * symbolHeight;
    const duration = config.baseDuration + index * config.stopGap;
    const easing =
      index >= config.lateReelStartIndex ? config.lateEasing : config.easing;

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
          .map((symbol) => this.symbolHTML(symbol))
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
          track.style.transition = `transform ${duration}ms ${easing}`;
          track.style.transform = `translate3d(0, -${distance}px, 0)`;
        });
      });

      window.setTimeout(finish, duration + 120);
    });
  }
};

window.addEventListener("DOMContentLoaded", () => Game.init());
