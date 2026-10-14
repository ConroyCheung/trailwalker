import { useEffect, useMemo, useState } from "react";
import { ROLE_LABEL, SECTIONS, TREND_LABEL, TREND_SYMBOL } from "../data/sections";
import { useGeolocation } from "../hooks/useGeolocation";
import { useNow } from "../hooks/useNow";
import {
  allocatedHours,
  buildEtaSnapshot,
  DEFAULT_TARGET_HOURS,
  formatClock,
  formatDuration,
  terrainAt,
} from "../lib/live/pace";
import {
  currentSectionKmCap,
  defaultLiveSession,
  elapsedInSectionMs,
  loadLiveSession,
  saveLiveSession,
  type LiveSession,
} from "../lib/live/session";

type Props = {
  /** 由主畫面同步段（例如底部轉段） */
  sectionId: number;
  onSectionChange: (id: number) => void;
};

export function LivePanel({ sectionId, onSectionChange }: Props) {
  const [session, setSession] = useState<LiveSession>(() => loadLiveSession());
  const tick = session.status === "running" || session.status === "paused";
  const now = useNow(tick);
  const geo = useGeolocation(session.status === "running" && session.gpsOn);

  useEffect(() => {
    saveLiveSession(session);
  }, [session]);

  /** 外部轉段時，若未開跑則同步設定起點／目前段 */
  useEffect(() => {
    setSession((s) => {
      if (s.status !== "idle" && s.status !== "ended") {
        if (s.currentSectionId === sectionId) return s;
        return {
          ...s,
          currentSectionId: sectionId,
          kmInSection: 0,
          sectionStartedAt: s.status === "running" ? Date.now() : s.sectionStartedAt,
          sectionPausedMs: 0,
          pausedAt: s.status === "paused" ? Date.now() : null,
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

  const section = SECTIONS[session.currentSectionId - 1];
  const kmCap = currentSectionKmCap(session);
  const elapsed = elapsedInSectionMs(session, now);
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
    patch((s) => ({
      ...s,
      status: "running",
      practiceStartedAt: s.practiceStartedAt ?? t,
      sectionStartedAt: t,
      sectionPausedMs: 0,
      pausedAt: null,
      currentSectionId: s.startSectionId,
      kmInSection: 0,
    }));
    onSectionChange(session.startSectionId);
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
        pausedAt: null,
      };
    });
  };

  const end = () => {
    patch((s) => ({
      ...s,
      status: "ended",
      pausedAt: s.status === "running" ? Date.now() : s.pausedAt,
      gpsOn: false,
    }));
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
    patch((s) => ({
      ...s,
      currentSectionId: nextId,
      kmInSection: 0,
      sectionStartedAt: t,
      sectionPausedMs: 0,
      pausedAt: s.status === "paused" ? t : null,
    }));
    onSectionChange(nextId);
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
    etas.aheadMs > 60_000 ? `慢 ${formatDuration(etas.aheadMs)}` : etas.aheadMs < -60_000 ? `快 ${formatDuration(-etas.aheadMs)}` : "貼近目標";

  return (
    <div className="live">
      <div className="live-banner">
        <div>
          <div className="live-kicker">Live · 練行</div>
          <div className="live-status">
            {statusLabel}
            {session.status === "running" || session.status === "paused" ? ` · 本段 ${formatDuration(elapsed)}` : null}
          </div>
        </div>
        <span className={`live-pill ${session.status}`}>{paceDelta}</span>
      </div>

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
            <p className="live-help">按各段 hours 權重拆時間（而家權重總和約 34.5h）</p>
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
              </label>
              <input
                id="live-km"
                type="range"
                min={0}
                max={kmCap}
                step={0.1}
                value={Math.min(session.kmInSection, kmCap)}
                onChange={(e) => patch((s) => ({ ...s, kmInSection: Number(e.target.value) }))}
              />
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
              <div className="label">GPS</div>
              <button
                type="button"
                className={`live-toggle ${session.gpsOn ? "on" : ""}`}
                onClick={() => patch((s) => ({ ...s, gpsOn: !s.gpsOn }))}
              >
                {session.gpsOn ? "開" : "關"}
              </button>
            </div>
            {session.gpsOn ? (
              geo.error ? (
                <p className="live-help danger">{geo.error} · 可用進度條繼續練</p>
              ) : geo.fix ? (
                <p className="live-help">
                  {geo.fix.lat.toFixed(5)}, {geo.fix.lng.toFixed(5)}
                  {geo.fix.accuracyM != null ? ` · ±${Math.round(geo.fix.accuracyM)}m` : ""}
                  {geo.fix.altitudeM != null ? ` · ${Math.round(geo.fix.altitudeM)}m` : ""}
                </p>
              ) : (
                <p className="live-help">定位中…</p>
              )
            ) : (
              <p className="live-help">關住慳電；位置用進度條對地形密碼</p>
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
