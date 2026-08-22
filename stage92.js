// DEADLINE — v0.9.2 발동 상태 패널 / 마지막 릴 정산 템포 조정
"use strict";

(() => {
  GAME_DATA.version = "v0.9.2";
  GAME_DATA.stage = 9;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousShowStage90Event = Game.showStage90Event;

  Game.resetStage92State = function () {
    if (this.stage92AlertHideTimer) window.clearTimeout(this.stage92AlertHideTimer);
    if (this.stage92AlertHiddenTimer) window.clearTimeout(this.stage92AlertHiddenTimer);
    this.stage92AlertHideTimer = null;
    this.stage92AlertHiddenTimer = null;
    this.stage92AlertToken = 0;
    this.stage92AlertNames = [];
    this.stage92AlertLastAt = 0;
  };

  // 리롤 전에 작동하는 확률/Luck/증폭 알림은 오른쪽 상태 카드가 전담합니다.
  // 패턴 정산 중 Modifier / 재발동 / 트리거 관련 이벤트 피드는 기존대로 유지합니다.
  Game.showStage90Event = function (kind, title, detail = "") {
    if (
      this.stage91CapturePreSpin &&
      ["chance", "luck", "boost"].includes(kind)
    ) return;
    return previousShowStage90Event?.call(this, kind, title, detail);
  };

  // v0.9.1의 릴 위 팝업을 머신 패널 오른쪽 아래의 고정 상태 카드로 교체합니다.
  // stage91이 호출하는 함수 이름은 그대로 유지해 기존 스핀 로직과 호환합니다.
  Game.ensureStage91ItemAlert = function () {
    const host = this.machinePanel || document.querySelector("#machinePanel");
    if (!host) return null;

    let alert = document.querySelector("#stage91ItemAlert");
    if (!alert) {
      alert = document.createElement("div");
      alert.id = "stage91ItemAlert";
      alert.setAttribute("aria-live", "polite");
    }

    alert.className = "stage91-item-alert stage92-item-status";
    alert.hidden = true;
    alert.innerHTML = `
      <span class="stage91-item-alert-icon" aria-hidden="true">◆</span>
      <span class="stage91-item-alert-copy">
        <small>아이템 작동</small>
        <strong>아이템</strong>
        <span class="stage92-item-alert-detail">효과 적용됨</span>
      </span>
    `;

    if (alert.parentElement !== host) host.appendChild(alert);
    this.stage91ItemAlert = alert;
    return alert;
  };

  // 카드는 빨리 사라지지 않게 유지하되, 릴 시작 자체는 오래 막지 않습니다.
  // 여러 사전 발동 아이템이 연속으로 터지면 같은 카드 안에서 이름을 누적합니다.
  Game.playStage91ItemAlert = async function (item) {
    const alert = this.ensureStage91ItemAlert();
    if (!alert || !item) return;

    const now = performance.now?.() || Date.now();
    if (now - (this.stage92AlertLastAt || 0) > 900) this.stage92AlertNames = [];
    this.stage92AlertLastAt = now;

    if (!this.stage92AlertNames.includes(item.name)) this.stage92AlertNames.push(item.name);

    const names = this.stage92AlertNames.slice(-3);
    const rarity = String(item.rarity || "COMMON").toLowerCase();
    const title = names.length === 1 ? names[0] : `${names.length}개 아이템 작동`;
    const detail = names.length === 1 ? "효과 적용됨" : names.join(" · ");

    alert.className = `stage91-item-alert stage92-item-status rarity-${rarity}`;
    alert.querySelector(".stage91-item-alert-icon").textContent = item.icon || "◆";
    alert.querySelector("strong").textContent = title;
    alert.querySelector(".stage92-item-alert-detail").textContent = detail;
    alert.hidden = false;
    void alert.offsetWidth;
    alert.classList.add("is-open");

    if (this.stage92AlertHideTimer) window.clearTimeout(this.stage92AlertHideTimer);
    if (this.stage92AlertHiddenTimer) window.clearTimeout(this.stage92AlertHiddenTimer);

    const token = ++this.stage92AlertToken;
    this.stage92AlertHideTimer = window.setTimeout(() => {
      if (token !== this.stage92AlertToken) return;
      alert.classList.remove("is-open");
      this.stage92AlertHiddenTimer = window.setTimeout(() => {
        if (token !== this.stage92AlertToken) return;
        alert.hidden = true;
        this.stage92AlertNames = [];
      }, 150);
    }, 1500);

    // 아이템이 먼저 작동했다는 건 인지되지만 리롤 템포는 끊기지 않는 정도만 대기합니다.
    await this.wait?.(360);
  };

  // 마지막 릴 정지 후 정산 전 안전 프레임을 2 → 1로 줄입니다.
  // stage83의 실제 심볼 높이 기반 위치 보정은 그대로 사용합니다.
  Game.normalizeStage90ReelsBeforeScore = async function () {
    const reels = [...(this.reelsEl?.querySelectorAll(".reel") || [])];
    reels.forEach((reel, index) => {
      this.normalizeReelTrack?.(reel, this.currentColumns?.[index], index);
      reel.classList.remove("reel-settled");
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
  };

  Game.init = function () {
    this.resetStage92State();
    previousInit.call(this);
    this.ensureStage91ItemAlert();
    this.stage = 9;
    this.status = "ACTIVATION_STATUS_SETTLEMENT_TEMPO";
    this.stageStatus.textContent = this.roundPreparation
      ? "9단계 · 라운드 준비"
      : "9단계 · 아이템 시스템";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.2 activation status / settlement tempo loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage92State();
    const result = previousRestartRun.apply(this, args);
    this.resetStage92State();
    this.ensureStage91ItemAlert();
    return result;
  };
})();
