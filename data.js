// DEADLINE — Stage 6
// 라운드 / 마감 / 경제 / 상점 시스템에 필요한 공용 게임 데이터.

"use strict";

const GAME_DATA = {
  version: "v0.6.2",
  stage: 6,
  board: { columns: 5, rows: 3 },

  // 실제 점수 계산에 사용합니다. 등장 확률 가중치는 아직 연결하지 않습니다.
  symbols: [
    { id: "CH", code: "CH", name: "체리", value: 2, multiplier: 1 },
    { id: "CO", code: "CO", name: "코인", value: 2, multiplier: 1 },
    { id: "BL", code: "BL", name: "벨", value: 3, multiplier: 1 },
    { id: "ST", code: "ST", name: "스타", value: 4, multiplier: 1 },
    { id: "DM", code: "DM", name: "다이아", value: 6, multiplier: 1 },
    { id: "CR", code: "CR", name: "크라운", value: 8, multiplier: 1 },
    { id: "SV", code: "7", name: "세븐", value: 12, multiplier: 1 }
  ],

  // Stage 1에서 확정한 v0.1.3 회전감 유지.
  reelMotion: {
    baseDuration: 1550,
    stopGap: 155,
    travelSymbols: 18,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  },

  // 심볼 가치 × 심볼 배율 × 패턴 칸 수 × 패턴 기본값 × 패턴 배율 × 전체 배율.
  // 겹쳐 성립하는 패턴은 각각 계산해 모두 합산합니다.
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

  // Stage 6.2에서는 라운드 준비 화면에서 납부/금고/상점을 먼저 정리한 뒤
  // 7회(+1T) 또는 3회(+3T)를 선택하고 시작 버튼으로 확정합니다.
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

  // Stage 6 상점 뼈대. 실제 아이템 효과/20개 콘텐츠는 Stage 7에서 연결합니다.
  shop: {
    offerCount: 4,
    maxOwnedItems: 6,
    rerollStartCost: 1,
    rerollCostStep: 1
  },

  // 개발 중 판정/점수 검수용 임시 샘플. 지갑/회전 수/티켓에는 영향 없음.
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
