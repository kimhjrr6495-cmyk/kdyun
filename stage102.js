// DEADLINE — v1.0.2 control layout / button state polish
"use strict";

(() => {
  GAME_DATA.version = "v1.0.2";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.applyStage102ControlLayout = function () {
    const payout = document.querySelector("#payoutValue");
    const spinButton = document.querySelector("#spinButton");
    const roundWallet = document.querySelector("#stage99RoundWallet");
    const machineActions = document.querySelector(".machine-actions");
    const patternTestButton = document.querySelector("#patternTestButton");

    // 리롤 버튼을 기존 '이번 라운드 수익' 자리(현재 지급액 바로 아래)로 이동.
    if (payout && spinButton) {
      if (spinButton.parentElement !== payout.parentElement || payout.nextElementSibling !== spinButton) {
        payout.insertAdjacentElement("afterend", spinButton);
      }
    }

    // 이번 라운드 수익 패널을 기존 하단 리롤 자리로 이동.
    if (machineActions && roundWallet) {
      if (patternTestButton) {
        if (roundWallet.parentElement !== machineActions || roundWallet.nextElementSibling !== patternTestButton) {
          machineActions.insertBefore(roundWallet, patternTestButton);
        }
      } else if (roundWallet.parentElement !== machineActions) {
        machineActions.insertBefore(roundWallet, machineActions.firstChild);
      }
    }
  };

  Game.applyStage102RoundInteractionLocks = function () {
    const roundLocked = Boolean(this.roundStarted || this.isSpinning || this.isResolvingRound);
    if (!roundLocked) return;

    const depositButton = this.deadlineDepositButton || document.querySelector("#deadlineDepositButton");
    const shopButton = this.actionShopButton || document.querySelector("#actionShopButton");

    if (depositButton) depositButton.disabled = true;
    if (shopButton) shopButton.disabled = true;
  };

  Game.updateStage102VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.0.2";

    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.0.2";
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.applyStage102ControlLayout();
    this.applyStage102RoundInteractionLocks();
    this.updateStage102VersionUI();
    return result;
  };

  Game.init = function () {
    previousInit.call(this);
    this.applyStage102ControlLayout();
    this.applyStage102RoundInteractionLocks();
    this.updateStage102VersionUI();
    this.stage = 10;
    this.status = "CONTRACTS_CONTROL_LAYOUT_POLISH";
    requestAnimationFrame(() => {
      this.applyStage102ControlLayout();
      this.updateAllUI?.();
    });
    console.info(`DEADLINE ${GAME_DATA.version}: v1.0.2 control layout polish loaded.`);
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.applyStage102ControlLayout();
    this.applyStage102RoundInteractionLocks();
    this.updateStage102VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
