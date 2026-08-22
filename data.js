// DEADLINE — Stage 2
// 공용 게임 데이터. 이후 단계에서도 이 파일을 기준으로 확장합니다.

"use strict";

const GAME_DATA = {
  version: "v0.2.1",
  stage: 2,
  board: { columns: 5, rows: 3 },

  // Stage 2까지는 등장 확률/가치 계산 없이 동일 확률로 랜덤 선택합니다.
  // 실제 등장 가중치와 점수 가치는 Stage 3 이후 연결합니다.
  symbols: [
    { id: "CH", code: "CH", name: "체리" },
    { id: "CO", code: "CO", name: "코인" },
    { id: "BL", code: "BL", name: "벨" },
    { id: "ST", code: "ST", name: "스타" },
    { id: "DM", code: "DM", name: "다이아" },
    { id: "CR", code: "CR", name: "크라운" },
    { id: "SV", code: "7", name: "세븐" }
  ],

  // Stage 1에서 확정한 v0.1.3 회전감 유지.
  reelMotion: {
    baseDuration: 1550,
    stopGap: 155,
    travelSymbols: 18,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  },

  // 점수 배율 값은 Stage 3에서 실제 계산에 사용합니다.
  // JACKPOT 배율은 현재 임시값이며 Stage 3/밸런스 단계에서 다시 조정합니다.
  patterns: {
    H3: { name: "가로 3", multiplier: 1 },
    H4: { name: "가로 4", multiplier: 2 },
    H5: { name: "가로 5", multiplier: 4 },
    JACKPOT: { name: "JACKPOT", multiplier: 12 },
    V3: { name: "세로 3", multiplier: 1.5 },
    DIAG: { name: "대각선", multiplier: 2 },
    V: { name: "V", multiplier: 6 },
    INV_V: { name: "역 V", multiplier: 6 },
    X: { name: "X", multiplier: 8 }
  },

  // 2단계 검증용 임시 샘플. 패턴 테스트 버튼으로 순환합니다.
  // JACKPOT 테스트는 '세븐 전용'이 아님을 확인하기 위해 체리로 15칸 전체를 채웁니다.
  patternTests: [
    { key: "H3", symbolId: "CH", coords: [[0, 1], [1, 1], [2, 1]] },
    { key: "H4", symbolId: "CH", coords: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    { key: "H5", symbolId: "CH", coords: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
    { key: "V3", symbolId: "CH", coords: [[2, 0], [2, 1], [2, 2]] },
    { key: "DIAG", symbolId: "CH", coords: [[0, 0], [1, 1], [2, 2]] },
    { key: "V", symbolId: "CH", coords: [[0, 0], [1, 1], [2, 2], [3, 1], [4, 0]] },
    { key: "INV_V", symbolId: "CH", coords: [[0, 2], [1, 1], [2, 0], [3, 1], [4, 2]] },
    { key: "X", symbolId: "CH", coords: [[0, 0], [4, 0], [2, 1], [0, 2], [4, 2]] },
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
