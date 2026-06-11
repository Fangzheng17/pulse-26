import {
  Activity,
  Bell,
  Bookmark,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Dumbbell,
  ExternalLink,
  Eye,
  Flame,
  Gauge,
  Home,
  Menu,
  Moon,
  Newspaper,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsDown
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import stadiumNight from "../assets/stadium-night.png";
import { fallbackPulse } from "./data.js";

const navItems = [
  { label: "今日", icon: Activity },
  { label: "赛程", icon: CalendarClock },
  { label: "情报", icon: Newspaper },
  { label: "来源", icon: ShieldCheck }
];

const sourceNameMap = {
  "BBC / ESPN": "BBC / ESPN",
  "BBC Sport": "BBC 体育",
  "ESPN Soccer": "ESPN 足球",
  "Google News": "谷歌新闻",
  Reuters: "路透社",
  "Reuters / AP": "路透社 / 美联社"
};

const providerLabelMap = {
  deepseek: "DeepSeek 今日简报",
  openrouter: "OpenRouter 今日简报",
  openai: "OpenAI 今日简报"
};

const mobileTabs = [
  { label: "首页", target: "今日", icon: Home },
  { label: "赛程", target: "赛程", icon: CalendarClock },
  { label: "情报", target: "情报", icon: Compass },
  { label: "来源", target: "来源", icon: ShieldCheck }
];

function formatBeijingTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

function getCountdown() {
  const kickoff = new Date("2026-06-12T03:00:00+08:00").getTime();
  const diff = Math.max(kickoff - Date.now(), 0);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes };
}

function displaySourceName(source = "") {
  return sourceNameMap[source] ?? source;
}

function hasLatinText(value = "") {
  return /[A-Za-z]{3,}/.test(String(value));
}

function localizeRssCard(card, index) {
  if (!hasLatinText(card.title) && !hasLatinText(card.summary)) {
    return { ...card, source: displaySourceName(card.source) };
  }

  const titles = [
    "世界杯今日重点动态",
    "参赛球队消息更新",
    "赛前情报进入观察池",
    "赛程与阵容出现新线索",
    "伤病与名单需要继续确认",
    "今日暗线值得留意"
  ];
  const source = displaySourceName(card.source);
  return {
    ...card,
    title: titles[index] ?? "世界杯动态更新",
    summary: `${source || "公开新闻源"} 发布了新的世界杯相关消息，已进入今日简报候选。`,
    why: card.why && !hasLatinText(card.why) ? card.why : `${source || "公开新闻源"} 的这条更新进入今日候选池。它可能影响观赛选择、赛前判断或后续卡片排序。`,
    watch: card.watch && !hasLatinText(card.watch) ? card.watch : "点开来源阅读原文；接入 DeepSeek 或 OpenRouter 后，系统会自动生成更具体的中文判断。",
    source
  };
}

function localizePayload(json) {
  const sourceMode = json.sourceMode ?? "rss";
  const isRss = sourceMode === "rss";
  const pulseCards = Array.isArray(json.pulseCards)
    ? json.pulseCards.map((card, index) => isRss ? localizeRssCard(card, index) : { ...card, source: displaySourceName(card.source) })
    : [];
  const topCard = pulseCards[0];
  const topPick = {
    ...json.topPick,
    label: localizeTopPickLabel(json.topPick?.label, json.generatedFor),
    match: isRss && topCard ? topCard.title : json.topPick?.match,
    body: isRss && topCard ? topCard.summary : json.topPick?.body,
    metrics: Array.isArray(json.topPick?.metrics)
      ? json.topPick.metrics.map((metric) => ({
          ...metric,
          value: metric.value === "RSS" ? "新闻源" : metric.value === "AI" ? "智能生成" : metric.value
        }))
      : json.topPick?.metrics
  };

  return {
    ...json,
    pulseCards,
    topPick,
    sourceLinks: Array.isArray(json.sourceLinks)
      ? json.sourceLinks.map((source) => ({ ...source, name: displaySourceName(source.name) }))
      : json.sourceLinks
  };
}

function localizeTopPickLabel(label, generatedFor) {
  if (!label || hasLatinText(label)) {
    return generatedFor === "night" ? "夜场重点" : "今日重点";
  }
  return label;
}

function IconButton({ icon: Icon, label, active, onClick }) {
  return (
    <button className={active ? "icon-button active" : "icon-button"} onClick={onClick} aria-label={label} title={label}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={accent ? "accent" : ""}>{value}</strong>
    </div>
  );
}

function SourceMeter({ source }) {
  return (
    <a className="source-row" href={source.url} target="_blank" rel="noreferrer">
      <div>
        <strong>{displaySourceName(source.name)}</strong>
        <span>{source.type}</span>
      </div>
      <div className="source-score">
        <span>{source.confidence}</span>
        <ExternalLink size={14} />
      </div>
    </a>
  );
}

function PulseCard({ card, active, saved, feedback, onSelect, onSave, onDown }) {
  return (
    <article className={`pulse-card tone-${card.tone} ${active ? "selected" : ""}`} onClick={onSelect}>
      <div className="card-topline">
        <span>{card.kind}</span>
        <Gauge size={15} />
      </div>
      <h3>{card.title}</h3>
      <p>{card.summary}</p>
      <div className="confidence-line">
        <span style={{ width: `${card.confidence}%` }} />
      </div>
      <div className="card-actions">
        <button onClick={(event) => { event.stopPropagation(); onSave(); }} className={saved ? "saved" : ""} title="保存">
          {saved ? <Check size={15} /> : <Bookmark size={15} />}
          {saved ? "已存" : "保存"}
        </button>
        <button onClick={(event) => { event.stopPropagation(); onDown(); }} className={feedback ? "muted-on" : ""} title="不适合我">
          <ThumbsDown size={15} />
          不适合我
        </button>
      </div>
    </article>
  );
}

function TimelineItem({ item }) {
  return (
    <div className={`timeline-item ${item.level}`}>
      <div className="timeline-dot" />
      <div>
        <span>{item.phase}</span>
        <strong>{item.match}</strong>
        <small>{item.date} · {item.note}</small>
      </div>
    </div>
  );
}

function ScheduleCard({ item, onSelect }) {
  return (
    <button className={`schedule-card ${item.level}`} onClick={onSelect}>
      <span>{item.date}</span>
      <strong>{item.match}</strong>
      <small>{item.note}</small>
    </button>
  );
}

function App() {
  const [dailyPulse, setDailyPulse] = useState(fallbackPulse);
  const [dataStatus, setDataStatus] = useState("正在读取今日内容");
  const [selectedId, setSelectedId] = useState("opening");
  const [savedIds, setSavedIds] = useState(() => new Set(JSON.parse(localStorage.getItem("pulse26:saved") ?? "[\"opening\"]")));
  const [mutedIds, setMutedIds] = useState(() => new Set(JSON.parse(localStorage.getItem("pulse26:muted") ?? "[]")));
  const [nav, setNav] = useState("今日");
  const [toast, setToast] = useState("");
  const briefingRef = useRef(null);
  const cardsRef = useRef(null);
  const timelineRef = useRef(null);
  const sourcesRef = useRef(null);
  const pulseCards = dailyPulse.pulseCards?.length ? dailyPulse.pulseCards : fallbackPulse.pulseCards;
  const matchTimeline = dailyPulse.matchTimeline?.length ? dailyPulse.matchTimeline : fallbackPulse.matchTimeline;
  const pushSchedule = dailyPulse.pushSchedule?.length ? dailyPulse.pushSchedule : fallbackPulse.pushSchedule;
  const sourceLinks = dailyPulse.sourceLinks?.length ? dailyPulse.sourceLinks : fallbackPulse.sourceLinks;
  const topPick = dailyPulse.topPick ?? fallbackPulse.topPick;
  const selected = pulseCards.find((card) => card.id === selectedId) ?? pulseCards[0];
  const countdown = useMemo(getCountdown, []);
  const beijingTime = useMemo(formatBeijingTime, []);

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}daily-pulse.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`daily-pulse.json ${response.status}`);
        return response.json();
      })
      .then((json) => {
        if (!active || !Array.isArray(json.pulseCards) || json.pulseCards.length === 0) return;
        const localizedJson = localizePayload(json);
        setDailyPulse({
          ...fallbackPulse,
          ...localizedJson,
          meta: { ...fallbackPulse.meta, ...localizedJson.meta },
          topPick: { ...fallbackPulse.topPick, ...localizedJson.topPick }
        });
        setDataStatus(json.sourceMode && json.sourceMode !== "rss" ? providerLabelMap[json.sourceMode] ?? `${json.sourceMode} 今日简报` : "新闻源自动更新");
      })
      .catch(() => {
        if (active) setDataStatus("备用内容");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pulseCards.some((card) => card.id === selectedId)) {
      setSelectedId(pulseCards[0]?.id ?? "opening");
    }
  }, [pulseCards, selectedId]);

  useEffect(() => {
    localStorage.setItem("pulse26:saved", JSON.stringify([...savedIds]));
  }, [savedIds]);

  useEffect(() => {
    localStorage.setItem("pulse26:muted", JSON.stringify([...mutedIds]));
  }, [mutedIds]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message) {
    setToast(message);
  }

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleNav(label) {
    setNav(label);
    const refs = {
      今日: cardsRef,
      赛程: timelineRef,
      情报: briefingRef,
      来源: sourcesRef
    };
    scrollTo(refs[label] ?? cardsRef);
  }

  function selectCard(id, scrollDetail = true) {
    setSelectedId(id);
    if (scrollDetail) {
      window.setTimeout(() => scrollTo(briefingRef), 60);
    }
  }

  function toggleSaved(id) {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        showToast("已取消保存");
      } else {
        next.add(id);
        showToast("已保存到这台手机");
      }
      return next;
    });
  }

  function toggleMuted(id) {
    setMutedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        showToast("已恢复这张卡");
      } else {
        next.add(id);
        showToast("已减少类似内容");
      }
      return next;
    });
  }

  return (
    <main className="app-shell" style={{ "--stadium": `url(${stadiumNight})` }}>
      <aside className="side-rail">
        <div className="brand">
          <div className="brand-mark">
            <Radio size={19} />
          </div>
          <div>
            <strong>PULSE 26</strong>
            <span>世界杯编辑台</span>
          </div>
        </div>
        <nav>
          {navItems.map(({ label, icon }) => (
            <IconButton key={label} icon={icon} label={label} active={nav === label} onClick={() => handleNav(label)} />
          ))}
        </nav>
        <div className="rail-status">
          <Moon size={16} />
          <span>开幕倒计时</span>
          <strong>{countdown.days}天 {countdown.hours}小时</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" aria-label="菜单">
              <Menu size={18} />
            </button>
            <div>
              <span>北京时间 {beijingTime}</span>
              <strong>{dailyPulse.meta?.title ?? fallbackPulse.meta.title}</strong>
              <small className="data-status">{dataStatus}</small>
            </div>
          </div>
          <div className="topbar-actions">
            <button title="搜索">
              <Search size={17} />
            </button>
            <button title="推送">
              <Bell size={17} />
            </button>
          </div>
        </header>

        <div className="dashboard-grid">
          <section className="main-column">
            <section className="tonight-panel">
              <div className="match-copy">
                <div className="live-mark">
                  <Flame size={16} />
                  <span>{topPick.label ?? "今日重点"}</span>
                </div>
                <h1>{topPick.match}</h1>
                <p>{topPick.body}</p>
                <div className="primary-actions">
                  <button onClick={() => selectCard(pulseCards[0]?.id ?? "opening")}>
                    <Eye size={17} />
                    打开简报
                  </button>
                  <button className={savedIds.has(pulseCards[0]?.id) ? "secondary saved-primary" : "secondary"} onClick={() => toggleSaved(pulseCards[0]?.id ?? "opening")}>
                    {savedIds.has(pulseCards[0]?.id) ? <Check size={17} /> : <Bookmark size={17} />}
                    {savedIds.has(pulseCards[0]?.id) ? "已保存" : "保存夜场"}
                  </button>
                </div>
              </div>
              <div className="match-radar" aria-label="比赛雷达">
                <div className="radar-core">
                  <span>{topPick.time ?? "03:00"}</span>
                  <strong>北京</strong>
                </div>
                {(topPick.metrics ?? fallbackPulse.topPick.metrics).map((metric) => (
                  <Metric key={metric.label} label={metric.label} value={metric.value} accent={metric.accent} />
                ))}
              </div>
            </section>

            <section className="schedule-strip" aria-label="今日赛程概览">
              <div className="schedule-intro">
                <Dumbbell size={18} />
                <div>
                  <strong>赛程速览</strong>
                  <span>{matchTimeline.length} 条关键节点</span>
                </div>
              </div>
              <div className="schedule-scroll">
                {matchTimeline.map((item) => (
                  <ScheduleCard key={`strip-${item.phase}-${item.date}`} item={item} onSelect={() => scrollTo(timelineRef)} />
                ))}
              </div>
            </section>

            <section className="cards-section" ref={cardsRef}>
              <div className="section-heading">
                <div>
                  <span>每日简报</span>
                  <h2>今日情报卡</h2>
                  <small>{dailyPulse.meta?.subtitle}</small>
                </div>
                <button onClick={() => scrollTo(cardsRef)}>
                  全部
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="pulse-grid">
                {pulseCards.map((card) => (
                  <PulseCard
                    key={card.id}
                    card={card}
                    active={selected.id === card.id}
                    saved={savedIds.has(card.id)}
                    feedback={mutedIds.has(card.id)}
                    onSelect={() => selectCard(card.id)}
                    onSave={() => toggleSaved(card.id)}
                    onDown={() => toggleMuted(card.id)}
                  />
                ))}
              </div>
            </section>
          </section>

          <aside className="detail-column">
            <section className="briefing-panel" ref={briefingRef}>
              <div className="panel-title">
                <Sparkles size={17} />
                <span>{selected.kind}</span>
              </div>
              <h2>{selected.title}</h2>
              <p>{selected.why}</p>
              <div className="watch-box">
                <Compass size={18} />
                <div>
                  <span>你该看什么</span>
                  <strong>{selected.watch}</strong>
                </div>
              </div>
              <div className="confidence-pill">
                <ShieldCheck size={16} />
                来源置信 {selected.confidence}% · {displaySourceName(selected.source)}
              </div>
              {selected.url && (
                <a className="source-link-button" href={selected.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  打开来源
                </a>
              )}
            </section>

            <section className="timeline-panel" ref={timelineRef}>
              <div className="panel-title">
                <Clock3 size={17} />
                <span>赛程暗线</span>
              </div>
              <div className="timeline-list">
                {matchTimeline.map((item) => (
                  <TimelineItem key={`${item.phase}-${item.date}`} item={item} />
                ))}
              </div>
            </section>

            <section className="push-panel">
              <div className="panel-title">
                <Bell size={17} />
                <span>推送节奏</span>
              </div>
              {pushSchedule.map((item) => (
                <div className="push-row" key={item.time}>
                  <strong>{item.time}</strong>
                  <div>
                    <span>{item.label}</span>
                    <small>{item.detail}</small>
                  </div>
                </div>
              ))}
            </section>

            <section className="sources-panel" ref={sourcesRef}>
              <div className="panel-title">
                <Star size={17} />
                <span>来源可信度</span>
              </div>
              {sourceLinks.map((source, index) => (
                <SourceMeter key={`${source.name}-${source.url}-${index}`} source={source} />
              ))}
            </section>
          </aside>
        </div>
      </section>
      <nav className="bottom-nav" aria-label="手机底部导航">
        {mobileTabs.map(({ label, target, icon: Icon }) => (
          <button key={label} className={nav === target ? "active" : ""} onClick={() => handleNav(target)}>
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

export default App;
