// DEADLINE — v0.8.2 릴 정지 동기화 / 가치·지급액 용어 정리 / TEST +5T
"use strict";

(() => {
  GAME_DATA.version = "v0.8.2";
  GAME_DATA.stage = 8;

  const MONEY_ITEM_NOTES = {
    cherry_sticker: "체리 기본 가치 +1",
    coin_polish: "코인 기본 가치 +1",
    bell_hammer: "벨 기본 가치 +2",
    star_lens: "스타 기본 가치 +2",
    diamond_cutter: "다이아 기본 가치 +3",
    crown_seal: "크라운 기본 가치 +3",
    seven_stamp: "세븐 기본 가치 +4",

    horizontal_wire: "가로 패턴 지급액 증가",
    vertical_wire: "세로 패턴 지급액 증가",
    diagonal_ruler: "대각선 패턴 지급액 증가",
    v_frame: "V / 역V 패턴 지급액 증가",
    x_bridge: "X 패턴 지급액 증가",
    jackpot_fuse: "잭팟 지급액 증가",

    market_amp: "모든 당첨 지급액 증가",
    premium_terminal: "모든 당첨 지급액 크게 증가",
    opening_alert: "첫 리롤 지급액 증가",
    closing_bell: "마지막 리롤 지급액 증가",
    diverse_portfolio: "심볼 6종 이상이면 지급액 증가",

    ticket_punch: "라운드 시작 시 티켓 +1",
    refresh_coupon: "상점 새로고침 비용 -1T",

    echo_chip: "패턴 당첨 시 추가 지급",
    horizontal_relay: "가로 패턴 당첨 시 추가 지급",
    diamond_echo: "다이아 패턴 당첨 시 추가 지급",
    jackpot_capacitor: "잭팟 정산 시 추가 지급",
    amplifier_coil: "트리거 보너스 추가 지급",
    chain_relay: "연쇄 발동 시 추가 지급"
  };

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;
  const previousAnimateReel = Game.animateReel;
  const previousEvaluateAndRenderScore = Game.evaluateAndRenderScore;

  Game.applyMoneyItemNotes = function () {
    (GAME_DATA.items || []).forEach((item) => {
      const note = MONEY_ITEM_NOTES[item.id];
      if (note) item.note = note;
    });
  };

  Game.waitAnimationFrame = function () {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  };

  Game.normalizeReelTrack = function (reel, finalColumn = null, reelIndex = null) {
    if (!reel) return;
    const track = reel.querySelector(".reel-track");
    if (!track) return;

    track.style.transition = "none";
    track.style.transform = "translate3d(0, 0, 0)";

    if (Array.isArray(finalColumn) && Number.isInteger(reelIndex)) {
      track.innerHTML = finalColumn
        .map((symbol, row) => this.symbolHTML(symbol, reelIndex, row))
        .join("");
    }

    // 레이아웃을 즉시 확정해 transform 초기화가 합성 프레임에 남지 않게 합니다.
    void track.offsetHeight;
  };

  Game.animateReel = async function (reel, index, finalColumn) {
    await previousAnimateReel.call(this, reel, index, finalColumn);
    this.normalizeReelTrack(reel, finalColumn, index);
    await this.waitAnimationFrame();
  };

  Game.normalizeAllReelsBeforeScoring = async function () {
    const reels = [...(this.reelsEl?.querySelectorAll(".reel") || [])];

    reels.forEach((reel, index) => {
      const finalColumn = this.currentColumns?.[index];
      this.normalizeReelTrack(reel, finalColumn, index);
      reel.classList.remove("reel-settled");
    });

    // 마지막 릴의 DOM/transform 정리가 실제 화면에 반영된 뒤에만 패턴 판정으로 이동합니다.
    await this.waitAnimationFrame();
    await this.waitAnimationFrame();
  };

  Game.evaluateAndRenderScore = async function (options = {}) {
    await this.normalizeAllReelsBeforeScoring();
    return previousEvaluateAndRenderScore.call(this, options);
  };

  Game.addTestTickets = function () {
    if (!Number.isFinite(this.tickets)) return;
    this.tickets += 5;
    this.updateAllUI();
    if (this.readoutDetail) {
      this.readoutDetail.textContent = "TEST · 티켓 +5";
    }
  };

  Game.init = function () {
    this.devTicketButton = document.querySelector("#devTicketButton");
    this.applyMoneyItemNotes();
    previousInit.call(this);
    this.applyMoneyItemNotes();

    this.devTicketButton?.addEventListener("click", () => this.addTestTickets());

    this.stage = 8;
    this.status = "REEL_SETTLEMENT_GUARD_MONEY_COPY_TEST_TICKETS";
    this.updateAllUI();
    console.info(`DEADLINE ${GAME_DATA.version}: v0.8.2 reel settlement guard + money copy + test tickets loaded.`);
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    this.applyMoneyItemNotes();
  };
})();
