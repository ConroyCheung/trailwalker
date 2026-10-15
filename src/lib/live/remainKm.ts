import { SECTIONS, TOTAL_KM } from "../../data/sections";

export type RemainKm = {
  sectionRemainKm: number;
  todayRemainKm: number;
  fullRemainKm: number;
  estimated: boolean;
};

/**
 * @param kmAt 全場累計（軌道投影）；若無則用段累加估
 * @param trainingTotalKm 練行模式總距（去＋返）；有則本段／今日／全場都用練習剩距
 */
export function computeRemainKm(opts: {
  currentSectionId: number;
  kmInSection: number;
  startSectionId: number;
  endSectionId: number;
  startKmAt?: number;
  endKmAt?: number;
  kmAt: number | null;
  trainingTotalKm?: number | null;
}): RemainKm {
  if (opts.trainingTotalKm != null && opts.trainingTotalKm > 0) {
    const kmIn = Math.min(opts.trainingTotalKm, Math.max(0, opts.kmInSection));
    const remain = Math.max(0, opts.trainingTotalKm - kmIn);
    const r = +remain.toFixed(2);
    return {
      sectionRemainKm: r,
      todayRemainKm: r,
      fullRemainKm: r,
      estimated: false,
    };
  }

  const section = SECTIONS[opts.currentSectionId - 1];
  const start = Math.min(opts.startSectionId, opts.endSectionId);
  const end = Math.max(opts.startSectionId, opts.endSectionId);
  const startKmAt = Math.max(0, opts.startKmAt ?? 0);
  const endKmAt = opts.endKmAt ?? SECTIONS[end - 1]?.km ?? 0;
  const kmIn = Math.min(section.km, Math.max(0, opts.kmInSection));
  const sectionCap =
    opts.currentSectionId === end ? Math.min(section.km, endKmAt) : section.km;
  const sectionRemainKm = Math.max(0, sectionCap - kmIn);

  let todayTotal = 0;
  let todayDone = 0;
  for (let id = start; id <= end; id++) {
    const s = SECTIONS[id - 1];
    const segStart = id === start ? startKmAt : 0;
    const segEnd = id === end ? Math.min(s.km, endKmAt) : s.km;
    todayTotal += Math.max(0, segEnd - segStart);
    if (id < opts.currentSectionId) todayDone += Math.max(0, segEnd - segStart);
    else if (id === opts.currentSectionId) todayDone += Math.max(0, kmIn - segStart);
  }
  const todayRemainKm = Math.max(0, todayTotal - todayDone);

  let fullRemainKm: number;
  let estimated = false;
  if (opts.kmAt != null && Number.isFinite(opts.kmAt)) {
    fullRemainKm = Math.max(0, TOTAL_KM - opts.kmAt);
  } else {
    estimated = true;
    let done = 0;
    for (let id = 1; id < opts.currentSectionId; id++) done += SECTIONS[id - 1].km;
    done += kmIn;
    fullRemainKm = Math.max(0, TOTAL_KM - done);
  }

  return {
    sectionRemainKm: +sectionRemainKm.toFixed(2),
    todayRemainKm: +todayRemainKm.toFixed(2),
    fullRemainKm: +fullRemainKm.toFixed(2),
    estimated,
  };
}
