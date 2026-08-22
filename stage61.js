// DEADLINE — Stage 6.1 준비 화면 통합 / 7·3 리롤 선택 / 수동 상점 / 아이템 트레이
"use strict";

(() => {
  Game.stage = 6;
  Game.status = "ROUND_PREP_HUB";
  Game.roundPreparation = false;
  Game.selectedRoundModeId = null;
  Game.shopRoundKey = null;
  Game.selectedSellItemId = null;

  const previousInit = Game.init;
  const previousSpin = Game.spin;
  const previousUpdateFinanceVisualState = Game.updateFinanceVisualState;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousRestartRun = Game.restartRun;

  Game.init = function () {
    this.roundPreparation = false;
    this.selectedRoundModeId = null;
    this.shopRoundKey = null;
    this.selectedSellItemId = null;

    this.roundPrepPanel = document.querySelector("#roundPrepPanel");
    this.prepShopButton = document.querySelector("#prepShopButton");
    this.itemTray = document.querySelector("#itemTray");
    this.itemTrayCount = document.querySelector("#itemTrayCount");
    this.itemTraySlots = document.querySelector("#itemTraySlots");
    this.itemSellPopover = document.querySelector("#itemSellPopover");
    this.itemSellName = document.querySelector("#itemSellName");
    this.itemSellEffect = document.querySelector("#itemSellEffect");
    this.itemSellValue = document.querySelector("#itemSellValue");
    this.itemSellConfirm = document.querySelector("#itemSellConfirm");
    this.itemSellCancel = document.querySelector("#itemSellCancel");

    previousInit.call(this);

    this.roundPrepPanel?.addEventListener("click", (event) => {
      const modeButton = event.target.closest("button[data-prep-mode]");
      if (modeButton) {
        this.togglePreparedMode(modeButton.dataset.prepMode);
        return;
      }

      const shopButton = event.target.closest("#prepShopButton");
      if (shopButton) this.openPrepShop();
    });

    this.itemTraySlots?.addEventListener("click", (event) => {
      const itemButton = event.target.closest("button[data-item-instance]");
      if (!itemButton) return;
      this.openItemSellPopover(itemButton.dataset.itemInstance);
    });

    this.itemSellConfirm?.addEventListener("click", () => {
      if (!this.selectedSellItemId || !this.canSellItemsNow()) return;
      this.sellOwnedItem(this.selectedSellItemId);
      this.closeItemSellPopover();
    });

    this.itemSellCancel?.addEventListener("click", () => this.closeItemSellPopover());

    this.stageStatus.textContent = "6단계 · 라운드 준비";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 6.1 loaded.`);
  };

  Game.getRoundKey = function () {
    return `${this.deadlineIndex}:${this.round}`;
  };

  Game.isPrepFinanceOpen = function () {
    return Boolean(
      this.roundPreparation &&
      !this.selectedRoundModeId &&
      !this.shopOpen &&
      !this.finalPaymentPhase &&
      !this.gameOver &&
      !this.runComplete &&
      !this.lastSettlement &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      !this.flowOverlay.classList.contains("is-open")
    );
  };

  Game.showRoundChoice = function (note = "") {
    this.roundPreparation = true;
    this.selectedRoundModeId = null;
    this.awaitingRoundStart = false;
    this.pendingModeTickets = 0;
    this.roundStarted = false;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.shopOpen = false;
    this.shopContinuation = null;
    this.paymentCommitted = this.deadlinePaid;

    if (!this.vaultDeposit) this.selectedVaultTerm = null;

    this.flowOptions.classList.remove("shop-layout", "mode-only", "has-vault-setup");
    this.closeFlowOverlay();
    this.closeItemSellPopover();

    this.stageStatus.textContent = "6단계 · 라운드 준비";
    this.spinButton.textContent = "시작";
    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.scoreBreakdown.textContent = `라운드 ${this.round} 준비`;
    this.readoutDetail.textContent = note || "납부 · 금고 · 상점을 정리한 뒤 리롤 횟수를 선택하세요.";

    this.updateAllUI();
  };

  Game.togglePreparedMode = function (modeId) {
    if (
      !this.roundPreparation ||
      this.shopOpen ||
      this.finalPaymentPhase ||
      this.roundStarted ||
      this.gameOver ||
      this.runComplete ||
      this.lastSettlement
    ) return;

    const mode = GAME_DATA.deadline.modes[modeId];
    if (!mode) return;

    if (this.selectedRoundModeId === modeId) {
      this.selectedRoundModeId = null;
      this.readoutDetail.textContent = "리롤 선택 취소 · 납부와 금고를 다시 사용할 수 있습니다.";
    } else {
      this.selectedRoundModeId = modeId;
      this.readoutDetail.textContent = `${mode.spins}회 리롤 선택 · 시작을 누르면 확정됩니다.`;
    }

    this.updateAllUI();
  };

  Game.canPayDeadline = function () {
    if (
      this.isSpinning ||
      this.isResolvingRound ||
      this.gameOver ||
      this.runComplete ||
      this.lastSettlement
    ) return false;

    if (this.finalPaymentPhase) return true;
    return this.isPrepFinanceOpen();
  };

  Game.selectVaultTerm = function (rounds) {
    if (
      !this.isPrepFinanceOpen() ||
      this.vaultDeposit ||
      !this.getVaultTerm(rounds)
    ) return;

    this.selectedVaultTerm = rounds;
    this.updateAllUI();
  };

  Game.canFundVault = function () {
    if (!this.isPrepFinanceOpen()) return false;
    if (this.vaultDeposit) return this.vaultDeposit.state === "FUNDING";
    return Boolean(this.selectedVaultTerm);
  };

  Game.renderVaultControls = function () {
    if (!this.vaultControls) return;

    const deposit = this.vaultDeposit;
    if (deposit?.state === "LOCKED") {
      this.vaultControls.innerHTML = "";
      return;
    }

    const prepOpen = this.isPrepFinanceOpen();
    const funding = deposit?.state === "FUNDING" ? deposit : null;
    const selectedTerm = funding?.termRounds || this.selectedVaultTerm;
    const unit = funding?.depositUnit || this.getDepositUnit();
    const currentAmount = funding?.currentAmount || 0;
    const canDeposit = prepOpen && this.canFundVault() && this.wallet >= unit;
    const termDisabled = !prepOpen || Boolean(funding);

    this.vaultControls.innerHTML = `
      <div class="vault-inline-term-grid">
        <button class="vault-inline-term ${selectedTerm === 2 ? "is-selected" : ""}"
          data-sidebar-vault-term="2" ${termDisabled ? "disabled" : ""}>
          <strong>2라운드</strong><small>15% · 15% · 티켓 +1</small>
        </button>
        <button class="vault-inline-term ${selectedTerm === 4 ? "is-selected" : ""}"
          data-sidebar-vault-term="4" ${termDisabled ? "disabled" : ""}>
          <strong>4라운드</strong><small>15% · 15% · 25% · 25%</small>
        </button>
      </div>
      <div class="vault-inline-meta">
        <span>예치 단위 <strong>$${unit.toLocaleString("ko-KR")}</strong></span>
        <span>현재 예치금 <strong>$${currentAmount.toLocaleString("ko-KR")}</strong></span>
      </div>
      <button class="vault-inline-deposit" data-sidebar-vault-deposit="1"
        ${!selectedTerm || !canDeposit ? "disabled" : ""}>예치</button>
    `;
  };

  Game.beginPreparedRound = function () {
    if (
      !this.roundPreparation ||
      !this.selectedRoundModeId ||
      this.shopOpen ||
      this.finalPaymentPhase ||
      this.roundStarted ||
      this.gameOver ||
      this.runComplete ||
      this.flowOverlay.classList.contains("is-open")
    ) return;

    const mode = GAME_DATA.deadline.modes[this.selectedRoundModeId];
    if (!mode) return;

    if (this.vaultDeposit?.state === "FUNDING") {
      this.lockVaultFunding();
    } else if (!this.vaultDeposit) {
      this.selectedVaultTerm = null;
    }

    this.currentMode = mode;
    this.spinsTotal = mode.spins;
    this.spinsRemaining = mode.spins;
    this.tickets += mode.tickets;
    this.paymentCommitted = this.deadlinePaid;
    this.roundPreparation = false;
    this.roundStarted = true;
    this.awaitingRoundStart = false;
    this.pendingModeTickets = 0;

    this.clearScoreDisplay();
    this.stageStatus.textContent = "6단계 · 라운드 진행";
    this.scoreBreakdown.textContent = `${mode.spins}회 리롤 · 티켓 +${mode.tickets}`;
    this.readoutDetail.textContent = `${mode.name} · 리롤 ${mode.spins}회`;
    this.spinButton.textContent = "리롤";
    this.spinButton.disabled = false;
    this.patternTestButton.disabled = false;
    this.closeItemSellPopover();
    this.updateAllUI();
  };

  Game.spin = async function () {
    if (this.roundPreparation) {
      if (this.selectedRoundModeId && !this.shopOpen) this.beginPreparedRound();
      return;
    }

    if (this.shopOpen) return;
    return previousSpin.call(this);
  };

  Game.openPrepShop = function () {
    if (
      !this.roundPreparation ||
      this.finalPaymentPhase ||
      this.roundStarted ||
      this.gameOver ||
      this.runComplete ||
      this.lastSettlement
    ) return;

    const key = this.getRoundKey();
    if (this.shopRoundKey !== key) {
      this.shopRoundKey = key;
      this.shopRerollCount = 0;
      this.generateShopOffers();
    } else if (!this.shopOffers.length) {
      this.generateShopOffers();
    }

    this.shopOpen = true;
    this.shopContinuation = null;
    this.stageStatus.textContent = "6단계 · 상점";
    this.flowOptions.classList.remove("mode-only", "has-vault-setup");
    this.flowOptions.classList.add("shop-layout");
    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} · 라운드 ${this.round}`;
    this.flowTitle.textContent = "상점";
    this.flowFooter.textContent = "";
    this.renderShop();
    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.showShop = function () {
    this.openPrepShop();
  };

  Game.renderShop = function () {
    if (!this.shopOpen) return;

    const maxOwned = GAME_DATA.shop.maxOwnedItems;
    const isFull = this.ownedItems.length >= maxOwned;
    const rerollCost = this.getShopRerollCost();

    this.flowText.textContent = `티켓 ${this.tickets} · 보유 ${this.ownedItems.length} / ${maxOwned}`;

    const offerHTML = this.shopOffers.map((offer, index) => {
      const cannotBuy = offer.sold || isFull || this.tickets < offer.price;
      const stateText = offer.sold
        ? "구매 완료"
        : isFull
          ? "보유 한도"
          : `${offer.price}T`;

      return `
        <button class="shop-offer-card ${offer.sold ? "is-sold" : ""}"
          data-shop-action="buy" data-offer-index="${index}" ${cannotBuy ? "disabled" : ""}>
          <span class="shop-offer-kicker">아이템</span>
          <strong>${offer.name}</strong>
          <small>${offer.note}</small>
          <b>${stateText}</b>
        </button>
      `;
    }).join("");

    this.flowOptions.innerHTML = `
      <section class="shop-offers-section shop-offers-only">
        <div class="shop-section-heading">
          <span>오늘의 제안</span>
          <strong>4개</strong>
        </div>
        <div class="shop-offer-grid">${offerHTML}</div>
      </section>
      <div class="shop-actions">
        <button class="shop-reroll" data-shop-action="reroll" ${this.tickets < rerollCost ? "disabled" : ""}>
          제안 새로고침 · ${rerollCost}T
        </button>
        <button class="shop-continue" data-shop-action="continue">닫기</button>
      </div>
    `;
  };

  Game.continueFromShop = function () {
    if (!this.shopOpen) return;
    this.shopOpen = false;
    this.shopContinuation = null;
    this.flowOptions.classList.remove("shop-layout");
    this.closeFlowOverlay();
    this.stageStatus.textContent = "6단계 · 라운드 준비";
    this.updateAllUI();
  };

  Game.resolveRound = async function () {
    const completedRound = this.round;
    const vaultEvent = this.advanceVaultRound();
    const vaultText = this.describeVaultEvent(vaultEvent);

    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.awaitingRoundStart = false;
    this.roundStarted = false;
    this.roundPreparation = false;
    this.selectedRoundModeId = null;
    this.pendingModeTickets = 0;
    this.updateAllUI();

    this.scoreBreakdown.textContent = `라운드 ${completedRound} 종료 · ${vaultText}`;
    this.readoutDetail.textContent = vaultText;

    await this.animateVaultEvent(vaultEvent);
    this.isResolvingRound = false;
    this.updateAllUI();

    if (this.deadlinePaid >= this.deadlineTarget) {
      this.settleDeadline("ROUND_END");
      return;
    }

    if (completedRound < this.roundsPerDeadline) {
      this.round = completedRound + 1;
      this.showRoundChoice(vaultText);
      return;
    }

    // 마지막 3라운드 뒤에는 상점 없이 즉시 0라운드/게임오버 판정으로 갑니다.
    this.showGameOver();
  };

  Game.canSellItemsNow = function () {
    return Boolean(
      (this.roundPreparation || this.shopOpen) &&
      !this.finalPaymentPhase &&
      !this.roundStarted &&
      !this.gameOver &&
      !this.runComplete
    );
  };

  Game.openItemSellPopover = function (instanceId) {
    const item = this.ownedItems.find((entry) => entry.instanceId === instanceId);
    if (!item || !this.itemSellPopover) return;

    this.selectedSellItemId = instanceId;
    const sellValue = this.getItemSellValue(item);
    this.itemSellName.textContent = item.name;
    this.itemSellEffect.textContent = item.note || "효과 준비 중";
    this.itemSellValue.textContent = `판매 +${sellValue}T`;
    this.itemSellConfirm.textContent = `판매 +${sellValue}T`;
    this.itemSellConfirm.disabled = !this.canSellItemsNow();
    this.itemSellPopover.hidden = false;
  };

  Game.closeItemSellPopover = function () {
    this.selectedSellItemId = null;
    if (this.itemSellPopover) this.itemSellPopover.hidden = true;
  };

  Game.renderOwnedItemsDrawer = function () {
    if (!this.itemTraySlots) return;

    const maxOwned = GAME_DATA.shop.maxOwnedItems;
    if (this.itemTrayCount) {
      this.itemTrayCount.textContent = `${this.ownedItems.length} / ${maxOwned}`;
    }

    this.itemTraySlots.innerHTML = Array.from({ length: maxOwned }, (_, index) => {
      const item = this.ownedItems[index];
      if (!item) return `<div class="item-tray-slot is-empty" aria-hidden="true"></div>`;

      const tooltip = `${item.name} · ${item.note || "효과 준비 중"}`;
      return `
        <button class="item-tray-slot" data-item-instance="${item.instanceId}"
          data-tooltip="${tooltip}" aria-label="${item.name}">
          <strong>${item.name.slice(0, 2)}</strong>
        </button>
      `;
    }).join("");
  };

  Game.updateFinanceVisualState = function () {
    previousUpdateFinanceVisualState.call(this);

    const prepUnlocked = this.isPrepFinanceOpen();
    const prepSelected = Boolean(
      this.roundPreparation &&
      this.selectedRoundModeId &&
      !this.shopOpen &&
      !this.finalPaymentPhase
    );
    const prepShopLocked = Boolean(this.roundPreparation && this.shopOpen);
    const runningLocked = Boolean(this.currentMode && this.roundStarted && !this.finalPaymentPhase);
    const financeLocked = prepSelected || prepShopLocked || runningLocked;

    this.deadlineAccountSection?.classList.toggle("is-prep-open", prepUnlocked);
    this.deadlineAccountSection?.classList.toggle("is-round-locked", financeLocked);
    this.deadlineAccountSection?.classList.remove("is-mode-selecting");

    this.vaultSection?.classList.toggle(
      "is-prep-open",
      prepUnlocked && this.vaultDeposit?.state !== "LOCKED"
    );
    this.vaultSection?.classList.toggle(
      "is-round-locked",
      financeLocked || this.vaultDeposit?.state === "LOCKED" || this.finalPaymentPhase
    );
    this.vaultSection?.classList.remove("is-mode-selecting");

    if (this.vaultLockState && this.roundPreparation) {
      if (this.vaultDeposit?.state === "LOCKED") this.vaultLockState.textContent = "잠김";
      else if (prepUnlocked) this.vaultLockState.textContent = this.vaultDeposit?.state === "FUNDING" ? "준비" : "열림";
      else this.vaultLockState.textContent = "잠김";
    }

    const prepActive = Boolean(this.roundPreparation && !this.finalPaymentPhase && !this.gameOver && !this.runComplete);
    this.machinePanel?.classList.toggle("is-round-prep", prepActive);
    this.machinePanel?.classList.toggle("is-awaiting-start", prepActive);
    this.machinePanel?.classList.toggle("round-prep-active", prepActive);
    this.machinePanel?.classList.toggle("has-mode-selection", Boolean(prepActive && this.selectedRoundModeId));

    if (this.roundPrepPanel) this.roundPrepPanel.hidden = !prepActive;
    if (this.prepShopButton) {
      this.prepShopButton.disabled = !prepActive || this.shopOpen;
    }

    this.roundPrepPanel?.querySelectorAll("button[data-prep-mode]").forEach((button) => {
      const selected = button.dataset.prepMode === this.selectedRoundModeId;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.disabled = !prepActive || this.shopOpen;
    });
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);

    if (this.roundPreparation && !this.finalPaymentPhase && !this.shopOpen) {
      this.spinButton.textContent = "시작";
      this.spinButton.disabled = !this.selectedRoundModeId;
      this.patternTestButton.disabled = true;
      this.spinStatus.textContent = this.selectedRoundModeId ? "시작 대기" : "준비";

      const selectedMode = this.selectedRoundModeId
        ? GAME_DATA.deadline.modes[this.selectedRoundModeId]
        : null;
      if (selectedMode) this.modeStatus.textContent = `${selectedMode.spins}회 선택`;
    }

    if (this.currentMode && this.roundStarted && !this.isSpinning && !this.isResolvingRound) {
      this.spinButton.textContent = "리롤";
    }

    if (this.shopOpen) {
      this.spinButton.disabled = true;
      this.patternTestButton.disabled = true;
      this.spinStatus.textContent = "상점";
    }

    this.updateFinanceVisualState();
    this.renderVaultControls();
    this.renderOwnedItemsDrawer();
  };

  Game.advanceDeadline = function () {
    this.roundPreparation = false;
    this.selectedRoundModeId = null;
    this.shopRoundKey = null;
    this.closeItemSellPopover();
    previousAdvanceDeadline.call(this);
  };

  Game.restartRun = function () {
    this.roundPreparation = false;
    this.selectedRoundModeId = null;
    this.shopRoundKey = null;
    this.selectedSellItemId = null;
    previousRestartRun.call(this);
  };
})();
