// DEADLINE — Stage 5.1 term vault layer
"use strict";

(() => {
  Game.stage = 5;
  Game.status = "TERM_VAULT";
  Game.vaultDeposit = null;
  Game.selectedVaultTerm = null;
  Game.lastSettlement = null;

  const baseInit = Game.init;
  const baseBind = Game.bindInputs;
  const baseSpin = Game.spin;
  const baseRestart = Game.restartRun;
  const baseUpdateAll = Game.updateAllUI;

  Game.init = function () {
    this.vaultStateBadge = document.querySelector("#vaultStateBadge");
    this.vaultStatusCopy = document.querySelector("#vaultStatusCopy");
    this.vaultPreview = document.querySelector("#vaultPreview");
    this.vaultTermButtons = [...document.querySelectorAll("[data-vault-term]")];
    this.vaultDeposit25Button = document.querySelector("#vaultDeposit25Button");
    this.vaultDeposit50Button = document.querySelector("#vaultDeposit50Button");
    this.vaultDepositAllButton = document.querySelector("#vaultDepositAllButton");
    this.earlyPaymentButton = document.querySelector("#earlyPaymentButton");

    baseInit.call(this);
    this.stageStatus.textContent = "STAGE 5 · TERM VAULT";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: term vault loaded.`);
  };

  Game.bindInputs = function () {
    baseBind.call(this);
    this.vaultTermButtons.forEach((button) => {
      button.addEventListener("click", () => this.selectVaultTerm(Number(button.dataset.vaultTerm)));
    });
    this.vaultDeposit25Button.addEventListener("click", () => this.openVaultDeposit(0.25));
    this.vaultDeposit50Button.addEventListener("click", () => this.openVaultDeposit(0.5));
    this.vaultDepositAllButton.addEventListener("click", () => this.openVaultDeposit(1));
    this.earlyPaymentButton.addEventListener("click", () => this.attemptEarlyPayment());
  };

  Game.spin = async function () {
    const p = baseSpin.call(this);
    this.updateFinancialControls();
    await p;
    this.updateFinancialControls();
  };

  Game.canUseEconomyControls = function () {
    return !(this.isSpinning || this.isResolvingRound || this.gameOver || this.runComplete || this.lastSettlement);
  };

  Game.canOpenVault = function () {
    return this.canUseEconomyControls() && !this.currentMode && !this.vaultDeposit;
  };

  Game.getVaultTerm = function (rounds) {
    return GAME_DATA.economy.vaultTerms[String(rounds)] || null;
  };

  Game.selectVaultTerm = function (rounds) {
    if (!this.canOpenVault() || !this.getVaultTerm(rounds)) return;
    this.selectedVaultTerm = rounds;
    this.updateFinancialControls();
  };

  Game.openVaultDeposit = function (ratio) {
    if (!this.canOpenVault() || !this.selectedVaultTerm || this.wallet <= 0) return;
    const term = this.getVaultTerm(this.selectedVaultTerm);
    const principal = ratio >= 1 ? this.wallet : Math.max(1, Math.floor(this.wallet * ratio));
    const amount = Math.min(this.wallet, principal);
    const maturityAmount = Math.round(amount * (1 + term.rate));

    this.wallet -= amount;
    this.bank = amount;
    this.vaultDeposit = {
      principal: amount,
      termRounds: term.rounds,
      roundsRemaining: term.rounds,
      rate: term.rate,
      ticketBonus: term.tickets,
      maturityAmount
    };
    this.selectedVaultTerm = null;
    this.readoutDetail.textContent = `금고 예치 $${amount.toLocaleString("ko-KR")} · ${term.rounds}R 잠금 · 만기 $${maturityAmount.toLocaleString("ko-KR")}`;
    this.updateAllUI();
  };

  Game.advanceVaultRound = function () {
    if (!this.vaultDeposit) return null;
    this.vaultDeposit.roundsRemaining -= 1;

    if (this.vaultDeposit.roundsRemaining > 0) {
      return { type: "TICK", ...this.vaultDeposit };
    }

    const matured = { ...this.vaultDeposit };
    this.wallet += matured.maturityAmount;
    this.tickets += matured.ticketBonus;
    this.bank = 0;
    this.vaultDeposit = null;
    EffectsManager.pulseWallet(this.walletValue);
    return { type: "MATURED", ...matured };
  };

  Game.describeVaultEvent = function (event) {
    if (!event) return "금고 변동 없음";
    if (event.type === "TICK") {
      return `금고 ${event.roundsRemaining}R 남음 · 만기 $${event.maturityAmount.toLocaleString("ko-KR")}`;
    }
    const profit = event.maturityAmount - event.principal;
    const ticket = event.ticketBonus ? ` · +${event.ticketBonus}T` : "";
    return `금고 만기 +$${event.maturityAmount.toLocaleString("ko-KR")} · 수익 +$${profit.toLocaleString("ko-KR")}${ticket}`;
  };

  Game.resolveRound = function () {
    const completedRound = this.round;
    const vaultEvent = this.advanceVaultRound();
    const vaultText = this.describeVaultEvent(vaultEvent);

    this.isResolvingRound = false;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();
    this.scoreBreakdown.textContent = `라운드 ${completedRound} 종료 · ${vaultText}`;
    this.readoutDetail.textContent = vaultText;

    // 마감 납부 시스템은 아직 기존 자동 정산 유지. 잠긴 금고 자금은 제외.
    if (this.wallet >= this.deadlineTarget) {
      this.settleDeadline("ROUND_END");
      return;
    }
    if (this.round < this.roundsPerDeadline) {
      this.round += 1;
      this.showRoundChoice(vaultText);
      return;
    }
    this.showGameOver();
  };

  Game.showRoundChoice = function (note = "") {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = false;
    this.spinButton.textContent = "회전";
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.updateAllUI();

    const normal = GAME_DATA.deadline.modes.NORMAL;
    const risk = GAME_DATA.deadline.modes.RISK;
    const locked = this.vaultDeposit
      ? ` · 금고 $${this.vaultDeposit.principal.toLocaleString("ko-KR")} / ${this.vaultDeposit.roundsRemaining}R 잠금`
      : "";

    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} · ROUND ${this.round} / ${this.roundsPerDeadline}`;
    this.flowTitle.textContent = "라운드 방식 선택";
    this.flowText.textContent = `목표 $${this.deadlineTarget.toLocaleString("ko-KR")} · 사용 가능 $${this.wallet.toLocaleString("ko-KR")}${locked}`;
    this.flowOptions.innerHTML = `
      <button class="flow-choice" data-action="start-round" data-mode="NORMAL">
        <span>${normal.name}</span><strong>${normal.spins} SPINS</strong>
        <small>티켓 +${normal.tickets} · 안정적인 선택</small>
      </button>
      <button class="flow-choice risk" data-action="start-round" data-mode="RISK">
        <span>${risk.name}</span><strong>${risk.spins} SPINS</strong>
        <small>티켓 +${risk.tickets} · 적은 회전, 높은 보상</small>
      </button>`;
    this.flowFooter.textContent = note
      ? `${note} · 금고는 왼쪽에서 라운드 시작 전에 설정 가능`
      : "금고는 왼쪽에서 라운드 시작 전에 설정할 수 있습니다.";
    this.openFlowOverlay();
    this.updateFinancialControls();
  };

  Game.getUnusedRoundCount = function (trigger) {
    if (trigger === "ROUND_END" || this.currentMode) return Math.max(0, this.roundsPerDeadline - this.round);
    return Math.max(0, this.roundsPerDeadline - this.round + 1);
  };

  Game.settleDeadline = function (trigger = "ROUND_END") {
    if (this.lastSettlement || this.wallet < this.deadlineTarget) return false;
    const target = this.deadlineTarget;
    this.wallet -= target;
    const unusedRounds = this.getUnusedRoundCount(trigger);
    const bonusTickets = unusedRounds * GAME_DATA.economy.earlyPaymentTicketPerUnusedRound;
    this.tickets += bonusTickets;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;
    this.lastSettlement = { trigger, target, unusedRounds, bonusTickets };
    this.updateAllUI();
    this.showDeadlineSuccess(this.lastSettlement);
    return true;
  };

  Game.attemptEarlyPayment = function () {
    if (!this.canUseEconomyControls() || this.wallet < this.deadlineTarget) return;
    this.settleDeadline("EARLY");
  };

  Game.showDeadlineSuccess = function (settlement) {
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 5 · DEADLINE SETTLED";
    const isLast = this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1;
    const label = settlement.trigger === "EARLY" ? "조기 상환" : "마감 정산";
    const bonus = settlement.bonusTickets ? `미사용 라운드 +${settlement.bonusTickets}T` : "미사용 라운드 보너스 없음";
    const locked = this.vaultDeposit ? ` · 금고 ${this.vaultDeposit.roundsRemaining}R 잠금 유지` : "";

    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} SETTLED`;
    this.flowTitle.textContent = `${label} 완료`;
    this.flowText.textContent = `$${settlement.target.toLocaleString("ko-KR")} 지갑에서 납부 · 잔액 $${this.wallet.toLocaleString("ko-KR")}${locked}`;

    if (isLast) {
      this.runComplete = true;
      this.flowOptions.innerHTML = `<button class="flow-primary" data-action="restart-run"><span>STAGE 5 LOOP CLEAR</span><strong>처음부터 다시 테스트</strong></button>`;
      this.flowFooter.textContent = `${bonus} · 최종 엔딩/Endless는 Stage 12에서 구현합니다.`;
    } else {
      const nextTarget = GAME_DATA.deadline.targets[this.deadlineIndex + 1];
      this.flowOptions.innerHTML = `<button class="flow-primary" data-action="next-deadline"><span>NEXT DEADLINE</span><strong>다음 목표 $${nextTarget.toLocaleString("ko-KR")}</strong></button>`;
      this.flowFooter.textContent = bonus;
    }
    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.showGameOver = function () {
    this.gameOver = true;
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "STAGE 5 · GAME OVER";
    const shortfall = Math.max(0, this.deadlineTarget - this.wallet);
    const locked = this.vaultDeposit ? ` · 금고 $${this.vaultDeposit.principal.toLocaleString("ko-KR")}는 ${this.vaultDeposit.roundsRemaining}R 잠금 상태` : "";
    this.flowEyebrow.textContent = `DEADLINE ${this.deadlineNumber} FAILED`;
    this.flowTitle.textContent = "GAME OVER";
    this.flowText.textContent = `사용 가능한 돈이 목표까지 $${shortfall.toLocaleString("ko-KR")} 부족합니다.${locked}`;
    this.flowOptions.innerHTML = `<button class="flow-primary danger" data-action="restart-run"><span>RESTART</span><strong>처음부터 다시 시작</strong></button>`;
    this.flowFooter.textContent = `${this.roundsPerDeadline}라운드를 모두 사용했습니다.`;
    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.advanceDeadline = function () {
    if (this.deadlineIndex >= GAME_DATA.deadline.targets.length - 1) return;
    this.deadlineIndex += 1;
    this.round = 1;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.isResolvingRound = false;
    this.lastSettlement = null;
    this.stageStatus.textContent = "STAGE 5 · TERM VAULT";
    this.updateAllUI();
    this.showRoundChoice();
  };

  Game.restartRun = function () {
    this.vaultDeposit = null;
    this.selectedVaultTerm = null;
    this.lastSettlement = null;
    this.bank = 0;
    baseRestart.call(this);
    this.stageStatus.textContent = "STAGE 5 · TERM VAULT";
    this.updateAllUI();
  };

  Game.updateEconomyUI = function (updateWalletText = true) {
    if (updateWalletText) this.walletValue.textContent = `$ ${this.wallet.toLocaleString("ko-KR")}`;
    this.bankValue.textContent = `$ ${(this.vaultDeposit?.principal || 0).toLocaleString("ko-KR")}`;
    const ratio = Math.min(1, this.wallet / this.deadlineTarget);
    this.progressFill.style.width = `${ratio * 100}%`;
    this.progressCopy.textContent = `$ ${this.wallet.toLocaleString("ko-KR")} / $ ${this.deadlineTarget.toLocaleString("ko-KR")}`;
  };

  Game.updateVaultUI = function () {
    if (!this.vaultStateBadge) return;
    const deposit = this.vaultDeposit;
    this.vaultTermButtons.forEach((button) => {
      const term = Number(button.dataset.vaultTerm);
      button.classList.toggle("is-selected", !deposit && this.selectedVaultTerm === term);
      button.disabled = !this.canOpenVault();
    });

    if (deposit) {
      const profit = deposit.maturityAmount - deposit.principal;
      const ticket = deposit.ticketBonus ? ` · +${deposit.ticketBonus}T` : "";
      this.vaultStateBadge.textContent = "LOCKED";
      this.vaultStateBadge.classList.add("is-locked");
      this.vaultStatusCopy.textContent = `남은 ${deposit.roundsRemaining} ROUND · +${Math.round(deposit.rate * 100)}%${ticket}`;
      this.vaultPreview.innerHTML = `만기 수령 <strong>$${deposit.maturityAmount.toLocaleString("ko-KR")}</strong> · 수익 +$${profit.toLocaleString("ko-KR")} · 중도출금 불가`;
      return;
    }

    this.vaultStateBadge.textContent = "READY";
    this.vaultStateBadge.classList.remove("is-locked");
    if (this.selectedVaultTerm) {
      const term = this.getVaultTerm(this.selectedVaultTerm);
      const ticket = term.tickets ? ` · 만기 +${term.tickets}T` : "";
      this.vaultStatusCopy.textContent = `${term.rounds}라운드 상품 선택됨`;
      this.vaultPreview.innerHTML = `<strong>${term.rounds} ROUND</strong> 잠금 · +${Math.round(term.rate * 100)}%${ticket} · 만기 전 사용 불가`;
    } else {
      this.vaultStatusCopy.textContent = "예치 없음 · 기간을 선택하세요.";
      this.vaultPreview.textContent = "예치 기간을 선택하면 예상 조건이 표시됩니다.";
    }
  };

  Game.updateFinancialControls = function () {
    const canDeposit = this.canOpenVault() && this.selectedVaultTerm && this.wallet > 0;
    this.vaultDeposit25Button.disabled = !canDeposit;
    this.vaultDeposit50Button.disabled = !canDeposit;
    this.vaultDepositAllButton.disabled = !canDeposit;

    const canPay = this.canUseEconomyControls() && this.wallet >= this.deadlineTarget;
    this.earlyPaymentButton.disabled = !canPay;
    if (canPay) {
      const bonus = this.getUnusedRoundCount("EARLY") * GAME_DATA.economy.earlyPaymentTicketPerUnusedRound;
      this.earlyPaymentButton.textContent = bonus ? `조기 상환 · 미사용 라운드 +${bonus}T` : "조기 상환";
    } else {
      this.earlyPaymentButton.textContent = "조기 상환";
    }
    this.updateVaultUI();
  };

  Game.updateAllUI = function () {
    baseUpdateAll.call(this);
    this.updateEconomyUI(true);
    this.updateFinancialControls();
  };
})();
