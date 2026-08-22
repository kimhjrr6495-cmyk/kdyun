// DEADLINE — v0.9.9 final Stage 9 UI polish / round escrow / SHINY layout
"use strict";

(() => {
  GAME_DATA.version = "v0.9.9";
  GAME_DATA.stage = 9;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousBeginPreparedRound = Game.beginPreparedRound;
  const previousResolveRound = Game.resolveRound;
  const previousEvaluateAndRenderScore = Game.evaluateAndRenderScore;
  const previousPlaySinglePatternImpact = Game.playSinglePatternImpact;
  const previousPlayTriggerActivation = Game.playTriggerActivation;
  const previousCreditStage90CashBonus = Game.creditStage90CashBonus;
  const previousOpenItemSellPopover = Game.openItemSellPopover;
  const previousRenderVaultControls = Game.renderVaultControls;
  const previousShowStage90Event = Game.showStage90Event;
  const previousDescribeVaultEvent = Game.describeVaultEvent;

  Game.resetStage99State = function () {
    this.stage99RoundEscrow = 0;
    this.stage99SpinEscrowBase = 0;
    this.stage99ProjectedSpinTotal = 0;
    this.stage99EscrowCapture = false;
    this.stage99TransferBusy = false;
  };

  Game.ensureStage99RoundWallet = function () {
    this.stage99RoundWallet = document.querySelector("#stage99RoundWallet");
    this.stage99RoundWalletValue = document.querySelector("#stage99RoundWalletValue");
    return this.stage99RoundWallet;
  };

  Game.updateStage99RoundWalletUI = function () {
    this.ensureStage99RoundWallet();
    if (this.stage99RoundWalletValue && !this.stage99EscrowCapture && !this.stage99TransferBusy) {
      this.stage99RoundWalletValue.textContent = `$ ${Math.max(0, Number(this.stage99RoundEscrow) || 0).toLocaleString("ko-KR")}`;
    }
  };

  Game.formatStage99TicketText = function (value) {
    return String(value ?? "")
      .replace(/티켓\s*([+-])\s*(\d+)/g, "🎟️ $1$2")
      .replace(/\bT\s*(\d+)/g, "🎟️ $1")
      .replace(/([+-]?)\s*(\d+)\s*T(?![A-Za-z])/g, (_, sign, count) => `${sign || ""}🎟️ ${count}`);
  };

  Game.applyStage99TicketNotation = function (root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const next = this.formatStage99TicketText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  };

  Game.applyStage99StaticTicketUI = function () {
    const ticketIcon = document.querySelector(".wallet-ticket-value span");
    if (ticketIcon) ticketIcon.textContent = "🎟️";

    this.roundPrepPanel?.querySelectorAll("button[data-prep-mode]").forEach((button) => {
      const mode = GAME_DATA.deadline.modes?.[button.dataset.prepMode];
      const small = button.querySelector("small");
      if (small && mode) small.textContent = `🎟️ +${mode.tickets}`;
    });

    const devTicket = document.querySelector("#devTicketButton");
    if (devTicket) devTicket.textContent = "TEST +🎟️5";

    const buyValue = document.querySelector("#itemBuyValue");
    const sellValue = document.querySelector("#itemSellValue");
    if (buyValue && /^T\b/.test(buyValue.textContent.trim())) buyValue.textContent = "🎟️ 0";
    if (sellValue && /^T\b/.test(sellValue.textContent.trim())) sellValue.textContent = "🎟️ 1";
  };

  Game.applyStage99AccountUI = function () {
    const label = this.deadlineAccountSection?.querySelector(".vault-heading .label");
    if (label) label.textContent = "마감 계좌";

    if (this.progressCopy) this.progressCopy.hidden = true;
    if (this.deadlineWarningCopy) this.deadlineWarningCopy.hidden = true;

    const values = this.deadlineAccountSection?.querySelector(".deadline-account-values");
    if (values) {
      const charCount = `${Math.max(0, Number(this.deadlinePaid) || 0).toLocaleString("ko-KR")}/${Math.max(0, Number(this.deadlineTarget) || 0).toLocaleString("ko-KR")}`.length;
      values.classList.toggle("stage99-money-long", charCount >= 15);
      values.classList.toggle("stage99-money-very-long", charCount >= 21);
    }
  };

  Game.renderShop = function () {
    if (!this.shopOpen) return;

    const maxOwned = this.getMaxOwnedItems();
    const isFull = this.ownedItems.length >= maxOwned;
    const rerollCost = this.getShopRerollCost();
    const canReroll = rerollCost === 0 || this.wallet >= rerollCost;

    this.flowText.innerHTML = `
      <span class="shop-ticket-balance">🎟️ ${this.tickets}</span>
      <span class="stage96-shop-wallet">지갑 $${this.wallet.toLocaleString("ko-KR")}</span>
      <span class="shop-owned-count">보유 ${this.ownedItems.length} / ${maxOwned} · 이번 마감 리롤 ${this.stage96DeadlineShopRerolls || 0}회</span>
    `;

    const offerHTML = (this.shopOffers || []).map((offer, index) => {
      const instant = this.isStage90InstantItem(offer);
      const cannotBuy = offer.sold || (!instant && isFull) || this.tickets < offer.price;
      const stateText = offer.sold ? "구매 완료" : (!instant && isFull) ? "보유 한도" : `🎟️ ${offer.price}`;
      const rarity = offer.rarity || "COMMON";
      const rarityLabel = GAME_DATA.rarities?.[rarity]?.label || rarity;
      const trait = this.getStage96ShinyTrait?.(offer) || null;

      return `
        <button class="shop-offer-card stage99-offer-card rarity-${rarity.toLowerCase()} ${trait ? "is-shiny" : ""} ${offer.sold ? "is-sold" : ""}"
          data-shop-action="buy" data-offer-index="${index}" ${cannotBuy ? "disabled" : ""}>
          <div class="stage99-card-topline">
            <span class="stage99-rarity-label">${rarityLabel}</span>
            <span class="stage99-shiny-label ${trait ? "" : "is-empty"}">${trait ? "✨ SHINY" : ""}</span>
          </div>
          <div class="stage99-card-content">
            <div class="stage99-card-base">
              <span class="shop-item-mark" aria-hidden="true">${offer.icon || "◆"}</span>
              <strong>${offer.name}</strong>
              <small>${this.formatStage99TicketText(offer.note || "")}</small>
            </div>
            <div class="stage99-trait-panel ${trait ? "" : "is-empty"}">
              ${trait ? `<span>부가 효과</span><strong>${trait.icon} ${trait.name}</strong><small>${this.formatStage99TicketText(trait.note)}</small>` : ""}
            </div>
          </div>
          <b class="stage99-card-price">${stateText}</b>
        </button>
      `;
    }).join("");

    const ownedHTML = Array.from({ length: maxOwned }, (_, index) => {
      const item = this.ownedItems[index];
      if (!item) return `<div class="shop-owned-card is-empty"><span>빈 슬롯</span></div>`;
      const sellValue = this.getItemSellValue(item);
      const rarity = item.rarity || "COMMON";
      const trait = this.getStage96ShinyTrait?.(item) || null;
      return `
        <button class="shop-owned-card rarity-${rarity.toLowerCase()} ${trait ? "is-shiny" : ""}" data-shop-owned-item="${item.instanceId}" type="button">
          ${trait ? `<span class="shop-shiny-mini">✨ ${trait.name}</span>` : ""}
          <span class="shop-owned-mark" aria-hidden="true">${item.icon || "◆"}</span>
          <div><strong>${item.name}</strong><small>${this.formatStage99TicketText(this.getItemDisplayNote(item))}</small></div>
          <b>판매 🎟️ ${sellValue}</b>
        </button>
      `;
    }).join("");

    const nextRatio = Math.round(((Number(GAME_DATA.shop.rerollBaseTargetRatio) || 0.15) + (Number(GAME_DATA.shop.rerollStepTargetRatio) || 0.05) * (this.stage96DeadlineShopRerolls || 0)) * 100);
    this.flowOptions.innerHTML = `
      <section class="shop-main-section">
        <div class="shop-section-heading shop-main-heading stage99-shop-heading">
          <div><span>아이템 제안 · ${this.shopOffers.length}개</span><small>SHINY 기본 4% · 다음 기준 ${nextRatio}%</small></div>
          <button class="shop-reroll-compact stage96-coin-reroll" data-shop-action="reroll" ${canReroll ? "" : "disabled"}>
            ↻ 새로고침 · ${rerollCost === 0 ? "무료" : `$${rerollCost.toLocaleString("ko-KR")}`}
          </button>
        </div>
        <div class="shop-offer-grid">${offerHTML}</div>
      </section>
      <section class="shop-owned-panel">
        <div class="shop-section-heading">
          <div><span>보유 아이템</span><small>구매 🎟️ · 새로고침 지갑 코인</small></div>
          <strong>${this.ownedItems.length} / ${maxOwned}</strong>
        </div>
        <div class="shop-owned-large-grid">${ownedHTML}</div>
      </section>
    `;
  };

  Game.openItemSellPopover = function (instanceId) {
    const result = previousOpenItemSellPopover.call(this, instanceId);
    const item = (this.ownedItems || []).find((entry) => entry.instanceId === instanceId);
    if (!item || !this.itemSellPopover || this.itemSellPopover.hidden) return result;

    const sellValue = this.getItemSellValue(item);
    const buyValue = document.querySelector("#itemBuyValue");
    if (buyValue) buyValue.textContent = `🎟️ ${item.price || 0}`;
    if (this.itemSellValue) this.itemSellValue.textContent = `🎟️ ${sellValue}`;
    if (this.itemSellConfirm) this.itemSellConfirm.textContent = `판매 +🎟️ ${sellValue}`;
    this.applyStage99TicketNotation(this.itemSellPopover);
    return result;
  };

  Game.renderVaultControls = function (...args) {
    const result = previousRenderVaultControls.apply(this, args);
    this.applyStage99TicketNotation(this.vaultControls);
    return result;
  };

  Game.showStage90Event = function (kind, title, detail) {
    return previousShowStage90Event.call(
      this,
      kind,
      this.formatStage99TicketText(title),
      this.formatStage99TicketText(detail)
    );
  };

  Game.describeVaultEvent = function (...args) {
    return this.formatStage99TicketText(previousDescribeVaultEvent.apply(this, args));
  };

  Game.beginPreparedRound = function (...args) {
    this.stage99RoundEscrow = 0;
    this.stage99ProjectedSpinTotal = 0;
    const result = previousBeginPreparedRound.apply(this, args);
    this.updateStage99RoundWalletUI();
    if (this.currentMode && this.roundStarted) {
      this.scoreBreakdown.textContent = `${this.currentMode.spins}회 리롤 · 🎟️ +${this.currentMode.tickets}`;
    }
    this.applyStage99StaticTicketUI();
    return result;
  };

  Game.playSinglePatternImpact = async function (pattern, index, total, timing, runningTotal, oldWallet, creditWallet) {
    if (!creditWallet || !this.stage99EscrowCapture) {
      return previousPlaySinglePatternImpact.call(this, pattern, index, total, timing, runningTotal, oldWallet, creditWallet);
    }

    const projectedFrom = this.stage99SpinEscrowBase + runningTotal;
    const projectedTo = projectedFrom + Math.max(0, Number(pattern?.amount) || 0);
    this.stage99ProjectedSpinTotal = Math.max(this.stage99ProjectedSpinTotal, runningTotal + (Number(pattern?.amount) || 0));

    const settlement = previousPlaySinglePatternImpact.call(this, pattern, index, total, timing, runningTotal, oldWallet, false);
    const escrowAnimation = this.stage99RoundWalletValue
      ? EffectsManager.animateNumber(this.stage99RoundWalletValue, projectedFrom, projectedTo, { duration: timing.count, prefix: "$ " })
      : Promise.resolve();

    const [nextTotal] = await Promise.all([settlement, escrowAnimation]);
    return nextTotal;
  };

  Game.playTriggerActivation = async function (item, bonus, eventDepth, context, runningTotal, oldWallet, creditWallet) {
    if (!creditWallet || !this.stage99EscrowCapture) {
      return previousPlayTriggerActivation.call(this, item, bonus, eventDepth, context, runningTotal, oldWallet, creditWallet);
    }

    const projectedFrom = this.stage99SpinEscrowBase + runningTotal;
    const projectedTo = projectedFrom + Math.max(0, Number(bonus) || 0);
    this.stage99ProjectedSpinTotal = Math.max(this.stage99ProjectedSpinTotal, runningTotal + (Number(bonus) || 0));

    const settlement = previousPlayTriggerActivation.call(this, item, bonus, eventDepth, context, runningTotal, oldWallet, false);
    const escrowAnimation = this.stage99RoundWalletValue
      ? EffectsManager.animateNumber(this.stage99RoundWalletValue, projectedFrom, projectedTo, { duration: context.triggerCount > 5 ? 100 : 145, prefix: "$ " })
      : Promise.resolve();

    const [nextTotal] = await Promise.all([settlement, escrowAnimation]);
    return nextTotal;
  };

  Game.creditStage90CashBonus = async function (label, amount, runningTotal, oldWallet, creditWallet) {
    if (!creditWallet || !this.stage99EscrowCapture) {
      return previousCreditStage90CashBonus.call(this, label, amount, runningTotal, oldWallet, creditWallet);
    }

    const rounded = Math.max(0, Math.round(Number(amount) || 0));
    const projectedFrom = this.stage99SpinEscrowBase + runningTotal;
    const projectedTo = projectedFrom + rounded;
    this.stage99ProjectedSpinTotal = Math.max(this.stage99ProjectedSpinTotal, runningTotal + rounded);

    const settlement = previousCreditStage90CashBonus.call(this, label, amount, runningTotal, oldWallet, false);
    const escrowAnimation = this.stage99RoundWalletValue
      ? EffectsManager.animateNumber(this.stage99RoundWalletValue, projectedFrom, projectedTo, { duration: 150, prefix: "$ " })
      : Promise.resolve();

    const [nextTotal] = await Promise.all([settlement, escrowAnimation]);
    return nextTotal;
  };

  Game.evaluateAndRenderScore = async function (options = {}) {
    const creditWallet = Boolean(options.creditWallet);
    if (!creditWallet) return previousEvaluateAndRenderScore.call(this, options);

    this.ensureStage99RoundWallet();
    const walletBefore = Math.max(0, Number(this.wallet) || 0);
    const escrowBefore = Math.max(0, Number(this.stage99RoundEscrow) || 0);
    this.stage99EscrowCapture = true;
    this.stage99SpinEscrowBase = escrowBefore;
    this.stage99ProjectedSpinTotal = 0;

    try {
      const total = await previousEvaluateAndRenderScore.call(this, options);
      const finalGain = Math.max(0, Math.round(Number(total) || 0));
      const projected = Math.max(0, Number(this.stage99ProjectedSpinTotal) || 0);

      // Older scoring layers still finish by assigning the payout to wallet.
      // Restore the real wallet immediately and keep the payout in round escrow instead.
      this.wallet = walletBefore;

      if (this.stage99RoundWalletValue && finalGain > projected) {
        await EffectsManager.animateNumber(
          this.stage99RoundWalletValue,
          escrowBefore + projected,
          escrowBefore + finalGain,
          { duration: 170, prefix: "$ " }
        );
      }

      this.stage99RoundEscrow = escrowBefore + finalGain;
      this.stage99EscrowCapture = false;
      this.updateEconomyUI?.(false);
      this.updateStage99RoundWalletUI();
      return total;
    } finally {
      this.wallet = walletBefore;
      this.stage99EscrowCapture = false;
      this.stage99SpinEscrowBase = 0;
      this.stage99ProjectedSpinTotal = 0;
      this.updateEconomyUI?.(false);
      this.updateStage99RoundWalletUI();
    }
  };

  Game.showStage99WalletGainFloat = function (amount) {
    const host = document.querySelector(".wallet-section");
    if (!host || amount <= 0) return;

    const float = document.createElement("div");
    float.className = "stage99-wallet-gain-float";
    float.textContent = `+$${amount.toLocaleString("ko-KR")}`;
    host.appendChild(float);
    window.setTimeout(() => float.remove(), 1050);
  };

  Game.playStage99WalletTransfer = function (amount) {
    if (!this.stage99RoundWallet || !this.walletValue || amount <= 0) return Promise.resolve();

    const from = this.stage99RoundWallet.getBoundingClientRect();
    const to = this.walletValue.getBoundingClientRect();
    const fx = document.createElement("div");
    fx.className = "stage99-wallet-transfer-fx";
    fx.textContent = `+$${amount.toLocaleString("ko-KR")}`;
    fx.style.left = `${from.left + from.width / 2}px`;
    fx.style.top = `${from.top + from.height / 2}px`;
    fx.style.setProperty("--stage99-transfer-x", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
    fx.style.setProperty("--stage99-transfer-y", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
    document.body.appendChild(fx);
    requestAnimationFrame(() => fx.classList.add("is-flying"));

    return new Promise((resolve) => {
      window.setTimeout(() => {
        fx.remove();
        this.showStage99WalletGainFloat(amount);
        resolve();
      }, 540);
    });
  };

  Game.transferStage99RoundEscrow = async function () {
    const amount = Math.max(0, Math.round(Number(this.stage99RoundEscrow) || 0));
    if (amount <= 0 || this.stage99TransferBusy) return 0;

    this.stage99TransferBusy = true;
    this.ensureStage99RoundWallet();

    const before = Math.max(0, Number(this.wallet) || 0);
    const after = before + amount;
    const fly = this.playStage99WalletTransfer(amount);
    const roundAnim = this.stage99RoundWalletValue
      ? EffectsManager.animateNumber(this.stage99RoundWalletValue, amount, 0, { duration: 430, prefix: "$ " })
      : Promise.resolve();
    const walletAnim = this.walletValue
      ? EffectsManager.animateNumber(this.walletValue, before, after, { duration: 500, prefix: "$ " })
      : Promise.resolve();

    this.wallet = after;
    this.stage99RoundEscrow = 0;
    this.walletValue?.classList.add("stage99-wallet-receiving");
    EffectsManager.pulseWallet?.(this.walletValue);

    await Promise.all([fly, roundAnim, walletAnim]);

    this.walletValue?.classList.remove("stage99-wallet-receiving");
    this.stage99TransferBusy = false;
    this.updateEconomyUI?.(false);
    this.updateStage99RoundWalletUI();
    return amount;
  };

  Game.resolveRound = async function (...args) {
    if (!this.finalPaymentPhase && this.roundStarted && (Number(this.stage99RoundEscrow) || 0) > 0) {
      await this.transferStage99RoundEscrow();
    }
    return previousResolveRound.apply(this, args);
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.ensureStage99RoundWallet();
    this.applyStage99AccountUI();
    this.applyStage99StaticTicketUI();

    [this.flowOverlay, this.scoreBreakdown, this.readoutDetail, this.vaultControls, this.itemSellPopover]
      .forEach((root) => this.applyStage99TicketNotation(root));

    if (!this.stage99EscrowCapture && !this.stage99TransferBusy) this.updateStage99RoundWalletUI();
    return result;
  };

  Game.init = function () {
    this.resetStage99State();
    previousInit.call(this);
    this.ensureStage99RoundWallet();
    this.applyStage99StaticTicketUI();
    this.applyStage99AccountUI();
    this.updateStage99RoundWalletUI();
    this.stage = 9;
    this.status = "FINAL_STAGE9_UI_POLISH_ESCROW";
    this.stageStatus.textContent = this.roundPreparation ? "9단계 · 라운드 준비" : "9단계 · UI 정리";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.9.9 final Stage 9 UI polish / round escrow loaded.`);
  };

  Game.restartRun = function (...args) {
    this.resetStage99State();
    const result = previousRestartRun.apply(this, args);
    this.resetStage99State();
    this.ensureStage99RoundWallet();
    this.applyStage99StaticTicketUI();
    this.applyStage99AccountUI();
    this.updateAllUI?.();
    return result;
  };
})();
