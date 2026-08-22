// DEADLINE — Stage 1
// 공용 게임 데이터. 이후 단계에서도 이 파일을 기준으로 확장합니다.

"use strict";

const GAME_DATA = {
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
  // 2026-08-22 조정: 전체 회전이 빠르다는 피드백을 반영해
  // 기본 회전 시간과 각 릴의 정지 간격을 조금 늘렸습니다.
  // 최종 사운드/정지 이펙트가 들어갈 때 다시 미세조정할 예정입니다.
  reelMotion: {
    baseDuration: 1150,
    stopGap: 145,
    travelSymbols: 18,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
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
