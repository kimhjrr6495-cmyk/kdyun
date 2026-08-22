// DEADLINE — Stage 6.2 상점 UX / 지갑 티켓 / 판매 모달
"use strict";

(() => {
  Game.stage = 6;
  Game.status = "SHOP_UX_REFINEMENT";

  const previousInit = Game.init;
  const previousOpenPrepShop = Game.openPrepShop;
  const previousContinueFromShop = Game.continueFromShop;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousRestartRun = Game.restartRun;

  Game.init = function () {
    this.actionShopButton = document.querySelector("#actionShopButton");
    this.shopCloseButton = document.querySelector("#shopCloseButton");
    this.itemBuyValue = document.querySelector("#itemBuyValue");

    previousInit.call(this);

    this.actionShopButton?.addEventListener("click", () => this.openPrepShop());
    this.shopCloseButton?.addEventListener("click", () => this.continueFromShop());

    this.flowOverlay?.addEventListener("click", (event) => {
      if (this.shopOpen && event.target === this.flowOverlay) {
        this.continueFromShop();
      }
    });

    this.flowOptions?.addEventListener("click", (event) => {
      const ownedButton = event.target.closest("button[data-shop-owned-item]");
      if (!ownedButton || !this.shopOpen) return;
      this.openItemSellPopover(ownedButton.dataset.shopOwnedItem);
    });

    this.itemSellPopover?.addEventListener("click", (event) => {
      if (event.target === this.itemSellPopover) this.closeItemSellPopover();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!this.itemSellPopover?.hidden) {
        this.closeItemSellPopover();
        return;
      }
      if (this.shopOpen) this.continueFromShop();
    });

    this.stageStatus.textContent = "6단계 · 상점 정리";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 6.2 loaded.`);
  };

  Game.openPrepShop = function () {
    previousOpenPrepShop.call(this);
    if (!this.shopOpen) return;

    this.flowOverlay.classList.add("is-shop-modal");
    this.flowEyebrow.textContent = "";
    this.flowTitle.textContent = "상점";
    this.flowFooter.textContent = "";
    if (this.shopCloseButton) this.shopCloseButton.hidden = false;
    this.renderShop();
    this.updateAllUI();
  };

  Game.continueFromShop = function () {
    if (!this.shopOpen) return;
    this.flowOverlay.classList.remove("is-shop-modal");
    if (this.shopCloseButton) this.shopCloseButton.hidden = true;
    this.closeItemSellPopover();
    previousContinueFromShop.call(this);
  };

  Game.renderShop = function () {
    if (!this.shopOpen) return;

    const maxOwned = GAME_DATA.shop.maxOwnedItems;
    const isFull = this.ownedItems.length >= maxOwned;
    const rerollCost = this.getShopRerollCost();

    this.flowText.innerHTML = `
      <span class="shop-ticket-balance">T ${this.tickets}</span>
      <span class="shop-owned-count">보유 ${this.ownedItems.length} / ${maxOwned}</span>
    `;

    const offerHTML = this.shopOffers.map((offer, index) => {
      const cannotBuy = offer.sold || isFull || this.tickets < offer.price;
      const stateText = offer.sold
        ? "구매 완료"
        : isFull
          ? "보유 한도"
          : `T ${offer.price}`;

      return `
        <button class="shop-offer-card ${offer.sold ? "is-sold" : ""}"
          data-shop-action="buy" data-offer-index="${index}" ${cannotBuy ? "disabled" : ""}>
          <span class="shop-item-mark" aria-hidden="true">${offer.name.slice(0, 1)}</span>
          <strong>${offer.name}</strong>
          <small>${offer.note}</small>
          <b>${stateText}</b>
        </button>
      `;
    }).join("");

    const ownedHTML = Array.from({ length: maxOwned }, (_, index) => {
      const item = this.ownedItems[index];
      if (!item) {
        return `<div class="shop-owned-card is-empty"><span>빈 슬롯</span></div>`;
      }

      const sellValue = this.getItemSellValue(item);
      return `
        <button class="shop-owned-card" data-shop-owned-item="${item.instanceId}" type="button">
          <span class="shop-owned-mark" aria-hidden="true">${item.name.slice(0, 1)}</span>
          <div>
            <strong>${item.name}</strong>
            <small>${item.note || "효과 준비 중"}</small>
          </div>
          <b>판매 T ${sellValue}</b>
        </button>
      `;
    }).join("");

    this.flowOptions.innerHTML = `
      <section class="shop-main-section">
        <div class="shop-section-heading shop-main-heading">
          <div>
            <span>아이템 제안</span>
            <small>티켓으로 구매</small>
          </div>
          <button class="shop-reroll-compact" data-shop-action="reroll"
            ${this.tickets < rerollCost ? "disabled" : ""}>
            ↻ 새로고침 · T ${rerollCost}
          </button>
        </div>
        <div class="shop-offer-grid">${offerHTML}</div>
      </section>

      <section class="shop-owned-panel">
        <div class="shop-section-heading">
          <div>
            <span>보유 아이템</span>
            <small>클릭해서 판매</small>
          </div>
          <strong>${this.ownedItems.length} / ${maxOwned}</strong>
        </div>
        <div class="shop-owned-large-grid">${ownedHTML}</div>
      </section>
    `;
  };

  Game.openItemSellPopover = function (instanceId) {
    const item = this.ownedItems.find((entry) => entry.instanceId === instanceId);
    if (!item || !this.itemSellPopover) return;

    this.selectedSellItemId = instanceId;
    const sellValue = this.getItemSellValue(item);
    this.itemSellName.textContent = item.name;
    this.itemSellEffect.textContent = item.note || "효과 준비 중";
    if (this.itemBuyValue) this.itemBuyValue.textContent = `구매가 T ${item.price}`;
    this.itemSellValue.textContent = `판매가 T ${sellValue}`;
    this.itemSellConfirm.textContent = `판매하고 T ${sellValue} 받기`;
    this.itemSellConfirm.disabled = !this.canSellItemsNow();
    this.itemSellPopover.hidden = false;
  };

  Game.closeItemSellPopover = function () {
    this.selectedSellItemId = null;
    if (this.itemSellPopover) this.itemSellPopover.hidden = true;
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);

    const canOpenShop = Boolean(
      this.roundPreparation &&
      !this.finalPaymentPhase &&
      !this.roundStarted &&
      !this.gameOver &&
      !this.runComplete &&
      !this.lastSettlement &&
      !this.isSpinning &&
      !this.isResolvingRound
    );

    if (this.actionShopButton) {
      this.actionShopButton.disabled = !canOpenShop || this.shopOpen;
      this.actionShopButton.classList.toggle("is-available", canOpenShop && !this.shopOpen);
    }

    if (this.shopOpen) {
      this.flowOverlay.classList.add("is-shop-modal");
      if (this.shopCloseButton) this.shopCloseButton.hidden = false;
    } else {
      this.flowOverlay.classList.remove("is-shop-modal");
      if (this.shopCloseButton) this.shopCloseButton.hidden = true;
    }
  };

  Game.restartRun = function () {
    this.flowOverlay?.classList.remove("is-shop-modal");
    if (this.shopCloseButton) this.shopCloseButton.hidden = true;
    previousRestartRun.call(this);
  };
})();
