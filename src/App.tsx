import { useEffect, useMemo, useState } from "react";
import {
  DIFFICULTY_LABEL,
  ELEV_CODE_RULES,
  ROLE_LABEL,
  SECTIONS,
  START_CLOCK,
  TREND_LABEL,
  TREND_SYMBOL,
  TOTAL_KM,
  elevCodeKmSum,
  sectionElevMax,
} from "./data/sections";
import { getPlan } from "./data/plans";
import { BUY_LIST } from "./data/buyList";
import { buyKey, itemKey, isChecked, toggleChecked } from "./lib/checks";
import { loadSection, loadTab, saveSection, saveTab, type TabId } from "./lib/persist";
import { useOnline } from "./hooks/useOnline";
import { useSwipe } from "./hooks/useSwipe";
import { LivePanel } from "./components/LivePanel";

export default function App() {
  const [sectionId, setSectionId] = useState(loadSection);
  const [tab, setTab] = useState<TabId>(loadTab);
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const online = useOnline();
  const section = SECTIONS[sectionId - 1];
  const plan = getPlan(sectionId);
  const items = tab === "gear" ? plan.gear : plan.supplies;
  const isBuy = tab === "buy";
  const isTerrain = tab === "terrain";
  const isLive = tab === "live";
  const showPlanList = tab === "supplies" || tab === "gear";
  const buyItems = useMemo(() => BUY_LIST.flatMap((g) => g.items), []);
  const buyDone = buyItems.filter((i) => checks >= 0 && isChecked(buyKey(i.id))).length;

  useEffect(() => saveSection(sectionId), [sectionId]);
  useEffect(() => saveTab(tab), [tab]);
  useEffect(() => setExpanded(null), [tab, sectionId]);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const progressKm = useMemo(() => {
    return SECTIONS.filter((s) => s.id < sectionId).reduce((n, s) => n + s.km, 0);
  }, [sectionId]);

  const go = (id: number) => {
    const next = Math.min(10, Math.max(1, id));
    setSectionId(next);
    setPicker(false);
    setExpanded(null);
  };

  const selectTab = (next: TabId) => {
    setTab(next);
  };

  const swipe = useSwipe({
    onLeft: () => {
      if (!isBuy && !isLive) go(sectionId + 1);
    },
    onRight: () => {
      if (!isBuy && !isLive) go(sectionId - 1);
    },
  });

  return (
    <div className="app">
      <div className="sticky-head">
        <header className="topbar">
          <div className="brand">
            <strong>毅行者 · CP 計劃</strong>
            <span>
              {isBuy
                ? `購物清單 · 已買 ${buyDone} / ${buyItems.length}`
                : isLive
                  ? "Live 練行 · 目標時間拆段 · 可中途起止"
                  : `${START_CLOCK} 起步 · 36h · 已過 ${progressKm.toFixed(1)} / ${TOTAL_KM.toFixed(1)} km`}
            </span>
          </div>
          <div className="status">
            <span className={`pill ${online ? "" : "offline"}`}>
              <span className="dot" />
              {online ? "有網絡" : "離線可用"}
            </span>
          </div>
        </header>

        {isBuy ? (
          <div className="mission">
            <div className="label">賽前一次買齊</div>
            <p>數量已按十段計劃加總。沿途士多熱食唔使預先買，勾完代表記住帶錢同預留停站。</p>
          </div>
        ) : (
          <section className="section-card">
            <div className="section-nav">
              <div className="section-title">
                <button type="button" onClick={() => setPicker(true)}>
                  <div className="kicker">
                    第 {section.id} 段 · {section.id === 10 ? "終點" : `→ CP${section.id}`} · {section.km} km
                  </div>
                  <p className="route">
                    {section.from} → {section.to}
                  </p>
                </button>
              </div>
              <span className={`chip diff-badge diff-${section.difficulty}`}>
                {DIFFICULTY_LABEL[section.difficulty]}
              </span>
            </div>
            <div className="stage-row">
              {SECTIONS.map((s) => (
                <button key={s.id} className={`stage ${s.id === sectionId ? "active" : ""}`} onClick={() => go(s.id)}>
                  {s.id}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <main className="panel" {...swipe}>
        {isLive ? <LivePanel sectionId={sectionId} onSectionChange={go} /> : null}

        {isBuy ? (
          <>
            {BUY_LIST.map((group) => (
              <div key={group.id}>
                <div className="group-title">{group.title}</div>
                {group.hint ? <p className="group-hint">{group.hint}</p> : null}
                <div className="card">
                  {group.items.map((item) => {
                    const key = buyKey(item.id);
                    const done = checks >= 0 && isChecked(key);
                    return (
                      <div key={item.id} className={`list-item ${done ? "done" : ""}`}>
                        <button
                          className="check"
                          aria-label={done ? "取消已買" : "標記已買"}
                          onClick={() => {
                            toggleChecked(key);
                            setChecks((n) => n + 1);
                          }}
                        >
                          {done ? "✓" : ""}
                        </button>
                        <div className="item-body">
                          <span className="name">{item.name}</span>
                          <div className="qty">{item.qty}</div>
                          <div className="meta-row">
                            <span className="k">備註</span>
                            <span className="v">{item.note}</span>
                          </div>
                          <div className="meta-row">
                            <span className="k">用於</span>
                            <span className="v">{item.usedIn}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="hint">勾左邊＝已買／已準備</p>
          </>
        ) : null}

        {isTerrain ? (
          <>
            <div className="terrain">
              <div className="terrain-head">
                <div className="terrain-label">海拔地形密碼 · 對手錶</div>
                <div className="terrain-elev">
                  最高 {sectionElevMax(section)}m · 攀升約 {section.elevGain}m ·{" "}
                  {elevCodeKmSum(section.elevCode).toFixed(1)} km
                </div>
              </div>
              <div className="terrain-ladder" aria-label="海拔階梯">
                {section.elevCode.map((node, i) => (
                  <span key={`lad-${i}`} className="ladder-step">
                    {i > 0 ? (
                      <span className="ladder-arrow">
                        →<span className="ladder-km">{node.via?.km}km</span>→
                      </span>
                    ) : null}
                    <span className={`ladder-m role-${node.role}`}>{node.elevM}m</span>
                  </span>
                ))}
              </div>
              <ol className="elev-code-list">
                {section.elevCode.map((node, i) => (
                  <li key={`node-${i}`} className={`elev-node role-${node.role}`}>
                    {node.via ? (
                      <div className="elev-via">
                        <span className="via-km">{node.via.km} km</span>
                        <span className={`via-trend t-${node.via.trend}`}>
                          {TREND_SYMBOL[node.via.trend]} {TREND_LABEL[node.via.trend]}
                        </span>
                        <span className="via-surface">{node.via.surface}</span>
                      </div>
                    ) : null}
                    <div className="elev-node-main">
                      <span className="t-elev">{node.elevM}m</span>
                      <span className="t-role">{ROLE_LABEL[node.role]}</span>
                      <span className="t-place">{node.place}</span>
                      <span className="t-kmat">累計 {node.kmAt} km</span>
                    </div>
                  </li>
                ))}
              </ol>
              <details className="elev-rules">
                <summary>密碼規則</summary>
                <ul>
                  {ELEV_CODE_RULES.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </details>
            </div>
          </>
        ) : null}

        {showPlanList ? (
          <>
            {plan.mission ? (
              <div className="mission">
                <div className="label">本段目標</div>
                <p>{plan.mission}</p>
              </div>
            ) : null}

            {tab === "supplies" && plan.vest?.length ? (
              <div className="vest">
                <h2>{plan.vestTitle}</h2>
                <div className="vest-grid">
                  {plan.vest.map((p) => (
                    <div key={p.id} className="pocket">
                      <div className="slot">{p.slot}</div>
                      <div className="item">{p.item}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="card">
              {items.length === 0 ? (
                <div className="empty">
                  <h2>{tab === "supplies" ? "呢段補給未填" : "呢段裝備未填"}</h2>
                  <p>架構已經好。你之後逐段畀我清單，我會直接寫入離線資料，上山都睇到。</p>
                </div>
              ) : (
                items.map((item) => {
                  const key = itemKey(sectionId, tab === "gear" ? "gear" : "supplies", item.id);
                  const done = checks >= 0 && isChecked(key);
                  const open = expanded === item.id;
                  return (
                    <div key={item.id} className={`list-item ${done ? "done" : ""}`}>
                      <button
                        className="check"
                        aria-label={done ? "取消完成" : "標記完成"}
                        onClick={() => {
                          toggleChecked(key);
                          setChecks((n) => n + 1);
                        }}
                      >
                        {done ? "✓" : ""}
                      </button>
                      <button className="item-body" onClick={() => setExpanded(open ? null : item.id)}>
                        <span className="name">{item.name}</span>
                        {item.qty ? <div className="qty">{item.qty}</div> : null}
                        {item.when ? (
                          <div className="meta-row">
                            <span className="k">時間</span>
                            <span className="v">{item.when}</span>
                          </div>
                        ) : null}
                        {item.pocket ? (
                          <div className="meta-row">
                            <span className="k">位置</span>
                            <span className="v">{item.pocket}</span>
                          </div>
                        ) : item.note ? (
                          <div className="meta-row">
                            <span className="k">備註</span>
                            <span className="v">{item.note}</span>
                          </div>
                        ) : null}
                        {item.tactics?.length ? (
                          open ? (
                            <ul className="tactics">
                              {item.tactics.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="expand">展開戰術 ▾</div>
                          )
                        ) : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <p className="hint">勾左邊做完 · 撳內容展開戰術 · 左右掃轉段</p>
          </>
        ) : null}

        {installEvent ? (
          <button
            className="install"
            onClick={async () => {
              await installEvent.prompt();
              setInstallEvent(null);
            }}
          >
            加到主畫面（上山離線用）
          </button>
        ) : null}
      </main>

      <nav className="tabs">
        <button
          className="nav-btn tab-nav"
          disabled={sectionId === 1 || isBuy}
          onClick={() => go(sectionId - 1)}
          aria-label="上一段"
        >
          ‹
        </button>
        <button className={`tab ${tab === "supplies" ? "active" : ""}`} onClick={() => selectTab("supplies")}>
          補給
        </button>
        <button className={`tab ${tab === "terrain" ? "active" : ""}`} onClick={() => selectTab("terrain")}>
          地形
        </button>
        <button className={`tab ${tab === "live" ? "active" : ""}`} onClick={() => selectTab("live")}>
          Live
        </button>
        <button className={`tab ${tab === "gear" ? "active" : ""}`} onClick={() => selectTab("gear")}>
          裝備
        </button>
        <button className={`tab ${tab === "buy" ? "active" : ""}`} onClick={() => selectTab("buy")}>
          購物
        </button>
        <button
          className="nav-btn tab-nav"
          disabled={sectionId === 10 || isBuy}
          onClick={() => go(sectionId + 1)}
          aria-label="下一段"
        >
          ›
        </button>
      </nav>

      {picker ? (
        <div className="sheet" onClick={() => setPicker(false)}>
          <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
            <h2>揀 CP 段</h2>
            <div className="grid">
              {SECTIONS.map((s) => (
                <button key={s.id} className={s.id === sectionId ? "active" : ""} onClick={() => go(s.id)}>
                  {s.id}
                </button>
              ))}
            </div>
            <p className="hint">大掣方便戴手套／夜間撳</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
