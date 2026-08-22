// DEADLINE — Stage 4
// 현재 사용하는 최소 점수 피드백 모듈.
// 라운드/마감 흐름 자체는 game.js에서 처리하며,
// 최종 사운드/고급 당첨/위험 연출은 Stage 12에서 다시 다듬습니다.

"use strict";

const EffectsManager = {
  stage: 4,
  enabled: true,

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  animateNumber(element, from, to, options = {}) {
    if (!element) return Promise.resolve();

    const duration = options.duration ?? 520;
    const prefix = options.prefix ?? "";
    const suffix = options.suffix ?? "";
    const formatter =
      options.formatter ?? ((value) => Math.round(value).toLocaleString("ko-KR"));

    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      duration <= 0
    ) {
      element.textContent = `${prefix}${formatter(to)}${suffix}`;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const start = performance.now();

      const frame = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = this.easeOutCubic(progress);
        const value = from + (to - from) * eased;
        element.textContent = `${prefix}${formatter(value)}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          element.textContent = `${prefix}${formatter(to)}${suffix}`;
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });
  },

  flashWin(target) {
    if (!target) return;
    target.classList.remove("win-flash");
    void target.offsetWidth;
    target.classList.add("win-flash");
    window.setTimeout(() => target.classList.remove("win-flash"), 240);
  },

  pulseWallet(target) {
    if (!target) return;
    target.classList.remove("wallet-gain");
    void target.offsetWidth;
    target.classList.add("wallet-gain");
    window.setTimeout(() => target.classList.remove("wallet-gain"), 360);
  }
};

window.EffectsManager = EffectsManager;
