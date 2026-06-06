const pulseUrl = process.env.PULSE_URL || "https://fangzheng17.github.io/pulse-26/";
const topic = process.env.NTFY_TOPIC;
const kindArg = process.argv.find((arg) => arg.startsWith("--kind="))?.split("=")[1];

if (!topic) {
  throw new Error("Missing NTFY_TOPIC. Set it as a GitHub Actions secret or local environment variable.");
}

const now = new Date();
const beijing = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
}).format(now);

function inferKind() {
  if (kindArg) return kindArg;
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    hour12: false
  }).format(now));
  return hour < 6 ? "morning" : "night";
}

const templates = {
  morning: {
    title: "PULSE 26 晨报",
    priority: 4,
    tags: ["soccer", "worldcup"],
    message: [
      `北京时间 ${beijing}`,
      "今日重点：开幕周进入倒计时，先锁定开幕战、强队首秀和赛前伤病更新。",
      "今晚推荐：墨西哥 vs 南非，建议看上半场。",
      "暗线：如果墨西哥前15分钟抢不下球权，比赛会变成耐心测试。",
      "",
      "点开查看完整 PULSE 26 卡片。"
    ].join("\n")
  },
  night: {
    title: "PULSE 26 夜场预告",
    priority: 4,
    tags: ["soccer", "night"],
    message: [
      `北京时间 ${beijing}`,
      "夜场判断：开幕战值得看，但不用硬熬全场。",
      "你该看什么：主场压迫、南非断球后的第一脚向前、开场20分钟节奏。",
      "临场提醒：首发和伤病以开赛前90分钟更新为准。",
      "",
      "点开查看完整 PULSE 26 卡片。"
    ].join("\n")
  },
  test: {
    title: "PULSE 26 测试推送",
    priority: 3,
    tags: ["test_tube", "soccer"],
    message: [
      `北京时间 ${beijing}`,
      "这是一条测试通知。手机收到后，点开会进入 PULSE 26 网页。",
      "",
      pulseUrl
    ].join("\n")
  }
};

const payload = templates[inferKind()] ?? templates.morning;

const response = await fetch("https://ntfy.sh", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    topic,
    title: payload.title,
    message: payload.message,
    priority: payload.priority,
    tags: payload.tags,
    click: pulseUrl
  })
});

if (!response.ok) {
  throw new Error(`ntfy publish failed: ${response.status} ${await response.text()}`);
}

const result = await response.json().catch(() => ({}));
console.log(`Sent ${payload.title} to ntfy topic ${topic}`);
if (result.id) console.log(`ntfy message id: ${result.id}`);
