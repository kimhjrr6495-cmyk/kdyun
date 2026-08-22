// DEADLINE — v0.7.5 잭팟 릴 프레임 / 카지노식 벨·차임 사운드
"use strict";

(() => {
  Game.stage = 7;
  Game.status = "JACKPOT_FRAME_CASINO_AUDIO";

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;

  Game.getPatternAudioContext = function () {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.patternAudioContext) this.patternAudioContext = new AudioCtx();
      if (this.patternAudioContext.state === "suspended") {
        this.patternAudioContext.resume().catch(() => {});
      }
      return this.patternAudioContext;
    } catch (_) {
      return null;
    }
  };

  Game.playCasinoBell = function ({ frequency, delay = 0, duration = 0.16, volume = 0.032, richness = 1 } = {}) {
    const context = this.getPatternAudioContext();
    if (!context || !Number.isFinite(frequency)) return;

    const start = context.currentTime + Math.max(0, delay);
    const partials = richness >= 3
      ? [[1, 1], [2.01, 0.32], [3.98, 0.13]]
      : richness === 2
        ? [[1, 1], [2.01, 0.24]]
        : [[1, 1], [2.01, 0.13]];

    partials.forEach(([ratio, level], partialIndex) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = partialIndex === 0 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency * ratio, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * level), start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });

    // 슬롯 버튼/코인 기계 같은 짧은 금속성 어택을 아주 작게 추가합니다.
    const clickOscillator = context.createOscillator();
    const clickGain = context.createGain();
    clickOscillator.type = "square";
    clickOscillator.frequency.setValueAtTime(Math.min(2400, frequency * 2.6), start);
    clickGain.gain.setValueAtTime(volume * 0.09, start);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.022);
    clickOscillator.connect(clickGain);
    clickGain.connect(context.destination);
    clickOscillator.start(start);
    clickOscillator.stop(start + 0.026);
  };

  // 일반 패턴: 전자식 삑 소리 대신 짧은 벨/코인 차임. 연속 당첨일수록 음정이 조금 상승합니다.
  Game.playPatternTone = function (index, total, intensity = 1) {
    const base = 523.25 * Math.pow(2, Math.min(index, 12) / 30);
    const volume = intensity >= 3 ? 0.046 : intensity === 2 ? 0.039 : 0.03;
    const duration = intensity >= 3 ? 0.23 : intensity === 2 ? 0.18 : 0.135;

    this.playCasinoBell({
      frequency: base,
      duration,
      volume,
      richness: intensity
    });

    if (intensity >= 2) {
      this.playCasinoBell({
        frequency: base * 1.25,
        delay: 0.018,
        duration: duration * 0.9,
        volume: volume * 0.62,
        richness: 1
      });
    }
  };

  Game.playJackpotCasinoChime = function () {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // 짧은 상승 벨 4개 뒤에 메이저 코드로 확정감을 줍니다.
    const climb = [659.25, 783.99, 987.77, 1174.66];
    climb.forEach((frequency, index) => {
      this.playCasinoBell({
        frequency,
        delay: index * 0.075,
        duration: 0.24,
        volume: 0.042 + index * 0.003,
        richness: index >= 2 ? 2 : 1
      });
    });

    const chordStart = 0.34;
    [1046.5, 1318.51, 1567.98].forEach((frequency, index) => {
      this.playCasinoBell({
        frequency,
        delay: chordStart + index * 0.012,
        duration: 0.48,
        volume: index === 0 ? 0.056 : 0.038,
        richness: 3
      });
    });
  };

  // 잭팟 피니시는 화면 중앙 방사형 그래픽 대신 릴 프레임 자체가 변합니다.
  Game.playJackpotFinish = async function () {
    const layer = this.ensurePatternFxLayer?.();
    const shell = this.reelsEl?.closest(".reels-shell");
    if (!shell || !this.reelsEl) return;

    const accent = layer?.style.getPropertyValue("--pattern-accent")?.trim() || "#C18B24";
    shell.style.setProperty("--jackpot-accent", accent);
    this.reelsEl.style.setProperty("--jackpot-accent", accent);

    shell.classList.remove("jackpot-frame-active");
    this.reelsEl.classList.remove("jackpot-grid-active");
    void shell.offsetWidth;
    shell.classList.add("jackpot-frame-active");
    this.reelsEl.classList.add("jackpot-grid-active");

    this.playJackpotCasinoChime();

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    await this.wait(reduced ? 90 : 720);

    shell.classList.remove("jackpot-frame-active");
    this.reelsEl.classList.remove("jackpot-grid-active");
  };

  Game.init = function () {
    previousInit.call(this);

    // v0.7.4의 방사형 잭팟 flare DOM도 제거해서 다시 보일 여지를 없앱니다.
    this.ensurePatternFxLayer?.()
      ?.querySelector(".pattern-jackpot-flare")
      ?.remove();

    this.stage = 7;
    this.status = "JACKPOT_FRAME_CASINO_AUDIO";
    console.info(`DEADLINE ${GAME_DATA.version}: v0.7.5 jackpot frame + casino chime loaded.`);
  };

  Game.restartRun = function () {
    const shell = this.reelsEl?.closest(".reels-shell");
    shell?.classList.remove("jackpot-frame-active");
    this.reelsEl?.classList.remove("jackpot-grid-active");
    previousRestartRun.call(this);
  };
})();
