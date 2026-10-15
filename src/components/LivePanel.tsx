import { useEffect, useMemo, useRef, useState } from "react";
import { ROLE_LABEL, SECTIONS, TREND_LABEL, TREND_SYMBOL } from "../data/sections";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNow } from "../hooks/useNow";
import { formatSpeedKmh, gpsStepKm } from "../lib/live/geo";
import {
  allocatedHours,
  buildEtaSnapshot,
  DEFAULT_TARGET_HOURS,
  formatClock,
  formatDuration,
  terrainAt,
} from "../lib/live/pace";
import { computeRemainKm } from "../lib/live/remainKm";
import {
  buildSummary,
  currentSectionKmCap,
  defaultLiveSession,
  elapsedInSectionMs,
  loadLiveSession,
  practiceElapsedMs,
  saveLiveSession,
  type LiveSession,
} from "../lib/live/session";
import { formatOffTrack, nearestOnTrack, type TrackMatch } from "../lib/live/trackMatch";
import { LiveMap } from "./LiveMap";

type Props = {
  sectionId: number;
  onSectionChange: (id: number) => void;
};

export function LivePanel({ sectionId, onSectionChange }: Props) {
  const [session, setSession] = useState<LiveSession>(() => loadLiveSession());
  const [trackMatch, setTrackMatch] = useState<TrackMatch | null>(null);
  const tick = session.status === "running" || session.status === "paused";
  const now = useNow(tick || session.status === "ended");
  const geo = useGeolocation(session.status === "running" && session.gpsOn);
  const lastFixAt = useRef<number>(0);
  const skipSectionSync = useRef(false);

  useEffect(() => {
    saveLiveSession(session);
  }, [session]);

  /** 外部轉段時同步（自動認段觸發時跳過重置進度） */
  useEffect(() => {
    if (skipSectionSync.current) {
      skipSectionSync.current = false;
      setSession((s) => (s.currentSectionId === sectionId ? s : { ...s, currentSectionId: sectionId }));
      return;
    }
    setSession((s) => {
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

  /** GPS：認路進度／累距／自動切段 */
  useEffect(() => {
    if (session.status !== "running" || !session.gpsOn || !geo.fix) {
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
    const match = nearestOnTrack(sample.lat, sample.lng);
    setTrackMatch(match);

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
  }, [geo.fix, session.status, session.gpsOn, session.gpsFollow, session.autoSection, onSectionChange]);

  const section = SECTIONS[session.currentSectionId - 1];
  const kmCap = currentSectionKmCap(session);
  const elapsed = elapsedInSectionMs(session, now);
  const practiceMs = practiceElapsedMs(session, now);
  const terrain = useMemo(() => terrainAt(section, session.kmInSection), [section, session.kmInSection]);
  const etas = useMemo(
    () =>
      buildEtaSnapshot({
        targetHours: session.targetHours,
        currentSectionId: session.currentSectionId,
        fromSectionId: session.startSectionId,
        toSectionId: session.endSectionId,
        kmInSection: session.kmInSection,
        elapsedInCurrentMs: elapsed,
        nowTs: now,
      }),
    [session, elapsed, now],
  );

  const patch = (fn: (s: LiveSession) => LiveSession) => setSession(fn);

  const start = () => {
    const t = Date.now();
    const startId = session.startSectionId;
    patch((s) => ({
      ...s,
      status: "running",
      practiceStartedAt: t,
      practicePausedMs: 0,
      sectionStartedAt: t,
      sectionPausedMs: 0,
      pausedAt: null,
      currentSectionId: s.startSectionId,
      kmInSection: 0,
      lastGpsLat: null,
      lastGpsLng: null,
      gpsKmTotal: 0,
      sectionElapsedLog: {},
      summary: null,
    }));
    onSectionChange(startId);
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
    setSession(next);
  };

  const arriveNext = () => {
    if (session.currentSectionId >= session.endSectionId) {
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
        : session.status === "ended"
          ? "已結束"
          : "未開始";

  const paceDelta =
    session.status === "idle"
      ? "練行模式"
      : etas.aheadMs > 60_000
        ? `慢 ${formatDuration(etas.aheadMs)}`
        : etas.aheadMs < -60_000
          ? `快 ${formatDuration(-etas.aheadMs)}`
          : "貼近目標";

  const speedLabel = formatSpeedKmh(geo.fix?.speedMps);
  const remain = useMemo(
    () =>
      computeRemainKm({
        currentSectionId: session.currentSectionId,
        kmInSection: session.kmInSection,
        startSectionId: session.startSectionId,
        endSectionId: session.endSectionId,
        kmAt: trackMatch && !trackMatch.offTrack ? trackMatch.kmAt : null,
      }),
    [session, trackMatch],
  );

  return (
    <div className="live">
      <div className="live-banner">
        <div>
          <div className="live-kicker">Live · 練行</div>
          <div className="live-status">
            {statusLabel}
            {session.status === "running" || session.status === "paused"
              ? ` · 本段 ${formatDuration(elapsed)} · 今日 ${formatDuration(practiceMs)}`
              : null}
          </div>
        </div>
        <span className={`live-pill ${session.status}`}>{paceDelta}</span>
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
                第 {session.summary.fromSectionId}–{session.summary.toSectionId} 段
              </strong>
            </li>
            <li>
              <span>停响</span>
              <strong>
                第 {session.summary.lastSectionId} 段 · {session.summary.kmInLastSection.toFixed(1)} km
              </strong>
            </li>
            <li>
              <span>GPS 累距</span>
              <strong>{session.summary.gpsKmTotal.toFixed(2)} km</strong>
            </li>
            <li>
              <span>目標全場</span>
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
            <label htmlFor="live-target">全場目標完成時間</label>
            <div className="live-target-row">
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
              <span>小時</span>
            </div>
            <p className="live-help">按各段 hours 權重拆時間（權重總和約 34.5h）</p>
          </div>

          <div className="live-field">
            <span className="live-label">今日練習範圍</span>
            <div className="live-range">
              <select
                value={session.startSectionId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  patch((s) => ({
                    ...s,
                    startSectionId: id,
                    currentSectionId: id,
                    endSectionId: Math.max(id, s.endSectionId),
                    kmInSection: 0,
                  }));
                  onSectionChange(id);
                }}
              >
                {SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    起 · 第 {s.id} 段
                  </option>
                ))}
              </select>
              <select
                value={session.endSectionId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  patch((s) => ({
                    ...s,
                    endSectionId: id,
                    startSectionId: Math.min(id, s.startSectionId),
                  }));
                }}
              >
                {SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    止 · 第 {s.id} 段
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="live-preview">
            <div className="label">今日預計分配</div>
            <ul>
              {SECTIONS.filter((s) => s.id >= session.startSectionId && s.id <= session.endSectionId).map((s) => {
                const h = allocatedHours(session.targetHours, s.id);
                return (
                  <li key={s.id}>
                    <span>
                      第 {s.id} 段 · {s.km} km
                    </span>
                    <span>{h.toFixed(1)} h</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <button className="live-primary" type="button" onClick={start}>
            {session.status === "ended" ? "再開一轉" : "開始 Live"}
          </button>
          {session.status === "ended" ? (
            <button className="live-secondary" type="button" onClick={reset}>
              重置設定
            </button>
          ) : null}
        </div>
      ) : null}

      {session.status === "running" || session.status === "paused" ? (
        <>
          <div className="live-remain card">
            <div className="label">仲有幾多 km{remain.estimated ? "（估）" : ""}</div>
            <div className="live-remain-grid">
              <div>
                <span className="k">本段</span>
                <strong>{remain.sectionRemainKm.toFixed(1)}</strong>
              </div>
              <div>
                <span className="k">今日</span>
                <strong>{remain.todayRemainKm.toFixed(1)}</strong>
              </div>
              <div>
                <span className="k">全場</span>
                <strong>{remain.fullRemainKm.toFixed(1)}</strong>
              </div>
            </div>
          </div>

          <LiveMap
            currentSectionId={session.currentSectionId}
            startSectionId={session.startSectionId}
            endSectionId={session.endSectionId}
            geo={geo.fix}
            trackMatch={trackMatch}
            follow={session.gpsOn && session.status === "running"}
          />

          <div className="live-here card">
            <div className="label">而家位置</div>
            <p className="live-route">
              第 {section.id} 段 · {section.from} → {section.to}
            </p>
            <div className="live-terrain">
              <div>
                <span className="k">最近節點</span>
                <strong>
                  {terrain.current.place} · {terrain.current.elevM}m · {ROLE_LABEL[terrain.current.role]}
                </strong>
              </div>
              {terrain.next ? (
                <div>
                  <span className="k">下一個</span>
                  <strong>
                    {terrain.next.place} · {terrain.next.elevM}m
                    {terrain.next.via
                      ? ` · ${TREND_SYMBOL[terrain.next.via.trend]} ${TREND_LABEL[terrain.next.via.trend]} · ${terrain.next.via.surface}`
                      : null}
                  </strong>
                </div>
              ) : (
                <div>
                  <span className="k">下一個</span>
                  <strong>本段終點附近</strong>
                </div>
              )}
            </div>

            <div className="live-field">
              <label htmlFor="live-km">
                本段進度 · {session.kmInSection.toFixed(1)} / {kmCap.toFixed(1)} km
                {session.gpsOn && session.gpsFollow ? " · GPS 跟蹤" : ""}
              </label>
              <input
                id="live-km"
                type="range"
                min={0}
                max={kmCap}
                step={0.1}
                value={Math.min(session.kmInSection, kmCap)}
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
                  className="live-link"
                  onClick={() =>
                    patch((s) => ({
                      ...s,
                      gpsFollow: true,
                      lastGpsLat: null,
                      lastGpsLng: null,
                    }))
                  }
                >
                  恢復 GPS 跟蹤進度
                </button>
              ) : null}
            </div>
          </div>

          <div className="live-etas card">
            <div className="label">預計到站</div>
            <p className="live-help">左＝跟目標分配 · 右＝跟而家 pace</p>
            <ul className="live-eta-list">
              {etas.rows.map((row) => (
                <li key={row.sectionId} className={row.sectionId === session.currentSectionId ? "current" : ""}>
                  <div className="live-eta-name">
                    第 {row.sectionId} · {row.to}
                  </div>
                  <div className="live-eta-times">
                    <span>{formatClock(row.budgetArriveAt)}</span>
                    <span>{formatClock(row.paceArriveAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="live-gps card">
            <div className="live-gps-row">
              <div className="label">GPS · 認路</div>
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
            </div>
            <div className="live-gps-row live-gps-sub">
              <span className="live-help">自動切段</span>
              <button
                type="button"
                className={`live-toggle ${session.autoSection ? "on" : ""}`}
                disabled={!session.gpsOn}
                onClick={() => patch((s) => ({ ...s, autoSection: !s.autoSection }))}
              >
                {session.autoSection ? "開" : "關"}
              </button>
            </div>
            {session.gpsOn ? (
              geo.error ? (
                <p className="live-help danger">{geo.error} · 可用進度條繼續練</p>
              ) : geo.fix ? (
                <>
                  <p className="live-help">
                    {geo.fix.lat.toFixed(5)}, {geo.fix.lng.toFixed(5)}
                    {geo.fix.accuracyM != null ? ` · ±${Math.round(geo.fix.accuracyM)}m` : ""}
                    {geo.fix.altitudeM != null ? ` · ${Math.round(geo.fix.altitudeM)}m` : ""}
                    {speedLabel ? ` · ${speedLabel}` : ""}
                  </p>
                  <p className="live-help">今日 GPS 累距 {session.gpsKmTotal.toFixed(2)} km</p>
                  {trackMatch ? (
                    <div className={`live-nearest ${trackMatch.offTrack ? "off" : "on-track"}`}>
                      {trackMatch.offTrack ? (
                        <>
                          <div className="k">偏離路線</div>
                          <strong className="danger-text">{formatOffTrack(trackMatch.distanceKm)}</strong>
                          <p className="live-help">稀疏路線約略判斷；可人手轉段或拖進度</p>
                        </>
                      ) : (
                        <>
                          <div className="k">路線鎖定</div>
                          <strong>
                            第 {trackMatch.sectionId} 段 · 段內 {trackMatch.kmInSection.toFixed(1)} km
                            {trackMatch.label ? ` · ${trackMatch.label}` : ""}
                            {` · 離線 ${trackMatch.distanceKm < 1 ? `${Math.round(trackMatch.distanceKm * 1000)}m` : `${trackMatch.distanceKm.toFixed(1)}km`}`}
                          </strong>
                          {trackMatch.sectionId !== session.currentSectionId ? (
                            <button type="button" className="live-link" onClick={applyTrackSection}>
                              切去認到嘅第 {trackMatch.sectionId} 段
                            </button>
                          ) : (
                            <p className="live-help">同而家段一致 · 進度跟路線投影</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="live-help">定位中…</p>
              )
            ) : (
              <p className="live-help">
                關住慳電。地圖純離線底圖（唔經 CARTO）；認路＝OTW 官方線（終段元荃古道→哈羅）
              </p>
            )}
          </div>

          <div className="live-actions">
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
              {session.currentSectionId >= session.endSectionId ? "完成今日" : "到站 · 下一段"}
            </button>
            <button type="button" className="live-danger" onClick={end}>
              結束
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
