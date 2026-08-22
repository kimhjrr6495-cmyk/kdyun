// DEADLINE — Stage 0
// 현재 단계에서는 게임 로직을 구현하지 않습니다.
// Stage 1부터 5×3 릴 회전, 심볼 생성, 입력 처리를 이 파일에 추가합니다.

"use strict";

const Game = {
  stage: 0,
  status: "UI_ONLY",
  init() {
    console.info("DEADLINE Stage 0: UI skeleton loaded.");
  }
};

window.addEventListener("DOMContentLoaded", () => Game.init());
