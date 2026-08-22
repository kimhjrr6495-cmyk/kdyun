// DEADLINE — v0.9.5 누적 마감 계좌 / 10% 이자 / 마감 3 금고 해금 / 심볼 가치 조정
"use strict";

(() => {
  GAME_DATA.version = "v0.9.5";
  GAME_DATA.stage = 9;
  GAME_DATA.economy.deadlineAccountRoundRate = 0.10;
  GAME_DATA.economy.vaultUnlockDeadline = 3;

  const SYMBOL_VALUES_95 = {
    CH: 1,
    CO: 1,
    BL: 2,
    ST: 3,
    DM: 4,
    CR: 6,
    SV: 8
  };

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousResolveRound = Game.resolveRound;
  const previousDescribeVaultEvent = Game.describeVaultEvent;
  const previousShowDeadlineSuccess = Game.showDeadlineSuccess;
  const previousEnterFinalPaymentPhase = Game.enterFinalPaymentPhase;
  const previousDepositDeadlineUnit = Game.depositDeadlineUnit;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousSelectVaultTerm = Game.selectVaultTerm;
  const previousCanFundVault = Game.canFundVault;
  const previousDepositVaultUnit = Game.depositVaultUnit;
  const previousRenderVaultControls = Game.renderVaultControls;

  Game.applyStage95SymbolValues = function () {
    (GAME_DATA.symbols || []).forEach((symbol) => {
      if (Object.prototype.hasOwnProperty.call(SYMBOL_VALUES_95, symbol.id)) {
        symbol.value = SYMBOL_VALUES_95[symbol.id];
      }
    });
  };

  Game.resetStage95State = function () {
    this.stage95PendingDeadlineInterest = null;
    this.stage95VaultUnlocking = false;
    if (this.stage95VaultUnlockTimer) window.clearTimeout(this.stage95VaultUnlockTimer);
    this.stage95VaultUnlockTimer = null;
  };

  Game.isStage95VaultUnlocked = function () {
    const unlockAt = Number(GAME_DATA.economy.vaultUnlockDeadline) || 3;
    return this.deadlineNumber >= unlockAt || Boolean(this.stage95VaultUnlocking);
  };

  Game.ensureStage95VaultUnlockBanner = function () {
    if (!this.vaultSection) return null;
    let banner = this.vaultSection.querySelector(".stage95-vault-unlock-banner");
    if (banner) return banner;

    banner = document.createElement("div");
    banner.className = "stage95-vault-unlock-banner";
    banner.hidden = true;
    banner.innerHTML = `<span>금고 해금</span><strong>마감 3부터 이용 가능</strong>`;
    this.vaultSection.appendChild(banner);
    return banner;
  };

  Game.updateStage95VaultAvailability = function () {
    if (!this.vaultSection) return;
    const unlocked = this.isStage95VaultUnlocked();

    this.vaultSection.classList.toggle("stage95-vault-hidden", !unlocked);
    this.vaultSection.setAttribute("aria-hidden", unlocked ? "false" : "true");

    if (!unlocked) {
      this.selectedVaultTerm = null;
      if (this.vaultControls) this.vaultControls.innerHTML = "";
    }
  };

  Game.playStage95VaultUnlock = function () {
    if (!this.vaultSection) return;
    this.stage95VaultUnlocking = true;
    this.updateStage95VaultAvailability();

    const banner = this.ensureStage95VaultUnlockBanner();
    if (banner) banner.hidden = false;

    this.vaultSection.classList.remove("stage95-vault-unlocking");
    void this.vaultSection.offsetWidth;
    this.vaultSection.classList.add("stage95-vault-unlocking");

    if (this.vaultLockState) this.vaultLockState.textContent = "해금";

    if (this.stage95VaultUnlockTimer) window.clearTimeout(this.stage95VaultUnlockTimer);
    this.stage95VaultUnlockTimer = window.setTimeout(() => {
      this.vaultSection?.classList.remove("stage95-vault-unlocking");
      if (banner) banner.hidden = true;
      this.stage95VaultUnlockTimer = null;
      this.updateAllUI?.();
    }, 1050);
  };

  Game.selectVaultTerm = function (...args) {
    if (!this.isStage95VaultUnlocked()) return;
    return previousSelectVaultTerm.apply(this, args);
  };

  Game.canFundVault = function (...args) {
    if (!this.isStage95VaultUnlocked()) return false;
    return Boolean(previousCanFundVault.apply(this, args));
  };

  Game.depositVaultUnit = function (...args) {
    if (!this.isStage95VaultUnlocked()) return;
    return previousDepositVaultUnit.apply(this, args);
  };

  Game.renderVaultControls = function (...args) {
    if (!this.isStage95VaultUnlocked()) {
      if (this.vaultControls) this.vaultControls.innerHTML = "";
      return;
    }
    return previousRenderVaultControls.apply(this, args);
  };

  Game.applyStage95DeadlineInterest = function () {
    const rate = Number(GAME_DATA.economy.deadlineAccountRoundRate) || 0;
    const before = Math.max(0, Number(this.deadlinePaid) || 0);
    const interest = Math.max(0, Math.floor(before * rate));
    const after = before + interest;

    this.deadlinePaid = after;
    this.paymentCommitted = after;
    this.stage95PendingDeadlineInterest = { before, interest, after, rate };

    if (interest > 0) {
      EffectsManager.showCurrencyGain?.(this.deadlinePaidValue, interest);
      this.animateCurrency?.(this.deadlinePaidValue, before, after);
    }

    this.updateAllUI?.();
    return this.stage95PendingDeadlineInterest;
  };

  Game.describeVaultEvent = function (event) {
    const base = previousDescribeVaultEvent.call(this, event);
    const interest = this.stage95PendingDeadlineInterest;
    if (!interest || interest.interest <= 0) return base;

    const accountText = `마감 계좌 이자 ${Math.round(interest.rate * 100)}% · +$${interest.interest.toLocaleString("ko-KR")} · 잔액 $${interest.after.toLocaleString("ko-KR")}`;
    return event ? `${base} · ${accountText}` : accountText;
  };

  Game.resolveRound = async function (...args) {
    // 실제 플레이 라운드가 끝날 때만 마감 계좌 이자를 한 번 적용합니다.
    if (!this.finalPaymentPhase && this.roundStarted) {
      this.applyStage95DeadlineInterest();
    } else {
      this.stage95PendingDeadlineInterest = null;
    }

    try {
      return await previousResolveRound.apply(this, args);
    } finally {
      this.stage95PendingDeadlineInterest = null;
    }
  };

  Game.syncStage95FinalPaymentUI = function () {
    if (!this.finalPaymentPhase) return;

    const target = Math.max(0, Number(this.deadlineTarget) || 0);
    const balance = Math.max(0, Number(this.deadlinePaid) || 0);
    const remaining = Math.max(0, target - balance);

    if (this.flowEyebrow) this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} · 0라운드`;
    if (this.flowTitle) this.flowTitle.textContent = "최종 납부";
    if (this.flowText) this.flowText.textContent = `미납 금액 $${remaining.toLocaleString("ko-KR")}`;

    const panel = this.flowOptions?.querySelector(".final-payment-panel");
    if (panel) {
      const title = panel.querySelector("span");
      const value = panel.querySelector("strong");
      const wallet = panel.querySelector("small");
      if (title) title.textContent = "마감 계좌 · 누적 잔액";
      if (value) value.textContent = `$${balance.toLocaleString("ko-KR")} / $${target.toLocaleString("ko-KR")}`;
      if (wallet) wallet.textContent = `지갑 $${this.wallet.toLocaleString("ko-KR")} · 부족 $${remaining.toLocaleString("ko-KR")}`;
    }
  };

  Game.enterFinalPaymentPhase = function (...args) {
    const result = previousEnterFinalPaymentPhase.apply(this, args);
    this.syncStage95FinalPaymentUI();
    return result;
  };

  Game.depositDeadlineUnit = async function (...args) {
    const result = await previousDepositDeadlineUnit.apply(this, args);
    this.syncStage95FinalPaymentUI();
    return result;
  };

  Game.showDeadlineSuccess = function (settlement) {
    const unlockAt = Number(GAME_DATA.economy.vaultUnlockDeadline) || 3;
    const shouldUnlockVault = this.deadlineNumber === unlockAt - 1;

    if (shouldUnlockVault) this.stage95VaultUnlocking = true;
    const result = previousShowDeadlineSuccess.call(this, settlement);

    if (shouldUnlockVault) {
      requestAnimationFrame(() => this.playStage95VaultUnlock());
    }

    return result;
  };

  Game.advanceDeadline = function (...args) {
    // 기존 구현은 마감 이동 시 deadlinePaid를 0으로 만들기 때문에 현재 계좌 잔액을 보존합니다.
    const carriedBalance = Math.max(0, Number(this.deadlinePaid) || 0);
    const result = previousAdvanceDeadline.apply(this, args);

    this.deadlinePaid = carriedBalance;
    this.paymentCommitted = carriedBalance;
    this.stage95VaultUnlocking = false;
    this.applyStage95SymbolValues();
    this.updateAllUI?.();
    return result;
  };

  Game.applyStage95AccountCopy = function () {
    const label = this.deadlineAccountSection?.querySelector(".vault-heading .label");
    if (label) label.textContent = "마감 계좌 · 이자 10%";

    if (this.deadlineWarningCopy && !this.finalPaymentPhase) {
      const remaining = Math.max(0, this.deadlineTarget - this.deadlinePaid);
      if (remaining > 0) {
        this.deadlineWarningCopy.textContent = `목표까지 $${remaining.toLocaleString("ko-KR")} · 라운드 종료마다 잔액 +10%`;
      } else {
        this.deadlineWarningCopy.textContent = "목표 충족 · 잔액은 다음 마감으로 유지됩니다.";
      }
    }
  };

  Game.updateAllUI = function (...args) {
    previousUpdateAllUI.apply(this, args);
    this.applyStage95AccountCopy();
    this.updateStage95VaultAvailability();
    this.syncStage95FinalPaymentUI();
  };

  Game.init = function () {
    this.resetStage95State();
    this.applyStage95SymbolValues();
    document.body?.classList.add("stage95-visual-test");

    previousInit.call(this);

    this.ensureStage95VaultUnlockBanner();
    this.applyStage95AccountCopy();
    this.updateStage95VaultAvailability();
    this.stage = 9;
    this.status = "PERSISTENT_DEADLINE_ACCOUNT_VAULT_UNLOCK_ECONOMY_REBALANCE";
    this.stageStatus.textContent = this.roundPreparation
      ? "9단계 · 라운드 준비"
      : "9단계 · 경제 시스템";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.5 persistent deadline account / vault unlock loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage95State();
    const result = previousRestartRun.apply(this, args);
    this.deadlinePaid = 0;
    this.paymentCommitted = 0;
    this.applyStage95SymbolValues();
    document.body?.classList.add("stage95-visual-test");
    this.ensureStage95VaultUnlockBanner();
    this.updateAllUI?.();
    return result;
  };

  Game.applyStage95SymbolValues();
})();
