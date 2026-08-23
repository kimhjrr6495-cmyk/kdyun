// DEADLINE — v1.3.1 board-local FX audio companion
"use strict";

(() => {
  let ctx = null;

  const ensureAudio = () => {
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      return ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      ctx = new AudioCtx();
      if (ctx.state === "suspended") void ctx.resume();
    } catch (_) {
      ctx = null;
    }
    return ctx;
  };

  const tone = (frequency, duration = 0.055, gainValue = 0.022, type = "square", delay = 0) => {
    const audio = ensureAudio();
    if (!audio || audio.state !== "running") return;
    const start = audio.currentTime + Math.max(0, delay);
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.012);
  };

  Game.s131Sound = function (kind = "item") {
    if (kind === "glitch") {
      tone(118, 0.045, 0.018, "sawtooth", 0);
      tone(82, 0.05, 0.014, "square", 0.045);
      tone(156, 0.035, 0.011, "sawtooth", 0.085);
      return;
    }
    if (kind === "ticket") {
      tone(660, 0.055, 0.018, "sine", 0);
      tone(880, 0.075, 0.016, "sine", 0.055);
      return;
    }
    tone(330, 0.04, 0.012, "triangle", 0);
  };

  document.addEventListener("pointerdown", ensureAudio, { once: true, passive: true });
  document.addEventListener("keydown", ensureAudio, { once: true });

  const previousGlitch = Game.s131Glitch;
  if (previousGlitch) {
    Game.s131Glitch = async function (...args) {
      this.s131Sound?.("glitch");
      return previousGlitch.apply(this, args);
    };
  }

  const previousFloat = Game.s131Float;
  if (previousFloat) {
    Game.s131Float = async function (text, coords, kind) {
      if (kind === "ticket") this.s131Sound?.("ticket");
      return previousFloat.call(this, text, coords, kind);
    };
  }
})();
