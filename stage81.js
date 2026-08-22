// DEADLINE — v0.8.1 아이템 설명 간소화 / 리롤 선택 티켓 보상 실시간 표시
"use strict";

(() => {
  GAME_DATA.version = "v0.8.1";
  GAME_DATA.stage = 8;

  const SHORT_ITEM_NOTES = {
    cherry_sticker: "체리 가치 +1",
    coin_polish: "코인 가치 +1",
    bell_hammer: "벨 가치 +2",
    star_lens: "스타 가치 +2",
    diamond_cutter: "다이아 가치 +3",
    crown_seal: "크라운 가치 +3",
    seven_stamp: "세븐 가치 +4",

    horizontal_wire: "가로 패턴 강화",
    vertical_wire: "세로 패턴 강화",
    diagonal_ruler: "대각선 패턴 강화",
    v_frame: "V / 역V 패턴 강화",
    x_bridge: "X 패턴 강화",
    jackpot_fuse: "잭팟 배수 강화",

    market_amp: "모든 패턴 점수 강화",
    premium_terminal: "모든 패턴 점수 크게 강화",
    opening_alert: "첫 리롤 점수 강화",
    closing_bell: "마지막 리롤 점수 강화",
    diverse_portfolio: "심볼 6종 이상이면 점수 강화",

    ticket_punch: "라운드 시작 시 티켓 +1",
    refresh_coupon: "상점 새로고침 비용 -1T",

    echo_chip: "패턴 당첨 시 추가 지급",
    horizontal_relay: "가로 패턴 당첨 시 추가 지급",
    diamond_echo: "다이아 패턴 당첨 시 추가 지급",
    jackpot_capacitor: "잭팟 정산 시 추가 지급",
    amplifier_coil: "트리거 보너스 추가 증폭",
    chain_relay: "연쇄 발동 시 추가 지급"
  };

  const previousInit = Game.init;
  const previousUpdateAllUI = Game.updateAllUI;

  Game.applyShortItemNotes = function () {
    (GAME_DATA.items || []).forEach((item) => {
      const shortNote = SHORT_ITEM_NOTES[item.id];
      if (shortNote) item.note = shortNote;
    });
  };

  Game.getModeTicketDisplayBonus = function () {
    return (this.ownedItems || [])
      .filter((item) => item.effect?.type === "mode_ticket_bonus")
      .reduce((sum, item) => sum + (Number(item.effect?.amount) || 0), 0);
  };

  Game.updateRoundModeRewardLabels = function () {
    const bonus = this.getModeTicketDisplayBonus();

    document.querySelectorAll("button[data-prep-mode]").forEach((button) => {
      const modeId = button.dataset.prepMode;
      const mode = GAME_DATA.deadline.modes[modeId];
      const rewardText = button.querySelector("small");
      if (!mode || !rewardText) return;

      const totalTickets = mode.tickets + bonus;
      rewardText.textContent = `티켓 +${totalTickets}`;

      if (bonus > 0) {
        button.title = `기본 티켓 +${mode.tickets} · 아이템 +${bonus}`;
        button.classList.add("has-ticket-bonus");
      } else {
        button.removeAttribute("title");
        button.classList.remove("has-ticket-bonus");
      }
    });
  };

  Game.init = function () {
    this.applyShortItemNotes();
    previousInit.call(this);
    this.applyShortItemNotes();
    this.updateRoundModeRewardLabels();
    this.stage = 8;
    this.status = "SIMPLIFIED_ITEM_COPY_TICKET_PREVIEW";
    console.info(`DEADLINE ${GAME_DATA.version}: v0.8.1 item copy + ticket preview loaded.`);
  };

  Game.updateAllUI = function () {
    previousUpdateAllUI.call(this);
    this.applyShortItemNotes();
    this.updateRoundModeRewardLabels();
  };
})();
