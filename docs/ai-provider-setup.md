# PULSE 26 AI Provider Setup

PULSE 26 现在有两种生成模式：

- `rss`: 不需要 AI key。系统只抓公开新闻/RSS 候选源并更新网页。
- AI mode: 先抓同一批候选新闻，再交给 DeepSeek / OpenRouter / OpenAI 生成中文 Pulse 卡片。

不要把 API key 写进代码。只放到 GitHub Secrets：

`Repository -> Settings -> Secrets and variables -> Actions -> New repository secret`

## 先试 DeepSeek

新增或修改这些 Repository secrets：

```text
AI_PROVIDER=deepseek
AI_API_KEY=<your DeepSeek API key>
AI_MODEL=deepseek-v4-flash
```

Optional:

```text
AI_BASE_URL=https://api.deepseek.com
```

也可以不用 `AI_API_KEY`，改用：

```text
DEEPSEEK_API_KEY=<your DeepSeek API key>
```

如果 DeepSeek 后续模型变化，只改 `AI_MODEL`。

## 再试 OpenRouter

把同一批 secrets 改成：

```text
AI_PROVIDER=openrouter
AI_API_KEY=<your OpenRouter API key>
AI_MODEL=deepseek/deepseek-chat
AI_BASE_URL=https://openrouter.ai/api/v1
```

也可以不用 `AI_API_KEY`，改用：

```text
OPENROUTER_API_KEY=<your OpenRouter API key>
```

OpenRouter 的模型名是 model slug。要试别的模型，只改 `AI_MODEL`。

## 仍然兼容 OpenAI

旧写法仍然可用：

```text
OPENAI_API_KEY=<your OpenAI API key>
OPENAI_MODEL=gpt-5.4-mini
```

The preferred generic version is:

```text
AI_PROVIDER=openai
AI_API_KEY=<your OpenAI API key>
AI_MODEL=gpt-5.4-mini
AI_BASE_URL=https://api.openai.com/v1
```

## 手动测试

改完 secrets 后运行：

`Actions -> Generate Daily PULSE 26 -> Run workflow`

然后打开：

`https://fangzheng17.github.io/pulse-26/`

页面顶部应显示 `deepseek 今日简报`、`openrouter 今日简报`，或者无 key 时的 `新闻源自动更新`。

手机会收到同一条简报推送，因为生成 workflow 最后会调用 ntfy。
