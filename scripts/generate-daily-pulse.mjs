import { writeFile } from "node:fs/promises";

const outputPath = new URL("../public/daily-pulse.json", import.meta.url);
const kind = process.argv.find((arg) => arg.startsWith("--kind="))?.split("=")[1] || inferKind();
const pulseUrl = process.env.PULSE_URL || "https://fangzheng17.github.io/pulse-26/";
const openaiKey = process.env.OPENAI_API_KEY?.trim();
const openaiModel = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";

const feeds = [
  {
    source: "FIFA 官方",
    confidence: 98,
    url: googleNewsUrl("site:fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026 FIFA World Cup 2026")
  },
  {
    source: "Reuters",
    confidence: 92,
    url: googleNewsUrl("Reuters FIFA World Cup 2026")
  },
  {
    source: "BBC Sport",
    confidence: 90,
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml"
  },
  {
    source: "ESPN Soccer",
    confidence: 88,
    url: "https://www.espn.com/espn/rss/soccer/news"
  },
  {
    source: "Google News",
    confidence: 82,
    url: googleNewsUrl("2026 World Cup Mexico South Africa opening match injuries lineups")
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

function googleNewsUrl(query) {
  const params = new URLSearchParams({
    q: `${query} when:2d`,
    hl: "en-US",
    gl: "US",
    ceid: "US:en"
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
    return {
      id: `${feed.source}-${index}-${title}`.slice(0, 120),
      source: feed.source,
      confidence: feed.confidence,
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

function scoreArticle(article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  let score = article.confidence;
  if (/world cup|fifa|2026/.test(text)) score += 45;
  if (/mexico|south africa|opening|kickoff|lineup|injur|fixture|schedule|group|team/.test(text)) score += 24;
  if (/transfer|club world cup|premier league/.test(text)) score -= 36;
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
    .sort((a, b) => scoreArticle(b) - scoreArticle(a))
    .filter((article) => {
      const key = article.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 18);
}

function fallbackCards(articles) {
  const usable = articles.length ? articles : [
    {
      title: "世界杯开幕夜进入倒计时",
      summary: "当前新闻源暂时不可用，先保留开幕战、赛程和观赛策略作为今日简报。",
      source: "PULSE 26",
      confidence: 72,
      url: pulseUrl
    }
  ];
  return usable.slice(0, 6).map((article, index) => ({
    id: `feed-${index}-${slug(article.title)}`,
    kind: index === 0 ? "今日头条" : ["新闻线索", "赛前动态", "赛程雷达", "伤病观察", "今日暗线"][index - 1] ?? "新闻线索",
    title: article.title.slice(0, 34),
    summary: (article.summary || "来自公开新闻源的世界杯更新。").slice(0, 52),
    why: `${article.source} 的这条更新进入今日候选池。它可能影响观赛选择、赛前判断或后续卡片排序。`,
    watch: "点开来源阅读原文；如果配置 OPENAI_API_KEY，系统会把这些候选源压缩成更像 Pulse 的中文判断。",
    confidence: article.confidence ?? 80,
    source: article.source,
    url: article.url,
    tone: ["amber", "green", "steel", "blue", "green", "amber"][index % 6]
  }));
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "story";
}

async function generateWithOpenAI(articles) {
  if (!openaiKey) return null;
  const prompt = [
    "你是我的 2026 世界杯私人赛事编辑。基于候选新闻源，生成今日 PULSE 26 JSON。",
    "必须只输出 JSON，不要 Markdown，不要解释。",
    "要求：中文；5-8 张卡片；不要编造未确认信息；每张卡要有判断、看点和来源。",
    "JSON 结构：",
    JSON.stringify({
      meta: { title: "string", subtitle: "string", status: "string", summary: "string" },
      topPick: {
        label: "Tonight's Pick",
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
    `候选新闻源：${JSON.stringify(articles.slice(0, 16), null, 2)}`
  ].join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openaiModel,
      input: prompt
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const outputText = payload.output_text
    ?? payload.output?.flatMap((item) => item.content ?? []).map((content) => content.text ?? "").join("\n")
    ?? "";
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
  const title = aiPayload.meta?.title ?? (kind === "night" ? "PULSE 26 夜场预告" : "PULSE 26 世界杯晨报");
  const subtitle = aiPayload.meta?.subtitle ?? `北京时间 ${beijingStamp(now)} · ${sourceMode === "openai" ? "AI 生成" : "新闻源自动更新"}`;
  const sourceLinks = articles.slice(0, 4).map((article) => ({
    name: article.source,
    type: sourceMode === "openai" ? "AI候选源" : "新闻源",
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
      status: sourceMode === "openai" ? `OpenAI ${openaiModel}` : "RSS fallback",
      summary: aiPayload.meta?.summary ?? "今日内容来自公开新闻源自动汇总。配置 OPENAI_API_KEY 后会升级为中文编辑判断版。"
    },
    topPick: aiPayload.topPick ?? {
      label: kind === "night" ? "Night Watch" : "Today's Lead",
      match: topStory?.title ?? "2026 世界杯今日动态",
      time: kind === "night" ? "21:30" : "08:20",
      body: topStory?.summary || "今日世界杯候选新闻已经更新，点开卡片查看来源和重点。",
      metrics: [
        { label: "更新模式", value: sourceMode === "openai" ? "AI" : "RSS", accent: true },
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
  if (openaiKey) {
    try {
      aiPayload = normalizeAiPayload(await generateWithOpenAI(articles), articles);
      sourceMode = "openai";
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
