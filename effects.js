// DEADLINE — Stage 5
// 숫자 카운트업과 최소 점수 피드백 모듈.
// 최종 사운드/고급 당첨 연출은 Stage 12에서 다시 다듬습니다.

"use strict";

const EffectsManager = {
  stage: 5,
  enabled: true,
  activeNumberAnimations: new WeakMap(),

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  animateNumber(element, from, to, options = {}) {
    if (!element) return Promise.resolve();

    const duration = options.duration ?? 600;
    const prefix = options.prefix ?? "";
    const suffix = options.suffix ?? "";
    const formatter =
      options.formatter ?? ((value) => Math.round(value).toLocaleString("ko-KR"));

    const previous = this.activeNumberAnimations.get(element);
    if (previous) {
      previous.cancelled = true;
      previous.resolve?.();
    }

    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      duration <= 0 ||
      from === to
    ) {
      element.textContent = `${prefix}${formatter(to)}${suffix}`;
      this.activeNumberAnimations.delete(element);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const state = { cancelled: false, resolve };
      this.activeNumberAnimations.set(element, state);
      const start = performance.now();

      const frame = (now) => {
        if (state.cancelled) return;

        const progress = Math.min(1, (now - start) / duration);
        const eased = this.easeOutCubic(progress);
        const value = from + (to - from) * eased;
        element.textContent = `${prefix}${formatter(value)}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(frame);
        } else {
          element.textContent = `${prefix}${formatter(to)}${suffix}`;
          this.activeNumberAnimations.delete(element);
          resolve();
        }
      };

      requestAnimationFrame(frame);
    });
  },

  animateCurrency(element, from, to, options = {}) {
    return this.animateNumber(element, from, to, {
      duration: options.duration ?? 600,
      prefix: options.prefix ?? "$ ",
      suffix: options.suffix ?? "",
      formatter:
        options.formatter ?? ((value) => Math.round(value).toLocaleString("ko-KR"))
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
