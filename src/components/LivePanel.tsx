import { useEffect, useMemo, useRef, useState } from "react";
import {
  compareElevPick,
  elevPickKey,
  elevPickLabel,
  elevRangeKm,
  listElevPicks,
  listOabTurnPicks,
  parseElevPickKey,
} from "../data/elevPicks";
import { SECTIONS } from "../data/sections";
import {
  DEFAULT_OAB_TRAINING_ID,
  getTraining,
  makeOabTraining,
  trainingRaceKm,
} from "../data/trainings";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNow } from "../hooks/useNow";
import { formatSpeedKmh, gpsStepKm } from "../lib/live/geo";
import {
  allocatedHours,
  buildElevCodeEtaSnapshot,
  buildTrainingEtaSnapshot,
  DEFAULT_TARGET_HOURS,
  formatClock,
  formatDuration,
  terrainAt,
} from "../lib/live/pace";
import {
  buildSummary,
  clampPlannedStartTime,
  currentSectionKmCap,
  defaultLiveSession,
  elapsedInSectionMs,
  formatTimeInput,
  loadLiveSession,
  normalizeLiveSession,
  plannedStartTimestamp,
  saveLiveSession,
  type LiveSession,
} from "../lib/live/session";
import {
  formatOffTrack,
  nearestOnTrack,
  nearestOnTraining,
  type TrackMatch,
} from "../lib/live/trackMatch";
import { LiveMap } from "./LiveMap";

type Props = {
  sectionId: number;
  onSectionChange: (id: number) => void;
};

const ETA_USER_PAUSE_MS = 60_000;

export function LivePanel({ sectionId, onSectionChange }: Props) {
  const [session, setSessionRaw] = useState<LiveSession>(() => normalizeLiveSession(loadLiveSession()));
  const setSession = (update: LiveSession | ((prev: LiveSession) => LiveSession)) => {
    setSessionRaw((prev) => {
      const base = normalizeLiveSession(prev);
      const next = typeof update === "function" ? update(base) : update;
      return normalizeLiveSession(next);
    });
  };
  const [trackMatch, setTrackMatch] = useState<TrackMatch | null>(null);
  /** 人手 scroll ETA 後，用來觸發 1 分鐘後再 auto-follow */
  const [etaFollowNonce, setEtaFollowNonce] = useState(0);
  /** false = 列表高度約 3 站；true = 佔滿剩餘高度顯示全部 */
  const [etaFullHeight, setEtaFullHeight] = useState(false);
  const tick = session.status === "running" || session.status === "paused";
  const now = useNow(tick || session.status === "ended");
  const geoActive =
    (session.status === "running" || session.status === "ready") && session.gpsOn;
  const geo = useGeolocation(geoActive);
  const lastFixAt = useRef<number>(0);
  const skipSectionSync = useRef(false);
  const etaListRef = useRef<HTMLUListElement | null>(null);
  const etaCurrentRef = useRef<HTMLLIElement | null>(null);
  const etaUserPausedUntilRef = useRef(0);
  const etaProgrammaticScrollRef = useRef(false);
  const etaResumeTimerRef = useRef<number | null>(null);
  const inPractice =
    session.status === "ready" || session.status === "running" || session.status === "paused";

  useEffect(() => {
    saveLiveSession(session);
  }, [session]);

  const training = getTraining(session.trainingId);

  /** 外部轉段時同步（自動認段觸發時跳過重置進度）；練行模式唔跟 App 段重置 */
  useEffect(() => {
    if (skipSectionSync.current) {
      skipSectionSync.current = false;
      setSession((s) => (s.currentSectionId === sectionId ? s : { ...s, currentSectionId: sectionId }));
      return;
    }
    setSession((s) => {
      if (s.trainingId || s.status === "ready") return s;
      if (s.status !== "idle" && s.status !== "ended") {
        if (s.currentSectionId === sectionId) return s;
        const elapsed = elapsedInSectionMs(s, Date.now());
        return {
          ...s,
          sectionElapsedLog: { ...s.sectionElapsedLog, [String(s.currentSectionId)]: elapsed },
          currentSectionId: sectionId,
          kmInSection: 0,
          sectionStartedAt: Date.now(),
          sectionPausedMs: 0,
          pausedAt: s.status === "paused" ? Date.now() : null,
          lastGpsLat: null,
          lastGpsLng: null,
        };
      }
      if (s.currentSectionId === sectionId && s.startSectionId === sectionId) return s;
      return {
        ...s,
        startSectionId: sectionId,
        currentSectionId: sectionId,
        kmInSection: 0,
      };
    });
  }, [sectionId]);

  /** GPS：認路進度／累距／自動切段（ready 只預覽位置，唔計進度） */
  useEffect(() => {
    const previewOrRun = session.status === "running" || session.status === "ready";
    if (!previewOrRun || !session.gpsOn || !geo.fix) {
      if (!session.gpsOn) setTrackMatch(null);
      return;
    }
    if (geo.fix.at === lastFixAt.current) return;
    lastFixAt.current = geo.fix.at;

    const sample = {
      lat: geo.fix.lat,
      lng: geo.fix.lng,
      accuracyM: geo.fix.accuracyM,
      at: geo.fix.at,
    };
    const activeTraining = getTraining(session.trainingId);
    const match = activeTraining
      ? nearestOnTraining(sample.lat, sample.lng, activeTraining)
      : nearestOnTrack(sample.lat, sample.lng);
    setTrackMatch(match);

    if (session.status === "ready") {
      setSession((s) => ({ ...s, lastGpsLat: sample.lat, lastGpsLng: sample.lng }));
      return;
    }

    if (!session.gpsFollow) {
      setSession((s) => ({ ...s, lastGpsLat: sample.lat, lastGpsLng: sample.lng }));
      return;
    }

    const pendingSwitch = { id: null as number | null };

    setSession((s) => {
      if (s.status !== "running" || !s.gpsOn || !s.gpsFollow) return s;

      const prev =
        s.lastGpsLat != null && s.lastGpsLng != null
          ? { lat: s.lastGpsLat, lng: s.lastGpsLng, accuracyM: null, at: 0 }
          : null;
      const step = gpsStepKm(prev, sample);
      let gpsKmTotal = s.gpsKmTotal;
      if (step.addKm > 0) gpsKmTotal += step.addKm;

      const lastLat = step.acceptAsLast || !prev ? sample.lat : s.lastGpsLat;
      const lastLng = step.acceptAsLast || !prev ? sample.lng : s.lastGpsLng;

      let next: LiveSession = {
        ...s,
        gpsKmTotal,
        lastGpsLat: lastLat,
        lastGpsLng: lastLng,
      };

      if (getTraining(s.trainingId)) {
        if (!match.offTrack) {
          next = { ...next, kmInSection: match.kmAlong ?? match.kmInSection };
        } else if (step.addKm > 0) {
          const cap = currentSectionKmCap(s);
          next = { ...next, kmInSection: Math.min(cap, s.kmInSection + step.addKm) };
        }
        return next;
      }

      if (!match.offTrack) {
        const inRange = match.sectionId >= s.startSectionId && match.sectionId <= s.endSectionId;
        if (inRange && s.autoSection && match.sectionId !== s.currentSectionId) {
          const elapsed = elapsedInSectionMs(s, Date.now());
          pendingSwitch.id = match.sectionId;
          next = {
            ...next,
            sectionElapsedLog: { ...s.sectionElapsedLog, [String(s.currentSectionId)]: elapsed },
            currentSectionId: match.sectionId,
            kmInSection: match.kmInSection,
            sectionStartedAt: Date.now(),
            sectionPausedMs: 0,
            pausedAt: null,
          };
        } else if (match.sectionId === s.currentSectionId || (inRange && !s.autoSection)) {
          if (match.sectionId === s.currentSectionId) {
            next = { ...next, kmInSection: match.kmInSection };
          }
        }
      } else if (step.addKm > 0) {
        const cap = currentSectionKmCap(s);
        next = { ...next, kmInSection: Math.min(cap, s.kmInSection + step.addKm) };
      }

      return next;
    });

    if (pendingSwitch.id != null) {
      skipSectionSync.current = true;
      onSectionChange(pendingSwitch.id);
    }
  }, [
    geo.fix,
    session.status,
    session.gpsOn,
    session.gpsFollow,
    session.autoSection,
    session.trainingId,
    onSectionChange,
  ]);

  const section = SECTIONS[session.currentSectionId - 1];
  const kmCap = currentSectionKmCap(session);
  const elapsed = elapsedInSectionMs(session, now);
  const terrainKm = training
    ? trainingRaceKm(training, session.kmInSection)
    : session.kmInSection;
  const terrain = useMemo(() => {
    const base = terrainAt(section, terrainKm);
    if (!training) return base;
    // 來回：回程時「下一個」應係倒序上一節點，唔好指向草山／CP7
    const nodes = section.elevCode.filter((n) => n.kmAt <= training.turnRaceKm + 0.05);
    const along = session.kmInSection;
    const outKm = training.track.filter((p) => p.leg === "out").at(-1)?.kmAlong ?? training.totalKm / 2;
    const onBack = along > outKm + 0.05;
    if (!onBack) {
      const nextRace = nodes.find((n) => n.kmAt > terrainKm + 0.05) ?? null;
      return { ...base, next: nextRace };
    }
    const prev = [...nodes].reverse().find((n) => n.kmAt < terrainKm - 0.05) ?? nodes[0] ?? null;
    return { ...base, next: prev && prev.kmAt < terrainKm - 0.05 ? prev : nodes[0] ?? null };
  }, [section, terrainKm, training, session.kmInSection]);
  const etas = useMemo(() => {
    const liveClock = session.status === "running" || session.status === "paused";
    const etaNowTs = liveClock ? now : plannedStartTimestamp(session.plannedStartTime, now);
    const etaElapsed = liveClock ? elapsed : 0;
    if (training) {
      const outEnd = training.track.filter((p) => p.leg === "out").at(-1);
      const raceSection = SECTIONS[training.raceSectionId - 1];
      return buildTrainingEtaSnapshot({
        name: training.name,
        totalKm: training.totalKm,
        kmAlong: session.kmInSection,
        targetHours: session.trainingTargetHours,
        elapsedMs: etaElapsed,
        nowTs: etaNowTs,
        turnRaceKm: training.turnRaceKm,
        outKmAlong: outEnd?.kmAlong ?? training.totalKm / 2,
        elevNodes: raceSection?.elevCode ?? [],
      });
    }
    return buildElevCodeEtaSnapshot({
      targetHours: session.targetHours,
      currentSectionId: session.currentSectionId,
      fromSectionId: session.startSectionId,
      toSectionId: session.endSectionId,
      fromKmAt: session.startKmAt,
      toKmAt: session.endKmAt,
      kmInSection: session.kmInSection,
      elapsedInCurrentMs: etaElapsed,
      nowTs: etaNowTs,
    });
  }, [session, elapsed, now, training]);

  const elevPicks = useMemo(() => listElevPicks(), []);
  const startElevKey = elevPickKey(session.startSectionId, session.startKmAt);
  const endElevKey = elevPickKey(session.endSectionId, session.endKmAt);
  const raceRangeKm = elevRangeKm(
    session.startSectionId,
    session.startKmAt,
    session.endSectionId,
    session.endKmAt,
  );
  const oabEnabled = Boolean(training);

  /** 由而家起／止地形組來回；跨段則收束到起段並揀合理轉折 */
  const syncOabFromRange = (s: LiveSession): LiveSession => {
    const sectionId = s.startSectionId;
    let startKmAt = s.startKmAt;
    let turnKmAt = s.endSectionId === sectionId ? s.endKmAt : s.startKmAt;

    let t = makeOabTraining(sectionId, turnKmAt, startKmAt);
    if (!t) {
      const highs = listOabTurnPicks().filter(
        (p) => p.sectionId === sectionId && p.kmAt > startKmAt + 0.3,
      );
      for (const h of highs) {
        t = makeOabTraining(sectionId, h.kmAt, startKmAt);
        if (t) {
          turnKmAt = h.kmAt;
          break;
        }
      }
    }
    if (!t) {
      t = getTraining(DEFAULT_OAB_TRAINING_ID);
      if (!t) return { ...s, trainingId: null, autoSection: true };
      startKmAt = 0;
      turnKmAt = t.turnRaceKm;
    }

    return {
      ...s,
      trainingId: t.id,
      trainingTargetHours: t.defaultHours,
      currentSectionId: t.raceSectionId,
      startSectionId: t.raceSectionId,
      endSectionId: t.raceSectionId,
      startKmAt,
      endKmAt: turnKmAt,
      autoSection: false,
      kmInSection: 0,
    };
  };

  const patch = (fn: (s: LiveSession) => LiveSession) => setSession(fn);

  /** 設定完 → 入練習畫面（未計時） */
  const enterPractice = () => {
    const active = getTraining(session.trainingId);
    const startId = active ? active.raceSectionId : session.startSectionId;
    const startKm = active ? 0 : session.startKmAt;
    patch((s) => ({
      ...s,
      status: "ready",
      practiceStartedAt: null,
      practicePausedMs: 0,
      sectionStartedAt: null,
      sectionPausedMs: 0,
      pausedAt: null,
      currentSectionId: startId,
      startSectionId: active ? startId : s.startSectionId,
      endSectionId: active ? startId : s.endSectionId,
      autoSection: active ? false : s.autoSection,
      kmInSection: startKm,
      lastGpsLat: null,
      lastGpsLng: null,
      gpsKmTotal: 0,
      sectionElapsedLog: {},
      summary: null,
      gpsOn: true,
      gpsFollow: true,
    }));
    onSectionChange(startId);
  };

  /** 練習畫面入面撳開始 → 計時 */
  const start = () => {
    const t = Date.now();
    patch((s) => ({
      ...s,
      status: "running",
      practiceStartedAt: t,
      plannedStartTime: formatTimeInput(t),
      practicePausedMs: 0,
      sectionStartedAt: t,
      sectionPausedMs: 0,
      pausedAt: null,
      kmInSection: 0,
      lastGpsLat: null,
      lastGpsLng: null,
      gpsKmTotal: 0,
      sectionElapsedLog: {},
      summary: null,
    }));
  };

  const backToSetup = () => {
    patch((s) => ({
      ...s,
      status: "idle",
      gpsOn: false,
      practiceStartedAt: null,
      sectionStartedAt: null,
      pausedAt: null,
      kmInSection: 0,
      gpsKmTotal: 0,
      lastGpsLat: null,
      lastGpsLng: null,
    }));
    setTrackMatch(null);
  };

  const pause = () => {
    patch((s) => (s.status === "running" ? { ...s, status: "paused", pausedAt: Date.now() } : s));
  };

  const resume = () => {
    patch((s) => {
      if (s.status !== "paused" || !s.pausedAt) return s;
      const add = Date.now() - s.pausedAt;
      return {
        ...s,
        status: "running",
        sectionPausedMs: s.sectionPausedMs + add,
        practicePausedMs: s.practicePausedMs + add,
        pausedAt: null,
      };
    });
  };

  const end = () => {
    const t = Date.now();
    patch((s) => {
      const ended: LiveSession = {
        ...s,
        status: "ended",
        pausedAt: s.status === "running" ? t : s.pausedAt,
        gpsOn: false,
      };
      return { ...ended, summary: buildSummary(ended, t) };
    });
  };

  const reset = () => {
    const next = defaultLiveSession(sectionId);
    next.targetHours = session.targetHours;
    next.endSectionId = session.endSectionId;
    next.trainingId = session.trainingId;
    next.trainingTargetHours = session.trainingTargetHours;
    if (session.trainingId) {
      const t = getTraining(session.trainingId);
      if (t) {
        next.currentSectionId = t.raceSectionId;
        next.startSectionId = t.raceSectionId;
        next.endSectionId = t.raceSectionId;
        next.autoSection = false;
      }
    }
    setSession(next);
  };

  const arriveNext = () => {
    if (session.trainingId || session.currentSectionId >= session.endSectionId) {
      end();
      return;
    }
    const nextId = session.currentSectionId + 1;
    const t = Date.now();
    patch((s) => {
      const elapsedNow = elapsedInSectionMs(s, t);
      return {
        ...s,
        sectionElapsedLog: { ...s.sectionElapsedLog, [String(s.currentSectionId)]: elapsedNow },
        currentSectionId: nextId,
        kmInSection: 0,
        sectionStartedAt: t,
        sectionPausedMs: 0,
        pausedAt: s.status === "paused" ? t : null,
        lastGpsLat: null,
        lastGpsLng: null,
      };
    });
    onSectionChange(nextId);
  };

  const applyTrackSection = () => {
    if (!trackMatch || trackMatch.offTrack) return;
    const id = Math.min(session.endSectionId, Math.max(session.startSectionId, trackMatch.sectionId));
    skipSectionSync.current = true;
    patch((s) => ({
      ...s,
      currentSectionId: id,
      kmInSection: trackMatch.sectionId === id ? trackMatch.kmInSection : 0,
      sectionStartedAt: Date.now(),
      sectionPausedMs: 0,
      pausedAt: s.status === "paused" ? Date.now() : null,
    }));
    onSectionChange(id);
  };

  const statusLabel =
    session.status === "running"
      ? "進行中"
      : session.status === "paused"
        ? "已暫停"
        : session.status === "ready"
          ? "準備開始"
          : session.status === "ended"
            ? "已結束"
            : "未開始";

  const paceDelta =
    session.status === "idle"
      ? "練行模式"
      : session.status === "ready"
        ? "睇好地圖再開"
        : etas.aheadMs > 60_000
          ? `慢 ${formatDuration(etas.aheadMs)}`
          : etas.aheadMs < -60_000
            ? `快 ${formatDuration(-etas.aheadMs)}`
            : "貼近目標";

  const speedLabel = formatSpeedKmh(geo.fix?.speedMps);

  const practiceTitle = training
    ? `${training.name} · ${training.totalKm.toFixed(1)} km · ${session.trainingTargetHours} h · ${session.plannedStartTime} 起`
    : `第 ${session.startSectionId}–${session.endSectionId} 段 · ${session.targetHours} h · ${session.plannedStartTime} 起`;

  /** 地形密碼列表：跟進度 auto-scroll；人手 scroll 暫停 1 分鐘 */
  useEffect(() => {
    if (!inPractice) return;
    if (Date.now() < etaUserPausedUntilRef.current) return;
    const el = etaCurrentRef.current;
    const list = etaListRef.current;
    if (!el || !list) return;
    etaProgrammaticScrollRef.current = true;
    const top = el.offsetTop - list.clientHeight / 3;
    list.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    const t = window.setTimeout(() => {
      etaProgrammaticScrollRef.current = false;
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    inPractice,
    etaFullHeight,
    session.kmInSection,
    session.currentSectionId,
    etas.rows[0]?.to,
    etas.rows[0]?.distanceKm,
    etas.rows.length,
    etaFollowNonce,
  ]);

  useEffect(() => {
    return () => {
      if (etaResumeTimerRef.current != null) window.clearTimeout(etaResumeTimerRef.current);
    };
  }, []);

  const onEtaListScroll = () => {
    if (etaProgrammaticScrollRef.current) return;
    etaUserPausedUntilRef.current = Date.now() + ETA_USER_PAUSE_MS;
    if (etaResumeTimerRef.current != null) window.clearTimeout(etaResumeTimerRef.current);
    etaResumeTimerRef.current = window.setTimeout(() => {
      etaUserPausedUntilRef.current = 0;
      setEtaFollowNonce((n) => n + 1);
    }, ETA_USER_PAUSE_MS);
  };

  const gpsHint = !session.gpsOn
    ? "GPS 關"
    : geo.error
      ? geo.error
      : geo.fix
        ? [
            trackMatch?.offTrack
              ? formatOffTrack(trackMatch.distanceKm)
              : trackMatch
                ? training
                  ? `${trackMatch.leg === "back" ? "回程" : "去程"} ${trackMatch.kmAlong?.toFixed(1) ?? trackMatch.kmInSection.toFixed(1)} km`
                  : `第 ${trackMatch.sectionId} 段 ${trackMatch.kmInSection.toFixed(1)} km`
                : "定位中",
            geo.fix.accuracyM != null ? `±${Math.round(geo.fix.accuracyM)}m` : null,
            speedLabel,
          ]
            .filter(Boolean)
            .join(" · ")
        : "定位中…";

  return (
    <div className={`live${inPractice ? " live--practice" : ""}`}>
      <div className={`live-banner${inPractice ? " live-banner--practice" : ""}`}>
        <div className="live-banner-top">
          <div>
            <div className="live-kicker">Live · 練行</div>
            <div className="live-status">
              {inPractice ? (
                <>
                  {statusLabel}
                  {session.status === "running" || session.status === "paused"
                    ? ` · ${formatDuration(elapsed)}`
                    : null}
                  <span className="live-status-sub">{practiceTitle}</span>
                </>
              ) : (
                statusLabel
              )}
            </div>
          </div>
          <span className={`live-pill ${session.status}`}>{paceDelta}</span>
        </div>
        {inPractice ? (
          <div className="live-banner-progress">
            <div className="live-banner-progress-meta">
              <span className="live-terrain-inline">
                {terrain.current.place} · {terrain.current.elevM}m
                {terrain.next ? ` → ${terrain.next.place}` : ""}
              </span>
              <span className="live-km-chip">
                {session.kmInSection.toFixed(1)}/{kmCap.toFixed(1)} km
              </span>
            </div>
            <input
              id="live-km"
              type="range"
              min={0}
              max={kmCap}
              step={0.1}
              value={Math.min(session.kmInSection, kmCap)}
              aria-label={training ? "來回進度" : "本段進度"}
              onChange={(e) =>
                patch((s) => ({
                  ...s,
                  kmInSection: Number(e.target.value),
                  gpsFollow: false,
                }))
              }
            />
            {!session.gpsFollow && session.gpsOn ? (
              <button
                type="button"
                className="live-link live-link--inline"
                onClick={() =>
                  patch((s) => ({
                    ...s,
                    gpsFollow: true,
                    lastGpsLat: null,
                    lastGpsLng: null,
                  }))
                }
              >
                恢復 GPS 跟蹤
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {session.status === "ended" && session.summary ? (
        <div className="live-summary card">
          <div className="label">今日摘要</div>
          <ul className="live-summary-list">
            <li>
              <span>總用時</span>
              <strong>{formatDuration(session.summary.practiceMs)}</strong>
            </li>
            <li>
              <span>練習範圍</span>
              <strong>
                {session.summary.trainingName
                  ? session.summary.trainingName
                  : `第 ${session.summary.fromSectionId}–${session.summary.toSectionId} 段`}
              </strong>
            </li>
            <li>
              <span>停响</span>
              <strong>
                {session.summary.trainingName
                  ? `${session.summary.kmInLastSection.toFixed(1)} / 來回 km`
                  : `第 ${session.summary.lastSectionId} 段 · ${session.summary.kmInLastSection.toFixed(1)} km`}
              </strong>
            </li>
            <li>
              <span>GPS 累距</span>
              <strong>{session.summary.gpsKmTotal.toFixed(2)} km</strong>
            </li>
            <li>
              <span>{session.summary.trainingName ? "目標用時" : "目標全場"}</span>
              <strong>{session.summary.targetHours} h</strong>
            </li>
          </ul>
          {Object.keys(session.sectionElapsedLog).length ? (
            <div className="live-preview">
              <div className="label">各段用時</div>
              <ul>
                {Object.entries(session.sectionElapsedLog)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([id, ms]) => (
                    <li key={id}>
                      <span>第 {id} 段</span>
                      <span>{formatDuration(ms)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {session.status === "idle" || session.status === "ended" ? (
        <div className="live-setup card">
          <div className="live-field">
            <label htmlFor="live-start-time">練習開始時間</label>
            <div className="live-target-row">
              <input
                id="live-start-time"
                type="time"
                value={session.plannedStartTime}
                onChange={(e) =>
                  patch((s) => ({
                    ...s,
                    plannedStartTime: clampPlannedStartTime(e.target.value, s.plannedStartTime),
                  }))
                }
              />
              <button
                type="button"
                className="live-link live-link--inline"
                onClick={() =>
                  patch((s) => ({
                    ...s,
                    plannedStartTime: formatTimeInput(),
                  }))
                }
              >
                而家
              </button>
            </div>
            <p className="live-help">預計抵達會用呢個時間做起點（未撳開始前）</p>
          </div>

          <div className="live-field">
            <label htmlFor={oabEnabled ? "live-training-target" : "live-target"}>
              {oabEnabled ? "練行目標用時" : "全場目標完成時間"}
            </label>
            <div className="live-target-row">
              {oabEnabled ? (
                <input
                  id="live-training-target"
                  type="number"
                  min={0.5}
                  max={6}
                  step={0.25}
                  value={session.trainingTargetHours}
                  onChange={(e) =>
                    patch((s) => ({
                      ...s,
                      trainingTargetHours:
                        Number(e.target.value) || training?.defaultHours || 1.5,
                    }))
                  }
                />
              ) : (
                <input
                  id="live-target"
                  type="number"
                  min={20}
                  max={48}
                  step={0.5}
                  value={session.targetHours}
                  onChange={(e) =>
                    patch((s) => ({
                      ...s,
                      targetHours: Number(e.target.value) || DEFAULT_TARGET_HOURS,
                    }))
                  }
                />
              )}
              <span>小時</span>
            </div>
            <p className="live-help">
              {oabEnabled && training
                ? `去程 ≈ ${(training.totalKm / 2).toFixed(1)} km · 來回 ${training.totalKm.toFixed(1)} km`
                : "按各段 hours 權重拆時間（權重總和約 34.5h）"}
            </p>
          </div>

          <div className="live-field">
            <div className="live-label-row">
              <span className="live-label">今日練習範圍 · 地形細段</span>
              <button
                type="button"
                className={`live-toggle ${oabEnabled ? "on" : ""}`}
                aria-pressed={oabEnabled}
                title={oabEnabled ? "關閉來回" : "開啟來回"}
                onClick={() => {
                  if (oabEnabled) {
                    patch((s) => ({
                      ...s,
                      trainingId: null,
                      autoSection: true,
                      kmInSection: s.startKmAt,
                    }));
                    return;
                  }
                  const next = syncOabFromRange(session);
                  patch(() => next);
                  onSectionChange(next.currentSectionId);
                }}
              >
                來回
              </button>
            </div>
            <div className="live-range live-range--stack">
              <select
                value={startElevKey}
                onChange={(e) => {
                  const parsed = parseElevPickKey(e.target.value);
                  if (!parsed) return;
                  let next: LiveSession = {
                    ...session,
                    startSectionId: parsed.sectionId,
                    startKmAt: parsed.kmAt,
                    currentSectionId: parsed.sectionId,
                    kmInSection: oabEnabled ? 0 : parsed.kmAt,
                  };
                  const start = { sectionId: parsed.sectionId, kmAt: parsed.kmAt };
                  const end = { sectionId: session.endSectionId, kmAt: session.endKmAt };
                  if (compareElevPick(start, end) > 0) {
                    next.endSectionId = parsed.sectionId;
                    next.endKmAt = parsed.kmAt;
                  }
                  if (oabEnabled) next = syncOabFromRange(next);
                  patch(() => next);
                  onSectionChange(next.currentSectionId);
                }}
              >
                {elevPicks.map((p) => (
                  <option key={`start-${p.key}`} value={p.key}>
                    起 · {elevPickLabel(p)}
                  </option>
                ))}
              </select>
              <select
                value={endElevKey}
                onChange={(e) => {
                  const parsed = parseElevPickKey(e.target.value);
                  if (!parsed) return;
                  let next: LiveSession = {
                    ...session,
                    endSectionId: parsed.sectionId,
                    endKmAt: parsed.kmAt,
                  };
                  const start = { sectionId: session.startSectionId, kmAt: session.startKmAt };
                  const end = { sectionId: parsed.sectionId, kmAt: parsed.kmAt };
                  if (compareElevPick(start, end) > 0) {
                    next.startSectionId = parsed.sectionId;
                    next.startKmAt = parsed.kmAt;
                    next.currentSectionId = parsed.sectionId;
                    next.kmInSection = oabEnabled ? 0 : parsed.kmAt;
                  }
                  if (oabEnabled) next = syncOabFromRange(next);
                  patch(() => next);
                  onSectionChange(next.currentSectionId);
                }}
              >
                {elevPicks.map((p) => (
                  <option key={`end-${p.key}`} value={p.key}>
                    {oabEnabled ? "轉" : "止"} · {elevPickLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <p className="live-help">
              {oabEnabled && training
                ? training.blurb
                : `範圍約 ${raceRangeKm.toFixed(1)} km · 用地形密碼細段揀起止`}
            </p>
          </div>

          {!oabEnabled ? (
            <div className="live-preview">
              <div className="label">今日預計分配</div>
              <ul>
                {SECTIONS.filter((s) => s.id >= session.startSectionId && s.id <= session.endSectionId).map(
                  (s) => {
                    const h = allocatedHours(session.targetHours, s.id);
                    const fromKm = s.id === session.startSectionId ? session.startKmAt : 0;
                    const toKm = s.id === session.endSectionId ? session.endKmAt : s.km;
                    const segKm = Math.max(0, toKm - fromKm);
                    return (
                      <li key={s.id}>
                        <span>
                          第 {s.id} 段 · {segKm.toFixed(1)} km
                        </span>
                        <span>{h.toFixed(1)} h</span>
                      </li>
                    );
                  },
                )}
              </ul>
            </div>
          ) : null}

          <button className="live-primary" type="button" onClick={enterPractice}>
            {session.status === "ended" ? "再開一轉" : "進入練習"}
          </button>
          {session.status === "ended" ? (
            <button className="live-secondary" type="button" onClick={reset}>
              重置設定
            </button>
          ) : null}
        </div>
      ) : null}

      {inPractice ? (
        <>
          <LiveMap
            currentSectionId={session.currentSectionId}
            startSectionId={session.startSectionId}
            endSectionId={session.endSectionId}
            geo={geo.fix}
            trackMatch={trackMatch}
            follow={session.gpsOn && session.status === "running"}
            training={training}
            progressKm={session.kmInSection}
          />

          <div
            className={`live-etas card live-etas--compact${etaFullHeight ? " live-etas--expanded" : " live-etas--rows3"}`}
          >
            <div className="live-etas-head">
              <div className="label">預計抵達 · 地形密碼</div>
              <button
                type="button"
                className="live-help live-etas-count"
                title={etaFullHeight ? "收至 3 站高" : "展開全部高"}
                onClick={() => setEtaFullHeight((v) => !v)}
              >
                {etaFullHeight ? "全部高" : "3 站高"}
              </button>
            </div>
            <ul
              className="live-eta-list"
              ref={etaListRef}
              onScroll={onEtaListScroll}
            >
              {etas.rows.map((row, i) => (
                <li
                  key={`${row.sectionId}-${row.to}-${i}`}
                  ref={i === 0 ? etaCurrentRef : undefined}
                  className={i === 0 ? "current" : ""}
                >
                  <div className="live-eta-name">
                    {row.to}
                    {row.distanceKm != null ? (
                      <span className="live-eta-dist">{row.distanceKm.toFixed(1)} km</span>
                    ) : null}
                  </div>
                  <div className="live-eta-times">
                    <span>{formatClock(row.budgetArriveAt)}</span>
                    <span>{formatClock(row.paceArriveAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="live-gps card live-gps--compact">
            <div className="live-gps-row">
              <div className="live-gps-compact-text">
                <span className="label">GPS</span>
                <span className={`live-help${trackMatch?.offTrack ? " danger" : ""}`}>{gpsHint}</span>
              </div>
              <button
                type="button"
                className={`live-toggle ${session.gpsOn ? "on" : ""}`}
                onClick={() =>
                  patch((s) => ({
                    ...s,
                    gpsOn: !s.gpsOn,
                    lastGpsLat: null,
                    lastGpsLng: null,
                    gpsFollow: !s.gpsOn ? true : s.gpsFollow,
                  }))
                }
              >
                {session.gpsOn ? "開" : "關"}
              </button>
              {!training ? (
                <button
                  type="button"
                  className={`live-toggle ${session.autoSection ? "on" : ""}`}
                  disabled={!session.gpsOn}
                  title="自動切段"
                  onClick={() => patch((s) => ({ ...s, autoSection: !s.autoSection }))}
                >
                  切段
                </button>
              ) : null}
            </div>
            {!training && trackMatch && !trackMatch.offTrack && trackMatch.sectionId !== session.currentSectionId ? (
              <button type="button" className="live-link" onClick={applyTrackSection}>
                切去第 {trackMatch.sectionId} 段
              </button>
            ) : null}
          </div>

          <div className={`live-actions${session.status === "ready" ? " ready" : ""}`}>
            {session.status === "ready" ? (
              <>
                <button type="button" className="live-primary" onClick={start}>
                  開始
                </button>
                <button type="button" className="live-secondary" onClick={backToSetup}>
                  返回設定
                </button>
              </>
            ) : (
              <>
                {session.status === "running" ? (
                  <button type="button" className="live-secondary" onClick={pause}>
                    暫停
                  </button>
                ) : (
                  <button type="button" className="live-secondary" onClick={resume}>
                    繼續
                  </button>
                )}
                <button type="button" className="live-secondary" onClick={arriveNext}>
                  {training || session.currentSectionId >= session.endSectionId
                    ? "完成練習"
                    : "到站 · 下一段"}
                </button>
                <button type="button" className="live-danger" onClick={end}>
                  結束
                </button>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
