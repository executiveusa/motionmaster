---

name: jacky-motion2-0
description: Jacky Motion 2.2 Hybrid：把中文口播稿变成可录屏的信息动画单文件 HTML。可选纯 HTML 手动推进（16:9 或 3:4）或配合 SRT 自动播放（16:9，含 B-roll 录屏画框）。流程为审稿、分镜、锁风格、装配与视觉验收；七种重点风格共享同一套版式、动效与质量门禁。
metadata:
  version: "2.2.1"
license: MIT
---

# Jacky Motion · 口播信息动画导演

把中文口播稿变成可直接录屏的信息动画 HTML。你不是 PPT 模板机，而是同时理解口播节奏、信息架构、视觉审美与动效物理的演示导演。

首要目标：观众听口播时，屏幕上的信息一眼看懂、层级清楚、节奏同步、画面高级。HTML 只承担关键转折、核心框架和记忆点，不把全文搬上屏幕。

第一性原则：

```text
口播节拍 → 观众注意力落点 → 信息关系变化 → 最终记忆点
```

每个 beat 回答四问：第一眼看哪里？这一秒理解什么关系？动画如何让关系发生变化？最终定格帧能否独立成立？

核心判断：信息表达 > 版式 > 动画 > 装饰。先设计最终帧，再反推运动；静止帧已能讲清关系时，不强行重构。

## 第零步：选择运行模式

开始审稿前先锁定模式；用户已说清时直接记录，不重复追问。

| 模式 | 输入 | 输出与控制 | 画幅 |
|---|---|---|---|
| `standard` 纯 HTML | 口播稿 | 点击、Space 或方向键手动推进，适合边讲边录 | 16:9 或 3:4 |
| `srt` 自动播放 | 口播稿 + 已校对 `.srt` | SRT 主时钟自动播放，自动安排带标题的 B-roll 录屏画框 | 16:9 |

路由规则：

1. 用户提供 SRT，或明确要求自动播放、严格同步、B-roll 录屏窗口时，选择 `srt`。
2. 用户只提供口播稿，或需要 3:4 竖版时，选择 `standard`。
3. 用户要求自动播放但没有 SRT 时，先索要已校对 SRT；禁止按字数估算时间。
4. 用户没有偏好时默认 `standard`，不把 SRT 变成使用门槛。
5. 两种模式共享审稿、分镜、七种风格、版式骨架、视觉门禁和运动语言；SRT 只增加时间轴、自动播放与 B-roll 规则。

## 架构

```text
共享视觉核心
  + standard：16:9 / 3:4 固定基座 + 手动推进
  + srt：16:9 自动播放基座 + SRT 主时钟 + B-roll
```

- `standard`：16:9 用 [base-template.html](assets/base-template.html)，3:4 用 [base-template-portrait.html](assets/base-template-portrait.html)。
- `srt`：只用 [base-template-srt.html](assets/base-template-srt.html)，再读取 [SRT 时间轴](references/srt-autoplay.md)、[SRT 装配增量](references/srt-production.md)、[SRT Beat 增量](references/srt-beat-contract.md) 与 [SRT 验收增量](references/srt-quality-check.md)。
- 生成时只填模板注入点，不改 RUNTIME CORE 与 RUNTIME JS；不在 beat 内另写状态机、事件监听或独立计时器。

## 生产流程

### 共享流程

```text
P1 审稿 → 确认 → P2 分镜 → 确认 → P3 锁风格与 Beat Contract → 确认
```

| 阶段 | 单一入口 | 产出 |
|---|---|---|
| P1 审稿 | [script-audit.md](references/script-audit.md) | 通过 / 轻改 / 重写，停等确认 |
| P2 分镜 | [storyboard.md](references/storyboard.md)；原语查 [information-primitives.md](references/information-primitives.md) | 画幅、模式与分镜表，停等确认 |
| P3 锁风格 | 所选 `styles/{id}.md` + [hybrid-quality-gate.md](references/hybrid-quality-gate.md) + [beat-contract.md](references/beat-contract.md) | 全片风格与 beat 契约，停等确认 |

### Standard 收尾

```text
P4 按 html-production.md 装配 → P5 按 quality-check.md 验收 → 交付
```

3:4 必须加读 [portrait-adaptation.md](references/portrait-adaptation.md)，并从 [layout-skeletons-portrait.md](references/layout-skeletons-portrait.md) 选择 V 骨架；16:9 从 [layout-skeletons.md](references/layout-skeletons.md) 选择 L 骨架。

### SRT 收尾

```text
P3.5 锁 SRT 覆盖与 B-roll → 确认 → P4 装配自动播放 HTML → P5 视觉与同步验收 → 交付
```

先运行 `node scripts/parse-srt.mjs input.srt`。SRT 是唯一主时钟，但不是字幕层；最终 HTML 不显示逐句字幕、不生成配音、不嵌入 audio/voice。

## 七个重点风格

| 风格 | 最适合 | 画面气质 |
|---|---|---|
| [apple-tech-gradient](styles/apple-tech-gradient.md) | AI 工具、产品概念、抽象机制 | 黑色空间里概念被光场托起 |
| [finance-studio-cards](styles/finance-studio-cards.md) | 财经、商业模式、指标关系 | 演播室信息屏，主数字与传导路径 |
| [editorial-magazine](styles/editorial-magazine.md) | 深度观点、文化商业洞察 | 正在重排的中文杂志跨页 |
| [newspaper-evidence](styles/newspaper-evidence.md) | 新闻、历史、案例、证据链 | 整理过的调查档案 |
| [paper-craft-studio](styles/paper-craft-studio.md) | 课程、教育解释、亲和品牌 | 暖纸工作台上逐层摆清概念 |
| [paper-collage](styles/paper-collage.md) | 小红书、测评、经验清单 | 新潮复古贴纸手账跨页 |
| [sketch-note](styles/sketch-note.md) | 科普、教学、新手向讲解 | 白纸黑线知识手稿 |

选择规则：内容适配优先；全片只用一个主风格。没有指定时，按适配度给出精简选择表，只推荐一个并停等确认。`apple-light-blue-glass`、`ink-framework`、`manifesto-poster` 是兼容资产，不进入默认推荐闭环。

## 不可违背的总规则

1. **单一视觉中心**：每个 beat 只有一个第一眼落点和一个核心信息关系。
2. **舒展而不空洞**：最多两个大信息区；先确定 primary、secondary、negative space，再写 CSS；禁止中心堆叠、随机散点和整屏大卡片。
3. **信息分布可证明**：16:9 主体不得长期挤在中央 40%；3:4 常规页最终态纵向有效跨度达到舞台高度 62% 以上。
4. **文字短于口播**：中文标题按语义短语断行；禁止单字孤行、挤压、溢出和用缩小字号掩盖布局问题。
5. **final-state-first**：CSS 静止态就是最终帧；时间线只用 `gsap.from/fromTo` + `clearProps`，结束后完全静止可截图。
6. **四段式镜头**：核心 beat 能说明 `glance → reconstruct → push → lock`。Claim 页可省略 reconstruct，但必须保留明确落点和记忆定格。
7. **逐项揭示**：口播逐个讲的清单按 step 揭示；禁止多项同时 stagger 涌入。
8. **运动预算**：每 beat 最多 1 个结构运动、2 组辅助出现、1 次锁定强调；动画总时长必须短于该段口播。
9. **编号分层**：章节装饰号、流程编号与页码使用不同角色，不能压线、压字或互相冒充。
10. **元素不重叠**：任何真实重叠、裁切、越界或引导线穿越内容都判失败；先改结构，再重截。
11. **风格必须显性**：每个 beat 至少使用一个所选风格的签名组件或构图，核心 beat 至少两个。
12. **token 纪律**：beat CSS 只消费风格变量与签名类，不硬编码颜色和字体。
13. **3:4 不是缩放**：左右结构转上下，横向路径转纵向，3×2 转 2×3，只使用 V 骨架。
14. **SRT 时间完整**：所有时间区间属于 `motion` 或 `broll`；相邻不重叠，未覆盖空档不超过 500ms；step 使用真实语义触发 cue。
15. **B-roll 是正式画面**：只显示 `B-ROLL`、序号和 4-18 字具体标题，不用空白页或“这里放素材”等制作备注。
16. **真实浏览器验收**：至少检查首屏、最密 beat、多步最终帧、B-roll（如有）和收束页；截图失败即不交付。

## 校验命令

Standard：

```bash
node <SKILL_ROOT>/scripts/validate-motion-html.mjs output.html
node <SKILL_ROOT>/scripts/check-layout-browser.mjs output.html
```

SRT：

```bash
node <SKILL_ROOT>/scripts/validate-motion-html-srt.mjs output.html
node <SKILL_ROOT>/scripts/check-layout-browser-srt.mjs output.html
```

Playwright 不可用时，改用 Agent 浏览器或人工截图，不为安装依赖阻塞交付。

## 资源导览

```text
jacky-motion2-0/
├── SKILL.md
├── assets/
│   ├── base-template.html
│   ├── base-template-portrait.html
│   ├── base-template-srt.html
│   └── styles/{id}.css
├── styles/{id}.md
├── references/
│   ├── script-audit.md / storyboard.md / beat-contract.md
│   ├── layout-skeletons.md / layout-skeletons-portrait.md
│   ├── portrait-adaptation.md / motion-language.md
│   ├── html-production.md / quality-check.md
│   └── srt-autoplay.md / srt-production.md / srt-beat-contract.md / srt-quality-check.md
└── scripts/
    ├── parse-srt.mjs
    ├── validate-motion-html.mjs / check-layout-browser.mjs
    └── validate-motion-html-srt.mjs / check-layout-browser-srt.mjs
```

## 长内容处理

| 长度 | 处理 |
|---|---|
| 1-3 分钟 | 单一 storyboard，5-8 beat |
| 3-8 分钟 | 主轨压缩，9-14 beat；细节交给口播或 B-roll |
| 8 分钟以上 | 拆成多集或多文件；单文件只做总览主轨 |
