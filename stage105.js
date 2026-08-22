// DEADLINE — v1.0.5 machine header layout fix / slot HUD relocation
"use strict";

(() => {
  GAME_DATA.version = "v1.0.5";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.ensureStage105MachineLayout = function () {
    const header = document.querySelector(".machine-header");
    const machineStage = document.querySelector(".machine-stage");
    if (!header || !machineStage) return;

    // Stage 104가 만든 마감 라벨 래퍼는 유지하되, 계약 HUD는 헤더 밖으로 이동합니다.
    let left = header.querySelector(".stage104-machine-left");
    let title = document.querySelector("#stage104DeadlineLabel") || header.querySelector(":scope > strong");
    if (!left) {
      left = document.createElement("div");
      left.className = "stage104-machine-left";
      if (title) {
        header.insertBefore(left, title);
        left.appendChild(title);
      } else {
        title = document.createElement("strong");
        title.id = "stage104DeadlineLabel";
        left.appendChild(title);
        header.prepend(left);
      }
    }

    let meta = machineStage.querySelector("#stage105SlotMeta");
    if (!meta) {
      meta = document.createElement("div");
      meta.id = "stage105SlotMeta";
      meta.className = "stage105-slot-meta";
      meta.innerHTML = `
        <div id="stage105SpinMeta" class="stage105-spin-meta" aria-label="남은 회전">회전 -</div>
        <div class="stage105-contract-dock" aria-label="현재 계약"></div>
      `;
      machineStage.prepend(meta);
    }

    const hud = document.querySelector("#stage104ContractHud");
    const dock = meta.querySelector(".stage105-contract-dock");
    if (hud && dock && hud.parentElement !== dock) dock.appendChild(hud);
  };

  Game.getStage105SpinRemaining = function () {
    if (this.finalPaymentPhase || this.runComplete || this.gameOver) return 0;
    const remaining = Number(this.spinsRemaining);
    if ((this.roundStarted || this.currentMode) && Number.isFinite(remaining)) {
      return Math.max(0, Math.round(remaining));
    }
    return null;
  };

  Game.updateStage105MachineLayout = function () {
    this.ensureStage105MachineLayout();

    const deadlineLabel = document.querySelector("#stage104DeadlineLabel");
    const status = this.stageStatus || document.querySelector("#stageStatus");
    const spinMeta = document.querySelector("#stage105SpinMeta");

    if (deadlineLabel) deadlineLabel.textContent = `마감 ${this.deadlineNumber}`;

    if (status) {
      if (this.runComplete) status.textContent = "런 완료";
      else if (this.gameOver) status.textContent = "실패";
      else if (this.finalPaymentPhase) status.textContent = "최종 납부";
      else status.textContent = `남은 라운드 ${this.getStage104RoundsLeft?.() ?? Math.max(0, (this.roundsPerDeadline || 3) - (this.round || 1) + 1)}`;
    }

    if (spinMeta) {
      const spins = this.getStage105SpinRemaining();
      spinMeta.textContent = spins === null ? "회전 -" : `회전 ${spins}`;
      spinMeta.classList.toggle("is-active", spins !== null && spins > 0);
      spinMeta.classList.toggle("is-empty", spins === null || spins <= 0);
    }

    // Stage 104 update가 HUD를 다시 만져도 항상 슬롯 영역의 A 위치로 되돌립니다.
    const hud = document.querySelector("#stage104ContractHud");
    const dock = document.querySelector("#stage105SlotMeta .stage105-contract-dock");
    if (hud && dock && hud.parentElement !== dock) dock.appendChild(hud);
  };

  Game.updateStage105VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.0.5";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.0.5";
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.updateStage105MachineLayout();
    this.updateStage105VersionUI();
    return result;
  };

  Game.init = function () {
    const result = previousInit.call(this);
    this.updateStage105MachineLayout();
    this.updateStage105VersionUI();
    this.stage = 10;
    this.status = "STAGE10_MACHINE_HEADER_LAYOUT_105";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.0.5 machine header layout loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.updateStage105MachineLayout();
    this.updateStage105VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
