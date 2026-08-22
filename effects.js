// DEADLINE — Stage 0
// 이 파일은 후속 이펙트 시스템 전용입니다.
// 현재 단계에서는 시각/사운드 이펙트를 구현하지 않습니다.
//
// 예정:
// - Stage 1: 릴 정지 UI 사운드의 최소 구현 여부 검토
// - Stage 3: 당첨 숫자 카운트업 / 민트 플래시 / 당첨 칸 강조
// - Stage 8+: 아이템 발동 알림 / 재발동 체인 연출
// - Stage 12: 위험 연출, 처리 중..., 미세 떨림, 최종 사운드 폴리싱

"use strict";

const EffectsManager = {
  stage: 0,
  enabled: false
};

window.EffectsManager = EffectsManager;
