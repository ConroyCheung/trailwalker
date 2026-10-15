import { SECTIONS, TOTAL_KM } from "../../data/sections";

export type RemainKm = {
  sectionRemainKm: number;
  todayRemainKm: number;
  fullRemainKm: number;
  estimated: boolean;
};

/**
 * @param kmAt 全場累計（軌道投影）；若無則用段累加估
 */
export function computeRemainKm(opts: {
  currentSectionId: number;
  kmInSection: number;
  startSectionId: number;
  endSectionId: number;
  kmAt: number | null;
}): RemainKm {
  const section = SECTIONS[opts.currentSectionId - 1];
  const kmIn = Math.min(section.km, Math.max(0, opts.kmInSection));
  const sectionRemainKm = Math.max(0, section.km - kmIn);

  const start = Math.min(opts.startSectionId, opts.endSectionId);
  const end = Math.max(opts.startSectionId, opts.endSectionId);

  let todayTotal = 0;
  let todayDone = 0;
  for (let id = start; id <= end; id++) {
    const s = SECTIONS[id - 1];
    todayTotal += s.km;
    if (id < opts.currentSectionId) todayDone += s.km;
    else if (id === opts.currentSectionId) todayDone += kmIn;
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
