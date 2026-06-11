import { writeFile } from "node:fs/promises";

const outputPath = new URL("../public/daily-pulse.json", import.meta.url);
const kind = process.argv.find((arg) => arg.startsWith("--kind="))?.split("=")[1] || inferKind();
const pulseUrl = process.env.PULSE_URL || "https://fangzheng17.github.io/pulse-26/";
const aiProvider = resolveProvider();
const aiKey = resolveAiKey();
const aiModel = process.env.AI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || defaultModel(aiProvider);
const aiBaseUrl = (process.env.AI_BASE_URL?.trim() || defaultBaseUrl(aiProvider)).replace(/\/$/, "");

const feeds = [
  {
    source: "FIFA 官方中文",
    confidence: 99,
    url: googleNewsUrl("site:fifa.com/zh 2026 世界杯 比分 赛果 战报", "zh")
  },
  {
    source: "FIFA 官方",
    confidence: 98,
    url: googleNewsUrl("site:fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026 FIFA World Cup 2026 score result")
  },
  {
    source: "央视体育",
    confidence: 94,
    url: googleNewsUrl("央视体育 2026 世界杯 比分 赛果 战报", "zh")
  },
  {
    source: "新华社体育",
    confidence: 94,
    url: googleNewsUrl("新华社 2026 世界杯 比分 赛果 战报", "zh")
  },
  {
    source: "人民日报体育",
    confidence: 91,
    url: googleNewsUrl("人民日报体育 2026 世界杯 比分 赛果", "zh")
  },
  {
    source: "路透社",
    confidence: 92,
    url: googleNewsUrl("Reuters FIFA World Cup 2026 score result")
  },
  {
    source: "BBC 体育",
    confidence: 90,
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml"
  },
  {
    source: "ESPN 足球",
    confidence: 88,
    url: "https://www.espn.com/espn/rss/soccer/news"
  },
  {
    source: "谷歌新闻",
    confidence: 82,
    url: googleNewsUrl("2026 World Cup score result Mexico South Africa live updates")
  },
  {
    source: "中文体育新闻",
    confidence: 86,
    url: googleNewsUrl("2026 世界杯 今日 比分 赛果 赛程", "zh")
  }
];

const fallbackTimeline = [
  { phase: "开幕夜", date: "6月12日 03:00", match: "墨西哥 vs 南非", note: "建议看上半场", level: "must" },
  { phase: "第一轮", date: "6月12日-6月18日", match: "强队首秀窗口", note: "锁定夺冠热门", level: "watch" },
  { phase: "小组末轮", date: "6月23日-6月27日", match: "出线与避让", note: "同时开球风险", level: "watch" },
  { phase: "淘汰赛", date: "6月28日起", match: "32 强赛", note: "加赛后速报", level: "must" }
];

const pushSchedule = [
  { time: "08:20", label: "晨报", detail: "昨夜结果、今日看点、值得熬夜指数" },
  { time: "21:30", label: "夜场预告", detail: "次日比赛选择、暗线、首发风险" },
  { time: "T-90", label: "临场卡", detail: "重点比赛首发、阵型、变量" }
];

function googleNewsUrl(query, locale = "en") {
  const localeConfig = locale === "zh"
    ? { hl: "zh-CN", gl: "CN", ceid: "CN:zh-Hans" }
    : { hl: "en-US", gl: "US", ceid: "US:en" };
  const params = new URLSearchParams({
    q: `${query} when:2d`,
    ...localeConfig
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function inferKind() {
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    hour12: false
  }).format(new Date()));
  return hour < 14 ? "morning" : "night";
}

function resolveProvider() {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit) return explicit;
  if (process.env.DEEPSEEK_API_KEY?.trim()) return "deepseek";
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "rss";
}

function resolveAiKey() {
  return process.env.AI_API_KEY?.trim()
    || process.env.DEEPSEEK_API_KEY?.trim()
    || process.env.OPENROUTER_API_KEY?.trim()
    || process.env.OPENAI_API_KEY?.trim()
    || "";
}

function defaultBaseUrl(provider) {
  const baseUrls = {
    deepseek: "https://api.deepseek.com",
    openrouter: "https://openrouter.ai/api/v1",
    openai: "https://api.openai.com/v1"
  };
  return baseUrls[provider] ?? baseUrls.openai;
}

function defaultModel(provider) {
  const models = {
    deepseek: "deepseek-v4-flash",
    openrouter: "deepseek/deepseek-chat",
    openai: "gpt-5.4-mini"
  };
  return models[provider] ?? models.openai;
}

function chatCompletionsEndpoint() {
  if (aiBaseUrl.endsWith("/chat/completions")) return aiBaseUrl;
  return `${aiBaseUrl}/chat/completions`;
}

function beijingStamp(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Pulse26Bot/1.0 (+https://fangzheng17.github.io/pulse-26/)"
      }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function decodeXml(value = "") {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(xml, tag) {
  return decodeXml(xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "");
}

function parseFeed(xml, feed) {
  const rawItems = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  return rawItems.map((item, index) => {
    const title = pickTag(item, "title");
    const link = pickTag(item, "link") || item.match(/<link[^>]+href="([^"]+)"/i)?.[1] || feed.url;
    const description = pickTag(item, "description") || pickTag(item, "summary") || pickTag(item, "content");
    const publishedRaw = pickTag(item, "pubDate") || pickTag(item, "published") || pickTag(item, "updated");
    const publishedAt = Number.isNaN(Date.parse(publishedRaw)) ? null : new Date(publishedRaw).toISOString();
    const itemSource = cleanSourceName(pickTag(item, "source"));
    const source = itemSource || cleanSourceName(feed.source);
    const sameSource = !itemSource || source === cleanSourceName(feed.source) || /谷歌新闻|中文体育新闻/.test(feed.source);
    return {
      id: `${feed.source}-${index}-${title}`.slice(0, 120),
      source,
      searchSource: feed.source,
      confidence: sameSource ? feed.confidence : Math.max(68, feed.confidence - 12),
      title: cleanTitle(title),
      summary: description.slice(0, 260),
      url: link,
      publishedAt
    };
  }).filter((item) => item.title);
}

function cleanTitle(title) {
  return decodeXml(title)
    .replace(/\s+-\s+[^-]{2,45}$/u, "")
    .replace(/\s+\|\s+[^|]{2,45}$/u, "")
    .trim();
}

function cleanSourceName(source = "") {
  const name = decodeXml(source).trim();
  const sourceMap = {
    "BBC Sport": "BBC 体育",
    ESPN: "ESPN 足球",
    "ESPN.com": "ESPN 足球",
    FIFA: "FIFA 官方",
    "FIFA.com": "FIFA 官方",
    Reuters: "路透社",
    Xinhua: "新华社",
    "Xinhua News Agency": "新华社",
    "People's Daily": "人民日报",
    "CCTV.com": "央视网",
    CCTV: "央视"
  };
  return sourceMap[name] ?? name;
}

function hasScoreSignal(text) {
  const lower = String(text ?? "").toLowerCase();
  const scoreLike = /比分|赛果|战报|进球|绝杀|出线|淘汰|战胜|击败|大胜|小胜|平局|加时|点球|首胜|\b(today'?s\s+world cup scores|latest results|points table|standings|scoreline|full-time|recap|live updates?|goals?|goal-scorer|win over|wins over|won over|beat|beats|defeat|defeats|victory)\b/.test(lower);
  if (!scoreLike) return false;
  if (/ceremony|performer|shakira|song|ticket|opening ceremony/.test(lower) && !/match|points table|standings|latest results|today'?s world cup scores|live updates?/.test(lower)) {
    return false;
  }
  return true;
}

function isLowQualityArticle(article) {
  const text = `${article.title} ${article.summary} ${article.source}`.toLowerCase();
  return /买球|博彩|盘口|入口|\.vip|wnbk|betting|odds|props|futures|prediction|best bets|捷报比分|zhibo8|直播吧/.test(text);
}

function scoreArticle(article) {
  const title = article.title.toLowerCase();
  const text = `${article.title} ${article.summary}`.toLowerCase();
  let score = article.confidence;
  if (/世界杯|world cup|fifa|2026/.test(text)) score += 45;
  if (hasScoreSignal(title)) score += 86;
  if (!hasScoreSignal(title) && hasScoreSignal(text)) score += 12;
  if (/today'?s world cup scores|points table|standings|latest results|live updates?|recap|win over|wins over|beat|defeat|goal-scorer/.test(title)) score += 28;
  if (/墨西哥|南非|开幕|揭幕|首发|伤病|赛程|对阵|小组|球队|mexico|south africa|opening|kickoff|lineup|injur|fixture|schedule|group|team/.test(text)) score += 24;
  if (/ceremony|performer|shakira|ticket|transfer|club world cup|premier league|betting|odds|prediction/.test(text)) score -= 46;
  if (article.publishedAt) {
    const ageHours = (Date.now() - Date.parse(article.publishedAt)) / 3600000;
    score += Math.max(0, 30 - ageHours);
  }
  return score;
}

async function collectArticles() {
  const settled = await Promise.allSettled(feeds.map(async (feed) => parseFeed(await fetchText(feed.url), feed)));
  const articles = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const seen = new Set();
  return articles
    .filter((article) => !isLowQualityArticle(article))
    .sort((a, b) => scoreArticle(b) - scoreArticle(a))
    .filter((article) => {
      const key = article.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 28);
}

function fallbackCards(articles) {
  const usable = articles.length ? selectCardArticles(articles) : [
    {
      title: "世界杯开幕夜进入倒计时",
      summary: "当前新闻源暂时不可用，先保留开幕战、赛程和观赛策略作为今日简报。",
      source: "PULSE 26",
      confidence: 72,
      url: pulseUrl
    }
  ];
  return usable.slice(0, 6).map((article, index) => {
    const localized = localizeArticle(article, index);
    return {
      id: `feed-${index}-${slug(article.title)}`,
      kind: index === 0 ? "今日头条" : ["新闻线索", "赛前动态", "赛程雷达", "伤病观察", "今日暗线"][index - 1] ?? "新闻线索",
      title: localized.title,
      summary: localized.summary,
      why: `${article.source} 的这条更新进入今日候选池。它可能影响观赛选择、赛前判断或后续卡片排序。`,
      watch: localized.watch,
      confidence: article.confidence ?? 80,
      source: article.source,
      url: article.url,
      tone: ["amber", "green", "steel", "blue", "green", "amber"][index % 6]
    };
  });
}

function selectCardArticles(articles) {
  const selected = [];
  const usedTitles = new Set();
  const addFirst = (predicate) => {
    const article = articles.find((candidate) => predicate(candidate) && !usedTitles.has(candidate.title.toLowerCase()));
    if (!article) return;
    selected.push(article);
    usedTitles.add(article.title.toLowerCase());
  };

  addFirst((article) => hasScoreSignal(article.title));
  addFirst((article) => /FIFA|新华社|央视|人民日报/.test(article.source));
  addFirst((article) => /中文/.test(article.searchSource ?? "") || /中国|新华|央视|人民|新浪/.test(article.source));
  addFirst((article) => /fixture|schedule|赛程|对阵|group|小组/i.test(`${article.title} ${article.summary}`));
  addFirst((article) => /lineup|squad|roster|首发|阵容|名单|team news/i.test(`${article.title} ${article.summary}`));
  addFirst((article) => /injur|hurt|fitness|伤病|缺席/i.test(`${article.title} ${article.summary}`));

  for (const article of articles) {
    if (selected.length >= 6) break;
    const key = article.title.toLowerCase();
    if (!usedTitles.has(key)) {
      selected.push(article);
      usedTitles.add(key);
    }
  }
  return selected;
}

function localizeArticle(article, index) {
  const titleText = article.title.toLowerCase();
  const text = `${article.title} ${cleanSummary(article.summary)}`.toLowerCase();
  const source = article.source || "公开新闻源";
  if (hasScoreSignal(titleText)) {
    return {
      title: scoreCardTitle(article),
      summary: scoreCardSummary(article, source),
      watch: "先看进球时间、晋级影响和小组排名变化，再决定是否回看集锦。"
    };
  }
  const categories = [
    {
      pattern: /injur|hurt|replace|withdraw|fitness|recover|saka|aguerd|ezzalzouli/,
      title: "伤病与名单出现新变化",
      summary: `${source} 更新了球员健康或名单调整信息，赛前阵容还需要继续确认。`,
      watch: "重点看门将、中卫、后腰和边路位置是否临场换人，这些位置最容易改变比赛走势。"
    },
    {
      pattern: /lineup|squad|roster|team news|key players|qualified|contender/,
      title: "参赛队阵容信息更新",
      summary: `${source} 发布了球队名单、关键球员或出线相关信息，适合放进今日观察池。`,
      watch: "先确认核心球员是否稳定首发，再看替补深度和第二场轮换风险。"
    },
    {
      pattern: /fixture|schedule|match|group|opening|kickoff|mexico|south africa|korea|czechia/,
      title: "赛程与对阵线索更新",
      summary: `${source} 带来了赛程、分组或具体对阵的新线索，会影响今天的观赛优先级。`,
      watch: "优先看东道主、强队首秀和小组关键场，普通信息可以等晚间简报再处理。"
    },
    {
      pattern: /ranking|rankings|seed|draw/,
      title: "排名与分组形势值得关注",
      summary: `${source} 提到了排名、种子或分组相关信息，这会影响后续淘汰赛路径判断。`,
      watch: "不要只看名次高低，重点看同组对手风格和小组第三规则带来的策略变化。"
    },
    {
      pattern: /betting|odds|favorite|favourites|prediction|pick/,
      title: "市场预期正在调整",
      summary: `${source} 的赔率或预测信息显示，外部市场对夺冠和单场走势有了新判断。`,
      watch: "赔率只能当情绪温度计，不直接当结论；真正要看阵容、赛程密度和伤病。"
    },
    {
      pattern: /fan|ticket|ceremony|opening ceremony|shakira|broadcast/,
      title: "场外热度继续升温",
      summary: `${source} 关注了球迷、票务、开幕式或转播层面的变化，说明赛事关注度正在升高。`,
      watch: "这类信息主要影响观看体验和传播热度，比赛判断仍以赛前阵容为准。"
    }
  ];
  const matched = categories.find((category) => category.pattern.test(text));
  if (matched) return matched;

  const fallbackTitles = [
    "世界杯今日重点动态",
    "参赛球队消息更新",
    "赛前情报进入观察池",
    "赛程与阵容出现新线索",
    "今日新闻需要继续确认",
    "暗线信息值得留意"
  ];
  return {
    title: fallbackTitles[index] ?? "世界杯动态更新",
    summary: `${source} 发布了新的世界杯相关消息，已进入今日简报候选。`,
    watch: "点开来源阅读原文；接入 DeepSeek 或 OpenRouter 后，系统会自动生成更具体的中文判断。"
  };
}

function scoreCardTitle(article) {
  const title = article.title.toLowerCase();
  if (/mexico|south africa|el tri|bafana|墨西哥|南非/.test(title)) return "墨西哥 vs 南非赛果更新";
  if (/today'?s world cup scores|scores.*schedule|比分|赛果/.test(title)) return "今日世界杯比分速览";
  if (/points table|standings|积分榜/.test(title)) return "积分榜与最新赛果更新";
  if (/live updates?|实时|直播/.test(title)) return "今日比赛实时更新";
  if (/goal-scorer|goal|进球/.test(title)) return "进球与关键球员成为焦点";
  if (/win over|wins over|beat|defeat|victory|战胜|击败/.test(title)) return "今日赛果新闻更新";
  return "今日最重要的比分新闻";
}

function scoreCardSummary(article, source) {
  const title = article.title.toLowerCase();
  if (/mexico|south africa|el tri|bafana|墨西哥|南非/.test(title)) {
    return `${source} 更新了墨西哥与南非揭幕战相关赛果，是今天首页最该先看的比分新闻。`;
  }
  if (/points table|standings|积分榜/.test(title)) {
    return `${source} 更新了赛果和积分榜信息，适合快速判断小组形势变化。`;
  }
  if (/live updates?|实时|直播/.test(title)) {
    return `${source} 正在更新比赛进程，适合用来跟踪比分、进球和临场变化。`;
  }
  return `${source} 更新了今日赛果或比分动态，适合放在首页头条。`;
}

function cleanSummary(value) {
  const summary = String(value ?? "").trim();
  if (!summary || summary.toLowerCase() === "null" || summary.toLowerCase() === "undefined") {
    return "";
  }
  return summary;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "story";
}

function buildPrompt(articles) {
  return [
    "你是我的 2026 世界杯私人赛事编辑。基于候选新闻源，生成今日 PULSE 26 JSON。",
    "必须只输出 JSON，不要 Markdown，不要解释。",
    "要求：中文；5-8 张卡片；不要编造未确认信息；每张卡要有判断、看点和来源；label、kind、title、summary、why、watch、source 都必须用中文。",
    "首页 topPick 必须优先选择今天最重要的比分、赛果或战报类新闻；如果没有明确比分，再选择最重要的赛程或球队动态。",
    "JSON 结构：",
    JSON.stringify({
      meta: { title: "string", subtitle: "string", status: "string", summary: "string" },
      topPick: {
        label: "比分头条",
        match: "string",
        time: "HH:mm",
        body: "string",
        metrics: [{ label: "string", value: "string", accent: true }]
      },
      pulseCards: [{
        id: "short-id",
        kind: "string",
        title: "string",
        summary: "string",
        why: "string",
        watch: "string",
        confidence: 90,
        source: "string",
        url: "string",
        tone: "amber|green|steel|blue"
      }],
      notification: { title: "string", message: "string" }
    }),
    `生成类型：${kind}`,
    `北京时间：${beijingStamp()}`,
    `候选新闻源：${JSON.stringify(articles.slice(0, 20), null, 2)}`
  ].join("\n\n");
}

async function generateWithAI(articles) {
  if (!aiKey || aiProvider === "rss") return null;
  const prompt = buildPrompt(articles);

  const headers = {
    Authorization: `Bearer ${aiKey}`,
    "Content-Type": "application/json"
  };
  if (aiProvider === "openrouter") {
    headers["HTTP-Referer"] = pulseUrl;
    headers["X-OpenRouter-Title"] = "PULSE 26";
  }

  const requestBody = {
    model: aiModel,
    messages: [
      {
        role: "system",
        content: "你是严谨的中文体育新闻编辑，只返回有效 JSON。"
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2600,
    stream: false
  };
  if (aiProvider === "deepseek") {
    requestBody.thinking = { type: "disabled" };
  }

  const response = await fetch(chatCompletionsEndpoint(), {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`${aiProvider} API failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const message = payload.choices?.[0]?.message?.content ?? "";
  const outputText = Array.isArray(message)
    ? message.map((part) => typeof part === "string" ? part : part.text ?? "").join("\n")
    : message;
  return JSON.parse(extractJson(outputText));
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("Model did not return JSON");
  return text.slice(start, end + 1);
}

function buildPulsePayload(cards, articles, sourceMode, aiPayload = {}) {
  const topStory = cards[0];
  const now = new Date();
  const aiMode = sourceMode !== "rss";
  const title = aiPayload.meta?.title ?? (kind === "night" ? "PULSE 26 夜场预告" : "PULSE 26 世界杯晨报");
  const subtitle = aiPayload.meta?.subtitle ?? `北京时间 ${beijingStamp(now)} · ${aiMode ? `${sourceMode} 生成` : "新闻源自动更新"}`;
  const sourceLinks = articles.slice(0, 6).map((article) => ({
    name: article.source,
    type: aiMode ? "AI候选源" : "新闻源",
    confidence: article.confidence ?? 82,
    url: article.url
  }));

  return {
    version: 1,
    generatedAt: now.toISOString(),
    generatedFor: kind,
    sourceMode,
    meta: {
      title,
      subtitle,
      status: aiMode ? `${providerDisplayName(aiProvider)} 生成` : "新闻源兜底",
      summary: aiPayload.meta?.summary ?? "今日内容来自公开新闻源自动汇总。接入 DeepSeek 或 OpenRouter 后会升级为中文编辑判断版。"
    },
    topPick: aiPayload.topPick ?? {
      label: "比分头条",
      match: topStory?.title ?? "今日最重要的比分新闻",
      time: kind === "night" ? "21:30" : "08:20",
      body: topStory?.summary || "今日世界杯比分、赛果和战报候选新闻已经更新，点开卡片查看来源和重点。",
      metrics: [
        { label: "更新模式", value: aiMode ? "智能生成" : "新闻源", accent: true },
        { label: "候选新闻", value: String(articles.length) },
        { label: "来源置信", value: `${Math.max(...cards.map((card) => card.confidence ?? 70))}%` }
      ]
    },
    pulseCards: cards,
    matchTimeline: fallbackTimeline,
    pushSchedule,
    sourceLinks,
    notification: aiPayload.notification ?? {
      title,
      message: `${topStory?.title ?? "今日世界杯 Pulse 已更新"}\n\n点开查看完整卡片：${pulseUrl}`
    }
  };
}

function providerDisplayName(provider) {
  const names = {
    deepseek: "DeepSeek",
    openrouter: "OpenRouter",
    openai: "OpenAI"
  };
  return names[provider] ?? provider;
}

function normalizeAiPayload(aiPayload, articles) {
  const cards = Array.isArray(aiPayload.pulseCards) && aiPayload.pulseCards.length
    ? aiPayload.pulseCards
    : fallbackCards(articles);
  return {
    ...aiPayload,
    pulseCards: cards.slice(0, 8).map((card, index) => ({
      id: card.id || `ai-${index}-${slug(card.title ?? "card")}`,
      kind: card.kind || "今日线索",
      title: String(card.title || "世界杯更新").slice(0, 42),
      summary: String(card.summary || "").slice(0, 68),
      why: String(card.why || card.summary || "这条信息进入今日世界杯候选源。"),
      watch: String(card.watch || "关注官方确认、首发、伤病和赛程影响。"),
      confidence: clamp(Number(card.confidence) || 86, 50, 99),
      source: card.source || "公开新闻源",
      url: card.url || articles[index]?.url || pulseUrl,
      tone: ["amber", "green", "steel", "blue"].includes(card.tone) ? card.tone : ["amber", "green", "steel", "blue"][index % 4]
    }))
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

async function main() {
  const articles = await collectArticles();
  let sourceMode = "rss";
  let aiPayload = null;
  if (aiKey && aiProvider !== "rss") {
    try {
      aiPayload = normalizeAiPayload(await generateWithAI(articles), articles);
      sourceMode = aiProvider;
    } catch (error) {
      console.warn(error.message);
      sourceMode = "rss";
    }
  }
  const cards = aiPayload?.pulseCards ?? fallbackCards(articles);
  const payload = buildPulsePayload(cards, articles, sourceMode, aiPayload ?? {});
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Generated ${cards.length} cards from ${articles.length} articles using ${sourceMode}`);
}

await main();
