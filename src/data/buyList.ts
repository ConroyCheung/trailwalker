export type BuyItem = {
  id: string;
  name: string;
  qty: string;
  note: string;
  usedIn: string;
};

export type BuyGroup = {
  id: string;
  title: string;
  hint?: string;
  items: BuyItem[];
};

export const BUY_LIST: BuyGroup[] = [
  {
    id: "gel",
    title: "能量膠",
    hint: "賽前一次買齊，口袋按段再分裝",
    items: [
      {
        id: "ta-gel",
        name: "TA Energy Gel",
        qty: "5 包",
        note: "鹹焦糖／鹹西瓜。第 10 段第 3 包可省",
        usedIn: "第 1、2、6、8 段各 1；第 10 段 1（第 2 包可省）",
      },
      {
        id: "maurten",
        name: "Maurten Gel 100",
        qty: "4 包",
        note: "原味",
        usedIn: "第 1、3、7、8 段各 1",
      },
      {
        id: "sis-iso",
        name: "SiS Isotonic Gel",
        qty: "6 包",
        note: "蘋果／橙。第 5 段第 2 包可省（CP3 香蕉）",
        usedIn: "第 3 段 2；第 4 段 1；第 5 段 1；第 7、10 段各 1",
      },
    ],
  },
  {
    id: "chew",
    title: "軟糖",
    items: [
      {
        id: "ta-salt",
        name: "TA Energy 軟糖（高鹽）",
        qty: "13 粒",
        note: "High Sodium",
        usedIn: "第 1 段 3；第 2 段 2；第 6 段 2；第 8、10 段各 3",
      },
      {
        id: "ta-caf",
        name: "TA 咖啡因軟糖",
        qty: "15 粒",
        note: "Caffeine Chews",
        usedIn: "第 4 段 3；第 5 段 6；第 7、10 段各 3",
      },
    ],
  },
  {
    id: "drink",
    title: "沖劑／鎂粉",
    items: [
      {
        id: "tailwind",
        name: "Tailwind Endurance Fuel",
        qty: "夠沖約 3.6 L（7 × 500ml 或 9 × 400ml）",
        note: "短 CP 用 400ml 樽；長 CP 另加水袋純水。建議多買 2 份後備",
        usedIn: "第 1 段 400；第 4 段 2×500；第 5 段 500；第 7、9 段 400；第 10 段 2×400",
      },
      {
        id: "sis-hydro",
        name: "SiS Hydro 電解質錠",
        qty: "8 粒",
        note: "無糖，沖左胸軟樽",
        usedIn: "第 2、3、8 段各約 2；第 5 段半粒；第 6 段 1",
      },
      {
        id: "mag-on",
        name: "Mag-on 水溶性鎂粉",
        qty: "3 包",
        note: "檸檬／柚子",
        usedIn: "第 3、7、9 段各 1",
      },
    ],
  },
  {
    id: "food",
    title: "實體食物（賽前準備）",
    items: [
      {
        id: "onigiri",
        name: "飯糰（酸梅／三文魚）",
        qty: "2 個",
        note: "只帶起步＋終點；中段改食 CP 熱食減重",
        usedIn: "第 1 段起步 1；第 10 段改道／大棠 1",
      },
      {
        id: "naak",
        name: "Naäak Ultra Energy 威化餅",
        qty: "2 件",
        note: "焦糖／香草",
        usedIn: "第 4、9 段各 1",
      },
      {
        id: "dates",
        name: "椰棗 Dates",
        qty: "2 粒",
        note: "配榨菜重置味覺",
        usedIn: "第 5 段筆架山頂",
      },
      {
        id: "zha-cai",
        name: "榨菜絲",
        qty: "1 細包",
        note: "鹹酸劈甜膩",
        usedIn: "第 5 段筆架山頂",
      },
      {
        id: "plum",
        name: "咸話梅",
        qty: "1 粒",
        note: "後備；CP 鮮橙已做味覺重置",
        usedIn: "第 10 段元荃古道後，可唔食",
      },
    ],
  },
  {
    id: "kit",
    title: "CP 裝備（一定要買）",
    hint: "大會完全唔提供即棄碗碟",
    items: [
      {
        id: "bladder",
        name: "500ml 軟水袋（背倉）",
        qty: "1 個",
        note: "Salomon ADV Skin 12 背倉。長 CP 裝純水",
        usedIn: "起步→CP1 15.5 km、CP3→CP4 12.7 km",
      },
      {
        id: "bowl",
        name: "快乾矽膠摺碗 + 摺匙",
        qty: "1 套",
        note: "塞背囊側袋，入 CP 5 秒拉出",
        usedIn: "CP3／CP4／CP7／CP8 熱粥熱麵熱湯",
      },
    ],
  },
  {
    id: "trail",
    title: "大會 CP／沿途現場（唔使賽前買）",
    hint: "鮮橙、香蕉、熱食、寶礦力大會有。記住半碗、12 分鐘走人",
    items: [
      {
        id: "ham-tin",
        name: "咸田灣士多熱食",
        qty: "1 餐",
        note: "熱豆腐花／熱茶，現場買",
        usedIn: "第 2 段約 18.5 km，停 5–8 分鐘",
      },
      {
        id: "cheung-sheung",
        name: "嶂上許生士多熱食",
        qty: "1 餐",
        note: "豆腐花／餐蛋麵，現場買",
        usedIn: "第 3 段約 28.5 km",
      },
      {
        id: "cp-orange",
        name: "大會鮮橙",
        qty: "每個指定 CP 1–2 塊",
        note: "免費味覺重置",
        usedIn: "CP3 企嶺下、CP5 筆架山、CP7 鉛礦坳、CP8 扶輪公園",
      },
      {
        id: "cp-banana",
        name: "大會香蕉",
        qty: "半隻至一隻 × 3 站",
        note: "補鉀；可少食 1 包 Gel",
        usedIn: "CP4 基維爾、CP7 鉛礦坳、CP8 扶輪公園",
      },
      {
        id: "cp2",
        name: "CP3 半碗熱通粉／熱麵",
        qty: "只要半碗",
        note: "首個大型支援熱食",
        usedIn: "企嶺下，12 分鐘內撤離",
      },
      {
        id: "cp3",
        name: "CP4 半碗熱湯",
        qty: "只要半碗",
        note: "入夜暖胃",
        usedIn: "基維爾營地，12 分鐘內撤離",
      },
      {
        id: "cp6",
        name: "CP7 半碗熱湯／粉麵",
        qty: "只要半碗",
        note: "針草山後補鈉暖胃",
        usedIn: "鉛礦坳，12 分鐘內撤離",
      },
      {
        id: "cp7",
        name: "CP8 熱燒賣／包點 + 熱飲",
        qty: "少量",
        note: "支援隊關鍵站；高處可能大霧凍",
        usedIn: "大帽山扶輪公園，12 分鐘內撤離",
      },
      {
        id: "pocari",
        name: "大會寶礦力",
        qty: "左胸軟樽急救備用",
        note: "等滲透，每 100ml 約 6g 碳水",
        usedIn: "任何 CP，Tailwind／Hydro 飲晒就裝",
      },
    ],
  },
];
