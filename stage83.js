// DEADLINE — v0.8.3 릴 정지 위치 정밀 보정
"use strict";

(() => {
  GAME_DATA.version = "v0.8.3";
  GAME_DATA.stage = 8;

  const previousInit = Game.init;

  Game.getActualReelRowHeight = function (track, reel) {
    const firstSymbol = track?.querySelector(".reel-symbol");
    const measured = firstSymbol?.getBoundingClientRect?.().height;
    if (Number.isFinite(measured) && measured > 0) return measured;

    const cssValue = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--reel-row-height")
    );
    if (Number.isFinite(cssValue) && cssValue > 0) return cssValue;

    return Math.max(1, reel.clientHeight / GAME_DATA.board.rows);
  };

  // v0.8.2의 정규화 함수도 실제 고정 위치 기준으로 강화합니다.
  Game.normalizeReelTrack = function (reel, finalColumn = null, reelIndex = null) {
    if (!reel) return;
    const track = reel.querySelector(".reel-track");
    if (!track) return;

    track.style.transition = "none";
    track.style.top = "0px";
    track.style.transform = "translate3d(0, 0, 0)";

    if (Array.isArray(finalColumn) && Number.isInteger(reelIndex)) {
      track.innerHTML = finalColumn
        .map((symbol, row) => this.symbolHTML(symbol, reelIndex, row))
        .join("");
    }

    void track.offsetHeight;
  };

  // 기존 reel.clientHeight / 3 계산을 사용하지 않습니다.
  // 애니메이션용 심볼 DOM의 실제 높이를 직접 측정해 이동 거리를 계산합니다.
  Game.animateReel = function (reel, index, finalColumn) {
    const track = reel.querySelector(".reel-track");
    const config = GAME_DATA.reelMotion;
    const startColumn = this.currentColumns[index];
    const middle = Array.from(
      { length: config.travelSymbols },
      () => this.randomSymbol()
    );
    const sequence = [...startColumn, ...middle, ...finalColumn];

    reel.classList.remove("reel-settled");
    track.style.transition = "none";
    track.style.top = "0px";
    track.style.transform = "translate3d(0, 0, 0)";
    track.innerHTML = sequence.map((symbol) => this.symbolHTML(symbol)).join("");

    // DOM이 만들어진 뒤 실제 한 칸 높이를 측정합니다.
    void track.offsetHeight;
    const symbolHeight = this.getActualReelRowHeight(track, reel);
    const finalStartIndex = sequence.length - GAME_DATA.board.rows;
    const distance = finalStartIndex * symbolHeight;
    const duration = config.baseDuration + index * config.stopGap;

    return new Promise((resolve) => {
      let settled = false;
      let fallbackTimer = null;

      const finish = () => {
        if (settled) return;
        settled = true;

        track.removeEventListener("transitionend", onEnd);
        if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);

        // 애니메이션 끝점과 최종 DOM 위치가 정확히 같은 상태에서 교체합니다.
        track.style.transition = "none";
        track.style.transform = `translate3d(0, -${distance}px, 0)`;
        void track.offsetHeight;

        track.innerHTML = finalColumn
          .map((symbol, row) => this.symbolHTML(symbol, index, row))
          .join("");
        track.style.top = "0px";
        track.style.transform = "translate3d(0, 0, 0)";
        void track.offsetHeight;

        reel.classList.add("reel-settled");

        // 최종 3칸이 실제 화면에 한 프레임 그려진 다음에만 정지 완료로 처리합니다.
        requestAnimationFrame(() => {
          window.setTimeout(() => reel.classList.remove("reel-settled"), 90);
          resolve();
        });
      };

      const onEnd = (event) => {
        if (event.target === track && event.propertyName === "transform") finish();
      };

      track.addEventListener("transitionend", onEnd);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          track.style.transition = `transform ${duration}ms ${config.easing}`;
          track.style.transform = `translate3d(0, -${distance}px, 0)`;
        });
      });

      fallbackTimer = window.setTimeout(finish, duration + 180);
    });
  };

  Game.init = function () {
    previousInit.call(this);
    this.stage = 8;
    this.status = "PIXEL_EXACT_REEL_SETTLEMENT";
    console.info(`DEADLINE ${GAME_DATA.version}: v0.8.3 pixel-exact reel settlement loaded.`);
  };
})();
