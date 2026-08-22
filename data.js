// DEADLINE — Stage 3
// 점수 계산에 필요한 공용 게임 데이터.

"use strict";

const GAME_DATA = {
  version: "v0.3.2",
  stage: 3,
  board: { columns: 5, rows: 3 },

  // Stage 3부터 기본 가치와 심볼 배율을 실제 점수 계산에 사용합니다.
  // 등장 확률 가중치는 아직 연결하지 않고, 현재 회전 결과는 기존처럼 동일 확률입니다.
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

  // v0.3.2 점수 공식:
  // 심볼 기본 가치 × 심볼 배율 × 패턴 포함 칸 수 × 패턴 기본값 × 패턴 배율 × 전체 배율
  // 겹쳐서 동시에 성립하는 패턴은 각각 계산해 모두 합산합니다.
  // 예: V = 대각선 2개 + V / JACKPOT = 모든 성립 패턴 + JACKPOT 보너스.
  scoring: {
    patternMultiplier: 1,
    globalMultiplier: 1,
    rounding: "round",
    countUpDuration: 520
  },

  patterns: {
    H3: { name: "가로 3", baseValue: 1 },
    H4: { name: "가로 4", baseValue: 2 },
    H5: { name: "가로 5", baseValue: 4 },
    JACKPOT: { name: "JACKPOT", baseValue: 12 },
    V3: { name: "세로 3", baseValue: 1.5 },
    DIAG: { name: "대각선", baseValue: 2 },
    V: { name: "V", baseValue: 6 },
    INV_V: { name: "역 V", baseValue: 6 },
    X: { name: "X", baseValue: 8 }
  },

  // 개발 중 판정/점수 검증용 임시 샘플.
  // 실제 플레이 경제에는 반영하지 않고 '점수 미리보기'만 합니다.
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
