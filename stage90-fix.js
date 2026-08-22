// DEADLINE — v0.9.0 보유 아이템 동적 한도 호환 패치
"use strict";

(() => {
  const previousBuyShopOffer = Game.buyShopOffer;
  const previousRestartRun = Game.restartRun;
  const previousUpdateStatsRail = Game.updateStatsRail;

  Game.syncStage90InventoryCapacity = function () {
    const current = this.getMaxOwnedItems?.() || GAME_DATA.shop.baseMaxOwnedItems || 6;
    GAME_DATA.shop.maxOwnedItems = current;
    return current;
  };

  Game.buyShopOffer = function (...args) {
    const result = previousBuyShopOffer.apply(this, args);
    this.syncStage90InventoryCapacity();
    this.updateAllUI?.();
    return result;
  };

  Game.updateStatsRail = function () {
    previousUpdateStatsRail?.call(this);
    const current = this.syncStage90InventoryCapacity();
    if (!this.runStatsGrid) return;

    [...this.runStatsGrid.querySelectorAll(".stat-reference-row")].forEach((row) => {
      const label = row.querySelector("span")?.textContent?.trim();
      if (label !== "보유 아이템") return;
      const value = row.querySelector("strong");
      if (value) value.textContent = `${(this.ownedItems || []).length} / ${current}`;
    });
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    GAME_DATA.shop.maxOwnedItems = GAME_DATA.shop.baseMaxOwnedItems || 6;
    this.syncStage90InventoryCapacity();
    return result;
  };

  Game.syncStage90InventoryCapacity();
})();
