// DEADLINE — v0.9.9 wallet gain feedback final guard
"use strict";

(() => {
  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousTransferStage99RoundEscrow = Game.transferStage99RoundEscrow;

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    const current = Math.max(0, Number(this.wallet) || 0);

    if (this.stage99EscrowCapture || this.stage99TransferBusy) return result;

    if (this.stage99SuppressWalletGainFx) {
      this.stage99LastWalletBalance = current;
      return result;
    }

    const previous = Number.isFinite(this.stage99LastWalletBalance)
      ? this.stage99LastWalletBalance
      : current;

    if (current > previous) {
      const gain = current - previous;
      this.showStage99WalletGainFloat?.(gain);
      this.walletValue?.classList.add("stage99-wallet-receiving");
      EffectsManager.pulseWallet?.(this.walletValue);
      window.setTimeout(() => this.walletValue?.classList.remove("stage99-wallet-receiving"), 420);
    }

    this.stage99LastWalletBalance = current;
    return result;
  };

  Game.transferStage99RoundEscrow = async function (...args) {
    this.stage99SuppressWalletGainFx = true;
    try {
      const result = await previousTransferStage99RoundEscrow.apply(this, args);
      this.stage99LastWalletBalance = Math.max(0, Number(this.wallet) || 0);
      return result;
    } finally {
      this.stage99SuppressWalletGainFx = false;
    }
  };

  Game.init = function () {
    this.stage99LastWalletBalance = Math.max(0, Number(this.wallet) || 0);
    this.stage99SuppressWalletGainFx = false;
    previousInit.call(this);
    this.stage99LastWalletBalance = Math.max(0, Number(this.wallet) || 0);
  };

  Game.restartRun = function (...args) {
    this.stage99SuppressWalletGainFx = true;
    const result = previousRestartRun.apply(this, args);
    this.stage99LastWalletBalance = Math.max(0, Number(this.wallet) || 0);
    this.stage99SuppressWalletGainFx = false;
    return result;
  };
})();
