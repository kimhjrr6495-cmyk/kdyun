// DEADLINE — v1.1.0 player-facing ROLL terminology guard
"use strict";

(() => {
  const normalize = (value) => {
    let text = String(value ?? "").replace(/리롤/g, "↻ ROLL");
    text = text.replace(/ROLL/g, (match, offset, source) => {
      return source.slice(Math.max(0, offset - 2), offset) === "↻ " ? match : "↻ ROLL";
    });
    return text;
  };

  Game.normalizeStage110RollText = normalize;

  Game.applyStage110RollTerminology = function (root = document.body) {
    if (!root) return;

    const normalizeElementAttributes = (element) => {
      if (!(element instanceof Element)) return;
      ["title", "aria-label"].forEach((name) => {
        if (!element.hasAttribute(name)) return;
        const before = element.getAttribute(name) || "";
        const after = normalize(before);
        if (after !== before) element.setAttribute(name, after);
      });
    };

    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (parent?.closest("script, style, noscript")) return;
      const before = root.nodeValue || "";
      const after = normalize(before);
      if (after !== before) root.nodeValue = after;
      return;
    }

    if (!(root instanceof Element) && root !== document.body) return;
    if (root instanceof Element && root.closest("script, style, noscript")) return;

    if (root instanceof Element) normalizeElementAttributes(root);
    root.querySelectorAll?.("[title], [aria-label]").forEach(normalizeElementAttributes);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => this.applyStage110RollTerminology(node));
  };

  (GAME_DATA.items || []).forEach((item) => {
    if (typeof item.note === "string") item.note = normalize(item.note);
  });
  (GAME_DATA.contracts || []).forEach((contract) => {
    if (typeof contract.note === "string") contract.note = normalize(contract.note);
  });

  const previousUpdateAllUI = Game.updateAllUI;
  const previousRenderShop = Game.renderShop;
  const previousShowStage100ContractOffer = Game.showStage100ContractOffer;
  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.applyStage110RollTerminology(document.body);
    return result;
  };

  Game.renderShop = function (...args) {
    const result = previousRenderShop.apply(this, args);
    this.applyStage110RollTerminology(this.flowOverlay);
    return result;
  };

  Game.showStage100ContractOffer = function (...args) {
    const result = previousShowStage100ContractOffer.apply(this, args);
    this.applyStage110RollTerminology(this.flowOverlay);
    return result;
  };

  Game.installStage110RollObserver = function () {
    if (this.stage110RollObserver || !document.body) return;
    this.stage110RollObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") this.applyStage110RollTerminology(mutation.target);
        mutation.addedNodes?.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE || node instanceof Element) this.applyStage110RollTerminology(node);
        });
      });
    });
    this.stage110RollObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  };

  Game.init = function (...args) {
    const result = previousInit.apply(this, args);
    this.installStage110RollObserver();
    this.applyStage110RollTerminology(document.body);
    return result;
  };

  Game.restartRun = function (...args) {
    const result = previousRestartRun.apply(this, args);
    this.applyStage110RollTerminology(document.body);
    return result;
  };
})();
