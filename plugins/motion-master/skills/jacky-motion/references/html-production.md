# HTML 生产规范（Phase 4 单一入口）

运行时已固化在两个画幅基座：16:9 用 [assets/base-template.html](../assets/base-template.html)，3:4 用 [assets/base-template-portrait.html](../assets/base-template-portrait.html)。你不写状态机、不写缩放、不写键盘逻辑、不写降级——**只填内容**。两个基座共享运行时和七套风格，但版式登记表独立。

## 装配步骤

1. **锁定画幅并拷贝基座**：默认 16:9；用户明确选择 3:4 时先读 [portrait-adaptation.md](portrait-adaptation.md)，拷贝竖屏基座。禁止只改横版 `--stage-w/h`。
2. **注入风格**：用所选 `assets/styles/{id}.css` 的全部内容替换 `STYLE LAYER` 块内部；**保留 `STYLE LAYER` / `END STYLE LAYER` / `PORTRAIT FRAME LOCK` / `BEAT CSS` 等区块标记注释**。竖版的 `PORTRAIT FRAME LOCK` 必须留在风格层之后，防止风格 CSS 把画幅改回 1920×1080。把 css 头部 `FONT_LINKS` 插入 `<head>`；改 `<title>`。
3. **写 beats**：16:9 从 [layout-skeletons.md](layout-skeletons.md) 取 L 骨架；3:4 从 [layout-skeletons-portrait.md](layout-skeletons-portrait.md) 取 V 骨架。写 `data-layout` / `data-core` / `data-primitive` / `data-steps`；CPSE 原语写 `data-visual-demo`；关键容器加 `data-safe-box`。
4. **写 beat CSS**：写入 `BEAT_CSS` 区，每 beat 独立前缀（`.b1` `.b2`…）。先按 [hybrid-quality-gate.md](hybrid-quality-gate.md) 的“发布会级版式 harness”定 primary / secondary / negative space，再写字号和材质；不只套 L 骨架或 `.card`。颜色、字体、卡片材质**只用风格层的 token 和签名类，禁止硬编码 hex 和字体名**。
5. **写时间线**：按 [motion-language.md](motion-language.md) 在 `TL` 注册表为核心 beat 写 `enter` / `step`。至少 2/3 的核心 beat 要有签名动效，并能对应契约里的 `glance → reconstruct → push → lock`；其余可用运行时默认入场兜底，但仍要有明确最终定格。
6. **自检 + 校验**：过下方检查单，跑校验脚本，截图验收（见 [quality-check.md](quality-check.md)）。

## 运行时契约（写内容时必须遵守）

- **final-state-first**：所有元素的 CSS 静止态 = 最终可见态。时间线只用 `gsap.from`/`fromTo` + `clearProps`；禁止用 `gsap.to` 把元素留在非 CSS 状态。
- **step 声明式**：第 N 步才出现的元素写 `data-step="N"`（N≥2）；第 1 步内容不写。需要灰化退场的写 `data-dim-at="N"`。状态高亮用 CSS `.beat[data-current-step="N"]` 选择器。
- 运行时自动处理：step 可见性、回退直落终态、beat 切换 settle、HUD、F 全屏、R 重播。**不要在 beat 里写自己的事件监听和 setTimeout 动画**；交互控件加 `data-no-advance`。
- 交付说明必须提醒用户：默认浏览器打开，`F` 全屏录屏，`R` 重播当前 beat，`Esc` 退出全屏。

## 屏幕文字

屏幕文字是口播的视觉索引，不是字幕：
- 主标题 2-12 个汉字（最多 18）；副标题 1 行 ≤26 字；卡片标题 2-8 字；卡片说明 ≤14 字
- 一屏只表达一个核心信息；长句拆 beat 或进口播
- 中文大标题手动按短语断行（`<br>`），每行 4-9 字，禁止单字孤行
- 3:4 标题每行优先 3-7 字，最后一行不得只剩 1-2 字；先改短语断句，再微调字号
- 最终可见文字禁止出现 `B-roll` / `旁白窗口` / `可配口播` 等剪辑提示
- 禁止捏造数据、来源、引用

## 风格场面

L01-L10 / V01-V10 只保证结构稳定，不代表画面高级。每个 beat 写 CSS 前必须确认：

- 这页的 `style_scene` 是什么，去掉文字后是否还能识别风格？
- 主视觉边界是否明确，注意力是否占 45%-65%？
- 是否至少使用 1 个风格签名组件或签名构图；核心 beat 是否至少 2 个？
- 是否有最终定格帧，而不是只让元素显示出来？

只套 `.card` / `.flow-node` / `.hero-title` 而没有风格场面，视为未完成。

## 编号与规则线语义

编号元素必须先定语义，再定样式，禁止为了避开重叠把一种编号改成另一种编号。

- **章节装饰号**：用于大章节页或框架页的视觉锚点，通常是浅色、描边、低权重，可离正文较远。它是背景装饰，不是清单编号；可缩小、上移、换角落或让出规则线，但不能改成实心小编号。
- **流程/清单编号**：必须贴近对应条目，使用实心、高对比、可读样式；不得飘到页面角落当装饰。
- **页码/folio**：只用于导航提示，权重最低，不参与正文层级。
- **规则线**：规则线是版面秩序，不是遮罩。任何规则线穿过数字、标题、正文、卡片边界时，先移动或缩放装饰元素，再调整线长；不要把元素删掉来让截图"看起来不重叠"。

生成含编号页面时，先写一个 `numbering_map`：

```md
numbering_map:
  decorative_chapter: 01/02/03/04 的位置、尺寸、和规则线安全距离
  list_numbers: 哪些编号属于流程条目，贴近哪个条目
  folio: 页眉/页脚编号是否存在
  risk: 是否可能压线、压字、和其他编号混淆
```

若两种编号视觉接近，或观众无法判断哪个是章节、哪个是清单，判定失败。

## 舒展版式硬约束

正式成片和风格测试都按同一标准：先做能截图的整屏画面，再谈风格。

- 每屏最多 2 个大信息区；超过就拆 step、拆 beat，或改成 L06 矩阵并设计焦点。
- 主视觉必须先占地，不能等所有小卡片铺完才靠高亮找重点。
- 主体模块走 grid / flex 轨道，不用随机 absolute；absolute 只允许做短标注、框选、贴纸角标。
- 一页至少保留一条明确负空间走廊，不能把内容压在中心 40%。
- 多项信息必须逐步揭示；同屏最终态也要有主次，不许多卡同亮同权重。
- 禁止大外框、红框、调试框、整屏大卡片包内容；边界靠对齐和留白形成。

3:4 额外约束：
- 常规页使用上、中、下至少 3 个纵向锚点，最终态有效构图跨度 ≥62% 舞台高度。
- 左右对比改上下，横向流程改纵向，3×2 改 2×3；不能用缩窄和小字号维持横版关系。
- 底部空白 >26% 视为构图未完成；Claim/收束页例外，但需 `data-portrait-airy="true"` 且有顶部 meta 与底部 lock。
- 截图主视觉占舞台高度 45%-65%，说明落到底部短栏，不压图。

## 截图与素材

- 信息截图必须清晰可读（缩到 50% 仍能看出关键内容），用 `.shot` 容器自然缩放，禁止 `object-fit:cover` 裁切、禁止低透明背景图
- 截图作主视觉时面积 ≥40%（L09）；3:4 时高度占 45%-65%（V08/V09），文字解释放底栏，不压图
- 缺素材用诚实 placeholder（按当前画幅标注"图待补 · 16:9/3:4 描述"），不用 emoji 凑、不找无关图、不编数字

## 生成前逐 beat 快检

写每个 beat 的 HTML 前确认（分镜契约里应已回答）：
1. 最终定格帧长什么样？它能独立成立吗？
2. 第一眼看哪里？主视觉边界在哪？
3. `data-step` 划分和契约的 steps 一致吗？
4. 这个 beat 的运动预算：1 个结构运动 + ≤2 组辅助 + 1 次锁定，动画总时长 < 口播时长？
5. 风格签名组件或签名构图出现了吗？
6. 风险点（重叠/长标题/连线穿卡）避开了吗？
7. 如果有编号，章节装饰号、流程编号、folio 是否有清晰语义区分，且没有压线？

## 四段式 TL 落地

核心 beat 的自定义 `TL` 必须能读出四段，不要求每段都写成独立变量，但节奏要成立：

```js
TL.bK = {
  enter(b){
    const main = b.querySelector('[data-safe-box="title"], [data-safe-box="num"], [data-safe-box="evidence-main"]');
    const structure = b.querySelectorAll('.relation, .flow-link, .layer');
    const focus = b.querySelectorAll('.focus, .accent-word, .mark');
    const lock = b.querySelector('.memory-lock');
    gsap.timeline()
      .from(main, { opacity: 0, y: 24, duration: 1.0, ease: 'expo.out', clearProps: 'transform,opacity' })          // glance
      .from(structure, { opacity: 0, y: 16, duration: .7, ease: 'expo.inOut', stagger: .06, clearProps: 'transform,opacity' }, '-=.2') // reconstruct
      .from(focus, { opacity: 0, y: 12, scale: .96, duration: .55, ease: 'back.out(1.4)', clearProps: 'transform,opacity' }, '+=.15') // push
      .from(lock, { scaleX: 0, duration: .35, ease: 'expo.out', clearProps: 'transform' }, '+=.25');                   // lock
  }
};
```

要点：
- `glance` 只让第一眼对象先成立，不要同时把全页铺满。
- `reconstruct` 必须表现信息关系变化：分离、连接、层级展开、让位、证据聚焦。
- `push` 必须有远近或焦点变化：当前词/节点/证据被推近，非焦点降亮、退后或轻 blur。
- `lock` 只做一次，结束完全静止；禁止循环 pulse。

## 反 AI 视觉指纹（全风格通用禁令）

| 禁止 | 替代 |
|---|---|
| 紫粉/蓝紫渐变背景 | 风格层背景体系 |
| 彩色左边框卡片 | 风格签名卡片类 |
| Emoji 当图标 | 纯文字标签 / 风格签名符号 |
| 居中大标题+三列等宽卡片 | 信息结构驱动的 L 骨架 |
| 所有 beat 同一动画 | TL 注册表逐 beat 编排 |
| 多强调色 | 每风格单一 accent（次色只按风格卡规定用途） |
| 假数据/假 logo/假用户数 | 诚实 placeholder |

## 交付前校验

```bash
node <SKILL_ROOT>/scripts/validate-motion-html.mjs path/to/output.html
```

FAIL 必须修复重跑；WARN 人工确认。若环境可用 Playwright，继续跑浏览器布局校验：

```bash
node <SKILL_ROOT>/scripts/check-layout-browser.mjs path/to/output.html path/to/screenshots
```

没有 Playwright 时用 Agent 浏览器能力或人工截图验收，不要为装依赖阻塞交付。之后进入 [quality-check.md](quality-check.md) 截图验收。
