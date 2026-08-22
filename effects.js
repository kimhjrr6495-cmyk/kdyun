// DEADLINE — Stage 1
// 이 파일은 후속 이펙트 시스템 전용입니다.
// 현재 단계에서는 의도적으로 시각/사운드 이펙트를 거의 구현하지 않습니다.
// 지금 확인할 것은 '릴이 얼마나 자연스럽게 움직이고 멈추는가'입니다.
//
// 예정:
// - Stage 3: 당첨 숫자 카운트업 / 민트 플래시 / 당첨 칸 강조
// - Stage 8+: 아이템 발동 알림 / 재발동 체인 연출
// - Stage 12: 릴 정지음, 최종 사운드 폴리싱, 위험 연출,
//             처리 중..., 잔고 미세 떨림, 서브리미널 문구 등

"use strict";

const EffectsManager = {
  stage: 1,
  enabled: false,
  status: "DEFERRED_FOR_LATER_STAGES"
};

window.EffectsManager = EffectsManager;
