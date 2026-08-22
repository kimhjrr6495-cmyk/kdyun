// DEADLINE — v0.9.7 dark-mode cleanup / continuous deadline progress
"use strict";

(() => {
  GAME_DATA.version = "v0.9.7";
  GAME_DATA.stage = 9;

  const previousApplyStage96Theme = Game.applyStage96Theme;
  const previousUpdatePaymentProgress = Game.updatePaymentProgress;
  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;

  Game.applyStage96Theme = function (theme, persist = false) {
    const result = previousApplyStage96Theme.call(this, theme, persist);
    const dark = theme === "dark";
    document.documentElement.classList.toggle("theme-dark-root", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    return result;
  };

  Game.updatePaymentProgress = function (...args) {
    const result = previousUpdatePaymentProgress.apply(this, args);
    if (!this.progressFill || !this.progressPendingFill) return result;

    const target = Math.max(1, Number(this.deadlineTarget) || 1);
    const committed = Math.max(0, Math.min(Number(this.deadlinePaid) || 0, Number(this.paymentCommitted) || 0));
    const pending = Math.max(0, (Number(this.deadlinePaid) || 0) - committed);
    const committedRatio = Math.min(1, committed / target);
    const pendingRatio = Math.min(1 - committedRatio, pending / target);

    // Explicitly square the internal seam so the two fills visually touch.
    if (committedRatio > 0 && pendingRatio > 0) {
      this.progressFill.style.borderRadius = "999px 0 0 999px";
      this.progressPendingFill.style.borderRadius = "0 999px 999px 0";
    } else if (committedRatio > 0) {
      this.progressFill.style.borderRadius = "999px";
      this.progressPendingFill.style.borderRadius = "0";
    } else if (pendingRatio > 0) {
      this.progressFill.style.borderRadius = "0";
      this.progressPendingFill.style.borderRadius = "999px";
    } else {
      this.progressFill.style.borderRadius = "0";
      this.progressPendingFill.style.borderRadius = "0";
    }

    return result;
  };

  Game.init = function () {
    previousInit.call(this);
    const dark = document.body.classList.contains("theme-dark");
    document.documentElement.classList.toggle("theme-dark-root", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    this.stage = 9;
    this.status = "DARK_MODE_POLISH_PAYMENT_PROGRESS";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.7 dark-mode polish loaded.`);
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    const dark = document.body.classList.contains("theme-dark");
    document.documentElement.classList.toggle("theme-dark-root", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    this.updateAllUI?.();
    return result;
  };
})();
