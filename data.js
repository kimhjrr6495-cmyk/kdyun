// DEADLINE — Stage 1
// 공용 게임 데이터. 이후 단계에서도 이 파일을 기준으로 확장합니다.

"use strict";

const GAME_DATA = {
  version: "v0.1.4",
  stage: 1,
  board: { columns: 5, rows: 3 },

  // Stage 1에서는 확률/가치 계산 없이 동일 확률로 랜덤 선택합니다.
  // 실제 등장 가중치와 점수 가치는 후속 단계에서 연결합니다.
  symbols: [
    { id: "CH", code: "CH", name: "체리" },
    { id: "CO", code: "CO", name: "코인" },
    { id: "BL", code: "BL", name: "벨" },
    { id: "ST", code: "ST", name: "스타" },
    { id: "DM", code: "DM", name: "다이아" },
    { id: "CR", code: "CR", name: "크라운" },
    { id: "SV", code: "7", name: "세븐" }
  ],

  // Stage 1 릴 감각 조절값.
  // v0.1.4: 4·5번 릴의 끝부분 감속이 너무 길게 느껴지는 문제를 조정했습니다.
  // 정지 시점은 유지하면서 4·5번 릴만 더 빠른 감속 곡선을 사용합니다.
  reelMotion: {
    baseDuration: 1550,
    stopGap: 155,
    travelSymbols: 18,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    lateReelStartIndex: 3,
    lateEasing: "cubic-bezier(0.22, 0.78, 0.32, 1)"
  },

  palette: {
    background: "#F7F8FA",
    text: "#1A1D23",
    line: "#E4E6EB",
    gain: "#00D492",
    danger: "#FF5C5C"
  }
};

window.GAME_DATA = GAME_DATA;
