import {
  Activity,
  Bell,
  Bookmark,
  CalendarClock,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  ExternalLink,
  Eye,
  Flame,
  Gauge,
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
import React, { useMemo, useState } from "react";
import stadiumNight from "../assets/stadium-night.png";
import { matchTimeline, pulseCards, pushSchedule, sourceLinks } from "./data.js";

const navItems = [
  { label: "今日", icon: Activity },
  { label: "赛程", icon: CalendarClock },
  { label: "情报", icon: Newspaper },
  { label: "来源", icon: ShieldCheck }
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
        <strong>{source.name}</strong>
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

function App() {
  const [selectedId, setSelectedId] = useState("opening");
  const [savedIds, setSavedIds] = useState(new Set(["opening"]));
  const [mutedIds, setMutedIds] = useState(new Set());
  const [nav, setNav] = useState("今日");
  const selected = pulseCards.find((card) => card.id === selectedId) ?? pulseCards[0];
  const countdown = useMemo(getCountdown, []);
  const beijingTime = useMemo(formatBeijingTime, []);

  function toggleSaved(id) {
    setSavedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleMuted(id) {
    setMutedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
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
            <span>World Cup Desk</span>
          </div>
        </div>
        <nav>
          {navItems.map(({ label, icon }) => (
            <IconButton key={label} icon={icon} label={label} active={nav === label} onClick={() => setNav(label)} />
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
              <strong>2026 世界杯开幕周 Pulse</strong>
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
                  <span>Tonight's Pick</span>
                </div>
                <h1>墨西哥 vs 南非</h1>
                <p>开幕战，北京时间 6 月 12 日 03:00。我的建议是看上半场：主场情绪、前场压迫和反击第一脚会很快给出这届杯赛的第一条线索。</p>
                <div className="primary-actions">
                  <button>
                    <Eye size={17} />
                    打开简报
                  </button>
                  <button className="secondary">
                    <Bookmark size={17} />
                    保存夜场
                  </button>
                </div>
              </div>
              <div className="match-radar" aria-label="比赛雷达">
                <div className="radar-core">
                  <span>03:00</span>
                  <strong>BJT</strong>
                </div>
                <Metric label="熬夜指数" value="8.6" accent />
                <Metric label="冷门热度" value="中" />
                <Metric label="来源置信" value="94%" />
              </div>
            </section>

            <section className="cards-section">
              <div className="section-heading">
                <div>
                  <span>Daily Briefing</span>
                  <h2>今日情报卡</h2>
                </div>
                <button>
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
                    onSelect={() => setSelectedId(card.id)}
                    onSave={() => toggleSaved(card.id)}
                    onDown={() => toggleMuted(card.id)}
                  />
                ))}
              </div>
            </section>
          </section>

          <aside className="detail-column">
            <section className="briefing-panel">
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
                来源置信 {selected.confidence}% · {selected.source}
              </div>
            </section>

            <section className="timeline-panel">
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

            <section className="sources-panel">
              <div className="panel-title">
                <Star size={17} />
                <span>Source confidence</span>
              </div>
              {sourceLinks.map((source) => (
                <SourceMeter key={source.name} source={source} />
              ))}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
