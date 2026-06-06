export const sourceLinks = [
  {
    name: "FIFA 赛程",
    type: "官方",
    confidence: 98,
    url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums"
  },
  {
    name: "FIFA 开幕式",
    type: "官方",
    confidence: 96,
    url: "https://inside.fifa.com/organisation/media-releases/shakira-burna-dai-dai-world-cup-opening-ceremony-mexico-city"
  },
  {
    name: "Reuters / AP",
    type: "新闻",
    confidence: 91,
    url: "https://www.reuters.com/sports/soccer/"
  },
  {
    name: "BBC / ESPN",
    type: "赛前",
    confidence: 88,
    url: "https://www.bbc.com/sport/football"
  }
];

export const pulseCards = [
  {
    id: "opening",
    kind: "今晚推荐",
    title: "开幕战值得看上半场",
    summary: "墨西哥主场开球，南非反击会让前20分钟很有信息量。",
    why: "世界杯在 6 月 11 日从墨西哥城开赛，北京时间是 6 月 12 日凌晨。东道主的开局通常会把节奏、压力和裁判尺度一起暴露出来。",
    watch: "墨西哥边路推进后的二点保护，以及南非断球后的第一脚向前。",
    confidence: 94,
    source: "FIFA 赛程",
    tone: "amber"
  },
  {
    id: "dark-line",
    kind: "今日暗线",
    title: "这不是单纯的气氛局",
    summary: "开幕战是 2010 年揭幕战的重演，心理叙事会被放大。",
    why: "相同对阵会让赛前报道聚焦历史回声，但真正关键是东道主能否把情绪转化成压迫质量。",
    watch: "如果墨西哥前15分钟抢不下球权，比赛会变成耐心测试。",
    confidence: 86,
    source: "FIFA 开幕报道",
    tone: "green"
  },
  {
    id: "ceremony",
    kind: "赛前动态",
    title: "开幕式流量已经拉满",
    summary: "官方确认 Shakira 与 Burna Boy 参与开幕式新歌舞台。",
    why: "这会让开幕夜成为全球传播事件，场内等待时间、转播前奏和现场节奏都可能更长。",
    watch: "如果你只看球，建议从开球前 20 分钟进入；如果看仪式，提前 60 分钟。",
    confidence: 96,
    source: "FIFA 媒体发布",
    tone: "steel"
  },
  {
    id: "format",
    kind: "赛制雷达",
    title: "48 队让小组第三变得很微妙",
    summary: "104 场比赛会让“拿一分”在某些小组里更值钱。",
    why: "扩军后的第一届世界杯，强队轮换、弱队保平、净胜球策略都会更早进入比赛。",
    watch: "第一轮爆冷未必立刻改变出线，但会改变第二轮的风险偏好。",
    confidence: 92,
    source: "FIFA 赛程",
    tone: "blue"
  },
  {
    id: "time-zone",
    kind: "观赛策略",
    title: "北京时间观赛要分层",
    summary: "不要场场硬熬，先锁开幕战、强强对话和小组末轮。",
    why: "北美时区会制造大量凌晨比赛。这个 Pulse 会每天给出“值得熬夜指数”，避免信息疲劳。",
    watch: "第一周优先看东道主、夺冠热门首秀、亚洲球队首战。",
    confidence: 89,
    source: "PULSE 编辑策略",
    tone: "green"
  },
  {
    id: "news-pipeline",
    kind: "新闻管线",
    title: "首发与伤病需要临场二次确认",
    summary: "赛前 90 分钟的卡片会比早报更适合决定是否打开直播。",
    why: "世界杯赛前消息密度很高，早报负责判断价值，临场卡负责更新首发、阵型和缺席。",
    watch: "重点球队的门将、后腰、中卫组合，往往比锋线名字更能决定比赛走向。",
    confidence: 90,
    source: "Reuters / AP / 队伍官方",
    tone: "amber"
  }
];

export const matchTimeline = [
  {
    phase: "开幕夜",
    date: "6月12日 03:00",
    match: "墨西哥 vs 南非",
    note: "建议看上半场",
    level: "must"
  },
  {
    phase: "第一轮",
    date: "6月12日-6月18日",
    match: "强队首秀窗口",
    note: "锁定夺冠热门",
    level: "watch"
  },
  {
    phase: "小组末轮",
    date: "6月23日-6月27日",
    match: "出线与避让",
    note: "同时开球风险",
    level: "watch"
  },
  {
    phase: "淘汰赛",
    date: "6月28日起",
    match: "32 强赛",
    note: "加赛后速报",
    level: "must"
  }
];

export const pushSchedule = [
  { time: "08:20", label: "晨报", detail: "昨夜结果、今日看点、值得熬夜指数" },
  { time: "21:30", label: "夜场预告", detail: "次日比赛选择、暗线、首发风险" },
  { time: "T-90", label: "临场卡", detail: "重点比赛首发、阵型、变量" }
];
