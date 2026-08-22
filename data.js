// DEADLINE — Stage 0
// 게임 데이터 정의 전용 파일.
// 현재는 후속 단계에서 사용할 기본 구조만 예약합니다.

"use strict";

const GAME_DATA = {
  stage: 0,
  board: { columns: 5, rows: 3 },
  palette: {
    background: "#F7F8FA",
    text: "#1A1D23",
    line: "#E4E6EB",
    gain: "#00D492",
    danger: "#FF5C5C"
  }
};

window.GAME_DATA = GAME_DATA;
