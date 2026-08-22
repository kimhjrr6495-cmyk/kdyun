// DEADLINE — Stage 7
// 라운드 / 마감 / 경제 / 상점 / 첫 20개 아이템 데이터를 관리합니다.

"use strict";

const GAME_DATA = {
  version: "v0.7.0",
  stage: 7,
  board: { columns: 5, rows: 3 },

  // 등장 확률 가중치는 아직 연결하지 않습니다. 현재 심볼 선택은 균등 랜덤입니다.
  symbols: [
    { id: "CH", code: "CH", name: "체리", value: 2, multiplier: 1 },
    { id: "CO", code: "CO", name: "코인", value: 2, multiplier: 1 },
    { id: "BL", code: "BL", name: "벨", value: 3, multiplier: 1 },
    { id: "ST", code: "ST", name: "스타", value: 4, multiplier: 1 },
    { id: "DM", code: "DM", name: "다이아", value: 6, multiplier: 1 },
    { id: "CR", code: "CR", name: "크라운", value: 8, multiplier: 1 },
    { id: "SV", code: "7", name: "세븐", value: 12, multiplier: 1 }
  ],

  reelMotion: {
    baseDuration: 1550,
    stopGap: 155,
    travelSymbols: 18,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  },

  scoring: {
    patternMultiplier: 1,
    globalMultiplier: 1,
    rounding: "round",
    countUpDuration: 600
  },

  patterns: {
    H3: { name: "가로 3", baseValue: 1 },
    H4: { name: "가로 4", baseValue: 2 },
    H5: { name: "가로 5", baseValue: 4 },
    JACKPOT: { name: "잭팟", baseValue: 12 },
    V3: { name: "세로 3", baseValue: 1.5 },
    DIAG: { name: "대각선", baseValue: 2 },
    V: { name: "V", baseValue: 6 },
    INV_V: { name: "역 V", baseValue: 6 },
    X: { name: "X", baseValue: 8 }
  },

  deadline: {
    roundsPerDeadline: 3,
    targets: [
      80,
      220,
      700,
      2500,
      10000,
      50000,
      250000,
      1500000,
      12000000,
      120000000
    ],
    modes: {
      NORMAL: {
        id: "NORMAL",
        name: "7회",
        spins: 7,
        tickets: 1,
        description: "7회 리롤 · 티켓 +1"
      },
      RISK: {
        id: "RISK",
        name: "3회",
        spins: 3,
        tickets: 3,
        description: "3회 리롤 · 티켓 +3"
      }
    }
  },

  economy: {
    depositUnitRatio: 0.05,
    earlyPaymentTicketPerUnusedRound: 2,
    currencyAnimationDuration: 600,
    gainFloatDuration: 1500,
    autoAdvanceDelay: 650,
    vaultTerms: {
      2: {
        rounds: 2,
        roundRates: [0.15, 0.15],
        ticketRounds: [2],
        totalTickets: 1
      },
      4: {
        rounds: 4,
        roundRates: [0.15, 0.15, 0.25, 0.25],
        ticketRounds: [2, 4],
        totalTickets: 2
      }
    }
  },

  shop: {
    offerCount: 4,
    maxOwnedItems: 6,
    rerollStartCost: 1,
    rerollCostStep: 1
  },

  // Stage 7 첫 20개 아이템. 같은 아이템을 여러 개 보유하면 효과가 중첩됩니다.
  items: [
    {
      id: "cherry_sticker",
      name: "체리 스티커",
      category: "심볼",
      price: 1,
      note: "체리 패턴의 심볼 가치 +1",
      effect: { type: "symbol_value", symbolId: "CH", amount: 1 }
    },
    {
      id: "coin_polish",
      name: "코인 광택제",
      category: "심볼",
      price: 1,
      note: "코인 패턴의 심볼 가치 +1",
      effect: { type: "symbol_value", symbolId: "CO", amount: 1 }
    },
    {
      id: "bell_hammer",
      name: "벨 해머",
      category: "심볼",
      price: 2,
      note: "벨 패턴의 심볼 가치 +2",
      effect: { type: "symbol_value", symbolId: "BL", amount: 2 }
    },
    {
      id: "star_lens",
      name: "스타 렌즈",
      category: "심볼",
      price: 2,
      note: "스타 패턴의 심볼 가치 +2",
      effect: { type: "symbol_value", symbolId: "ST", amount: 2 }
    },
    {
      id: "diamond_cutter",
      name: "다이아 커터",
      category: "심볼",
      price: 3,
      note: "다이아 패턴의 심볼 가치 +3",
      effect: { type: "symbol_value", symbolId: "DM", amount: 3 }
    },
    {
      id: "crown_seal",
      name: "크라운 인장",
      category: "심볼",
      price: 3,
      note: "크라운 패턴의 심볼 가치 +3",
      effect: { type: "symbol_value", symbolId: "CR", amount: 3 }
    },
    {
      id: "seven_stamp",
      name: "세븐 스탬프",
      category: "심볼",
      price: 4,
      note: "세븐 패턴의 심볼 가치 +4",
      effect: { type: "symbol_value", symbolId: "SV", amount: 4 }
    },
    {
      id: "horizontal_wire",
      name: "가로 배선",
      category: "패턴",
      price: 2,
      note: "가로 3/4/5 점수 ×1.20",
      effect: { type: "pattern_mult", keys: ["H3", "H4", "H5"], factor: 1.2 }
    },
    {
      id: "vertical_wire",
      name: "세로 배선",
      category: "패턴",
      price: 2,
      note: "세로 3 점수 ×1.25",
      effect: { type: "pattern_mult", keys: ["V3"], factor: 1.25 }
    },
    {
      id: "diagonal_ruler",
      name: "사선 자",
      category: "패턴",
      price: 2,
      note: "대각선 점수 ×1.30",
      effect: { type: "pattern_mult", keys: ["DIAG"], factor: 1.3 }
    },
    {
      id: "v_frame",
      name: "V 프레임",
      category: "패턴",
      price: 3,
      note: "V / 역 V 점수 ×1.30",
      effect: { type: "pattern_mult", keys: ["V", "INV_V"], factor: 1.3 }
    },
    {
      id: "x_bridge",
      name: "X 브릿지",
      category: "패턴",
      price: 3,
      note: "X 패턴 점수 ×1.35",
      effect: { type: "pattern_mult", keys: ["X"], factor: 1.35 }
    },
    {
      id: "jackpot_fuse",
      name: "잭팟 퓨즈",
      category: "패턴",
      price: 5,
      note: "잭팟 점수 ×1.50",
      effect: { type: "pattern_mult", keys: ["JACKPOT"], factor: 1.5 }
    },
    {
      id: "market_amp",
      name: "시장 증폭기",
      category: "전체",
      price: 3,
      note: "모든 패턴 점수 ×1.08",
      effect: { type: "global_mult", factor: 1.08 }
    },
    {
      id: "premium_terminal",
      name: "프리미엄 터미널",
      category: "전체",
      price: 5,
      note: "모든 패턴 점수 ×1.15",
      effect: { type: "global_mult", factor: 1.15 }
    },
    {
      id: "opening_alert",
      name: "개장 알림",
      category: "조건",
      price: 2,
      note: "라운드 첫 리롤 점수 ×1.25",
      effect: { type: "conditional_mult", condition: "FIRST_SPIN", factor: 1.25 }
    },
    {
      id: "closing_bell",
      name: "마감 벨",
      category: "조건",
      price: 3,
      note: "라운드 마지막 리롤 점수 ×1.35",
      effect: { type: "conditional_mult", condition: "LAST_SPIN", factor: 1.35 }
    },
    {
      id: "diverse_portfolio",
      name: "분산 포트폴리오",
      category: "조건",
      price: 3,
      note: "결과에 서로 다른 심볼 6종 이상이면 점수 ×1.25",
      effect: { type: "conditional_mult", condition: "DIVERSE_6", factor: 1.25 }
    },
    {
      id: "ticket_punch",
      name: "티켓 펀치",
      category: "경제",
      price: 4,
      note: "라운드 시작 시 선택 보상 티켓 +1",
      effect: { type: "mode_ticket_bonus", amount: 1 }
    },
    {
      id: "refresh_coupon",
      name: "새로고침 쿠폰",
      category: "경제",
      price: 3,
      note: "상점 새로고침 비용 -1T · 최소 1T",
      effect: { type: "shop_reroll_discount", amount: 1 }
    }
  ],

  patternTests: [
    { key: "H3", symbolId: "CH", coords: [[0, 1], [1, 1], [2, 1]] },
    { key: "H4", symbolId: "CH", coords: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    { key: "H5", symbolId: "CH", coords: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
    { key: "V3", symbolId: "BL", coords: [[2, 0], [2, 1], [2, 2]] },
    { key: "DIAG", symbolId: "ST", coords: [[0, 0], [1, 1], [2, 2]] },
    { key: "V", symbolId: "DM", coords: [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]] },
    { key: "INV_V", symbolId: "CR", coords: [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]] },
    { key: "X", symbolId: "SV", coords: [[0, 0], [4, 0], [2, 1], [0, 2], [4, 2]] },
    { key: "JACKPOT", symbolId: "CH", fullBoard: true }
  ],

  palette: {
    background: "#F7F8FA",
    text: "#1A1D23",
    line: "#E4E6EB",
    gain: "#00D492",
    danger: "#FF5C5C"
  }
};

window.GAME_DATA = GAME_DATA;
