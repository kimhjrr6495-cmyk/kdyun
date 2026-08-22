// DEADLINE — v1.0.4 economy scaling / compact money / UI cleanup / contract HUD
"use strict";

(() => {
  GAME_DATA.version = "v1.0.4";
  GAME_DATA.stage = 10;

  const previousInit = Game.init;
  const previousRestartRun = Game.restartRun;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousEvaluateAndRenderScore = Game.evaluateAndRenderScore;
  const previousProcessStage94Errors = Game.processStage94Errors;
  const previousRenderShop = Game.renderShop;
  const previousRenderVaultControls = Game.renderVaultControls;
  const previousGetItemDisplayNote = Game.getItemDisplayNote;
  const previousSelectStage100Contract = Game.selectStage100Contract;
  const previousSkipStage100Contract = Game.skipStage100Contract;
  const previousAdvanceDeadline = Game.advanceDeadline;
  const previousResolveRound = Game.resolveRound;

  const MARKET_SCALING = {
    loose_change_jar: {
      factor: 1,
      note: "꽝 리롤마다 시장 기준가 ×1 저장 · 다음 당첨에 전부 지급"
    },
    piggy_bank: {
      factor: 1,
      note: "매 리롤마다 시장 기준가 ×1 저장 · 판매 시 저장금 획득"
    },
    error_collector: {
      factor: 1,
      note: "ERROR 1개마다 시장 기준가 ×1 저장 · 다음 당첨에 지급"
    },
    error_amplifier: {
      factor: 10,
      note: "ERROR EVENT 발생 시 남은 ERROR 1개당 시장 기준가 ×10 추가 지급"
    }
  };

  Game.getStage104MarketBaseValue = function () {
    const normals = (GAME_DATA.symbols || []).filter((symbol) => !symbol.special && symbol.id !== "WD" && symbol.id !== "ER");
    return Math.max(
      0,
      ...normals.map((symbol) => {
        const growth = Math.max(0, Number(this.symbolGrowth?.[symbol.id]) || 0);
        return Math.max(0, Number(symbol.value) || 0) + growth;
      })
    );
  };

  Game.formatStage104CompactNumber = function (value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    const sign = number < 0 ? "-" : "";
    const absolute = Math.abs(number);
    const units = [
      { value: 1e12, suffix: "T" },
      { value: 1e9, suffix: "B" },
      { value: 1e6, suffix: "M" },
      { value: 1e3, suffix: "K" }
    ];

    const unit = units.find((entry) => absolute >= entry.value);
    if (!unit) return `${sign}${Math.round(absolute)}`;

    const scaled = absolute / unit.value;
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    const text = scaled.toFixed(digits).replace(/\.0+$|(?<=\.[0-9])0+$/g, "");
    return `${sign}${text}${unit.suffix}`;
  };

  Game.formatStage104Money = function (value) {
    return `$${this.formatStage104CompactNumber(value)}`;
  };

  Game.getStage104ExactMoney = function (value) {
    return `$${Math.round(Number(value) || 0).toLocaleString("ko-KR")}`;
  };

  Game.compactStage104MoneyText = function (text) {
    return String(text ?? "").replace(/([+-]?)\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, (match, sign, raw) => {
      const value = Number(String(raw).replace(/,/g, ""));
      if (!Number.isFinite(value)) return match;
      return `${sign}$${this.formatStage104CompactNumber(value)}`;
    });
  };

  Game.applyStage104MoneyToNode = function (node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const before = node.nodeValue;
      if (!before || !before.includes("$")) return;
      const after = this.compactStage104MoneyText(before);
      if (after !== before) node.nodeValue = after;
      return;
    }
    if (!(node instanceof Element)) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((textNode) => this.applyStage104MoneyToNode(textNode));
  };

  Game.installStage104MoneyObserver = function () {
    if (this.stage104MoneyObserver || !document.body) return;
    this.stage104MoneyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") this.applyStage104MoneyToNode(mutation.target);
        mutation.addedNodes?.forEach((node) => this.applyStage104MoneyToNode(node));
      });
    });
    this.stage104MoneyObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  };

  Game.patchStage104MarketItemData = function () {
    (GAME_DATA.items || []).forEach((item) => {
      const config = MARKET_SCALING[item.id];
      if (!config) return;
      item.note = config.note;
      item.effect = item.effect || {};
      item.effect.stage104MarketFactor = config.factor;
    });
    (this.ownedItems || []).forEach((item) => {
      const config = MARKET_SCALING[item.id];
      if (!config) return;
      item.note = config.note;
      item.effect = item.effect || {};
      item.effect.stage104MarketFactor = config.factor;
    });
  };

  Game.syncStage104MarketScaledEffects = function () {
    this.patchStage104MarketItemData();
    const market = Math.max(0, this.getStage104MarketBaseValue());
    const all = [...(GAME_DATA.items || []), ...(this.ownedItems || [])];
    all.forEach((item) => {
      if (!item?.effect || !MARKET_SCALING[item.id]) return;
      if (item.effect.type === "error_event_cash") {
        item.effect.amountPerError = Math.round(market * 10);
      } else if (["miss_bank", "spin_bank", "error_bank"].includes(item.effect.type)) {
        item.effect.amount = Math.round(market * (Number(item.effect.stage104MarketFactor) || 1));
      }
    });
    return market;
  };

  Game.getItemDisplayNote = function (item) {
    this.syncStage104MarketScaledEffects();
    return this.compactStage104MoneyText(previousGetItemDisplayNote.call(this, item));
  };

  Game.ensureStage104MarketReference = function () {
    const table = this.symbolValueTable || document.querySelector("#symbolValueTable");
    const section = table?.closest(".reference-section");
    if (!section) return null;
    let row = section.querySelector(".stage104-market-reference");
    if (!row) {
      row = document.createElement("div");
      row.className = "stage104-market-reference";
      row.innerHTML = `<span>시장 기준가</span><strong>$0</strong>`;
      table.insertAdjacentElement("beforebegin", row);
    }
    const value = this.getStage104MarketBaseValue();
    const strong = row.querySelector("strong");
    if (strong) {
      strong.textContent = this.formatStage104Money(value);
      strong.title = this.getStage104ExactMoney(value);
    }
    return row;
  };

  Game.ensureStage104MachineHeader = function () {
    const header = document.querySelector(".machine-header");
    if (!header) return;
    let left = header.querySelector(".stage104-machine-left");
    let title = header.querySelector(":scope > strong");

    if (!left) {
      left = document.createElement("div");
      left.className = "stage104-machine-left";
      if (title) {
        header.insertBefore(left, title);
        left.appendChild(title);
      } else {
        title = document.createElement("strong");
        left.appendChild(title);
        header.prepend(left);
      }

      const hud = document.createElement("div");
      hud.id = "stage104ContractHud";
      hud.className = "stage104-contract-hud";
      hud.hidden = true;
      hud.innerHTML = `
        <span class="stage104-contract-rounds">0</span>
        <span class="stage104-contract-icon" aria-hidden="true">📄</span>
        <div class="stage104-contract-tooltip" role="tooltip"></div>
      `;
      left.appendChild(hud);
    }

    title = left.querySelector("strong");
    if (title) {
      title.id = "stage104DeadlineLabel";
      title.textContent = `마감 ${this.deadlineNumber}`;
    }
  };

  Game.getStage104RoundsLeft = function () {
    if (this.finalPaymentPhase) return 0;
    return Math.max(0, (Number(this.roundsPerDeadline) || 3) - (Number(this.round) || 1) + 1);
  };

  Game.updateStage104MachineHeader = function () {
    this.ensureStage104MachineHeader();
    const title = document.querySelector("#stage104DeadlineLabel");
    const status = this.stageStatus || document.querySelector("#stageStatus");
    if (title) title.textContent = `마감 ${this.deadlineNumber}`;

    if (status) {
      if (this.runComplete) status.textContent = "런 완료";
      else if (this.gameOver) status.textContent = "실패";
      else if (this.finalPaymentPhase) status.textContent = "최종 납부";
      else status.textContent = `남은 라운드 ${this.getStage104RoundsLeft()}`;
    }
  };

  Game.getStage104ContractDuration = function (contract = this.stage100ActiveContract) {
    if (!contract) return 0;
    const explicit = Number(contract.durationRounds);
    if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
    return Math.max(1, this.getStage104RoundsLeft());
  };

  Game.updateStage104ContractHud = function () {
    this.ensureStage104MachineHeader();
    const hud = document.querySelector("#stage104ContractHud");
    const contract = this.stage100ActiveContract;
    if (!hud) return;

    if (!contract) {
      hud.hidden = true;
      hud.className = "stage104-contract-hud";
      return;
    }

    if (!Number.isFinite(this.stage104ContractRoundsRemaining)) {
      this.stage104ContractRoundsRemaining = this.getStage104ContractDuration(contract);
    }

    const tier = this.getStage100TierMeta?.(contract.tier) || { label: contract.tier || "계약" };
    const reward = (contract.rewards || []).map((entry) => this.formatStage100Reward?.(entry) || "").filter(Boolean).join(" · ");
    const rounds = Math.max(0, Math.round(Number(this.stage104ContractRoundsRemaining) || 0));
    const safe = (value) => this.escapeStage100HTML?.(value) || String(value ?? "");

    hud.hidden = false;
    hud.className = `stage104-contract-hud tier-${String(contract.tier || "STANDARD").toLowerCase()}`;
    const roundsEl = hud.querySelector(".stage104-contract-rounds");
    const iconEl = hud.querySelector(".stage104-contract-icon");
    const tooltip = hud.querySelector(".stage104-contract-tooltip");
    if (roundsEl) roundsEl.textContent = String(rounds);
    if (iconEl) iconEl.textContent = contract.icon || "📄";
    if (tooltip) {
      tooltip.innerHTML = `
        <strong>${safe(contract.name)} · ${safe(tier.label)}</strong>
        <span>${this.highlightStage100Text?.(contract.note) || safe(contract.note)}</span>
        ${reward ? `<b>성공 보상 · ${safe(reward)}</b>` : ""}
        <small>남은 기간 · ${rounds}라운드</small>
      `;
    }
  };

  Game.selectStage100Contract = function (...args) {
    this.stage104ContractRoundsRemaining = null;
    const result = previousSelectStage100Contract.apply(this, args);
    this.stage104ContractRoundsRemaining = this.getStage104ContractDuration(this.stage100ActiveContract);
    this.updateStage104ContractHud();
    return result;
  };

  Game.skipStage100Contract = function (...args) {
    const result = previousSkipStage100Contract.apply(this, args);
    this.stage104ContractRoundsRemaining = null;
    this.updateStage104ContractHud();
    return result;
  };

  Game.resolveRound = async function (...args) {
    const contractBefore = this.stage100ActiveContract;
    const countedRound = Boolean(contractBefore && !this.finalPaymentPhase && this.roundStarted);
    const result = await previousResolveRound.apply(this, args);
    if (countedRound && this.stage100ActiveContract === contractBefore) {
      const current = Number.isFinite(this.stage104ContractRoundsRemaining)
        ? this.stage104ContractRoundsRemaining
        : this.getStage104ContractDuration(contractBefore);
      this.stage104ContractRoundsRemaining = Math.max(0, current - 1);
      this.updateStage104ContractHud();
    }
    return result;
  };

  Game.advanceDeadline = function (...args) {
    this.stage104ContractRoundsRemaining = null;
    const result = previousAdvanceDeadline.apply(this, args);
    this.updateStage104ContractHud();
    return result;
  };

  Game.evaluateAndRenderScore = async function (...args) {
    this.syncStage104MarketScaledEffects();
    return await previousEvaluateAndRenderScore.apply(this, args);
  };

  Game.processStage94Errors = async function (...args) {
    this.syncStage104MarketScaledEffects();
    let legacyDefaultCash = 0;
    const originalShowStage90Event = this.showStage90Event;

    if (typeof originalShowStage90Event === "function") {
      this.showStage90Event = function (kind, title, detail, ...rest) {
        if (title === "ERROR 보상") {
          const match = String(detail || "").match(/\+\$\s*([0-9,]+)/);
          if (match) legacyDefaultCash += Math.max(0, Number(match[1].replace(/,/g, "")) || 0);
        }
        return originalShowStage90Event.call(this, kind, title, detail, ...rest);
      };
    }

    let result;
    try {
      result = await previousProcessStage94Errors.apply(this, args);
    } finally {
      if (typeof originalShowStage90Event === "function") this.showStage90Event = originalShowStage90Event;
    }

    // 기존 기본 ERROR 현금 분기(errors × $4)를 시장 기준가 × ERROR 수 ×2로 교체합니다.
    if (legacyDefaultCash > 0) {
      const errorCount = Math.max(1, Math.round(legacyDefaultCash / 4));
      const desiredBase = Math.round(this.getStage104MarketBaseValue() * errorCount * 2);
      const contractFactor = this.getStage100EffectMultiplier?.("ERROR_CASH_MULT", 1) || 1;
      const delta = Math.round((desiredBase - legacyDefaultCash) * contractFactor);
      this.stage94PendingCash = Math.max(0, (Number(this.stage94PendingCash) || 0) + delta);
    }

    return result;
  };

  Game.renderShop = function (...args) {
    this.syncStage104MarketScaledEffects();
    const result = previousRenderShop.apply(this, args);
    this.applyStage104MoneyToNode(this.flowOverlay);
    return result;
  };

  Game.renderVaultControls = function (...args) {
    const result = previousRenderVaultControls.apply(this, args);
    this.applyStage104MoneyToNode(this.vaultControls);
    return result;
  };

  Game.updateStage104MoneyUI = function () {
    const entries = [
      [this.walletValue || document.querySelector("#walletValue"), this.wallet],
      [this.bankValue || document.querySelector("#bankValue"), this.bank],
      [this.deadlinePaidValue || document.querySelector("#deadlinePaidValue"), this.deadlinePaid],
      [this.deadlineTargetValue || document.querySelector("#deadlineTargetValue"), this.deadlineTarget],
      [document.querySelector("#stage99RoundWalletValue"), this.stage99RoundEscrow]
    ];

    entries.forEach(([element, value]) => {
      if (!element || !Number.isFinite(Number(value))) return;
      element.textContent = this.formatStage104Money(value);
      element.title = this.getStage104ExactMoney(value);
    });

    this.applyStage104MoneyToNode(document.querySelector(".machine-panel"));
    this.applyStage104MoneyToNode(document.querySelector(".info-panel"));
    this.applyStage104MoneyToNode(this.flowOverlay);
  };

  Game.updateStage104VersionUI = function () {
    const eyebrow = document.querySelector(".brand-block .eyebrow");
    if (eyebrow) eyebrow.textContent = "CONTROLLED MARKET SYSTEM · VERSION v1.0.4";
    const versionChip = document.querySelector(".top-status .status-chip strong");
    if (versionChip) versionChip.textContent = "v1.0.4";
  };

  Game.applyStage104Cleanup = function () {
    const label = this.deadlineAccountSection?.querySelector(".vault-heading .label");
    if (label) label.textContent = "마감 계좌";
    this.ensureStage104MarketReference();
    this.updateStage104MachineHeader();
    this.updateStage104ContractHud();
    this.updateStage104MoneyUI();
  };

  // 통화 카운트업도 K/M/B/T 표기를 사용합니다.
  if (window.EffectsManager && !EffectsManager.stage104CompactInstalled) {
    EffectsManager.stage104CompactInstalled = true;
    const originalAnimateNumber = EffectsManager.animateNumber;
    EffectsManager.animateNumber = function (element, from, to, options = {}) {
      const prefix = String(options.prefix ?? "");
      const moneyElement = Boolean(
        prefix.includes("$") ||
        element?.id === "walletValue" ||
        element?.id === "bankValue" ||
        element?.id === "deadlinePaidValue" ||
        element?.id === "deadlineTargetValue" ||
        element?.id === "stage99RoundWalletValue" ||
        element?.id === "payoutValue"
      );
      const nextOptions = moneyElement && !options.formatter
        ? { ...options, formatter: (value) => Game.formatStage104CompactNumber(value) }
        : options;
      return originalAnimateNumber.call(this, element, from, to, nextOptions);
    };
  }

  Game.updateAllUI = function (...args) {
    const result = previousUpdateAllUI.apply(this, args);
    this.syncStage104MarketScaledEffects();
    this.applyStage104Cleanup();
    this.updateStage104VersionUI();
    return result;
  };

  Game.init = function () {
    this.stage104ContractRoundsRemaining = null;
    this.patchStage104MarketItemData();
    const result = previousInit.call(this);
    this.installStage104MoneyObserver();
    this.syncStage104MarketScaledEffects();
    this.applyStage104Cleanup();
    this.updateStage104VersionUI();
    this.stage = 10;
    this.status = "STAGE10_ECONOMY_SCALING_COMPACT_HUD";
    this.updateAllUI?.();
    console.info(`DEADLINE ${GAME_DATA.version}: v1.0.4 economy scaling / compact HUD loaded.`);
    return result;
  };

  Game.restartRun = function (...args) {
    this.stage104ContractRoundsRemaining = null;
    const result = previousRestartRun.apply(this, args);
    this.patchStage104MarketItemData();
    this.syncStage104MarketScaledEffects();
    this.applyStage104Cleanup();
    this.updateStage104VersionUI();
    this.stage = 10;
    this.updateAllUI?.();
    return result;
  };

  Game.patchStage104MarketItemData();
})();
