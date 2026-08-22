// DEADLINE — v1.0.6 spin HUD / contract overlay count / round profit relocation / pattern payout pop
"use strict";

(() => {
  GAME_DATA.version = "v1.0.6";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousSelectStage100Contract = Game.selectStage100Contract;
  const previousSkipStage100Contract = Game.skipStage100Contract;
  const previousClearPatternImpactState = Game.clearPatternImpactState;

  Game.ensureStage106HudLayout = function () {
    this.ensureStage105MachineLayout?.();

    const meta = document.querySelector("#stage105SlotMeta");
    if (!meta) return;

    let profitDock = meta.querySelector("#stage106RoundProfitDock");
    if (!profitDock) {
      profitDock = document.createElement("div");
      profitDock.id = "stage106RoundProfitDock";
      profitDock.className = "stage106-round-profit-dock";
      meta.appendChild(profitDock);
    }

    const roundWallet = document.querySelector("#stage99RoundWallet");
    if (roundWallet && roundWallet.parentElement !== profitDock) {
      profitDock.appendChild(roundWallet);
    }
  };

  Game.updateStage106ContractOverlayCount = function () {
    const hud = document.querySelector("#stage104ContractHud");
    const icon = hud?.querySelector(".stage104-contract-icon");
    const legacyRounds = hud?.querySelector(".stage104-contract-rounds");

    if (legacyRounds) legacyRounds.hidden = true;
    if (!hud || hud.hidden || !icon || !this.stage100ActiveContract) return;

    let overlay = icon.querySelector(".stage106-contract-overlay-count");
    if (!overlay) {
      overlay = document.createElement("span");
      overlay.className = "stage106-contract-overlay-count";
      overlay.setAttribute("aria-hidden", "true");
      icon.appendChild(overlay);
    }

    const rounds = Math.max(0, Math.round(Number(this.stage104ContractRoundsRemaining) || 0));
    overlay.textContent = String(rounds);
  };

  Game.updateStage106HudLayout = function () {
    this.ensureStage106HudLayout();

    const spinMeta = document.querySelector("#stage105SpinMeta");
    if (spinMeta) {
      const spins = this.getStage105SpinRemaining?.();
      spinMeta.textContent = spins === null ? "돌리기: -" : `돌리기: ${spins}`;
      spinMeta.setAttribute("aria-label", spins === null ? "남은 돌리기 횟수 없음" : `남은 돌리기 ${spins}회`);
    }

    this.updateStage106ContractOverlayCount();
  };

  Game.ensureStage106PatternPayoutLayer = function () {
    const fxLayer = this.ensurePatternFxLayer?.();
    if (!fxLayer) return null;

    let host = fxLayer.querySelector(".stage106-pattern-payout-layer");
    if (!host) {
      host = document.createElement("div");
      host.className = "stage106-pattern-payout-layer";
      fxLayer.appendChild(host);
    }
    return host;
  };

  Game.spawnStage106PatternPayout = function (pattern, index = 0) {
    if (!pattern || !Number.isFinite(Number(pattern.amount))) return;
    const host = this.ensureStage106PatternPayoutLayer();
    if (!host) return;

    const points = (pattern.coords || []).map((coord) => this.getPatternPoint?.(coord)).filter(Boolean);
    if (!points.length) return;

    const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const topY = Math.min(...points.map((point) => point.y));
    const stackOffset = (Math.max(0, Number(index) || 0) % 3) * 11;

    const pop = document.createElement("span");
    pop.className = `stage106-pattern-payout${pattern.isRetrigger ? " is-retrigger" : ""}`;
    pop.textContent = `+$${this.formatStage104CompactNumber?.(pattern.amount) ?? Math.round(pattern.amount)}`;
    pop.style.left = `${centerX}px`;
    pop.style.top = `${Math.max(18, topY - 25 - stackOffset)}px`;
    host.appendChild(pop);

    window.setTimeout(() => pop.remove(), 900);
  };

  // 기존 중앙 패턴 배너 대신 실제 맞은 패턴 바로 위에 지급액을 띄웁니다.
  Game.showPatternImpactBanner = function (pattern, index, total) {
    const layer = this.ensurePatternFxLayer?.();
    const legacyBanner = layer?.querySelector(".pattern-impact-banner");
    if (legacyBanner) legacyBanner.hidden = true;
    this.spawnStage106PatternPayout(pattern, index);
  };

  if (typeof previousClearPatternImpactState === "function") {
    Game.clearPatternImpactState = function (options = {}) {
      const result = previousClearPatternImpactState.call(this, options);
      if (!options?.keepFinalHits) {
        this.ensureStage106PatternPayoutLayer()?.replaceChildren();
      }
      return result;
    };
  }

  Game.updateStage106VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.0.6";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.0.6";
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.updateStage106HudLayout();
    this.updateStage106VersionUI();
    return result;
  };

  Game.selectStage100Contract = function (...args) {
    const result = previousSelectStage100Contract.apply(this, args);
    this.updateStage106HudLayout();
    return result;
  };

  Game.skipStage100Contract = function (...args) {
    const result = previousSkipStage100Contract.apply(this, args);
    this.updateStage106HudLayout();
    return result;
  };

  Game.init = function () {
    const result = previousInit.call(this);
    this.updateStage106HudLayout();
    this.updateStage106VersionUI();
    this.stage = 10;
    this.status = "STAGE10_SPIN_HUD_PATTERN_PAYOUT_106";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.0.6 spin HUD / pattern payout pop loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.updateStage106HudLayout();
    this.updateStage106VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
