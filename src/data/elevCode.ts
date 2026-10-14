/**
 * 海拔地形密碼撰寫規則（Elevation & Terrain Code Rules）
 *
 * 規則 1：時序極值鎖定 — 起點起、終點結；不跳過局部極高／極低；坡度翻轉必記。
 * 規則 2：路面形態與趨勢 — 兩節點之間標明路面質地＋升降趨勢＋段距 km。
 * 規則 3：切分觸發 — 坡度反轉、路面劇變、關鍵戰術點（CP／加水／退場）。
 * 公式：[起點/海拔] →(km · 路面＋趨勢)→ [極高或極低/海拔] → … → [終點/海拔]
 * 各段 via.km 加總 ≈ 本段總距離。
 */

export type SlopeTrend = "steepUp" | "mildUp" | "flat" | "mildDown" | "steepDown";
export type NodeRole = "start" | "high" | "low" | "end" | "cp";

export type ElevVia = {
  /** 由上一點到本點嘅距離（km） */
  km: number;
  /** 路面質地：樓梯／斜路／平路／碎石樹根徑等 */
  surface: string;
  trend: SlopeTrend;
};

export type ElevCodeNode = {
  elevM: number;
  place: string;
  role: NodeRole;
  /** 由本段起點累計 km（起點＝0） */
  kmAt: number;
  /** 由上一點到本點；起點無 via */
  via?: ElevVia;
};

export const TREND_SYMBOL: Record<SlopeTrend, string> = {
  steepUp: "⬆️",
  mildUp: "↗️",
  flat: "➡️",
  mildDown: "↘️",
  steepDown: "⬇️",
};

export const TREND_LABEL: Record<SlopeTrend, string> = {
  steepUp: "陡升",
  mildUp: "緩升",
  flat: "平緩",
  mildDown: "緩降",
  steepDown: "急降",
};

export const ROLE_LABEL: Record<NodeRole, string> = {
  start: "起點",
  high: "極高",
  low: "極低",
  end: "終點",
  cp: "CP",
};

export const ELEV_CODE_RULES = [
  "起點海拔起、終點海拔結；中間唔跳過局部極高／極低",
  "上變落或落變上（波浪翻轉）必須記該處海拔",
  "兩點之間標明：段距 km＋路面質地＋升降趨勢",
  "各段 via.km 加總 ≈ 本段總距離；kmAt＝由起步累計",
  "坡度反轉／路面劇變／CP·加水·退場 → 強制加節點",
] as const;

export function elevLadder(nodes: ElevCodeNode[]): number[] {
  return nodes.map((n) => n.elevM);
}

export function elevMaxOf(nodes: ElevCodeNode[]): number {
  return nodes.reduce((m, n) => Math.max(m, n.elevM), 0);
}

export function elevCodeKmSum(nodes: ElevCodeNode[]): number {
  return nodes.reduce((s, n) => s + (n.via?.km ?? 0), 0);
}
