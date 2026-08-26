// DEADLINE — v1.3.6 LUCK build data
"use strict";
(() => {
  const V = "v1.3.6";
  const ITEMS = [
    { id:"old_four_leaf_clover", name:"낡은 네잎클로버", icon:"☘️", category:"LUCK", rarity:"COMMON", price:3, note:"Permanent LUCK +1", effect:{ type:"s136_perm_luck", amount:1 } },
    { id:"lucky_coin", name:"행운의 동전", icon:"🪙", category:"LUCK", rarity:"RARE", price:4, note:"3 ROLL마다 다음 ROLL Burst LUCK +3", unique:true, effect:{ type:"s136_periodic_burst", every:3, amount:3 } },
    { id:"luck_magnet", name:"행운 자석", icon:"🧲", category:"LUCK", rarity:"RARE", price:4, note:"무패턴 ROLL마다 LUCK +2 저장 · 최대 +6 · 다음 당첨 ROLL 후 초기화", unique:true, effect:{ type:"s136_miss_store", step:2, max:6 } },
    { id:"crystal_ball", name:"수정구", icon:"🔮", category:"LUCK", rarity:"RARE", price:5, note:"Lucky Symbol 선택 시 가장 많이 강화한 심볼의 선택 가중치 ×2", unique:true, effect:{ type:"s136_lucky_focus", factor:2 } },
    { id:"golden_ticket_holder", name:"황금 티켓 홀더", icon:"🎟️", category:"LUCK", rarity:"EPIC", price:6, note:"보유 🎟️ 10개마다 Permanent LUCK +1 · 최대 +4", unique:true, effect:{ type:"s136_ticket_luck", every:10, step:1, max:4 } },
    { id:"jokers_smile", name:"조커의 미소", icon:"🃏", category:"LUCK", rarity:"EPIC", price:6, note:"이번 ROLL의 WILD 1개마다 다음 ROLL Burst LUCK +1 · 최대 +4", unique:true, effect:{ type:"s136_wild_next_luck", perWild:1, max:4 } },
    { id:"luck_distiller", name:"행운 증류기", icon:"🧪", category:"LUCK", rarity:"EPIC", price:7, note:"Effective LUCK 8+에서 JACKPOT 실패 시 LUCK +1 저장 · 최대 +5 · JACKPOT 시 초기화", unique:true, effect:{ type:"s136_jackpot_store", threshold:8, step:1, max:5 } },
    { id:"luck_amplifier", name:"행운 증폭기", icon:"🌠", category:"LUCK", rarity:"LEGENDARY", price:9, note:"Burst LUCK과 Pity LUCK ×1.50", unique:true, effect:{ type:"s136_temp_luck_amp", factor:1.5 } },
    { id:"clover_engine", name:"클로버 엔진", icon:"🍀", category:"LUCK", rarity:"LEGENDARY", price:10, note:"마감 성공마다 Permanent LUCK +1 · 최대 +5", unique:true, effect:{ type:"s136_deadline_luck", step:1, max:5 } },
    { id:"singularity_clover", name:"특이점 클로버", icon:"🌈", category:"LUCK", rarity:"LEGENDARY", price:12, note:"Effective LUCK 10 초과분을 2배 적용 · 최종 LUCK 최대 15", unique:true, effect:{ type:"s136_luck_overflow", threshold:10, factor:2, cap:15 } }
  ];

  Game.patchStage136LuckData = function () {
    GAME_DATA.version = V;
    const items = GAME_DATA.items || (GAME_DATA.items = []);
    for (const fresh of ITEMS) {
      const current = items.find((item) => item?.id === fresh.id);
      if (current) Object.assign(current, fresh, { effect:{ ...fresh.effect } });
      else items.push({ ...fresh, effect:{ ...fresh.effect } });
    }
    const pepper = items.find((item) => item?.id === "green_pepper");
    if (pepper) {
      pepper.note = "15% 확률로 이번 ↻ ROLL Burst LUCK +4 · 9회 발동 후 소멸";
      pepper.effect = { ...(pepper.effect || {}), type:"chance_spin_luck", luck:4 };
    }
    if (GAME_DATA.shinyTraits?.LUCK) GAME_DATA.shinyTraits.LUCK.note = "매 ↻ ROLL Permanent LUCK +1";
  };

  // UI hotfix: only the board-local LUCK SURGE popup is allowed.
  // Item effects, trigger payouts, sounds and board-local source FX continue to work.
  Game.s136InstallQuietNotifications = function () {
    let style = document.querySelector("#stage136QuietNotifications");
    if (!style) {
      style = document.createElement("style");
      style.id = "stage136QuietNotifications";
      style.textContent = `
        #stage90Feed,
        #stage91ItemAlert,
        #triggerFeed,
        #triggerChainHud,
        .stage90-event-feed,
        .stage91-item-alert,
        .stage93-activation-card,
        .trigger-feed,
        .trigger-chain-hud { display:none !important; visibility:hidden !important; pointer-events:none !important; }
      `;
      document.head.appendChild(style);
    }

    const removeLegacyNodes = () => {
      document.querySelectorAll("#stage90Feed,#stage91ItemAlert,#triggerFeed,#triggerChainHud").forEach((el) => el.remove());
      this.stage90Feed = null;
      this.stage91ItemAlert = null;
      this.triggerFeed = null;
      this.triggerChainHud = null;
      this.stage93ActivationQueue = [];
      this.stage93ActivationBusy = false;
    };

    this.showStage90Event = function () {};
    this.ensureStage91ItemAlert = function () { removeLegacyNodes(); return null; };
    this.queueStage93ActivationCard = function () {};
    this.runStage93ActivationQueue = async function () {
      this.stage93ActivationQueue = [];
      this.stage93ActivationBusy = false;
    };
    this.playStage91ItemAlert = async function () {};
    this.queueStage94ItemCard = function () {};

    this.ensureTriggerUI = function () { removeLegacyNodes(); };
    this.renderTriggerActivation = function () {};
    this.renderTriggerFinalSummary = function () {};
    this.clearTriggerUI = function () {
      removeLegacyNodes();
      this.reelsEl?.closest(".reels-shell")?.classList.remove("trigger-chain-pulse");
    };

    removeLegacyNodes();
  };

  const installSurgeOnly = () => {
    Game.s136InstallQuietNotifications?.();
    const original = Game.s136ShowLuckPop;
    if (typeof original !== "function" || original.stage136SurgeOnly) return;
    const surgeOnly = function (text, level = 0) {
      if (!String(text || "").includes("LUCK SURGE")) return;
      return original.call(this, text, level);
    };
    surgeOnly.stage136SurgeOnly = true;
    Game.s136ShowLuckPop = surgeOnly;
  };

  Game.patchStage136LuckData();
  Game.s136InstallQuietNotifications();
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", installSurgeOnly, { once:true });
  } else {
    queueMicrotask(installSurgeOnly);
  }
  window.addEventListener("load", installSurgeOnly, { once:true });
})();
