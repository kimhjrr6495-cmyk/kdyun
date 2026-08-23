// DEADLINE — v1.1.1 contract tooltip portal / action alignment polish
"use strict";

(() => {
  GAME_DATA.version = "v1.1.1";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.ensureStage111ContractTooltipPortal = function () {
    let portal = document.querySelector("#stage111ContractTooltipPortal");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "stage111ContractTooltipPortal";
      portal.className = "stage111-contract-tooltip-portal";
      portal.setAttribute("role", "tooltip");
      portal.setAttribute("aria-hidden", "true");
      document.body.appendChild(portal);
    }
    return portal;
  };

  Game.hideStage111ContractTooltip = function () {
    const portal = document.querySelector("#stage111ContractTooltipPortal");
    if (!portal) return;
    portal.classList.remove("is-visible");
    portal.setAttribute("aria-hidden", "true");
  };

  Game.showStage111ContractTooltip = function (token) {
    if (!(token instanceof Element)) return;
    const source = token.querySelector(".stage110-contract-token-tooltip");
    if (!source) return;

    const portal = this.ensureStage111ContractTooltipPortal();
    portal.innerHTML = source.innerHTML;
    portal.classList.add("is-visible");
    portal.setAttribute("aria-hidden", "false");

    const tokenRect = token.getBoundingClientRect();
    const portalRect = portal.getBoundingClientRect();
    const gap = 8;
    const edge = 8;

    let left = tokenRect.left;
    left = Math.min(left, window.innerWidth - portalRect.width - edge);
    left = Math.max(edge, left);

    let top = tokenRect.top - portalRect.height - gap;
    if (top < edge) top = tokenRect.bottom + gap;
    top = Math.min(top, window.innerHeight - portalRect.height - edge);
    top = Math.max(edge, top);

    portal.style.left = `${Math.round(left)}px`;
    portal.style.top = `${Math.round(top)}px`;
  };

  Game.bindStage111ContractTooltips = function () {
    const ledger = document.querySelector("#stage110ContractLedger");
    if (!ledger || ledger.dataset.stage111TooltipBound === "1") return;
    ledger.dataset.stage111TooltipBound = "1";

    ledger.addEventListener("pointerover", (event) => {
      const token = event.target.closest?.(".stage110-contract-token");
      if (!token || !ledger.contains(token)) return;
      this.showStage111ContractTooltip(token);
    });

    ledger.addEventListener("pointerout", (event) => {
      const token = event.target.closest?.(".stage110-contract-token");
      if (!token) return;
      const related = event.relatedTarget;
      if (related instanceof Node && token.contains(related)) return;
      this.hideStage111ContractTooltip();
    });

    ledger.addEventListener("focusin", (event) => {
      const token = event.target.closest?.(".stage110-contract-token");
      if (token) this.showStage111ContractTooltip(token);
    });

    ledger.addEventListener("focusout", () => this.hideStage111ContractTooltip());
    window.addEventListener("scroll", () => this.hideStage111ContractTooltip(), true);
    window.addEventListener("resize", () => this.hideStage111ContractTooltip());
  };

  Game.updateStage111VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.1.1";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.1.1";
  };

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.bindStage111ContractTooltips();
    this.updateStage111VersionUI();
    return result;
  };

  Game.init = function (...args) {
    const result = previousInit.apply(this, args);
    this.ensureStage111ContractTooltipPortal();
    this.bindStage111ContractTooltips();
    this.updateStage111VersionUI();
    this.stage = 10;
    this.status = "CONTRACT_HUD_ACTION_ALIGN_111";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.1.1 contract HUD/action alignment loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    this.hideStage111ContractTooltip();
    const result = previousRestartRun.apply(this, args);
    this.bindStage111ContractTooltips();
    this.updateStage111VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };
})();
