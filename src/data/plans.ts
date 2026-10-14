export type PlanItem = {
  id: string;
  name: string;
  qty?: string;
  note?: string;
  when?: string;
  pocket?: string;
  tactics?: string[];
};

export type VestPocket = {
  id: string;
  slot: string;
  item: string;
};

export type SectionPlan = {
  mission?: string;
  vestTitle?: string;
  vest?: VestPocket[];
  supplies: PlanItem[];
  gear: PlanItem[];
};

const empty = (): SectionPlan => ({ supplies: [], gear: [] });

const CP_GEAR: PlanItem[] = [
  {
    id: "cp-bowl",
    name: "矽膠摺碗 + 摺匙",
    qty: "全程 BYOB",
    when: "大會完全唔提供即棄碗碟",
    pocket: "Salomon 背囊側袋，入 CP 5 秒拉出",
    tactics: [
      "想食 CP 熱粥／熱麵／熱湯必須自備。",
      "食完用純水沖沖就走。",
    ],
  },
  {
    id: "cp-half",
    name: "CP 半碗原則",
    qty: "只要半碗，切忌貪食",
    when: "CP3、CP4、CP7、CP8 熱食必講「只要半碗」",
    pocket: "同義工講清楚",
    tactics: [
      "食太飽血液全跑去胃部，離開 CP 即刻上斜會胃抽筋甚至嘔吐。",
    ],
  },
  {
    id: "cp-hydro",
    name: "補水鐵律",
    qty: ">12 km 水袋 500ml；<8 km 只需 400+400",
    when: "每個 CP 按下一段距離決定裝幾多水",
    pocket: "長距離：背倉水袋；短距離：收起水袋減重",
    tactics: [
      "只有兩段 >12 km 要加水袋：起步→CP1 西灣 15.5 km、CP3→CP4 基維爾 12.7 km。",
      "CP5→CP6 6.1 km、CP6→CP7 7.4 km 短過 8 km：左 400 + 右 400，水袋收起。",
      "其餘 8–12 km（含 CP1→CP2 8.6、CP8→CP9 11.3、CP9→終點 10.8）：雙樽 500+400。冇 CP10。",
    ],
  },
  {
    id: "cp-timer",
    name: "CP 12 分鐘撤離",
    qty: "最多 10–12 分鐘",
    when: "食完半碗 ➔ 補滿雙樽 ➔ 咬香蕉／鮮橙 ➔ 起行",
    pocket: "特別係深夜基維爾、清晨大帽山扶輪公園",
    tactics: [
      "坐太久大髀會冷卻發硬（Cool Down），再起步極難發力。",
    ],
  },
];

/** 之後逐段填。空陣列會顯示「待補」空狀態。 */
export const PLANS: Record<number, SectionPlan> = {
  1: {
    mission:
      "起步→CP1 西灣 15.5 km。柏油 Zone 2 打底過浪茄，Maurten 攻西灣山，落沙灘到第一個檢查站。目標：血糖穩定 + 血鈉預載；到 CP1 卸水袋。",
    vestTitle: "Salomon ADV Skin 12 零停頓口袋",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "Tailwind 400ml · 每 10 分鐘啜一口" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel 同漱口" },
      { id: "bladder", slot: "背倉水袋", item: "500ml 純水（起步→CP1 15.5 km 必帶）" },
      { id: "l-chest", slot: "左前胸小袋", item: "Maurten Gel 100 × 1（攻西灣山）" },
      { id: "r-chest", slot: "右前胸小袋", item: "TA Energy Gel × 1（5.5 km／落山）" },
      { id: "l-hip", slot: "左下側腰袋", item: "備用廢紙袋" },
      { id: "r-hip", slot: "右下側腰袋", item: "TA 高鹽軟糖 × 3（3 km、8 km、西灣山）" },
    ],
    supplies: [
      {
        id: "rice-ball",
        name: "起步飯糰",
        qty: "× 1（酸梅／三文魚）",
        when: "約 09:45｜拱門起步前 15 分鐘，或起步後 1 km 內吃完",
        pocket: "手持，或背囊後方大倉最外層",
        tactics: [
          "打底慢釋碳水：白米屬中低 GI，消化較 Gel 慢，提供約 1.5–2 小時穩定血糖，防止初段興奮配速過快後血糖驟降（Reactive Hypoglycemia）。",
          "墊胃防反胃：實體食物填飽胃部，為之後 30 小時不斷吞 Gel 同電解質水提供緩衝，減低尾段胃酸過多胃痛。",
        ],
      },
      {
        id: "ta-gel",
        name: "TA Energy Gel",
        qty: "× 1（鹹焦糖／鹹西瓜）",
        when: "約 10:38｜5.5 km（萬宜東壩前），起步後 35–40 分鐘",
        pocket: "右前胸快取袋（右手一抽即拿）",
        tactics: [
          "BCAA 肌肉保護：柏油路對膝同四頭衝擊大。Gel 含支鏈氨基酸（尤其亮氨酸），喺微撕裂前注入血液，延緩疲勞同損傷。",
          "必須配水：食完立刻從右胸軟樽啜 2–3 口純水漱口兼吞服，稀釋胃部滲透壓，令糖分極速入小腸。",
        ],
      },
      {
        id: "ta-chew-3k",
        name: "TA Energy 軟糖（高鹽）",
        qty: "第 3 km · 1 粒",
        when: "約 10:20｜第 3 公里含食 1 粒",
        pocket: "右下側彈力網袋（唔使睇，右手伸向右腰）",
        tactics: [
          "鈉質預載（Sodium Pre-loading）：高濃度鈉喺西灣山暴汗前拉高血鈉，防止第二段大量流汗後血鈉急跌、突發大腿抽筋。",
          "青檸鹹味刺激口水，保持口腔濕潤，解決長途慢跑口乾。",
        ],
      },
      {
        id: "ta-chew-8k",
        name: "TA Energy 軟糖（高鹽）",
        qty: "第 8 km · 1 粒",
        when: "約 10:55｜第 8 公里含食 1 粒",
        pocket: "右下側彈力網袋（唔使睇，右手伸向右腰）",
        tactics: [
          "第二粒繼續預載鈉質，接上西灣山前把血鈉水平穩住。",
          "食完用右胸純水漱口（可吐或吞），重置味覺，避免甜膩感提早出現。",
        ],
      },
      {
        id: "tailwind",
        name: "Tailwind Endurance Fuel",
        qty: "400ml（柑橘／檸檬）",
        when: "10:00–12:40，每 10–15 分鐘啜 1–2 口",
        pocket: "左胸 400ml 軟樽",
        tactics: [
          "流質能量：雙源碳水（葡萄糖 + 果糖），無需複雜消化即可轉化熱量。",
          "配合 Zone 2 慢跑，喺唔覺累之下默默補約 100–150 kcal。",
        ],
      },
      {
        id: "water",
        name: "右胸軟樽純水",
        qty: "400ml",
        when: "專門送服 TA Gel；每次食軟糖後漱口（吐或吞）",
        pocket: "右胸 400ml 軟樽",
        tactics: [
          "味覺重置（Palate Cleansing）：避免甜味長期殘留舌頭同喉嚨。",
          "防止第 1 段就積聚甜膩感，確保之後 30 小時仍然食得落。",
        ],
      },
      {
        id: "bladder",
        name: "背倉水袋純水",
        qty: "500ml",
        when: "10:00 起步裝滿，浪茄可啜，到 CP1 西灣（15.5 km）卸／重裝",
        pocket: "Salomon 背倉 500ml 水袋",
        tactics: [
          "起步→CP1 西灣 15.5 km >12 km，必須加水袋。浪茄唔係檢查站。",
          "雙樽 400+400 負責 Tailwind／送服，水袋專職純水救命。",
        ],
      },
      {
        id: "maurten",
        name: "Maurten Gel 100",
        qty: "× 1（原味）",
        when: "約 11:30｜浪茄過後攻西灣山急斜（約 12.5–13 km）",
        pocket: "左前胸快取袋",
        tactics: [
          "高心跳無痛吸收：西灣山心跳會暴升 Zone 4，胃部血液被抽去四頭。",
          "Maurten Hydrogel 繞過胃部直入小腸，極速提供 25g 葡萄糖。",
        ],
      },
      {
        id: "ta-chew-saiwan",
        name: "TA Energy 軟糖（高鹽）",
        qty: "西灣山天梯中段 · 1 粒",
        when: "約 13 km，西灣山天梯中段",
        pocket: "右下側腰袋",
        tactics: [
          "暴汗區精密補鈉：西灣山最曝曬、流汗量最高。",
          "封鎖小腿同大髀內側抽筋信號。",
        ],
      },
      {
        id: "cp1-end",
        name: "CP1 西灣抵達",
        qty: "卸水袋，改 500+400",
        when: "約 12:40｜西灣沙灘 CP1（15.5 km）",
        pocket: "大會樽裝水；基本醫療",
        tactics: [
          "正式第一個檢查站。補滿雙樽，背倉水袋倒空收起減重。",
          "下一段 CP1→CP2 只 8.6 km，唔使再負水袋。沙灘切忌興奮狂奔。",
        ],
      },
    ],
    gear: [
      ...CP_GEAR,
      {
        id: "poles-climb-saiwan",
        name: "BD 行山杖 · 開杖",
        qty: "浪茄 ➔ 西灣山頂（攀升 314m）",
        when: "遇大石級即刻開杖",
        pocket: "抽手離帶，揸低 10cm 泡棉爆上去",
        tactics: ["西灣山天梯用杖分擔四頭同膝。"],
      },
      {
        id: "poles-stow-cp1",
        name: "BD 行山杖 · 收杖",
        qty: "西灣山頂 ➔ CP1 沙灘",
        when: "落斜轉沙灘即收",
        pocket: "摺埋收落背囊",
        tactics: ["雙手自由入 CP1 補水。"],
      },
    ],
  },
  2: {
    mission:
      "CP1→CP2 北潭凹 8.6 km。沙灘＋鹹田灣熱食重置、大浪坳補鈉，收杖衝刺至北潭凹。雙樽 500+400，水袋收起。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "SiS Hydro 500ml · 無糖，每 10 分鐘啜一口" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel 同漱口" },
      { id: "l-chest", slot: "左前胸小袋", item: "TA Energy Gel × 1（大浪坳／平路）" },
      { id: "r-chest", slot: "右前胸小袋", item: "備用／廢紙袋" },
      { id: "l-hip", slot: "左下側腰袋", item: "備用廢紙袋" },
      { id: "r-hip", slot: "右下側腰袋", item: "TA 高鹽軟糖 × 2（大浪坳／赤徑）" },
    ],
    supplies: [
      {
        id: "ta-gel",
        name: "TA Energy Gel",
        qty: "× 1（鹹焦糖／鹹西瓜）",
        when: "約 13:30｜大浪坳中段或平路（累計約 18–20 km）",
        pocket: "右前胸快取袋",
        tactics: [
          "BCAA 修復；心率 Zone 2/3 先食，配合右胸純水吞服漱口。",
        ],
      },
      {
        id: "ta-chew-talong",
        name: "TA Energy 軟糖（高鹽）",
        qty: "大浪坳攀升中段 · 1 粒",
        when: "約 19 km，大浪坳攀升中段",
        pocket: "右下側腰袋",
        tactics: ["高曝曬高流汗，維持血鈉安全線。"],
      },
      {
        id: "ta-chew-hamtin",
        name: "TA Energy 軟糖（高鹽）",
        qty: "赤徑暗斜 · 1 粒",
        when: "約 22 km，赤徑前往北潭凹暗斜",
        pocket: "右下側腰袋",
        tactics: ["接上 CP2 前再補鈉，鎖定抽筋風險。"],
      },
      {
        id: "sis-hydro",
        name: "SiS Hydro 電解質水",
        qty: "左 500ml + 右 400ml（水袋已卸）",
        when: "12:50–15:00 密啜。CP1 已卸水袋",
        pocket: "左胸 500ml 軟樽",
        tactics: [
          "轉無糖 SiS Hydro，只補水同鈉／鉀，平衡體液滲透壓。",
        ],
      },
      {
        id: "ham-tin-reset",
        name: "咸田灣士多熱食",
        qty: "現場買，唔使自備飯糰",
        when: "約 13:15｜鹹田灣士多（累計約 18 km），停 5–8 分鐘",
        pocket: "熱豆腐花／熱茶現場買",
        tactics: [
          "腸胃重置：西灣山後熱食促進胃部循環，劈開 Gel 甜膩。",
        ],
      },
      {
        id: "cp2-end",
        name: "CP2 北潭凹抵達",
        qty: "樽裝水、基本醫療",
        when: "約 15:00｜北潭凹 CP2（累計 24.1 km）",
        pocket: "12 分鐘內補樽就走",
        tactics: [
          "呢站熱食唔豐富。大型支援同熱麵改喺 CP3 企嶺下。",
          "裝 500+400 行下一段 CP2→CP3 10.2 km。",
        ],
      },
    ],
    gear: [
      ...CP_GEAR,
      {
        id: "poles-climb-talong",
        name: "BD 行山杖 · 開杖",
        qty: "咸田灣 ➔ 大浪坳",
        when: "離開士多開始再攀升即開",
        pocket: "開杖輕鬆撐上大浪坳",
        tactics: ["慳力過坳。"],
      },
      {
        id: "poles-stow-cp2",
        name: "BD 行山杖 · 收杖",
        qty: "大浪坳 ➔ 赤徑 ➔ CP2 北潭凹",
        when: "過坳轉水泥平路／暗斜即收",
        pocket: "收杖慢跑至 CP2",
        tactics: ["順住平路衝刺入站。"],
      },
    ],
  },
  3: {
    mission:
      "CP2→CP3 企嶺下 10.2 km。頭半程最惡劣地獄路：Maurten 攻雞公、Mag-on 救抽筋、嶂上熱食、落斜收杖。過企嶺下即跨過西灣山 + 雞公山。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "SiS Hydro 500ml · 無糖，每 10 分鐘啜一口" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel、Mag-on 同漱口" },
      { id: "l-chest", slot: "左前胸小袋", item: "Maurten Gel 100 × 1（攻雞公山急斜食）" },
      { id: "r-chest", slot: "右前胸小袋", item: "SiS Isotonic Gel × 2（嶂上／落水浪窩前）" },
      { id: "zip", slot: "前胸拉鏈細袋", item: "Mag-on 鎂粉 × 1（嶂上／落山前急救）" },
      { id: "r-hip", slot: "右下側腰袋", item: "備用廢紙袋" },
      { id: "bowl", slot: "背囊側袋", item: "矽膠摺碗＋摺匙（CP3 半碗熱麵）" },
    ],
    supplies: [
      {
        id: "maurten",
        name: "Maurten Gel 100",
        qty: "× 1（原味）",
        when: "約 15:15｜CP2 北潭坳出發，榕樹澳路口開始攻雞公山石級（約 24.5 km）",
        pocket: "左前胸快取袋",
        tactics: [
          "Zone 4 高心跳防嘔吐：雞公山上斜直陡，心跳會長時間逼近 >85% HRmax。",
          "普通 Gel 會留喺胃引發胃酸倒流；Maurten Hydrogel 穿過胃部直達小腸，繼續供應 25g 葡萄糖。",
        ],
      },
      {
        id: "sis-iso-1",
        name: "SiS Isotonic Gel",
        qty: "第 1 包（蘋果／橙）",
        when: "過雞公山頂、落返嶂上高原平路（約 28 km）",
        pocket: "右前胸快取袋",
        tactics: [
          "等滲透免水極速吸收：滲透壓同體液相同，吞服完全唔使額外飲水稀釋。",
          "唔會增加胃部水腫，落斜時大腦保持清醒、反應更快。",
        ],
      },
      {
        id: "sis-iso-2",
        name: "SiS Isotonic Gel",
        qty: "第 2 包（蘋果／橙）",
        when: "畫眉山過後、準備落水浪窩無盡石級（約 32 km）",
        pocket: "右前胸快取袋",
        tactics: [
          "第二包專攻長命落石級，同樣免水、等滲，保持集中同反應。",
        ],
      },
      {
        id: "mag-on",
        name: "Mag-on 水溶性鎂粉",
        qty: "× 1 包（檸檬／柚子）",
        when: "嶂上高原（約 28.5 km），或大降落企嶺下之前 10 分鐘",
        pocket: "前胸最就手拉鏈細袋／右前胸袋",
        tactics: [
          "肌肉神經急救：雞公山落斜每一步都係四頭強烈離心收縮。",
          "撕開倒落口，用右胸純水沖下。水溶性鎂 3–5 分鐘內調節鈣／鎂平衡，中斷抽筋信號。",
        ],
      },
      {
        id: "sis-hydro",
        name: "SiS Hydro 電解質水",
        qty: "2 樽合共 1000ml",
        when: "全程每 10 分鐘啜 1–2 口。北潭坳 CP2 補水時加入 1 粒 SiS Hydro 錠",
        pocket: "左胸 500ml 軟樽",
        tactics: [
          "第三段繼續禁絕 Tailwind：已食 3 包 Gel，胃部碳水濃度達上限。",
          "左樽堅持無糖 SiS Hydro 補鈉、鉀、鎂，避免糖分過載惹噁心。",
        ],
      },
      {
        id: "cheung-sheung-reset",
        name: "嶂上許生士多熱食",
        qty: "豆腐花／熱麵（現場買，唔帶飯糰）",
        when: "抵達嶂上高原（約 28.5 km），停頓 8–10 分鐘",
        pocket: "熱豆腐花／餐蛋麵現場買",
        tactics: [
          "心智同腸胃雙重重置：熱食刺激胃部血液循環，洗走 Gel 化學味。",
          "自備飯糰取消，重量交給 CP3 半碗熱麵。",
        ],
      },
      {
        id: "cp3-orange",
        name: "CP3 大會鮮橙",
        qty: "1–2 塊，必食",
        when: "約 18:45｜企嶺下／水浪窩 CP3，入站唔使急住走",
        pocket: "現場攞",
        tactics: [
          "免費味覺重置器：果酸秒速洗走牙齒同舌頭上嘅化學 Gel 甜味。",
          "天然維他命 C 同水分，比純水更解渴。可少帶榨菜／話梅。",
        ],
      },
      {
        id: "cp3-hot",
        name: "CP3 半碗熱通粉／熱麵",
        qty: "只要半碗（代替 1 個自備飯糰）",
        when: "企嶺下 CP3，首個大型支援熱食站",
        pocket: "自備矽膠摺碗＋摺匙",
        tactics: [
          "熱湯即時暖胃。一定要同義工講「只要半碗」。",
          "流程：半碗熱食 ➔ 補滿雙樽 ➔ 鮮橙 ➔ 12 分鐘內起行。左樽飲晒可裝大會寶礦力。",
        ],
      },
    ],
    gear: [
      ...CP_GEAR,
      {
        id: "poles-climb-keikung",
        name: "BD 行山杖 · 開杖",
        qty: "北潭坳 ➔ 雞公山頂（攀升 399m）",
        when: "遇極陡大石級即開杖",
        pocket: "甩開手帶，揸低 10cm 延長泡棉爆上去",
        tactics: [
          "上斜專用：手肘保持 90 度，用雙臂向下壓把身體升上石級。",
        ],
      },
      {
        id: "poles-stow-cheung",
        name: "BD 行山杖 · 收杖",
        qty: "雞公山頂 ➔ 嶂上高原",
        when: "一到落斜即撳彈珠摺埋雙杖",
        pocket: "收杖，碎石路要手腳高平衡",
        tactics: ["落碎石路避免雙手被牽制。"],
      },
      {
        id: "poles-climb-meiwu",
        name: "BD 行山杖 · 開杖",
        qty: "嶂上 ➔ 畫眉山暗斜",
        when: "暗斜短暫再開",
        pocket: "開杖撐過暗斜",
        tactics: ["只係短暫開杖，過完暗斜即準備再收。"],
      },
      {
        id: "poles-stow-cp2",
        name: "BD 行山杖 · 收杖",
        qty: "畫眉山 ➔ 企嶺下 CP3",
        when: "長命落石級徹底收杖",
        pocket: "收落背囊",
        tactics: [
          "集中意志力，靠雙腳同四頭落石級抵達企嶺下／水浪窩。",
          "CP3 大休：半碗熱麵 + 鮮橙，12 分鐘內起行。親友可喺呢度交熱粥／烏冬。",
        ],
      },
    ],
  },
  4: {
    mission:
      "CP3→CP4 基維爾 12.7 km（加水袋）。晝夜轉折：上昂平開杖、入夜第一波咖啡因、Naäak 補蛋白禦寒、左樽切回 Tailwind 巡航至基維爾。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "Tailwind 500ml · 切回流質卡路里，密密啜" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel 同漱口" },
      { id: "bladder", slot: "背倉水袋", item: "500ml 純水（CP3→CP4 基維爾 12.7 km 必帶）" },
      { id: "l-chest", slot: "左前胸小袋", item: "SiS Isotonic Gel × 1（落沙田坳前食）" },
      { id: "r-chest", slot: "右前胸小袋", item: "TA 咖啡因軟糖 × 3（入夜每 30 分鐘 1 粒）" },
      { id: "l-hip", slot: "左下側腰袋", item: "Naäak 威化餅 × 1（昂平高原分口食）" },
      { id: "r-hip", slot: "右下側腰袋", item: "備用廢紙袋" },
      { id: "bowl", slot: "背囊側袋", item: "矽膠摺碗＋摺匙（CP4 熱湯）" },
    ],
    supplies: [
      {
        id: "caf-1",
        name: "TA 咖啡因軟糖",
        qty: "第 1 粒 · 入夜開頭燈",
        when: "約 20:15｜昂平高原（約 37 km）入夜開頭燈時",
        pocket: "右前胸快取袋",
        tactics: [
          "封鎖大腦睡意受體：入夜後褪黑激素帶來第一波生理睡意。",
          "咖啡因競爭性結合腺苷受體，強制喚醒中樞，保持夜行同落山反應，防拗柴。",
        ],
      },
      {
        id: "caf-2",
        name: "TA 咖啡因軟糖",
        qty: "第 2 粒 · 入夜 +30 分鐘",
        when: "約 20:30，昂平高原巡航",
        pocket: "右前胸快取袋",
        tactics: ["第二粒維持咖啡因水平，對抗第一波睡意。"],
      },
      {
        id: "caf-3",
        name: "TA 咖啡因軟糖",
        qty: "第 3 粒 · 入夜 +60 分鐘",
        when: "約 21:00，昂平高原至基維爾前",
        pocket: "右前胸快取袋",
        tactics: ["第三粒接上夜行，保持落山前敏捷度。"],
      },
      {
        id: "naak",
        name: "Naäak Ultra Energy 威化餅",
        qty: "× 1（焦糖／香草）",
        when: "昂平高原平路（約 38.5 km），步速穩定時分 3–4 口邊行邊咀",
        pocket: "左下側腰袋",
        tactics: [
          "4:1 碳水蛋白質黃金比：入夜高山氣溫驟降，單靠 Gel 難提供持續熱量。",
          "植物蛋白同電解質飽腹；蛋白質食物熱效應（TTE）較高，體內發熱，減少夜間體溫流失同肌肉分解。",
        ],
      },
      {
        id: "sis-iso",
        name: "SiS Isotonic Gel",
        qty: "× 1（蘋果／橙）",
        when: "過基維爾營（約 43 km）、落沙田坳柏油斜路前 10 分鐘",
        pocket: "左前胸小袋",
        tactics: [
          "等滲透免水：極速補 22g 葡萄糖，為夜間快步慢跑提供即時燃料。",
          "不加重胃部水腫負擔。",
        ],
      },
      {
        id: "tailwind",
        name: "Tailwind Endurance Fuel",
        qty: "500ml × 2 輪（左胸軟樽）",
        when: "18:55 企嶺下 CP3 用 Tailwind 沖劑加滿左樽；入夜每 10–15 分鐘小口飲",
        pocket: "左胸 500ml 軟樽",
        tactics: [
          "流質卡路里重現：昂平至基維爾有較長 Zone 2 平路，Gel 頻率降低。",
          "切換回 Tailwind，每小時約 100–120 kcal 維持血糖平穩。",
        ],
      },
      {
        id: "cp4-hot",
        name: "CP4 半碗熱湯",
        qty: "只要半碗 + 熱飲",
        when: "約 23:15｜基維爾營地 CP4（累計約 47 km），入夜氣溫降",
        pocket: "自備矽膠摺碗＋摺匙",
        tactics: [
          "熱湯好消化，極速補碳水兼提升核心體溫。同義工講「只要半碗」。",
          "12 分鐘內：半碗 ➔ 卸水袋 ➔ 補滿雙樽 500+400（下一段 CP4→CP5 只 8.5 km）➔ 起行。",
        ],
      },
      {
        id: "cp4-banana",
        name: "CP4 大會熱飲／麵包",
        qty: "少量，唔好食太飽",
        when: "基維爾 CP4，邊行邊食或站著食",
        pocket: "手持",
        tactics: [
          "天然鉀質同果糖，防抽筋、安撫胃部、唔會脹氣。",
          "食一隻香蕉就可以少食一包 Gel 或半個飯糰。下一段鷹巢山第二包 SiS Gel 可省。",
        ],
      },
    ],
    gear: [
      ...CP_GEAR,
      {
        id: "poles-climb-ngongping",
        name: "BD 行山杖 · 開杖",
        qty: "水浪窩 ➔ 昂平頂（攀升近 400m）",
        when: "全段最硬天梯之一，即開杖",
        pocket: "甩開手帶，雙手揸低 10cm 延長泡棉",
        tactics: ["用雙臂向下壓把身體撐上天梯。"],
      },
      {
        id: "poles-stow-plateau",
        name: "BD 行山杖 · 收杖",
        qty: "昂平高原 ➔ 基維爾營",
        when: "一到高原即摺杖收落背囊",
        pocket: "收杖，雙手 100% 自由",
        tactics: ["方便邊行邊食 Naäak 威化同 TA 咖啡因軟糖。"],
      },
      {
        id: "poles-stow-shatin",
        name: "BD 行山杖 · 收杖",
        qty: "基維爾營 ➔ 沙田坳",
        when: "柏油／石屎落斜保持收杖",
        pocket: "收杖慢跑",
        tactics: ["石屎落斜靠雙腳節奏慢跑，防震防滑。"],
      },
    ],
  },
  5: {
    mission:
      "CP4→CP5 筆架山 8.5 km。深夜喪屍期：重度咖啡因、免水 Gel、榨菜／椰棗味覺重置、落山收杖防跌倒，直入 CP5。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "Tailwind 500ml · 流質卡路里，密密啜" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水／SiS Hydro 400ml · 漱口沖榨菜鹹味" },
      { id: "l-chest", slot: "左前胸小袋", item: "SiS Isotonic Gel × 2（筆架山梯級／鷹巢山）" },
      { id: "r-chest", slot: "右前胸小袋", item: "TA 咖啡因軟糖 × 6（每 20–30 分鐘 1 粒）" },
      { id: "l-hip", slot: "左下側腰袋", item: "椰棗 × 2 + 榨菜絲 × 1（山頂平路解膩）" },
      { id: "r-hip", slot: "右下側腰袋", item: "備用廢紙袋" },
    ],
    supplies: [
      {
        id: "caf-1",
        name: "TA 咖啡因軟糖",
        qty: "第 1 粒",
        when: "凌晨約 1:00 起，每 20–30 分鐘一粒",
        pocket: "右前胸快取袋（最就手）",
        tactics: [
          "深夜還魂丹：1:00–4:00 係體溫最低、褪黑激素最強峰值。",
          "6 粒持續高濃度咖啡因封鎖腺苷受體，防止盲眼行山或恍惚叉錯腳。",
        ],
      },
      {
        id: "caf-2",
        name: "TA 咖啡因軟糖",
        qty: "第 2 粒",
        when: "第 1 粒後 20–30 分鐘",
        pocket: "右前胸快取袋",
        tactics: ["維持咖啡因水平，對抗喪屍期睡意。"],
      },
      {
        id: "caf-3",
        name: "TA 咖啡因軟糖",
        qty: "第 3 粒",
        when: "第 2 粒後 20–30 分鐘",
        pocket: "右前胸快取袋",
        tactics: ["繼續封鎖睡意受體。"],
      },
      {
        id: "caf-4",
        name: "TA 咖啡因軟糖",
        qty: "第 4 粒",
        when: "第 3 粒後 20–30 分鐘",
        pocket: "右前胸快取袋",
        tactics: ["深夜中段還魂，保持拎糖同落山反應。"],
      },
      {
        id: "caf-5",
        name: "TA 咖啡因軟糖",
        qty: "第 5 粒",
        when: "第 4 粒後 20–30 分鐘",
        pocket: "右前胸快取袋",
        tactics: ["接近落鷹巢山前再補一粒。"],
      },
      {
        id: "caf-6",
        name: "TA 咖啡因軟糖",
        qty: "第 6 粒",
        when: "第 5 粒後 20–30 分鐘，目標覆蓋至約 4:00",
        pocket: "右前胸快取袋",
        tactics: ["最後一粒接上落大埔公路，防精神恍惚。"],
      },
      {
        id: "sis-iso-1",
        name: "SiS Isotonic Gel",
        qty: "第 1 包（蘋果／橙）",
        when: "攻筆架山急斜梯級中段（約 49 km）",
        pocket: "左前胸小袋",
        tactics: [
          "夜間厭食期免水極速吸收：深夜腸胃蠕動極慢，連咀嚼都累。",
          "等滲透配方唔使額外飲水，直達小腸，為疲勞大腦提供最直接血糖。",
        ],
      },
      {
        id: "sis-iso-2",
        name: "SiS Isotonic Gel（可省）",
        qty: "第 2 包 · CP4 已有熱食則可唔食",
        when: "過筆架山雷達站、落鷹巢山（約 53 km）",
        pocket: "左前胸小袋",
        tactics: [
          "CP4 熱湯已補暖胃，呢包可留作後備或清倉唔食，減胃部 Gel 負擔。",
        ],
      },
      {
        id: "palate-rescue",
        name: "椰棗 + 榨菜絲",
        qty: "椰棗 × 2 + 榨菜絲 × 1 細包",
        when: "筆架山觀景台／雷達站平路（約 50.5 km），停 1 分鐘享用",
        pocket: "左下側腰袋",
        tactics: [
          "鹹酸味覺重置（Palate Rescue）：連吞 15 小時甜 Gel 後口腔極度反感。",
          "榨菜強烈鹹酸瞬間劈開甜膩、刺激口水、消除噁心；椰棗提供天然果糖同高鉀，修復肌肉神經。",
        ],
      },
      {
        id: "tailwind",
        name: "左胸 Tailwind",
        qty: "500ml 密密啜",
        when: "全程小口補充流質熱量",
        pocket: "左胸 500ml 軟樽",
        tactics: ["夜間雙重補給：每小時約 100 kcal 流質卡路里，維持血糖。"],
      },
      {
        id: "right-flask",
        name: "右胸純水／SiS Hydro",
        qty: "500ml（可加半粒 Hydro 錠）",
        when: "食完榨菜同 Gel 後漱口",
        pocket: "右胸 500ml 軟樽",
        tactics: ["保持口腔清潔，防止甜味殘留引發夜間嘔吐。"],
      },
      {
        id: "cp5-orange",
        name: "CP5 大會鮮橙／水果",
        qty: "1–2 塊，必食",
        when: "約 03:20｜筆架山 CP5（累計約 55.5 km）",
        pocket: "現場攞",
        tactics: [
          "免費味覺重置，果酸洗走 Gel 甜味。",
          "左樽飲晒可裝大會寶礦力銜接電解質。",
        ],
      },
    ],
    gear: [
      {
        id: "poles-climb-beacon",
        name: "BD 行山杖 · 開杖",
        qty: "基維爾 ➔ 筆架山頂（攀升近 300m 梯級）",
        when: "遇急斜大石級即開杖",
        pocket: "甩開手帶，揸低 10cm 延長泡棉爆上去",
        tactics: ["夜間借力減輕雙腿負擔。"],
      },
      {
        id: "poles-stow-cp4",
        name: "BD 行山杖 · 收杖",
        qty: "筆架山頂 ➔ CP5 筆架山檢查站",
        when: "轉山徑／泥路落斜必須徹底收杖",
        pocket: "摺埋收落背囊",
        tactics: [
          "深夜視線受阻，落山極易被樹根或石塊絆倒。",
          "空出雙手維持平衡，並方便隨時喺胸袋攞 TA 咖啡因軟糖。",
        ],
      },
    ],
  },
  6: {
    mission:
      "CP5→CP6 走私坳 6.1 km（短段 400+400）。Zone 2 恢復、水果洗嘴、全程收杖、防馬騮，為針草山儲糖原。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "SiS Hydro 400ml · 無糖，密密啜休養胃部" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel 同漱口" },
      { id: "l-chest", slot: "左前胸小袋", item: "備用廢紙袋" },
      { id: "r-chest", slot: "右前胸小袋", item: "TA Energy Gel × 1（金山平路中段食）" },
      { id: "l-hip", slot: "左下側腰袋", item: "CP5 鮮橙後備／空袋減重" },
      { id: "r-hip", slot: "右下側腰袋", item: "TA 高鹽軟糖 × 2（56 km、58 km）" },
    ],
    supplies: [
      {
        id: "ta-gel",
        name: "TA Energy Gel",
        qty: "× 1（鹹焦糖／鹹西瓜）",
        when: "約 57 km（金山馬路平路中段／九龍水塘邊）",
        pocket: "右前胸快取袋",
        tactics: [
          "BCAA 護肌同溫和補碳：第 5 段夜行後，Zone 2 低心跳先食 TA Gel。",
          "20g 溫和碳水唔加重胃負擔，為第 7 段針山連環爆發預先儲肌肉糖原。",
        ],
      },
      {
        id: "ta-chew-56",
        name: "TA Energy 軟糖（高鹽）",
        qty: "第 56 km · 1 粒",
        when: "金山路口",
        pocket: "右下側腰袋",
        tactics: [
          "針山前夕預先補鈉：第 6 段多為清晨天光／微熱。",
          "拉高血鈉，防止攻針山直梯時體溫上升暴汗引發大腿抽筋。",
        ],
      },
      {
        id: "ta-chew-58",
        name: "TA Energy 軟糖（高鹽）",
        qty: "第 58 km · 1 粒",
        when: "接近城門水塘",
        pocket: "右下側腰袋",
        tactics: ["第二粒把血鈉維持高位，接上 CP6 轉攻針草山。"],
      },
      {
        id: "cp4-cruise",
        name: "CP5 鮮橙後味覺重置",
        qty: "出發前已食 1–2 塊鮮橙",
        when: "筆架山 CP5 離開時，唔使再食自備飯糰",
        pocket: "現場鮮橙代替半個飯糰",
        tactics: [
          "果酸洗嘴、天然碳水。再食飯糰容易過飽上針山。",
          "金山路嚴禁雙手外露食物或膠袋，防馬騮搶。400+400 行 6.1 km 到 CP6。",
        ],
      },
      {
        id: "sis-hydro",
        name: "SiS Hydro 電解質水",
        qty: "400ml",
        when: "03:55–05:00 每 10–15 分鐘小口飲",
        pocket: "左胸 400ml 軟樽",
        tactics: [
          "無糖等滲透休養胃部：路程短，左樽堅持 SiS Hydro。",
          "只補水同鈉／鉀，避免糖分過載，把消化能量留給第 7 段 Maurten。",
        ],
      },
      {
        id: "water",
        name: "右胸軟樽純水",
        qty: "400ml",
        when: "送服 TA Gel 後漱口",
        pocket: "右胸 400ml 軟樽",
        tactics: ["味覺重置：洗走飯粒同甜味，保持口腔清爽。"],
      },
    ],
    gear: [
      {
        id: "poles-stow-all",
        name: "BD 行山杖 · 全程收杖",
        qty: "筆架山 CP5 ➔ 金山／走私坳 CP6（約 6.1 km）",
        when: "金山馬路 100% 柏油／平緩水泥，完全唔使開杖",
        pocket: "摺埋收落背心後方彈力繩或杖袋",
        tactics: [
          "休養上肢：雙臂、膊頭、前臂休息 30–40 分鐘，為針山同草山無盡天梯積蓄力量。",
          "特別提醒：金山野生猴子多。杖同所有食物收喺背心袋內，避免擺動包裝引猴子。",
        ],
      },
    ],
  },
  7: {
    mission:
      "CP6→CP7 鉛礦坳 7.4 km（短段）。一口氣攻針山＋草山：Maurten 爆發、Tailwind 慢燒、Mag-on 鎖抽筋、落斜收杖入鉛礦坳。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "Tailwind 400ml · 攻山密密啜（CP6→CP7 只 7.4 km）" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel、Mag-on 同漱口" },
      { id: "l-chest", slot: "左前胸小袋", item: "Maurten Gel 100 × 1（攻針山直梯前食）" },
      { id: "r-chest", slot: "右前胸小袋", item: "SiS Isotonic Gel × 1 + TA 咖啡因軟糖 × 3" },
      { id: "zip", slot: "前胸拉鏈細袋", item: "Mag-on 鎂粉 × 1（草山頂落斜前急救）" },
      { id: "r-hip", slot: "右下側腰袋", item: "備用廢紙袋" },
      { id: "bowl", slot: "背囊側袋", item: "矽膠摺碗＋摺匙（CP7 半碗熱湯／粉麵）" },
    ],
    supplies: [
      {
        id: "maurten",
        name: "Maurten Gel 100",
        qty: "× 1（原味）",
        when: "CP6 出發、踏入針山第一級石屎天梯（約 61 km）前 2 分鐘食完",
        pocket: "左前胸快取袋",
        tactics: [
          "Zone 4 爆心跳神級燃料：針山天梯心跳瞬間爆上 Zone 4 甚至極限。",
          "普通 Gel 滯留胃部易劇烈嘔吐；Maurten Hydrogel 穿過胃部直達小腸，為四頭注入 25g 葡萄糖。",
        ],
      },
      {
        id: "sis-iso",
        name: "SiS Isotonic Gel",
        qty: "× 1（蘋果／橙）",
        when: "過針草坳、攻草山長命柏油斜路中段（約 64.5 km）",
        pocket: "右前胸快取袋",
        tactics: [
          "免水等滲透續航：攻完針山雙腿極度酸軟，草山係漫長意志力磨蝕。",
          "唔使額外飲水，即時葡萄糖防止血糖崩盤。",
        ],
      },
      {
        id: "mag-on",
        name: "Mag-on 水溶性鎂粉",
        qty: "× 1 包（檸檬／柚子）",
        when: "草山山頂平路（約 65.5 km）、大降落鉛礦坳之前 2 分鐘",
        pocket: "前胸拉鏈細袋",
        tactics: [
          "落斜前急救：針草雙山後四頭同小腿已達疲勞臨界。",
          "撕開倒落口，右胸純水沖下。鎂離子 3–5 分鐘調節鈣／鎂平衡，鎖死大腿內側同小腿抽筋。",
        ],
      },
      {
        id: "caf-1",
        name: "TA 咖啡因軟糖",
        qty: "針山頂 · 1 粒",
        when: "約 62.5 km",
        pocket: "右前胸小袋",
        tactics: [
          "高壓下維持專注：極高心跳後大腦缺氧、反應遲鈍。",
          "咖啡因維持中樞敏銳，極陡落斜專注腳下，防恍惚拗柴。",
        ],
      },
      {
        id: "caf-2",
        name: "TA 咖啡因軟糖",
        qty: "草山中段 · 1 粒",
        when: "約 64.5 km",
        pocket: "右前胸小袋",
        tactics: ["第二粒接上草山意志力磨蝕。"],
      },
      {
        id: "caf-3",
        name: "TA 咖啡因軟糖",
        qty: "落鉛礦坳前 · 1 粒",
        when: "約 66 km",
        pocket: "右前胸小袋",
        tactics: ["第三粒保持落斜專注。"],
      },
      {
        id: "tailwind",
        name: "Tailwind Endurance Fuel",
        qty: "400ml × 1 輪（短 CP 唔使兩輪）",
        when: "約 05:10｜CP6 加滿左樽；針草山每 10 分鐘小口飲",
        pocket: "左胸 400ml 軟樽",
        tactics: [
          "雙山攀升雙源碳水：單靠 2 包 Gel 唔夠總卡路里。",
          "每小時約 120 kcal 葡萄糖＋果糖，邊行邊補。",
        ],
      },
      {
        id: "cp7-hot",
        name: "CP7 半碗熱湯／粉麵／熱粥",
        qty: "只要半碗（代替自備飯糰）",
        when: "約 08:15｜鉛礦坳 CP7（累計約 69 km），針草山後暖胃",
        pocket: "自備矽膠摺碗＋摺匙",
        tactics: [
          "熱鹹湯補回大量隨汗流失嘅鈉。同義工講「只要半碗」。",
          "12 分鐘：半碗 ➔ 補滿雙樽 ➔ 香蕉＋鮮橙 ➔ 起行。",
        ],
      },
      {
        id: "cp6-banana",
        name: "CP7 大會香蕉",
        qty: "半隻至一隻",
        when: "離開 CP7 前攞，邊行邊食",
        pocket: "手持",
        tactics: ["補鉀防抽筋。食咗香蕉，第 8 段 TA Gel 仍食（落斜 BCAA），唔好再加飯糰。"],
      },
      {
        id: "cp6-orange",
        name: "CP7 大會鮮橙",
        qty: "1–2 塊，必食",
        when: "鉛礦坳 CP7",
        pocket: "現場攞",
        tactics: ["果酸洗嘴。左樽飲晒可裝寶礦力。"],
      },
    ],
    gear: [
      ...CP_GEAR,
      {
        id: "poles-needle",
        name: "BD 行山杖 · 極限開杖",
        qty: "城門水塘 ➔ 針山頂（連環直梯）",
        when: "全場最需要杖嘅路段，遇陡石級即開",
        pocket: "甩開手帶，揸低 10cm 延長泡棉；手肘 90 度下壓把人升上針山",
        tactics: ["用雙臂把成個人「升」上針山。"],
      },
      {
        id: "poles-stow-saddle",
        name: "BD 行山杖 · 秒速收杖",
        qty: "針山頂 ➔ 針草坳",
        when: "極陡石屎落斜即摺杖收落背囊",
        pocket: "空出雙手維持平衡，專心落斜",
        tactics: ["針山落斜直陡且滑，杖會牽制雙手。"],
      },
      {
        id: "poles-grass",
        name: "BD 行山杖 · 開杖巡航",
        qty: "針草坳 ➔ 草山頂（長命柏油斜路）",
        when: "重新開杖，穿回手帶",
        pocket: "正常握法順住柏油斜路穩定推上草山",
        tactics: ["巡航推坡，唔使再揸低爆力。"],
      },
      {
        id: "poles-stow-cp6",
        name: "BD 行山杖 · 收杖慢跑",
        qty: "草山頂 ➔ 鉛礦坳 CP7",
        when: "山徑落斜摺杖收起",
        pocket: "啪完 Mag-on 後靠雙腳節奏慢跑落鉛礦坳",
        tactics: ["收杖保安全，接 CP7 半碗熱湯／粉麵＋香蕉＋鮮橙。"],
      },
    ],
  },
  8: {
    mission:
      "CP7→CP8 扶輪公園 9.7 km。攻大帽山 957m，再急降至 CP8。Maurten 發熱、防失溫、落斜補鈉收杖。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "SiS Hydro 500ml · 無糖，密密啜補水防抽" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel 同漱口" },
      { id: "l-chest", slot: "左前胸小袋", item: "Maurten Gel 100 × 1（攻大帽山急斜食）" },
      { id: "r-chest", slot: "右前胸小袋", item: "TA Energy Gel × 1（頂部／落柏油路前食）" },
      { id: "r-hip", slot: "右下側腰袋", item: "TA 高鹽軟糖 × 3（上山／山頂／落山）" },
      { id: "pack", slot: "背囊後倉／側袋", item: "保暖風褸＋矽膠摺碗（CP8 熱食／換衫）" },
    ],
    supplies: [
      {
        id: "maurten",
        name: "Maurten Gel 100",
        qty: "× 1（原味）",
        when: "約 08:40｜CP7 出發，踏上攻大帽山梯級約 15 分鐘（約 68.5 km）食完",
        pocket: "左前胸快取袋",
        tactics: [
          "高海拔爆發同極速發熱：鉛礦坳上山脊攀升大，心跳再拉高。",
          "山頂多為清晨、風大極凍。Maurten Hydrogel 繞過胃部轉 25g 葡萄糖，體內產熱，防止高海拔打冷震。",
        ],
      },
      {
        id: "ta-gel",
        name: "TA Energy Gel",
        qty: "× 1（鹹焦糖／鹹西瓜）",
        when: "大帽山雷達站（約 72.5 km），展開 4.5 km 大帽山道柏油落斜前食完",
        pocket: "右前胸快取袋",
        tactics: [
          "BCAA 抗肌肉震盪撕裂：大帽山道硬柏油，長距離落斜對四頭極劇烈離心震盪。",
          "BCAA 喺細胞受震盪破裂時即時提供修復原料，減緩肌肉失控抽搐。",
        ],
      },
      {
        id: "ta-chew-70",
        name: "TA Energy 軟糖（高鹽）",
        qty: "攻山中段 · 1 粒",
        when: "約 70 km，攻大帽山中段梯級",
        pocket: "右下側腰袋",
        tactics: ["柏油路落斜會加速汗同鈉流失；高鹽軟糖維持神經電位，封鎖抽筋。"],
      },
      {
        id: "ta-chew-72",
        name: "TA Energy 軟糖（高鹽）",
        qty: "雷達站頂 · 1 粒",
        when: "約 72.5 km，大帽山雷達站頂",
        pocket: "右下側腰袋",
        tactics: ["山頂補鈉，接上長命落斜。"],
      },
      {
        id: "ta-chew-75",
        name: "TA Energy 軟糖（高鹽）",
        qty: "落柏油路中段 · 1 粒",
        when: "約 75 km",
        pocket: "右下側腰袋",
        tactics: ["硬路落斜中段再鎖死大腿同小腿抽筋。"],
      },
      {
        id: "sis-hydro",
        name: "SiS Hydro 電解質水",
        qty: "2 樽合共 1000ml",
        when: "全程每 10–15 分鐘小口飲。CP7 加滿並放入 SiS Hydro 錠",
        pocket: "左胸 500ml 軟樽",
        tactics: [
          "無糖等滲透保護胃部：第 7 段 Tailwind 高糖負擔後，第 8 段左樽堅持 Hydro。",
          "只補水同鈉／鉀，避免積糖反胃，消化能量留給 Maurten 同 TA Gel。",
        ],
      },
      {
        id: "cp8-hot",
        name: "CP8 熱燒賣／包點 + 熱飲",
        qty: "少量固體 + 熱飲（唔好食太飽）",
        when: "約 12:30｜大帽山扶輪公園 CP8（累計約 78.7 km），落山後補熱食",
        pocket: "自備矽膠摺碗／手持；蓮姐士多或大會熱食",
        tactics: [
          "熱燒賣提供優質固體碳水，熱阿華田提供糖分同熱量，提升核心體溫。",
          "12 分鐘內撤離：熱食 ➔ 補樽（可裝寶礦力）➔ 香蕉 ➔ 起行。完成度約 77%。",
        ],
      },
      {
        id: "cp7-banana",
        name: "CP8 大會香蕉",
        qty: "半隻至一隻",
        when: "離開扶輪公園前攞，邊行邊食",
        pocket: "手持",
        tactics: ["補鉀。第 9 段可以少靠 Gel，用 Tailwind + Naäak 巡航。"],
      },
    ],
    gear: [
      ...CP_GEAR,
      {
        id: "poles-climb",
        name: "BD 行山杖 · 開杖攻頂",
        qty: "鉛礦坳 ➔ 大帽山雷達站",
        when: "遇大石級即開杖",
        pocket: "甩開手帶，揸低 10cm 延長泡棉；手肘 90 度撐上大帽山",
        tactics: ["用雙臂力量攻頂。"],
      },
      {
        id: "poles-stow-road",
        name: "BD 行山杖 · 徹底收杖",
        qty: "大帽山雷達站 ➔ 大帽山扶輪公園 CP8",
        when: "一踏入柏油馬路即秒速摺杖收落背囊",
        pocket: "收杖，雙臂自由擺動慢跑落山",
        tactics: [
          "柏油落斜用杖，金屬／橡膠尖撞擊硬路會強烈震手，反而加重手腕同膊頭。",
          "收杖配合腳步節奏，輕鬆步幅慢跑落山。",
        ],
      },
      {
        id: "windshell",
        name: "保暖風褸",
        qty: "雷達站防風用",
        when: "大帽山頂清晨風大、氣溫極低即著",
        pocket: "背囊後倉／側袋",
        tactics: ["配合 Maurten 體內發熱，防止高海拔打冷震。落斜回暖可除返袋。"],
      },
    ],
  },
  9: {
    mission:
      "CP8→CP9 吉慶橋 11.3 km。極度疲勞厭食期巡航；田夫仔唔係檢查站。戰術：100% 摺杖、Naäak 劈厭食、Mag-on 鎖抽筋、Tailwind 500+400，直入 CP9。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "Tailwind 500ml · 流質卡路里（CP8→CP9 11.3 km）" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服威化、Mag-on 同漱口" },
      { id: "l-chest", slot: "左前胸小袋", item: "備用廢紙袋" },
      { id: "r-chest", slot: "右前胸小袋", item: "備用物資／鹽糖" },
      { id: "zip", slot: "前胸拉鏈細袋", item: "Mag-on 鎂粉 × 1（約 81 km 防抽筋）" },
      { id: "l-hip", slot: "左下側腰袋", item: "Naäak 威化餅 × 1（79–80 km 分口食）" },
    ],
    supplies: [
      {
        id: "naak",
        name: "Naäak Ultra Energy 威化餅",
        qty: "× 1（焦糖／香草）",
        when: "約 79–80 km（大欖林道平路中段），分 3–4 口慢咀嚼",
        pocket: "左下側腰袋",
        tactics: [
          "拯救 80km 終極厭食期（Palate Rescue）：對甜 Gel 反感達頂峰（Gel Disgust）。",
          "香脆固體口感重置口腔神經；4:1 碳水蛋白質提供飽腹同持續熱量，防止肌肉衰竭。",
        ],
      },
      {
        id: "mag-on",
        name: "Mag-on 水溶性鎂粉",
        qty: "× 1 包（檸檬／柚子）",
        when: "約 81 km，撕開倒落口，右胸純水沖下",
        pocket: "前胸拉鏈細袋",
        tactics: [
          "硬石屎路防抽筋：柏油對已行 77 km 嘅四頭同小腿係極大離心衝擊。",
          "水溶性鎂快速平衡細胞膜電位，防止慢跑時突發抽筋。",
        ],
      },
      {
        id: "tailwind",
        name: "Tailwind Endurance Fuel",
        qty: "500ml",
        when: "12:40–16:15 每 10–15 分鐘小口飲。CP8 扶輪公園沖調好",
        pocket: "左胸 500ml 軟樽",
        tactics: [
          "流質卡路里無痛續航：胃口極差時雙源碳水直接吸收。",
          "每小時約 100–120 kcal，撐到 CP9。",
        ],
      },
      {
        id: "water",
        name: "右胸軟樽純水",
        qty: "400ml",
        when: "食完 Naäak 同 Mag-on 後漱口及吞服",
        pocket: "右胸 400ml 軟樽",
        tactics: ["清潔口腔：洗走餅屑同化學甜味，維持清爽。"],
      },
      {
        id: "no-cp",
        name: "田夫仔唔係 CP",
        qty: "唔使大休",
        when: "約 14:30｜田夫仔只係路標分段，CP9 仲有約 5 km",
        pocket: "雙樽 500+400 繼續啜",
        tactics: [
          "唔好當呢度係檢查站停耐。本段 11.3 km，未到 12 km 唔使加水袋。",
        ],
      },
      {
        id: "cp9-end",
        name: "CP9 吉慶橋抵達",
        qty: "水、基本食物；停 3–5 分鐘",
        when: "約 16:15｜大欖涌水塘吉慶橋 CP9（約 M174，累計約 90 km）",
        pocket: "雙樽 500+400；唔使加水袋",
        tactics: [
          "最後一個檢查站，冇 CP10。下一段 10.8 km 官方改道到哈羅。",
          "大會可能設路線確認處，四人必須一齊經過。",
        ],
      },
    ],
    gear: [
      {
        id: "poles-stow-all",
        name: "BD 行山杖 · 100% 全程收杖",
        qty: "CP8 扶輪公園 ➔ CP9 吉慶橋",
        when: "大欖林道 100% 平緩柏油／水泥，完全唔使開杖",
        pocket: "摺埋收落背心後方彈力繩或杖袋",
        tactics: [
          "避開杖尖喺硬柏油撞擊嘅震手感。",
          "雙臂膊頭完全放鬆，雙手自由拎 Naäak 同左胸 Tailwind。",
        ],
      },
    ],
  },
  10: {
    mission:
      "CP9→哈羅終點 10.8 km（2026 官方改道）。麥徑至 C6119 右轉元荃古道→大棠→大欖林道→M178–M193→青盈路左轉哈羅。見到 M175＝行錯。冇 CP10。",
    vestTitle: "Salomon ADV Skin 12 口袋佈局",
    vest: [
      { id: "l-flask", slot: "左胸軟樽", item: "Tailwind 500ml · CP9 出發密密啜" },
      { id: "r-flask", slot: "右胸軟樽", item: "純水 400ml · 送服 Gel 同咸話梅漱口" },
      { id: "l-chest", slot: "左前胸小袋", item: "TA Gel × 2 + SiS Gel × 1（每 4–5 km 清倉）" },
      { id: "r-chest", slot: "右前胸小袋", item: "高鹽軟糖 × 3 + 咖啡因軟糖 × 3（交替）" },
      { id: "zip", slot: "前胸拉鏈細袋", item: "咸話梅 × 1（後備；CP 鮮橙已洗嘴）" },
      { id: "l-hip", slot: "左下側腰袋", item: "飯糰 × 1（話梅開胃後食）" },
    ],
    supplies: [
      {
        id: "route-nav",
        name: "2026 終點改道（必記）",
        qty: "C6119 → 大棠 → M178 → 青盈路",
        when: "離開 CP9 後全程對標距柱",
        pocket: "四人一人複述一次",
        tactics: [
          "M174 後沿麥徑至元荃古道路口 C6119，右轉入古道（C6119–C6124）到大棠燒烤場。",
          "大棠左轉沿大棠山道上斜往大欖林道；林道分岔轉右，接回麥徑 M178 行至 M193。",
          "M193 後沿大樓梯落青盈路，左轉至哈羅香港國際學校。見到 M175＝行錯路。",
        ],
      },
      {
        id: "plum",
        name: "咸話梅（後備）",
        qty: "× 1 粒（鮮橙已重置則可唔食）",
        when: "入元荃古道頭段（約 91 km）先含 1 粒，生津開胃",
        pocket: "前胸拉鏈細袋",
        tactics: [
          "徹底劈開 30 小時甜膩感（Palate Rescue）。",
          "強烈鹹酸重置口腔神經，先有胃口食最後飯糰。",
        ],
      },
      {
        id: "rice",
        name: "最後一個飯糰",
        qty: "× 1",
        when: "咸話梅開胃後，或大棠燒烤場稍停時分幾口食埋",
        pocket: "左下側腰袋",
        tactics: ["補足慢釋澱粉。大棠有加水／廁所，唔好坐耐。"],
      },
      {
        id: "ta-gel-86",
        name: "TA Energy Gel",
        qty: "第 1 包 · 清倉",
        when: "約 92 km｜元荃古道中段",
        pocket: "左右前胸快取袋",
        tactics: ["每 4–5 km 啪一包，維持血糖，防最後 10 km 撞牆。"],
      },
      {
        id: "sis-iso-90",
        name: "SiS Isotonic Gel",
        qty: "第 2 包 · 清倉（免水）",
        when: "約 95 km｜大棠山道／大欖林道上斜",
        pocket: "左右前胸快取袋",
        tactics: ["免水等滲透極速補糖同 BCAA；呢截有緩上，心跳會再升。"],
      },
      {
        id: "ta-gel-95",
        name: "TA Energy Gel（可省）",
        qty: "第 3 包 · CP 香蕉充足則可唔食",
        when: "約 98 km｜接回 M178–M193 平路",
        pocket: "左右前胸快取袋",
        tactics: ["最後一包碳水，穩住步速至青盈路樓梯。"],
      },
      {
        id: "salt-1",
        name: "TA 高鹽軟糖",
        qty: "交替第 1 粒",
        when: "每 2.5–3 km 同咖啡因軟糖交替；此粒先食",
        pocket: "右下側腰袋",
        tactics: [
          "高鹽防硬路同石級離心抽筋：古道、林道、樓梯持續震腳。",
        ],
      },
      {
        id: "caf-1",
        name: "TA 咖啡因軟糖",
        qty: "交替第 1 粒",
        when: "高鹽之後 2.5–3 km",
        pocket: "右下側腰袋",
        tactics: ["最後精神衝刺：消沉悶同睡意，專心睇標距柱防行錯。"],
      },
      {
        id: "salt-2",
        name: "TA 高鹽軟糖",
        qty: "交替第 2 粒",
        when: "再隔 2.5–3 km",
        pocket: "右下側腰袋",
        tactics: ["繼續鎖死硬路抽筋。"],
      },
      {
        id: "caf-2",
        name: "TA 咖啡因軟糖",
        qty: "交替第 2 粒",
        when: "再隔 2.5–3 km",
        pocket: "右下側腰袋",
        tactics: ["維持中樞刺激。"],
      },
      {
        id: "salt-3",
        name: "TA 高鹽軟糖",
        qty: "交替第 3 粒",
        when: "再隔 2.5–3 km",
        pocket: "右下側腰袋",
        tactics: ["清倉最後一粒高鈉。"],
      },
      {
        id: "caf-3",
        name: "TA 咖啡因軟糖",
        qty: "交替第 3 粒",
        when: "再隔 2.5–3 km，接上青盈路樓梯衝線",
        pocket: "右下側腰袋",
        tactics: ["清倉最後一粒咖啡因，四人一齊衝哈羅德門。"],
      },
      {
        id: "tailwind",
        name: "Tailwind Endurance Fuel",
        qty: "500ml（CP9 沖滿出發）",
        when: "約 16:15 離 CP9 後每 10–15 分鐘小口飲；大棠可補幾口",
        pocket: "左胸 500ml 軟樽",
        tactics: ["吊鹽水式續航：每小時約 100–120 kcal，支援 Zone 2。"],
      },
      {
        id: "water",
        name: "右胸軟樽純水",
        qty: "400ml",
        when: "食 Gel 同咸話梅後漱口清洗口腔",
        pocket: "右胸 400ml 軟樽",
        tactics: ["保持口腔清爽，衝線時狀態最佳。"],
      },
      {
        id: "finish",
        name: "哈羅終點",
        qty: "衝線",
        when: "約 18:30｜青盈路左轉哈羅香港國際學校",
        pocket: "四人一齊過線",
        tactics: [
          "冇 CP10。見到 M175＝行錯，即刻回頭搵 C6119／M178。",
        ],
      },
    ],
    gear: [
      {
        id: "poles-stow-all",
        name: "BD 行山杖 · 多數收杖",
        qty: "CP9 ➔ 哈羅終點",
        when: "平路／石屎收杖；大棠山道緩上可短暫開杖",
        pocket: "摺埋收落背心後方彈力繩或杖袋",
        tactics: [
          "元荃古道同大欖林道以平緩為主，收杖減震手。",
          "M193 後大樓梯落青盈路：收杖，空出雙手扶欄／平衡，防最後拗柴。",
        ],
      },
    ],
  },
};

export function getPlan(sectionId: number): SectionPlan {
  return PLANS[sectionId] ?? empty();
}
