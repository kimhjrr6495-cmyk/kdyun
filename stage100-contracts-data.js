// DEADLINE — v1.0.0 Stage 10 Contracts data
"use strict";

(() => {
  GAME_DATA.contractTiers = {
    STANDARD: { id: "STANDARD", label: "일반", icon: "●" },
    RISK: { id: "RISK", label: "위험", icon: "▲" },
    EXTREME: { id: "EXTREME", label: "극한", icon: "◆" }
  };

  const reward = (...entries) => entries;
  const fx = (...entries) => entries;

  GAME_DATA.contracts = [
    { id:"fiscal_tightening", tier:"STANDARD", category:"ECONOMY", icon:"📉", name:"긴축 재정", note:"이번 마감의 상점 새로고침 비용이 50% 증가합니다.", effects:fx({type:"SHOP_REROLL_MULT",factor:1.5}), rewards:reward({type:"TICKETS",amount:3}) },
    { id:"zero_interest", tier:"RISK", category:"ECONOMY", icon:"🏦", name:"무이자 기간", note:"이번 마감 동안 마감 계좌 이자가 0%가 됩니다.", effects:fx({type:"INTEREST_SET",rate:0}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"vault_lockdown", tier:"RISK", category:"ECONOMY", icon:"🔒", name:"금고 봉쇄", note:"이번 마감 동안 새 금고 예치를 할 수 없습니다. 기존 잠금 예치는 계속 진행됩니다.", requires:["vault"], effects:fx({type:"VAULT_DISABLED"}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"cash_freeze", tier:"RISK", category:"ECONOMY", icon:"🧊", name:"현금 경색", note:"계약 체결 시 현재 지갑의 25%를 동결합니다. 마감 성공 시 전액 반환됩니다.", effects:fx({type:"FREEZE_WALLET_RATIO",ratio:0.25}), rewards:reward({type:"TICKETS",amount:3}) },
    { id:"premium_market", tier:"EXTREME", category:"ECONOMY", icon:"💸", name:"고비용 시장", note:"이번 마감의 상점 새로고침 비용이 2배가 됩니다.", effects:fx({type:"SHOP_REROLL_MULT",factor:2}), rewards:reward({type:"TICKETS",amount:2},{type:"FREE_REROLL",amount:1}) },
    { id:"deposit_first", tier:"STANDARD", category:"ECONOMY", icon:"📥", name:"투자 우선주의", note:"이번 마감에서 마감 계좌에 한 번 이상 납부하기 전에는 상점을 열 수 없습니다.", effects:fx({type:"SHOP_REQUIRES_DEPOSIT"}), rewards:reward({type:"SHINY_BONUS",amount:0.02}) },
    { id:"compound_tax", tier:"EXTREME", category:"ECONOMY", icon:"🧾", name:"복리 과세", note:"마감 계좌 이자는 절반, 상점 새로고침 비용은 25% 증가합니다.", effects:fx({type:"INTEREST_MULT",factor:0.5},{type:"SHOP_REROLL_MULT",factor:1.25}), rewards:reward({type:"TICKETS",amount:3},{type:"INTEREST_BONUS",amount:0.01}) },

    { id:"scarce_market", tier:"RISK", category:"SYMBOL", icon:"💎", name:"희소 시장", note:"💎·👑·7️⃣의 등장 가중치가 35% 감소합니다.", effects:fx({type:"HIGH_WEIGHT_MULT",factor:0.65}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"common_market", tier:"STANDARD", category:"SYMBOL", icon:"🍒", name:"서민 시장", note:"🍒·🪙 가중치 +60%, 💎·👑·7️⃣ 가중치 -30%.", effects:fx({type:"LOW_WEIGHT_MULT",factor:1.6},{type:"HIGH_WEIGHT_MULT",factor:0.7}), rewards:reward({type:"TICKETS",amount:3},{type:"SHINY_BONUS",amount:0.01}) },
    { id:"seven_ban", tier:"RISK", category:"SYMBOL", icon:"7️⃣", name:"세븐 금지령", note:"이번 마감 동안 7️⃣이 등장하지 않습니다.", effects:fx({type:"BAN_SYMBOL",symbolId:"SV"}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"wild_ban", tier:"STANDARD", category:"SYMBOL", icon:"🃏", name:"WILD 금지", note:"이번 마감 동안 WILD가 등장하지 않습니다.", tags:["wild"], effects:fx({type:"BAN_SYMBOL",symbolId:"WD"}), rewards:reward({type:"TICKETS",amount:3},{type:"SHINY_BONUS",amount:0.01}) },
    { id:"unstable_market", tier:"RISK", category:"SYMBOL", icon:"⚠️", name:"불안정 시장", note:"ERROR 가중치 +75%. ERROR EVENT 현금 지급은 2배가 됩니다.", tags:["error"], effects:fx({type:"ERROR_WEIGHT_MULT",factor:1.75},{type:"ERROR_CASH_MULT",factor:2}), rewards:reward({type:"TICKETS",amount:2}) },
    { id:"chaos_market", tier:"EXTREME", category:"SYMBOL", icon:"🌀", name:"카오스 시장", note:"매 라운드 시작 시 모든 심볼 등장 가중치가 무작위로 크게 흔들립니다.", effects:fx({type:"CHAOS_WEIGHTS"}), rewards:reward({type:"TICKETS",amount:5}) },
    { id:"luxury_tax", tier:"RISK", category:"SYMBOL", icon:"👑", name:"사치세", note:"💎·👑·7️⃣ 패턴 지급 -25%, 🍒·🪙 패턴 지급 +15%.", effects:fx({type:"HIGH_SYMBOL_SCORE_MULT",factor:0.75},{type:"LOW_SYMBOL_SCORE_MULT",factor:1.15}), rewards:reward({type:"RARE_GUARANTEE",amount:1}) },

    { id:"horizontal_ban", tier:"RISK", category:"PATTERN", icon:"↔️", name:"가로 금지", note:"H3·H4·H5 패턴이 지급 대상에서 제외됩니다.", effects:fx({type:"BAN_PATTERN_KEYS",keys:["H3","H4","H5"]}), rewards:reward({type:"TICKETS",amount:3}) },
    { id:"vertical_ban", tier:"STANDARD", category:"PATTERN", icon:"↕️", name:"세로 금지", note:"V3 패턴이 지급 대상에서 제외됩니다.", effects:fx({type:"BAN_PATTERN_KEYS",keys:["V3"]}), rewards:reward({type:"TICKETS",amount:2}) },
    { id:"diagonal_ban", tier:"STANDARD", category:"PATTERN", icon:"📐", name:"사선 금지", note:"DIAG 패턴이 지급 대상에서 제외됩니다.", effects:fx({type:"BAN_PATTERN_KEYS",keys:["DIAG"]}), rewards:reward({type:"TICKETS",amount:2}) },
    { id:"big_order", tier:"RISK", category:"PATTERN", icon:"📦", name:"대형 주문", note:"3칸 패턴 지급 -50%, 5칸 이상 패턴 지급 +25%.", effects:fx({type:"THREE_CELL_MULT",factor:0.5},{type:"FIVE_PLUS_MULT",factor:1.25}), rewards:reward({type:"TICKETS",amount:3}) },
    { id:"single_settlement", tier:"EXTREME", category:"PATTERN", icon:"1️⃣", name:"단일 정산", note:"한 리롤에서 가장 높은 지급액의 패턴 1개만 정산합니다.", effects:fx({type:"HIGHEST_ONLY"}), rewards:reward({type:"TICKETS",amount:5}) },
    { id:"diversified_settlement", tier:"RISK", category:"PATTERN", icon:"📊", name:"분산 투자", note:"같은 종류의 패턴은 한 리롤에서 가장 높은 1개만 정산합니다.", effects:fx({type:"UNIQUE_PATTERN_ONLY"}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"geometry_only", tier:"EXTREME", category:"PATTERN", icon:"✖️", name:"기하학 시장", note:"V·역V·X·JACKPOT만 지급됩니다. 일반 3칸/가로 패턴은 무효입니다.", effects:fx({type:"ALLOW_PATTERN_KEYS",keys:["V","INV_V","X","JACKPOT"]}), rewards:reward({type:"TICKETS",amount:3},{type:"RARE_GUARANTEE",amount:1}) },

    { id:"no_reroll", tier:"RISK", category:"SHOP", icon:"🚫", name:"리롤 금지", note:"이번 마감 동안 상점 새로고침을 사용할 수 없습니다.", effects:fx({type:"NO_SHOP_REROLL"}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"one_visit", tier:"RISK", category:"SHOP", icon:"🚪", name:"폐쇄 시장", note:"이번 마감에서 상점은 단 한 번만 열 수 있습니다.", effects:fx({type:"SHOP_MAX_VISITS",count:1}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"no_sell", tier:"STANDARD", category:"SHOP", icon:"📦", name:"판매 금지", note:"이번 마감 동안 보유 아이템을 판매할 수 없습니다.", requires:["sellable"], effects:fx({type:"NO_SELL"}), rewards:reward({type:"TICKETS",amount:2}) },
    { id:"rarity_control", tier:"RISK", category:"SHOP", icon:"🚧", name:"희귀품 통제", note:"이번 마감 동안 EPIC·LEGENDARY 아이템을 구매할 수 없습니다.", effects:fx({type:"BLOCK_RARITIES",rarities:["EPIC","LEGENDARY"]}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"narrow_storage", tier:"RISK", category:"SHOP", icon:"🗄️", name:"좁은 창고", note:"이번 마감 동안 아이템 보유 한도가 2칸 감소합니다.", requires:["items3"], effects:fx({type:"INVENTORY_CAP_MINUS",amount:2}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"shiny_suppression", tier:"RISK", category:"SHOP", icon:"🌑", name:"광택 억제", note:"이번 마감 동안 보유 SHINY 부가 효과가 작동하지 않습니다.", requires:["shiny"], effects:fx({type:"DISABLE_SHINY_TRAITS"}), rewards:reward({type:"TICKETS",amount:4},{type:"SHINY_BONUS",amount:0.03}) },
    { id:"shiny_embargo", tier:"EXTREME", category:"SHOP", icon:"✨", name:"SHINY 구매 금지", note:"이번 마감 동안 상점에 나온 SHINY 아이템을 구매할 수 없습니다.", effects:fx({type:"BLOCK_SHINY_PURCHASE"}), rewards:reward({type:"SUPPLY",amount:1}) },

    { id:"no_retrigger", tier:"RISK", category:"CHAIN", icon:"🔁", name:"무반복 시장", note:"이번 마감 동안 모든 Retrigger가 비활성화됩니다.", requires:["retrigger"], effects:fx({type:"NO_RETRIGGER"}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"chain_limit", tier:"RISK", category:"CHAIN", icon:"⛓️", name:"연쇄 차단", note:"패턴 하나당 Trigger 최대 발동 횟수가 4회로 제한됩니다.", requires:["trigger"], effects:fx({type:"TRIGGER_CAP",count:4}), rewards:reward({type:"TICKETS",amount:3}) },
    { id:"no_modifiers", tier:"RISK", category:"CHAIN", icon:"🧩", name:"무개조 시장", note:"이번 마감 동안 새 심볼 Modifier가 생성되지 않습니다.", requires:["modifier"], effects:fx({type:"NO_MODIFIERS"}), rewards:reward({type:"TICKETS",amount:3}) },
    { id:"golden_regulation", tier:"STANDARD", category:"CHAIN", icon:"✨", name:"황금 규제", note:"이번 마감 동안 GOLDEN Modifier 효과가 비활성화됩니다.", requires:["modifier"], effects:fx({type:"BLOCK_MODIFIER",modifier:"GOLDEN"}), rewards:reward({type:"TICKETS",amount:2}) },
    { id:"broken_chain", tier:"STANDARD", category:"CHAIN", icon:"⛓️", name:"끊어진 사슬", note:"이번 마감 동안 CHAIN Modifier 효과가 비활성화됩니다.", requires:["modifier"], effects:fx({type:"BLOCK_MODIFIER",modifier:"CHAIN"}), rewards:reward({type:"TICKETS",amount:2}) },
    { id:"overload", tier:"RISK", category:"CHAIN", icon:"⚡", name:"과부하", note:"Trigger 최대 발동은 6회로 감소하지만 Trigger 지급액은 1.5배가 됩니다.", requires:["trigger"], effects:fx({type:"TRIGGER_CAP",count:6},{type:"TRIGGER_BONUS_MULT",factor:1.5}), rewards:reward({type:"TICKETS",amount:3}) },
    { id:"compressed_chain", tier:"EXTREME", category:"CHAIN", icon:"🧨", name:"압축 연쇄", note:"Trigger 최대 3회. 대신 Retrigger 지급액은 1.5배가 됩니다.", requires:["trigger","retrigger"], effects:fx({type:"TRIGGER_CAP",count:3},{type:"RETRIGGER_MULT",factor:1.5}), rewards:reward({type:"TICKETS",amount:3}) },

    { id:"short_game", tier:"RISK", category:"ROUND", icon:"⏱️", name:"단기전", note:"이번 마감의 모든 라운드는 3회 리롤 모드만 선택할 수 있습니다.", effects:fx({type:"FORCE_MODE",modeId:"RISK"}), rewards:reward({type:"TICKETS",amount:5}) },
    { id:"long_game", tier:"STANDARD", category:"ROUND", icon:"🕰️", name:"장기전", note:"이번 마감의 모든 라운드는 7회 리롤 모드만 선택할 수 있습니다.", effects:fx({type:"FORCE_MODE",modeId:"NORMAL"}), rewards:reward({type:"TICKETS",amount:2},{type:"FREE_REROLL",amount:1}) },
    { id:"early_close", tier:"EXTREME", category:"ROUND", icon:"⏳", name:"조기 마감", note:"Round 2가 끝날 때까지 마감 목표를 달성해야 합니다.", effects:fx({type:"CLEAR_BY_ROUND",round:2}), rewards:reward({type:"TICKETS",amount:6}) },
    { id:"no_final_payment", tier:"EXTREME", category:"ROUND", icon:"0️⃣", name:"0라운드 금지", note:"3라운드 종료 뒤 최종 납부 단계에 진입할 수 없습니다.", effects:fx({type:"NO_FINAL_PAYMENT"}), rewards:reward({type:"TICKETS",amount:5}) },
    { id:"last_stand", tier:"RISK", category:"ROUND", icon:"🎯", name:"마지막 승부", note:"Round 1~2 지급 -25%, Round 3 지급 +40%.", effects:fx({type:"ROUND_SCORE_MULT",rounds:{1:0.75,2:0.75,3:1.4}}), rewards:reward({type:"TICKETS",amount:4}) },
    { id:"upfront_investment", tier:"EXTREME", category:"ROUND", icon:"📈", name:"선행 투자", note:"Round 1 패턴 지급 0. Round 2~3 패턴 지급은 1.35배가 됩니다.", effects:fx({type:"ROUND_SCORE_MULT",rounds:{1:0,2:1.35,3:1.35}}), rewards:reward({type:"TICKETS",amount:6}) },
    { id:"market_pressure", tier:"RISK", category:"ROUND", icon:"📉", name:"시장 압박", note:"이번 마감의 모든 패턴 지급액이 20% 감소합니다.", effects:fx({type:"SCORE_GLOBAL_MULT",factor:0.8}), rewards:reward({type:"TICKETS",amount:5}) }
  ];
})();
