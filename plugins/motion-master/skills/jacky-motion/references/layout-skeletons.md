# 版式骨架登记表（L01-L10）

每个 beat 的版式必须从这里**选用并登记**，不是每次临场发明。beat 的 `data-layout` 必须写登记编号（如 `L04`），校验脚本会核对。骨架给的是**结构和轴线**，字号、具体尺寸、风格气质由风格层和 beat CSS 决定。

选用规则（信息原语 → 候选版式）：

| 信息原语 | 首选 | 备选 |
|---|---|---|
| Claim（判断/开场/结论） | L01 概念揭示 · L02 收束定格 | L07 数据主屏 |
| Contrast（对比/误区正解） | L03 左右对比 | L06 矩阵网格 |
| Path（步骤/路径/因果链） | L04 横向流程 | L09 截图工作流 |
| System（框架/层级/组成） | L05 纵向层级 · L06 矩阵网格 | L10 核心外扩 |
| Evidence（证据/数据/案例） | L08 证据板 · L07 数据主屏 | L09 截图展示 |

通用禁用（任何版式都不许出现）：
- 居中大标题 + 三张等宽卡片
- 中心大圆/光场 + 5-6 个胶囊节点环绕（多项并排一律走 L06）
- 随机百分比 absolute 散点
- 线条靠 rotate 硬连、穿过文字或卡片

---

## 排版铁律（所有版式共用）

1. **一屏一个第一眼落点**。主视觉占注意力 45%-65%，辅助 20%-35%，标签 5%-15%，装饰 ≤5%。缩小到 50% 看，仍能一眼说出这页在讲什么。
2. **中文标题按短语断行**，每行 4-9 个汉字最稳，单行最多 12 个；禁止单字孤行；容器带 `word-break:keep-all;line-break:strict`（primitives 已内置）。
3. **行高**：hero 标题 1.06-1.18；大标题/结论 1.12-1.24；卡片标题 1.18-1.32；正文 1.38-1.6。`letter-spacing` 一律 0，禁止负字距。
4. **间距阶梯**：kicker→标题 24-40px；标题→副标题 36-64px；主组→辅助组 72-120px。组内 gap 用 16/24/32/40/48，跨组用 64/80/96/120。
5. **同组元素共享轴线**：共享左边界、右边界或中心轴；卡片同组统一高度、内边距、标题基线。负空间要有方向（留给推进/呼吸/定格），禁止四周空一圈中间堆一团。
6. **安全间距**：核心元素之间 ≥48px；主视觉与外部卡片 ≥64px；主内容距底部 HUD ≥96px。
7. **关键容器加 `data-safe-box="语义名"`**：主标题、主视觉、核心卡片、截图、流程节点、结论句。一个信息对象只标最外层，不嵌套标注。
8. 生成前自问：主视觉边界在哪？辅助结构为什么在那个位置？留白承担什么功能？定格帧有没有记忆点？答不清先改分镜。
9. **整屏构图优先**。每个 beat 最多 2 个大信息区，先在 12 栏 / 6 行隐形网格里确定 primary 与 secondary，再写 CSS。不要先堆卡片再靠高亮找重点。
10. **留白走廊必须可命名**：左侧推进、右侧呼吸、上下分层、证据缓冲、定格安全。说不出功能的留白通常只是中间堆叠造成的空洞。
11. **主体不用随机 absolute**。主体模块必须由 grid/flex 轨道承载；absolute 只用于短标注、框选、贴纸角标、光场背景，且不能决定信息关系。
12. **卡片预算**：Claim 0-1 张，Contrast 2 张，Path 3-5 节点，System 2-3 层，Evidence 1 主证据 + 1 小证据。超过预算先拆页。

字号下限（1920×1080）：hero 标题 ≥96px（纯文字页 ≥120px）、副标题/正文 ≥25px、标签 ≥18px。

---

## L01 概念揭示（Claim · 开场/核心判断）

构图：左轴主导（dominant-left）。kicker + 大标题占左侧 60% 空间，副标题第 2 步进入；右侧留白或放一个低调的风格签名视觉。**不要上下左右完全居中**——左轴让画面有方向。

```html
<section class="beat" id="b1" data-layout="L01" data-steps="2"
  data-core="一句话核心判断" data-primitive="Claim">
  <div class="scene b1">
    <div class="b1-stack">
      <div class="kicker" data-safe-box="kicker">EP.12 · AI 工作流</div>
      <h1 class="hero-title b1-title" data-safe-box="title">把口播稿<br>变成一支视频</h1>
      <p class="hero-sub" data-step="2" data-safe-box="sub">不用剪辑软件，一个 HTML 就够</p>
    </div>
  </div>
</section>
```

```css
.b1{display:grid;align-items:center}
.b1-stack{display:grid;gap:40px;max-width:1100px}
.b1-title{font-size:132px}
```

Step 建议：1=标题定场；2=副标题补一刀。禁忌：标题超过 18 字、副标题抢主视觉、为凑动效做无意义重构。

## L02 收束定格（Claim · 结尾金句/行动建议）

构图：中轴偏上。一句主句 + 最多 3 个短标签，画面必须干净——这是观众截图的一帧。

```html
<section class="beat" id="bN" data-layout="L02" data-steps="2"
  data-core="最终记忆点" data-primitive="Claim">
  <div class="scene bN">
    <blockquote class="quote bN-final" data-safe-box="final">先让信息站住，再让画面动人</blockquote>
    <div class="bN-tags" data-step="2" data-safe-box="tags">
      <span class="tag">审稿</span><span class="tag">分镜</span><span class="tag">定格</span>
    </div>
  </div>
</section>
```

```css
.bN{display:grid;place-content:center;justify-items:center;gap:56px;text-align:center}
.bN-final{font-size:88px;max-width:1200px}
.bN-tags{display:flex;gap:20px}
```

Step 建议：1=金句；2=标签落位 + 一次轻强调后完全停住。禁忌：结尾再引入新信息、循环脉冲、fade to black——**戛然而止定格**。

## L03 左右对比（Contrast · 前后/误区正解/A-B）

构图：split-proof。左右两栏 + 中缝分隔线；两栏**不同权重**——旧状态（左）先稳定，新状态（右）后亮起并成为焦点，左侧自动灰化。

```html
<section class="beat" id="bK" data-layout="L03" data-steps="3"
  data-core="旧做法 vs 新做法" data-primitive="Contrast" data-visual-demo="split-compare">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">同一份稿子，两种命运</h2>
    <div class="split bK-body">
      <div class="bK-side" data-dim-at="3" data-safe-box="side-old">
        <div class="label">以前</div>
        <div class="bK-side-title">逐句做成字幕 PPT</div>
        <p class="body-text">观众在读屏幕，没人听你说话</p>
      </div>
      <div class="split-divider"></div>
      <div class="bK-side is-new" data-step="2" data-safe-box="side-new">
        <div class="label accent">现在</div>
        <div class="bK-side-title">只上屏关键结构</div>
        <p class="body-text" data-step="3">屏幕给框架，口播给细节</p>
      </div>
    </div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 1fr;gap:72px;align-content:center}
.bK-title{font-size:96px}
.bK-body{column-gap:64px}
.bK-side{display:grid;gap:28px;align-content:start;padding:48px}
.bK-side-title{font-size:44px;font-weight:700;line-height:1.24}
```

Step 建议：1=标题+旧状态稳定；2=新状态亮起；3=差异锁定（新侧补最后一句，旧侧 `data-dim-at="3"` 自动灰化）。禁忌：两侧同时入场、两侧同亮抢焦点、分隔线穿过文字。

## L04 横向流程（Path · 3-5 步路径/因果链）

构图：full-axis 横贯。节点与连接线各占独立 grid 轨道，线在轨道内 `scaleX` 生长，永不穿卡。节点逐个点亮 = 逐 step。

```html
<section class="beat" id="bK" data-layout="L04" data-steps="3"
  data-core="三步走完流水线" data-primitive="Path" data-visual-demo="path-build">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">三步，从稿到片</h2>
    <div class="flow bK-flow">
      <div class="flow-node" data-safe-box="node-1">
        <div class="bK-node-t">审稿</div><div class="label">信息密度诊断</div>
      </div>
      <div class="flow-link bK-link-2" data-step="2"></div>
      <div class="flow-node" data-step="2" data-safe-box="node-2">
        <div class="bK-node-t">分镜</div><div class="label">节拍与版式</div>
      </div>
      <div class="flow-link bK-link-3" data-step="3"></div>
      <div class="flow-node" data-step="3" data-safe-box="node-3">
        <div class="bK-node-t">成片</div><div class="label">HTML 录屏</div>
      </div>
    </div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 1fr;gap:96px;align-content:center}
.bK-title{font-size:96px}
.bK-flow{grid-template-columns:1fr 96px 1fr 96px 1fr}
.bK-node-t{font-size:40px;font-weight:700;margin-bottom:12px}
/* 当前节点高亮：利用 data-current-step */
.beat[data-current-step="2"] .bK-flow .flow-node:nth-of-type(2),
.beat[data-current-step="3"] .bK-flow .flow-node:nth-of-type(3){border-color:var(--accent)}
```

Step 建议：每 step = 新节点 + 它的连接线（TL 里线用 `gsap.from(..., {scaleX:0})`）。已亮节点保持稳定。禁忌：>5 个主节点（拆 beat）、整条路径反复重播、rotate 连线。纵向流程把 `.flow-link` 换 `.v` 类并转置网格。

## L05 纵向层级（System · 抽象→具体/三层结构）

构图：top-anchor。主概念在顶部保持锚点，下层结构逐层展开；层级之间有明显大小差。

```html
<section class="beat" id="bK" data-layout="L05" data-steps="3"
  data-core="系统的三层结构" data-primitive="System" data-visual-demo="system-layer-expand">
  <div class="scene bK">
    <div class="bK-anchor" data-safe-box="anchor">
      <h2 class="hero-title bK-title">一套稳定系统</h2>
    </div>
    <div class="bK-layers">
      <div class="card bK-layer" data-safe-box="layer-1">
        <div class="bK-layer-t">运行时</div><p class="body-text">状态机 + 降级，一次写死</p>
      </div>
      <div class="card bK-layer" data-step="2" data-safe-box="layer-2">
        <div class="bK-layer-t">版式库</div><p class="body-text">十个登记骨架，选用不发明</p>
      </div>
      <div class="card bK-layer" data-step="3" data-safe-box="layer-3">
        <div class="bK-layer-t">风格层</div><p class="body-text">统一 token，换风格不换结构</p>
      </div>
    </div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-columns:5fr 7fr;column-gap:96px;align-items:center}
.bK-title{font-size:104px}
.bK-layers{display:grid;gap:32px}
.bK-layer{display:grid;grid-template-columns:220px 1fr;align-items:center;gap:32px}
.bK-layer-t{font-size:36px;font-weight:700}
```

Step 建议：每 step 展开一层；主概念不重播。左右分屏（标题左、层级右）比纯上下堆更稳。禁忌：每层文字过长、所有层同时飞入、层级无大小差。

## L06 矩阵网格（System/Contrast · 4-6 项并排）

构图：左题右阵 或 上题下阵。**多项并排的唯一正解**——6 个模型/4 个特性/多个答案一律用网格，不做环绕。

```html
<section class="beat" id="bK" data-layout="L06" data-steps="3"
  data-core="六个模型一次看清" data-primitive="System" data-visual-demo="matrix-fill">
  <div class="scene bK">
    <div class="bK-head" data-safe-box="title">
      <h2 class="hero-title bK-title">六个模型<br>三种用途</h2>
      <p class="hero-sub">按任务选，不按名气选</p>
    </div>
    <div class="grid-2x3 bK-grid">
      <div class="card bK-cell" data-safe-box="cell-1">…</div>
      <div class="card bK-cell" data-safe-box="cell-2">…</div>
      <div class="card bK-cell" data-step="2" data-safe-box="cell-3">…</div>
      <div class="card bK-cell" data-step="2" data-safe-box="cell-4">…</div>
      <div class="card bK-cell" data-step="3" data-safe-box="cell-5">…</div>
      <div class="card bK-cell" data-step="3" data-safe-box="cell-6">…</div>
    </div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-columns:4fr 8fr;column-gap:80px;align-items:center}
.bK-title{font-size:88px}
.bK-cell{display:grid;gap:14px;align-content:center}
```

Step 建议：按行/按组填充（一次 2 个），不是 6 个一起 stagger；讲到某一格时其余格 `data-dim-at` 灰化聚焦。禁忌：格子密度不均、单格塞长段文字、把网格做成同亮度平铺后不聚焦。

## L07 数据主屏（Evidence/Claim · 一个数字最重要）

构图：dominant-left 巨数。大数字是主视觉，解释与来源在右侧或下方次轴。

```html
<section class="beat" id="bK" data-layout="L07" data-steps="2"
  data-core="核心数据冲击" data-primitive="Evidence" data-visual-demo="number-count">
  <div class="scene bK">
    <div class="bK-num-wrap" data-safe-box="num">
      <div class="hero-num bK-num" data-count-to="83">0</div>
      <div class="bK-unit">%</div>
    </div>
    <div class="bK-side" data-step="2" data-safe-box="explain">
      <h2 class="bK-claim">大多数演示，观众只记住一个数</h2>
      <p class="body-text">所以把它做成整屏的主角</p>
      <div class="label">来源：内部复盘 · 2026-05</div>
    </div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-columns:7fr 5fr;align-items:center;column-gap:96px}
.bK-num{font-size:420px}
.bK-unit{font-size:96px;color:var(--accent)}
.bK-num-wrap{display:flex;align-items:baseline;gap:16px}
.bK-claim{font-size:52px;line-height:1.24;font-weight:700}
.bK-side{display:grid;gap:32px}
```

Step 建议：1=数字滚动到位（TL 里用 gsap counter，见 motion-language.md）；2=解释与来源落位。禁忌：数字和结论同权重、数据无来源（禁止捏造）、数字藏在小卡片里。

## L08 证据板（Evidence · 截图/引用/材料证明结论）

构图：主证据最大（≥55% 宽），次证据错位叠放，标注贴合焦点。

```html
<section class="beat" id="bK" data-layout="L08" data-steps="3"
  data-core="证据支撑结论" data-primitive="Evidence" data-visual-demo="evidence-spotlight">
  <div class="scene bK">
    <div class="bK-board">
      <figure class="card bK-main" data-safe-box="evidence-main">
        <div class="shot"><img src="…" alt="主证据"></div>
        <figcaption class="label">2026-06-30 · 官方公告</figcaption>
      </figure>
      <div class="bK-mark" data-step="2" data-safe-box="mark"><!-- 短下划线/小圈标注，贴焦点 --></div>
    </div>
    <div class="bK-conclude" data-step="3" data-safe-box="conclusion">
      <h2 class="bK-claim">这不是传闻，是官宣</h2>
    </div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-columns:7fr 5fr;column-gap:80px;align-items:center}
.bK-board{position:relative}
.bK-mark{position:absolute;/* 固定坐标贴合证据焦点，不横跨半屏 */}
.bK-claim{font-size:60px;line-height:1.22;font-weight:700}
```

Step 建议：1=证据稳定出现；2=标注落位（短线/小圈/箭头，不是大红框）；3=结论落位、证据轻let位。禁忌：截图当低透明背景、`object-fit:cover` 裁信息、标注线穿字。

## L09 产品截图展示（Path/Evidence · 工具/界面/工作流）

构图：截图 ≥40% 面积做主视觉，解释做侧栏；文字绝不压在截图上。

```html
<section class="beat" id="bK" data-layout="L09" data-steps="2"
  data-core="界面里看流程" data-primitive="Path" data-visual-demo="screenshot-annotation">
  <div class="scene bK">
    <figure class="card bK-shot-wrap" data-safe-box="shot">
      <div class="shot"><img src="…" alt="产品界面"></div>
    </figure>
    <div class="bK-side">
      <h2 class="bK-claim" data-safe-box="title">三次点击，全部完成</h2>
      <ol class="bK-steps">
        <li class="body-text" data-safe-box="pt-1">选中口播稿</li>
        <li class="body-text" data-step="2" data-safe-box="pt-2">确认分镜表</li>
      </ol>
    </div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-columns:8fr 4fr;column-gap:72px;align-items:center}
.bK-shot-wrap{padding:20px}
.bK-side{display:grid;gap:40px;align-content:center}
.bK-claim{font-size:56px;line-height:1.24;font-weight:700}
.bK-steps{display:grid;gap:24px;list-style:none}
```

Step 建议：截图先稳定，解释项逐条进入；需要框选时框选层用 absolute 固定坐标 + `data-step`。禁忌：截图模糊（缩到 50% 要能读）、解释文字盖图。

## L10 核心外扩（System · 1 核心 + 最多 3 能力）

构图：中心概念 + 外扩模块，模块离核心边界 ≥64px。**超过 3 个模块必须改 L06**。

```html
<section class="beat" id="bK" data-layout="L10" data-steps="3"
  data-core="一个核心三种能力" data-primitive="System" data-visual-demo="concept-expand">
  <div class="scene bK">
    <div class="bK-core card" data-safe-box="core"><div class="bK-core-t">口播稿</div></div>
    <div class="card bK-sat bK-sat-1" data-step="2" data-safe-box="sat-1">…</div>
    <div class="card bK-sat bK-sat-2" data-step="2" data-safe-box="sat-2">…</div>
    <div class="card bK-sat bK-sat-3" data-step="3" data-safe-box="sat-3">…</div>
  </div>
</section>
```

```css
/* 用 grid 分区放置，不用随机 absolute；连线走独立 SVG 层且不穿卡 */
.bK{display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;
    gap:64px;align-items:center;justify-items:center}
.bK-core{grid-column:2;grid-row:1/3;padding:64px 72px}
.bK-core-t{font-size:64px;font-weight:700}
.bK-sat-1{grid-column:1;grid-row:1}.bK-sat-2{grid-column:3;grid-row:1}.bK-sat-3{grid-column:1;grid-row:2}
```

Step 建议：1=核心定场；2-3=模块分批外扩。禁忌：模块压核心边界、核心内叠多层解释、外扩超过 3 个。

---

## 登记扩展

如果内容确实没有合适骨架，允许自定义结构，但必须：
1. `data-layout` 写 `LX-自定义名`；
2. 在分镜表里说明构图轴线、主视觉边界、留白功能；
3. 遵守本文件的排版铁律和通用禁用。
自定义不是逃生舱——先确认 L01-L10 真的都不匹配。
