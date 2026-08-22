// DEADLINE — Stage 6.0 상점 / 시작-리롤 단일 버튼
"use strict";

(() => {
  Game.stage = 6;
  Game.status = "SHOP_LOOP";
  Game.shopOpen = false;
  Game.shopOffers = [];
  Game.shopRerollCount = 0;
  Game.shopContinuation = null;
  Game.ownedItems = [];
  Game.itemInstanceSeed = 0;

  const SHOP_CATALOG = [
    { id: "shell_magnet", name: "작은 자석", price: 1, note: "효과는 7단계에서 연결" },
    { id: "shell_calc", name: "낡은 계산기", price: 1, note: "효과는 7단계에서 연결" },
    { id: "shell_receipt", name: "붉은 영수증", price: 2, note: "효과는 7단계에서 연결" },
    { id: "shell_coin", name: "행운 동전", price: 2, note: "효과는 7단계에서 연결" },
    { id: "shell_ledger", name: "검은 장부", price: 2, note: "효과는 7단계에서 연결" },
    { id: "shell_chip", name: "유리 칩", price: 3, note: "효과는 7단계에서 연결" },
    { id: "shell_bell", name: "시장 벨", price: 3, note: "효과는 7단계에서 연결" },
    { id: "shell_pin", name: "잠금 핀", price: 4, note: "효과는 7단계에서 연결" }
  ];

  const previousInit = Game.init;
  const previousSpin = Game.spin;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousRestartRun = Game.restartRun;

  Game.init = function () {
    this.shopOpen = false;
    this.shopOffers = [];
    this.shopRerollCount = 0;
    this.shopContinuation = null;
    this.ownedItems = [];
    this.itemInstanceSeed = 0;

    this.drawerItemCount = document.querySelector(".drawer-item-heading strong");
    this.drawerEmptySlots = document.querySelector(".empty-slots");

    previousInit.call(this);

    this.flowOptions.addEventListener("click", (event) => {
      const actionButton = event.target.closest("button[data-shop-action]");
      if (!actionButton || !this.shopOpen) return;

      const action = actionButton.dataset.shopAction;
      if (action === "buy") {
        this.buyShopOffer(Number(actionButton.dataset.offerIndex));
        return;
      }
      if (action === "reroll") {
        this.rerollShop();
        return;
      }
      if (action === "sell") {
        this.sellOwnedItem(actionButton.dataset.instanceId);
        return;
      }
      if (action === "continue") this.continueFromShop();
    });

    this.stageStatus.textContent = "6단계 · 상점 시스템";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: Stage 6 loaded.`);
  };

  // v0.5.8의 중앙 시작 버튼 대신 기존 리롤 버튼 하나가
  // 준비 중에는 '시작', 실제 진행 중에는 '리롤' 역할을 합니다.
  Game.spin = async function () {
    if (
      this.awaitingRoundStart &&
      !this.roundStarted &&
      !this.shopOpen &&
      !this.flowOverlay.classList.contains("is-open")
    ) {
      this.beginRoundPlay();
      return;
    }

    return previousSpin.call(this);
  };

  Game.getShopRerollCost = function () {
    return this.shopRerollCount + 1;
  };

  Game.getItemSellValue = function (item) {
    return Math.max(1, Math.floor((item?.price || 1) / 2));
  };

  Game.generateShopOffers = function () {
    const pool = [...SHOP_CATALOG];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    this.shopOffers = pool
      .slice(0, GAME_DATA.shop.offerCount)
      .map((item) => ({ ...item, sold: false }));
  };

  Game.showShop = function (continuation, note = "") {
    this.shopOpen = true;
    this.shopContinuation = continuation;
    this.shopRerollCount = 0;
    this.awaitingRoundStart = false;
    this.roundStarted = false;
    this.pendingModeTickets = 0;
    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.generateShopOffers();

    this.spinButton.disabled = true;
    this.patternTestButton.disabled = true;
    this.stageStatus.textContent = "6단계 · 상점";
    this.flowOptions.classList.remove("mode-only", "has-vault-setup");
    this.flowOptions.classList.add("shop-layout");
    this.flowEyebrow.textContent = `마감 ${this.deadlineNumber} · 상점`;
    this.flowTitle.textContent = "상점";
    this.flowFooter.textContent = note;

    this.renderShop();
    this.openFlowOverlay();
    this.updateAllUI();
  };

  Game.renderShop = function () {
    if (!this.shopOpen) return;

    const maxOwned = GAME_DATA.shop.maxOwnedItems;
    const isFull = this.ownedItems.length >= maxOwned;
    const rerollCost = this.getShopRerollCost();

    this.flowText.textContent =
      `티켓 ${this.tickets} · 보유 아이템 ${this.ownedItems.length} / ${maxOwned}`;

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

    const ownedHTML = Array.from({ length: maxOwned }, (_, index) => {
      const item = this.ownedItems[index];
      if (!item) {
        return `<div class="shop-owned-slot is-empty"><span>빈 슬롯</span></div>`;
      }

      const sellValue = this.getItemSellValue(item);
      return `
        <div class="shop-owned-slot">
          <div>
            <strong>${item.name}</strong>
            <small>효과 준비 중</small>
          </div>
          <button data-shop-action="sell" data-instance-id="${item.instanceId}">판매 +${sellValue}T</button>
        </div>
      `;
    }).join("");

    this.flowOptions.innerHTML = `
      <section class="shop-offers-section">
        <div class="shop-section-heading">
          <span>오늘의 제안</span>
          <strong>4개</strong>
        </div>
        <div class="shop-offer-grid">${offerHTML}</div>
      </section>

      <section class="shop-owned-section">
        <div class="shop-section-heading">
          <span>보유 아이템</span>
          <strong>${this.ownedItems.length} / ${maxOwned}</strong>
        </div>
        <div class="shop-owned-grid">${ownedHTML}</div>
      </section>

      <div class="shop-actions">
        <button class="shop-reroll" data-shop-action="reroll" ${this.tickets < rerollCost ? "disabled" : ""}>
          제안 새로고침 · ${rerollCost}T
        </button>
        <button class="shop-continue" data-shop-action="continue">상점 나가기</button>
      </div>
    `;
  };

  Game.buyShopOffer = function (index) {
    const offer = this.shopOffers[index];
    if (!offer || offer.sold) return;
    if (this.ownedItems.length >= GAME_DATA.shop.maxOwnedItems) return;
    if (this.tickets < offer.price) return;

    this.tickets -= offer.price;
    offer.sold = true;
    this.itemInstanceSeed += 1;
    this.ownedItems.push({
      ...offer,
      sold: undefined,
      instanceId: `item-${this.itemInstanceSeed}`
    });

    this.readoutDetail.textContent = `${offer.name} 구매 · 티켓 -${offer.price}`;
    this.renderShop();
    this.updateAllUI();
  };

  Game.rerollShop = function () {
    const cost = this.getShopRerollCost();
    if (this.tickets < cost) return;

    this.tickets -= cost;
    this.shopRerollCount += 1;
    this.generateShopOffers();
    this.readoutDetail.textContent = `상점 새로고침 · 티켓 -${cost}`;
    this.renderShop();
    this.updateAllUI();
  };

  Game.sellOwnedItem = function (instanceId) {
    const index = this.ownedItems.findIndex((item) => item.instanceId === instanceId);
    if (index < 0) return;

    const [item] = this.ownedItems.splice(index, 1);
    const value = this.getItemSellValue(item);
    this.tickets += value;
    this.readoutDetail.textContent = `${item.name} 판매 · 티켓 +${value}`;
    this.renderShop();
    this.updateAllUI();
  };

  Game.continueFromShop = function () {
    if (!this.shopOpen) return;

    const continuation = this.shopContinuation;
    this.shopOpen = false;
    this.shopContinuation = null;
    this.flowOptions.classList.remove("shop-layout");

    if (continuation?.type === "NEXT_ROUND") {
      this.showRoundChoice(continuation.note || "");
      return;
    }

    this.closeFlowOverlay();
    this.showGameOver();
  };

  // Stage 6: 실제 플레이 라운드가 끝날 때마다 상점을 한 번 거칩니다.
  Game.resolveRound = async function () {
    const completedRound = this.round;
    const vaultEvent = this.advanceVaultRound();
    const vaultText = this.describeVaultEvent(vaultEvent);

    this.currentMode = null;
    this.spinsRemaining = 0;
    this.spinsTotal = 0;
    this.awaitingRoundStart = false;
    this.roundStarted = false;
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
      this.showShop({ type: "NEXT_ROUND", note: vaultText }, vaultText);
      return;
    }

    this.showShop({ type: "FINAL_CHECK", note: vaultText }, vaultText);
  };

  Game.renderOwnedItemsDrawer = function () {
    if (!this.drawerItemCount || !this.drawerEmptySlots) return;

    const maxOwned = GAME_DATA.shop.maxOwnedItems;
    this.drawerItemCount.textContent = `보유 아이템 ${this.ownedItems.length} / ${maxOwned}`;
    this.drawerEmptySlots.innerHTML = Array.from({ length: maxOwned }, (_, index) => {
      const item = this.ownedItems[index];
      return item
        ? `<div class="owned-drawer-item"><strong>${item.name}</strong><small>효과 준비 중</small></div>`
        : "<div>비어 있음</div>";
    }).join("");
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);

    const prepOpen =
      this.awaitingRoundStart &&
      Boolean(this.currentMode) &&
      !this.roundStarted &&
      !this.finalPaymentPhase &&
      !this.shopOpen &&
      !this.flowOverlay.classList.contains("is-open") &&
      !this.lastSettlement;

    if (prepOpen) {
      this.spinButton.disabled = false;
      this.spinButton.textContent = "시작";
      this.patternTestButton.disabled = true;
      this.spinStatus.textContent = "시작 대기";
    } else if (
      this.currentMode &&
      this.roundStarted &&
      !this.isSpinning &&
      !this.isResolvingRound &&
      this.spinsRemaining > 0
    ) {
      this.spinButton.textContent = "리롤";
    }

    if (this.shopOpen) {
      this.spinButton.disabled = true;
      this.patternTestButton.disabled = true;
      this.spinStatus.textContent = "상점";
    }

    this.renderOwnedItemsDrawer();
  };

  Game.advanceDeadline = function () {
    this.shopOpen = false;
    this.shopContinuation = null;
    previousAdvanceDeadline.call(this);
  };

  Game.restartRun = function () {
    this.shopOpen = false;
    this.shopOffers = [];
    this.shopRerollCount = 0;
    this.shopContinuation = null;
    this.ownedItems = [];
    this.itemInstanceSeed = 0;
    previousRestartRun.call(this);
  };
})();
