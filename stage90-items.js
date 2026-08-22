// DEADLINE — v0.9.0 아이템 대형 확장 / 등급 / Modifier 데이터
"use strict";

(() => {
  GAME_DATA.version = "v0.9.0";
  GAME_DATA.stage = 9;

  GAME_DATA.shop.offerCount = 6;
  GAME_DATA.shop.baseMaxOwnedItems = 6;
  GAME_DATA.shop.maxOwnedItems = 6;
  GAME_DATA.shop.maxExpandedItems = 12;

  GAME_DATA.rarities = {
    COMMON: { name: "COMMON", label: "커먼", rank: 0 },
    RARE: { name: "RARE", label: "레어", rank: 1 },
    EPIC: { name: "EPIC", label: "에픽", rank: 2 },
    LEGENDARY: { name: "LEGENDARY", label: "레전더리", rank: 3 }
  };

  GAME_DATA.modifiers = {
    GOLDEN: { name: "황금", icon: "✨" },
    TICKET: { name: "티켓", icon: "🎟️" },
    REPEAT: { name: "반복", icon: "↻" },
    CHAIN: { name: "연쇄", icon: "⛓️" }
  };

  const EXISTING_META = {
    cherry_sticker: { rarity: "COMMON", icon: "🍒" },
    coin_polish: { rarity: "COMMON", icon: "🪙" },
    bell_hammer: { rarity: "COMMON", icon: "🔔" },
    star_lens: { rarity: "COMMON", icon: "⭐" },
    diamond_cutter: { rarity: "RARE", icon: "💎" },
    crown_seal: { rarity: "RARE", icon: "👑" },
    seven_stamp: { rarity: "RARE", icon: "7️⃣" },
    horizontal_wire: { rarity: "COMMON", icon: "➖" },
    vertical_wire: { rarity: "COMMON", icon: "↕️" },
    diagonal_ruler: { rarity: "RARE", icon: "📐" },
    v_frame: { rarity: "RARE", icon: "🔻" },
    x_bridge: { rarity: "RARE", icon: "✕" },
    jackpot_fuse: { rarity: "EPIC", icon: "🎰" },
    market_amp: { rarity: "RARE", icon: "📈" },
    premium_terminal: { rarity: "EPIC", icon: "🖥️" },
    opening_alert: { rarity: "RARE", icon: "🔔" },
    closing_bell: { rarity: "RARE", icon: "🕛" },
    diverse_portfolio: { rarity: "RARE", icon: "📊" },
    ticket_punch: { rarity: "RARE", icon: "🎟️" },
    refresh_coupon: { rarity: "RARE", icon: "♻️" },
    echo_chip: { rarity: "RARE", icon: "📡" },
    horizontal_relay: { rarity: "RARE", icon: "➡️" },
    diamond_echo: { rarity: "EPIC", icon: "💎" },
    jackpot_capacitor: { rarity: "EPIC", icon: "⚡" },
    amplifier_coil: { rarity: "EPIC", icon: "🌀" },
    chain_relay: { rarity: "EPIC", icon: "🔗" }
  };

  (GAME_DATA.items || []).forEach((item) => {
    const meta = EXISTING_META[item.id] || { rarity: "COMMON", icon: "◆" };
    Object.assign(item, meta);
  });

  const NEW_ITEMS = [
    {
      id: "green_pepper", name: "풋고추", icon: "🌶️", category: "확률", rarity: "COMMON", price: 2,
      note: "15% 확률로 이번 리롤 행운 증가 · 9회 발동 후 소멸",
      effect: { type: "chance_spin_luck", chance: 0.15, luck: 0.45, charges: 9 }
    },
    {
      id: "broken_magnet", name: "고장난 자석", icon: "🧲", category: "구제", rarity: "COMMON", price: 2,
      note: "꽝이면 25% 확률로 가장 싼 심볼 1개 재추첨",
      effect: { type: "miss_reroll_lowest", chance: 0.25 }
    },
    {
      id: "loose_change_jar", name: "잔돈통", icon: "🫙", category: "축적", rarity: "COMMON", price: 1,
      note: "꽝 리롤마다 $2 저장 · 다음 당첨에 전부 지급",
      effect: { type: "miss_bank", amount: 2 }
    },
    {
      id: "first_bell", name: "첫 종", icon: "🔔", category: "조건", rarity: "COMMON", price: 2,
      note: "라운드 첫 당첨 지급액 ×1.20",
      effect: { type: "first_win_mult", factor: 1.2 }
    },
    {
      id: "torn_ticket", name: "찢어진 티켓", icon: "🎫", category: "확률", rarity: "COMMON", price: 2,
      note: "라운드 시작 시 20% 확률로 티켓 +1",
      effect: { type: "round_start_ticket_chance", chance: 0.2, amount: 1 }
    },
    {
      id: "repeat_disc", name: "반복 디스크", icon: "💿", category: "반복", rarity: "COMMON", price: 2,
      note: "7번째 리롤마다 모든 당첨 패턴 한 번 더 발동",
      effect: { type: "retrigger_every", every: 7 }
    },
    {
      id: "cardboard_expansion", name: "골판지 확장팩", icon: "📦", category: "공간", rarity: "COMMON", price: 2,
      note: "보유 아이템 최대치 +1 · 구매 즉시 적용",
      unique: true, consumableOnPurchase: true,
      effect: { type: "inventory_capacity", amount: 1 }
    },
    {
      id: "hot_pepper", name: "매운 고추", icon: "🌶️", category: "확률", rarity: "RARE", price: 3,
      note: "패턴마다 10% 확률로 재발동 · 7회 발동 후 소멸",
      effect: { type: "pattern_retrigger_chance", chance: 0.1, charges: 7 }
    },
    {
      id: "red_pepper", name: "붉은 고추", icon: "🌶️", category: "확률", rarity: "RARE", price: 3,
      note: "20% 확률로 이번 리롤 지급액 ×1.30 · 8회 발동 후 소멸",
      effect: { type: "chance_spin_mult", chance: 0.2, factor: 1.3, charges: 8 }
    },
    {
      id: "piggy_bank", name: "저금통", icon: "🐷", category: "축적", rarity: "RARE", price: 3,
      note: "매 리롤 $2 저장 · 판매 시 저장금 획득",
      effect: { type: "spin_bank", amount: 2 }
    },
    {
      id: "broken_calculator", name: "고장난 계산기", icon: "🧮", category: "반복", rarity: "RARE", price: 4,
      note: "패턴마다 20% 확률로 한 번 더 발동",
      effect: { type: "pattern_retrigger_chance", chance: 0.2 }
    },
    {
      id: "recycle_circuit", name: "재활용 회로", icon: "♻️", category: "구제", rarity: "RARE", price: 3,
      note: "꽝 2회 연속이면 다음 당첨 지급액 ×1.50",
      effect: { type: "miss_streak_mult", threshold: 2, factor: 1.5 }
    },
    {
      id: "monocle_lens", name: "외눈 렌즈", icon: "🧿", category: "조건", rarity: "RARE", price: 3,
      note: "당첨 패턴이 정확히 1개면 지급액 ×1.50",
      effect: { type: "exact_pattern_mult", count: 1, factor: 1.5 }
    },
    {
      id: "points_card", name: "포인트 카드", icon: "💳", category: "상점", rarity: "RARE", price: 3,
      note: "상점 새로고침 3회마다 다음 1회 무료",
      effect: { type: "shop_reroll_free_every", every: 3 }
    },
    {
      id: "disposable_amp", name: "일회용 증폭기", icon: "🧨", category: "소모", rarity: "RARE", price: 3,
      note: "다음 잭팟 지급액 ×2.00 · 발동 후 소멸",
      effect: { type: "next_jackpot_mult", factor: 2 }
    },
    {
      id: "gold_plater", name: "황금 도금기", icon: "✨", category: "Modifier", rarity: "RARE", price: 3,
      note: "생성 심볼이 6% 확률로 ✨ 황금화",
      effect: { type: "modifier_generator", modifier: "GOLDEN", chance: 0.06 }
    },
    {
      id: "ticket_printer", name: "티켓 인쇄기", icon: "🖨️", category: "Modifier", rarity: "RARE", price: 3,
      note: "생성 심볼이 6% 확률로 🎟️ 티켓화",
      effect: { type: "modifier_generator", modifier: "TICKET", chance: 0.06 }
    },
    {
      id: "repeat_stamp", name: "반복 스탬프", icon: "🔁", category: "Modifier", rarity: "RARE", price: 4,
      note: "생성 심볼이 5% 확률로 ↻ 반복화",
      effect: { type: "modifier_generator", modifier: "REPEAT", chance: 0.05 }
    },
    {
      id: "chain_seal", name: "연쇄 인장", icon: "⛓️", category: "Modifier", rarity: "RARE", price: 4,
      note: "생성 심볼이 5% 확률로 ⛓️ 연쇄화",
      effect: { type: "modifier_generator", modifier: "CHAIN", chance: 0.05 }
    },
    {
      id: "asset_certificate", name: "자산 증명서", icon: "📜", category: "공간", rarity: "RARE", price: 4,
      note: "보유 아이템 최대치 +2 · 구매 즉시 적용",
      unique: true, consumableOnPurchase: true,
      effect: { type: "inventory_capacity", amount: 2 }
    },
    {
      id: "probability_booster", name: "확률 증폭기", icon: "🎲", category: "확률", rarity: "EPIC", price: 5,
      note: "보유 확률형 아이템의 발동 확률 ×1.50",
      effect: { type: "chance_multiplier", factor: 1.5 }
    },
    {
      id: "lucky_cat", name: "행운 고양이", icon: "🐈", category: "성장", rarity: "EPIC", price: 5,
      note: "확률형 효과 성공마다 자신의 지급 보너스 +2%",
      effect: { type: "chance_growth", step: 0.02 }
    },
    {
      id: "growing_mushroom", name: "증식 버섯", icon: "🍄", category: "성장", rarity: "EPIC", price: 5,
      note: "한 리롤의 3번째 패턴부터 패턴마다 지급액 +15%",
      effect: { type: "pattern_ramp", startAt: 3, step: 0.15 }
    },
    {
      id: "compound_circuit", name: "복리 회로", icon: "📈", category: "연쇄", rarity: "EPIC", price: 5,
      note: "같은 패턴의 연쇄가 길어질수록 트리거 지급 증가",
      effect: { type: "trigger_chain_scale", step: 0.12 }
    },
    {
      id: "oil_can", name: "오일 캔", icon: "🛢️", category: "보드", rarity: "EPIC", price: 5,
      note: "5번째 리롤마다 당첨되지 않은 릴 하나 자동 재추첨",
      effect: { type: "periodic_column_reroll", every: 5 }
    },
    {
      id: "adaptive_chip", name: "적응형 칩", icon: "🧬", category: "성장", rarity: "EPIC", price: 5,
      note: "같은 심볼이 3회 연속 당첨되면 그 심볼 기본 가치 영구 +1",
      effect: { type: "repeat_symbol_growth", threshold: 3, amount: 1 }
    },
    {
      id: "black_pepper", name: "검은 고추", icon: "🌶️", category: "확률", rarity: "EPIC", price: 5,
      note: "10% 확률로 패턴 재발동 · 성공할 때마다 확률 +2%",
      effect: { type: "pattern_retrigger_chance", chance: 0.1, growthOnSuccess: 0.02 }
    },
    {
      id: "royal_plater", name: "왕실 도금기", icon: "👑", category: "Modifier", rarity: "EPIC", price: 5,
      note: "💎·👑·7️⃣가 14% 확률로 ✨ 황금화",
      effect: { type: "modifier_generator", modifier: "GOLDEN", chance: 0.14, symbolIds: ["DM", "CR", "SV"] }
    },
    {
      id: "vip_printer", name: "VIP 인쇄기", icon: "🎫", category: "Modifier", rarity: "EPIC", price: 5,
      note: "🔔·⭐·💎가 12% 확률로 🎟️ 티켓화",
      effect: { type: "modifier_generator", modifier: "TICKET", chance: 0.12, symbolIds: ["BL", "ST", "DM"] }
    },
    {
      id: "echo_tape", name: "에코 테이프", icon: "📼", category: "반복", rarity: "EPIC", price: 5,
      note: "↻ 재발동 패턴 지급액 ×1.35",
      effect: { type: "retrigger_mult", factor: 1.35 }
    },
    {
      id: "pattern_forge", name: "패턴 대장간", icon: "🔨", category: "Modifier", rarity: "EPIC", price: 5,
      note: "⛓️ 연쇄가 패턴을 성장시킬 때 상승량 ×1.50",
      effect: { type: "chain_growth_mult", factor: 1.5 }
    },
    {
      id: "overload_shelf", name: "과적재 선반", icon: "🗄️", category: "공간", rarity: "EPIC", price: 5,
      note: "보유 아이템 최대치 +3 · 새로고침 비용 +1T",
      unique: true, consumableOnPurchase: true,
      effect: { type: "inventory_capacity", amount: 3, rerollSurcharge: 1 }
    },
    {
      id: "double_settler", name: "이중 정산기", icon: "🧾", category: "반복", rarity: "EPIC", price: 5,
      note: "매 리롤 가장 높은 지급 패턴을 한 번 더 발동",
      effect: { type: "retrigger_highest", count: 1 }
    },
    {
      id: "god_of_chance", name: "확률의 신", icon: "🃏", category: "확률", rarity: "LEGENDARY", price: 7,
      note: "모든 확률형 아이템의 발동 판정을 한 번 추가 시도",
      unique: true,
      effect: { type: "chance_extra_roll", attempts: 1 }
    },
    {
      id: "market_prophecy", name: "시장 예언서", icon: "👁️", category: "보드", rarity: "LEGENDARY", price: 7,
      note: "패턴이 정확히 1개면 주변 심볼 2개를 해당 심볼로 변환",
      unique: true,
      effect: { type: "single_pattern_conversion", count: 2 }
    },
    {
      id: "golden_pepper", name: "황금 고추", icon: "🌶️", category: "확률", rarity: "LEGENDARY", price: 7,
      note: "5% 확률로 패턴 재발동 · 실패마다 +2% · 성공 시 5%로 초기화",
      unique: true,
      effect: { type: "pattern_retrigger_chance", chance: 0.05, failGrowth: 0.02, resetOnSuccess: true }
    },
    {
      id: "perpetual_engine", name: "영구기관", icon: "♾️", category: "반복", rarity: "LEGENDARY", price: 7,
      note: "라운드에서 ↻ 발동할 때마다 이후 재발동 지급액 +10%",
      unique: true,
      effect: { type: "retrigger_round_ramp", step: 0.1 }
    },
    {
      id: "double_imprint", name: "이중 각인", icon: "🧬", category: "Modifier", rarity: "LEGENDARY", price: 7,
      note: "심볼 하나에 Modifier를 최대 2개까지 허용",
      unique: true,
      effect: { type: "modifier_slots", max: 2 }
    }
  ];

  const existingIds = new Set((GAME_DATA.items || []).map((item) => item.id));
  NEW_ITEMS.forEach((item) => {
    if (!existingIds.has(item.id)) GAME_DATA.items.push(item);
  });

  // 레전더리는 기본적으로 한 런에서 동일 아이템 중복 보유를 허용하지 않습니다.
  (GAME_DATA.items || []).forEach((item) => {
    if (!item.rarity) item.rarity = "COMMON";
    if (!item.icon) item.icon = "◆";
    if (item.rarity === "LEGENDARY") item.unique = true;
  });
})();
