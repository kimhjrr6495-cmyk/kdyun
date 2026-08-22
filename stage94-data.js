// DEADLINE — v0.9.4 WILD / ERROR / 신규 아이템 데이터
"use strict";

(() => {
  GAME_DATA.version = "v0.9.4";
  GAME_DATA.stage = 9;

  GAME_DATA.stage94 = {
    wildId: "WD",
    errorId: "ER",
    jackpotWildLimit: 1,
    maxErrorConversionsPerSpin: 8
  };

  const SPECIAL_SYMBOLS = [
    { id: "WD", code: "WILD", name: "와일드", value: 0, multiplier: 1, special: true },
    { id: "ER", code: "ERROR", name: "오류", value: 0, multiplier: 1, special: true }
  ];

  SPECIAL_SYMBOLS.forEach((symbol) => {
    if (!(GAME_DATA.symbols || []).some((entry) => entry.id === symbol.id)) {
      GAME_DATA.symbols.push(symbol);
    }
  });

  const STAGE94_ITEMS = [
    {
      id: "joker_card", name: "조커 카드", icon: "🃏", category: "WILD", rarity: "RARE", price: 4,
      note: "WILD 기본 등장 가중치 +2%p",
      effect: { type: "wild_weight_add", amount: 2 }
    },
    {
      id: "masquerade", name: "가면극", icon: "🎭", category: "WILD", rarity: "EPIC", price: 5,
      note: "WILD가 완성한 패턴 지급액 ×1.35",
      effect: { type: "wild_pattern_mult", factor: 1.35 }
    },
    {
      id: "king_joker", name: "왕의 조커", icon: "👑", category: "WILD", rarity: "LEGENDARY", price: 7,
      note: "WILD가 💎·👑·7️⃣를 대신하면 지급액 ×1.50",
      unique: true,
      effect: { type: "wild_high_value_mult", factor: 1.5, symbolIds: ["DM", "CR", "SV"] }
    },
    {
      id: "error_collector", name: "오류 수집기", icon: "🧲", category: "ERROR", rarity: "RARE", price: 3,
      note: "ERROR 1개마다 $3 저장 · 다음 당첨에 지급",
      effect: { type: "error_bank", amount: 3 }
    },
    {
      id: "overclock", name: "오버클럭", icon: "⚠️", category: "ERROR", rarity: "RARE", price: 4,
      note: "ERROR 등장 가중치 +3%p · 모든 지급액 ×1.20",
      effect: { type: "global_mult", factor: 1.2, errorWeightAdd: 3 }
    },
    {
      id: "debugger", name: "디버거", icon: "🔧", category: "ERROR", rarity: "COMMON", price: 2,
      note: "매 리롤 첫 ERROR를 정상 심볼로 변환",
      effect: { type: "error_convert_first", count: 1 }
    },
    {
      id: "backup_file", name: "백업 파일", icon: "💾", category: "ERROR", rarity: "RARE", price: 4,
      note: "ERROR가 35% 확률로 직전 보드의 심볼로 복구",
      effect: { type: "error_restore_chance", chance: 0.35 }
    },
    {
      id: "error_amplifier", name: "오류 증폭기", icon: "☣️", category: "ERROR", rarity: "EPIC", price: 5,
      note: "ERROR EVENT 발생 시 남은 ERROR 1개당 $10 추가 지급",
      effect: { type: "error_event_cash", amountPerError: 10 }
    },
    {
      id: "kernel_panic", name: "커널 패닉", icon: "🖥️", category: "ERROR", rarity: "LEGENDARY", price: 7,
      note: "ERROR EVENT 발생 시 모든 ERROR를 WILD로 변환",
      unique: true,
      effect: { type: "error_event_all_to_wild" }
    },
    {
      id: "glitch_router", name: "글리치 라우터", icon: "🔀", category: "ERROR", rarity: "EPIC", price: 5,
      note: "ERROR EVENT 때 ERROR 1개를 다른 셀과 교환",
      effect: { type: "error_swap", count: 1 }
    },
    {
      id: "chaos_chip", name: "카오스 칩", icon: "🎲", category: "특수", rarity: "EPIC", price: 5,
      note: "WILD와 ERROR 등장 가중치 각각 +2%p",
      effect: { type: "special_weight_shift", wildAdd: 2, errorAdd: 2 }
    },
    {
      id: "unstable_joker", name: "불안정한 조커", icon: "🃏", category: "ERROR", rarity: "LEGENDARY", price: 7,
      note: "ERROR가 35% 확률로 WILD로 변환",
      unique: true,
      effect: { type: "error_to_wild_chance", chance: 0.35 }
    }
  ];

  const existingIds = new Set((GAME_DATA.items || []).map((item) => item.id));
  STAGE94_ITEMS.forEach((item) => {
    if (!existingIds.has(item.id)) {
      GAME_DATA.items.push(item);
      existingIds.add(item.id);
    }
  });
})();
