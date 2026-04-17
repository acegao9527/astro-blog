---
id: "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
title: "Claudian - Obsidian 的 Claude 侧边栏"
slug: "claudian"
created: "2026-04-17T00:00:00.000Z"
modified: "2026-04-17T00:00:00.000Z"
description: "背景：为什么需要在 Obsidian 里用 Claude？ 作为 Obsidian 重度用户，我一直用它管理「第二大脑」——笔记、想法、项目文档。但有一个痛点始终存在：写作时想咨询 Claude，需要切换到 ChatGPT/Claude 网页或 App。 如果能把 Claude"
tags: []
---
## 背景：为什么需要在 Obsidian 里用 Claude？

作为 Obsidian 重度用户，我一直用它管理「第二大脑」——笔记、想法、项目文档。但有一个痛点始终存在：**写作时想咨询 Claude，需要切换到 ChatGPT/Claude 网页或 App**。

如果能把 Claude 直接集成到 Obsidian 里，工作流会顺畅很多。

**Claudian** 就是这个问题的答案——它是一个 Obsidian 插件，让你在笔记侧边栏直接与 Claude 对话，而且支持自定义 API 端点（比如 MiniMax 中转站）。

---

## 一、安装步骤

1、先在插件市场安装 BRAT 并启用

2、在 BRAT 点击“Add beta plugin”，输入链接 [https://github.com/YishenTu/claudian](https://github.com/YishenTu/claudian)

3、打开 Claudian，填入 API Key 和 Base URL 即可（见下一节）

如果你使用的是 MiniMax 中转站（非官方 API），需要在 Claudian 设置中填入以下配置：

```yaml
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
ANTHROPIC_AUTH_TOKEN=sk-XXXXX
ANTHROPIC_MODEL=MiniMax-M2
```

> **提示**：`sk-XXXXX` 替换为你从 MiniMax 获取的实际 API Key。

## 三、使用场景

Claudian 特别适合以下场景：

| 场景 | 说明 |
|:---|:---|
| **写作辅助** | 写笔记时随时咨询 Claude，思路卡壳了让它帮忙续写 |
| **笔记整理** | 让 Claude 帮忙总结、归纳、整理散落的笔记 |
| **代码片段** | 在技术笔记里直接写代码，让 Claude 帮忙 review |
| **翻译润色** | 外文资料直接扔给 Claude 翻译，母语级润色 |

## 四、效果截图

Claudian 成功配置后，侧边栏会显示 Claude 对话界面：

![Image.png](/uploads/posts/claudian/assets/sidebar-chat-main.png)

![Image.png](/uploads/posts/claudian/assets/sidebar-chat-example-1.png)

![Image.png](/uploads/posts/claudian/assets/sidebar-chat-example-2.png)

![Image.png](/uploads/posts/claudian/assets/sidebar-chat-example-3.png)

---

## 五、总结

Claudian 让 Obsidian 和 Claude 实现了无缝衔接：

- **零切换**：写作时无需离开 Obsidian，随时调用 Claude
- **成本可控**：通过 MiniMax 中转站，Token 成本更低
- **体验一致**：侧边栏对话，不打断写作心流

如果你也是 Obsidian 用户，想要在笔记时随时获得 AI 辅助，Claudian 值得一试。

---

*Last Updated: 2026-04-17*
