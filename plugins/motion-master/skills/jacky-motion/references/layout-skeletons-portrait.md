# 3:4 竖屏版式骨架登记表（V01-V10）

选择 3:4 时，每个 beat 必须登记 `V01-V10` 或 `VX-*`。完整画幅、密度和横转竖规则见 [portrait-adaptation.md](portrait-adaptation.md)。骨架只锁结构；颜色、材质、签名组件仍来自 Jacky Motion 现有六种风格。

| 信息原语 | 首选 | 备选 |
|---|---|---|
| Claim | V01 概念揭示 · V02 收束定格 | V07 数据主屏 |
| Contrast | V03 上下对比 | V06 竖版矩阵 |
| Path | V04 纵向流程 | V09 截图工作流 |
| System | V05 层级展开 · V06 竖版矩阵 | V10 核心展开 |
| Evidence | V08 证据纵览 · V07 数据主屏 | V09 截图展示 |

## 共用铁律

1. `.scene` 使用明确 grid rows；常规页至少有上、中、下 3 个纵向锚点。
2. 标题区、主视觉区、记忆锁分别登记 `data-safe-box`，不要只标中间一团。
3. 最终态纵向有效跨度目标 `62%-86%`；截图主视觉占舞台高度 `45%-65%`。
4. 主体走 grid/flex 轨道；absolute 只做角标、短标注、风格背景。
5. 核心元素间距 ≥40px，主组之间 ≥56px；底部主内容距 HUD ≥112px。
6. 竖屏默认左轴；只有 V02/V07 可使用中轴强定格。

## V01 竖向概念揭示（Claim）

构图：顶部 meta + 中上大标题 + 中下签名视觉/短结论。不是把三行文字居中。

```html
<section class="beat" id="b1" data-layout="V01" data-steps="2"
  data-core="一句话核心判断" data-primitive="Claim">
  <div class="scene b1">
    <div class="kicker" data-safe-box="meta">EP.12 · AI 工作流</div>
    <h1 class="hero-title b1-title" data-safe-box="title">把口播稿<br>变成一支视频</h1>
    <div class="b1-signature" data-safe-box="signature"></div>
    <p class="hero-sub b1-lock" data-step="2" data-safe-box="lock">屏幕给结构，口播给细节</p>
  </div>
</section>
```

```css
.b1{display:grid;grid-template-rows:auto auto 1fr auto;align-content:stretch;gap:48px}
.b1-title{font-size:116px;max-width:900px}
.b1-signature{align-self:stretch;min-height:430px}
.b1-lock{max-width:820px;padding-bottom:72px}
```

## V02 竖向收束定格（Claim）

构图：顶部章节锚点，中部金句，底部标签/记忆条。允许 `data-portrait-airy="true"`，但上下仍需呼应。

```html
<section class="beat" id="bN" data-layout="V02" data-steps="2"
  data-core="最终记忆点" data-primitive="Claim" data-portrait-airy="true">
  <div class="scene bN">
    <div class="kicker" data-safe-box="meta">FINAL LOCK</div>
    <blockquote class="quote bN-final" data-safe-box="final">先让信息站住<br>再让画面动人</blockquote>
    <div class="bN-tags" data-step="2" data-safe-box="lock">
      <span class="tag">审稿</span><span class="tag">分镜</span><span class="tag">定格</span>
    </div>
  </div>
</section>
```

```css
.bN{display:grid;grid-template-rows:auto 1fr auto;gap:56px;align-items:center}
.bN-final{font-size:82px;max-width:850px;align-self:center}
.bN-tags{display:flex;flex-wrap:wrap;gap:18px;padding-bottom:96px}
```

## V03 上下对比（Contrast）

旧状态在上、新状态在下，中间规则线独占轨道。第 3 步新状态成为第一焦点，旧状态灰化。

```html
<section class="beat" id="bK" data-layout="V03" data-steps="3"
  data-core="旧做法 vs 新做法" data-primitive="Contrast" data-visual-demo="stack-compare">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">同一件事<br>两种结果</h2>
    <div class="split bK-compare" data-safe-box="compare">
      <div class="bK-side" data-dim-at="3"><div class="label">以前</div><h3>只堆信息</h3></div>
      <div class="split-divider"></div>
      <div class="bK-side is-new" data-step="2"><div class="label accent">现在</div><h3>推动理解</h3><p data-step="3">关系变化才是动画</p></div>
    </div>
    <div class="bK-lock" data-step="3" data-safe-box="lock">不是更多元素，而是更清楚的焦点</div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 1fr auto;gap:56px}
.bK-title{font-size:84px}
.bK-compare{min-height:690px}
.bK-side{display:grid;align-content:center;gap:20px;padding:40px 44px}
.bK-side h3{font-size:48px;line-height:1.22}
.bK-lock{font-size:30px;padding-bottom:72px}
```

## V04 纵向流程（Path）

节点与竖线分别占轨道，线用 `scaleY` 生长；3-5 节点，逐 step 推进。

```html
<section class="beat" id="bK" data-layout="V04" data-steps="3"
  data-core="三步路径" data-primitive="Path" data-visual-demo="vertical-path-build">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">三步，从稿到片</h2>
    <div class="bK-flow" data-safe-box="flow">
      <div class="flow-node">审稿</div>
      <div class="flow-link v" data-step="2"></div><div class="flow-node" data-step="2">分镜</div>
      <div class="flow-link v" data-step="3"></div><div class="flow-node" data-step="3">成片</div>
    </div>
    <div class="bK-lock" data-step="3" data-safe-box="lock">完整路径稳定定格</div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 1fr auto;gap:48px}
.bK-title{font-size:82px}
.bK-flow{display:grid;grid-template-columns:1fr;grid-template-rows:auto 54px auto 54px auto;align-content:center}
.bK-flow .flow-link{justify-self:center;width:3px;height:auto;margin:12px 0}
.bK-lock{font-size:30px;padding-bottom:64px}
```

## V05 层级展开（System）

标题锚定上部，2-3 层结构纵向展开；层级靠宽度、字号和材质变化，不靠多张同权卡片。

```html
<section class="beat" id="bK" data-layout="V05" data-steps="3"
  data-core="三层系统" data-primitive="System" data-visual-demo="portrait-layer-expand">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">一套稳定系统</h2>
    <div class="bK-layers" data-safe-box="layers">
      <div class="bK-layer">运行时</div>
      <div class="bK-layer" data-step="2">版式层</div>
      <div class="bK-layer" data-step="3">风格层</div>
    </div>
    <div class="bK-lock" data-step="3" data-safe-box="lock">结构稳定，风格才能自由</div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 1fr auto;gap:56px}
.bK-title{font-size:84px}
.bK-layers{display:grid;align-content:center;gap:28px}
.bK-layer{min-height:170px;padding:40px;font-size:42px}
.bK-layer:nth-child(2){margin-inline:32px}.bK-layer:nth-child(3){margin-inline:64px}
.bK-lock{font-size:30px;padding-bottom:68px}
```

## V06 竖版矩阵（System/Contrast）

2×2 或 2×3。必须用焦点层级，不能六格同亮；同一 step 最多揭示一行。

```html
<section class="beat" id="bK" data-layout="V06" data-steps="3"
  data-core="六个组成" data-primitive="System" data-visual-demo="matrix-focus">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">六个视角</h2>
    <div class="grid-2x3 bK-grid" data-safe-box="matrix">
      <div class="card">结构</div><div class="card">案例</div>
      <div class="card" data-step="2">风险</div><div class="card" data-step="2">成本</div>
      <div class="card" data-step="3">路径</div><div class="card" data-step="3">结论</div>
    </div>
    <div class="bK-lock" data-step="3" data-safe-box="lock">当前行高亮，其余保留上下文</div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 1fr auto;gap:52px}
.bK-title{font-size:84px}
.bK-grid{min-height:760px}
.bK-grid .card{display:grid;place-items:center;font-size:34px}
.bK-lock{font-size:28px;padding-bottom:64px}
```

## V07 数据主屏（Evidence/Claim）

一个数字或关键词占中上部，解释和结论分居下部。禁止多个 KPI 同权并列。

```html
<section class="beat" id="bK" data-layout="V07" data-steps="2"
  data-core="一个关键数字" data-primitive="Evidence" data-visual-demo="number-context-lock">
  <div class="scene bK">
    <div class="kicker" data-safe-box="meta">KEY SIGNAL</div>
    <div class="hero-num bK-num" data-safe-box="number">3×</div>
    <p class="hero-sub bK-explain" data-step="2" data-safe-box="explain">不是更快堆内容<br>而是更快建立关系</p>
    <div class="bK-lock" data-step="2" data-safe-box="lock">一句结论锁定数字含义</div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 1fr auto auto;gap:48px;text-align:center}
.bK-num{font-size:300px;align-self:center}
.bK-explain{font-size:38px}
.bK-lock{font-size:28px;padding:36px 0 72px}
```

## V08 证据纵览（Evidence）

标题/结论在上，主证据占中部，来源/注释在下。证据视觉优先，不做背景。

```html
<section class="beat" id="bK" data-layout="V08" data-steps="3"
  data-core="证据支持结论" data-primitive="Evidence" data-visual-demo="evidence-spotlight">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">证据先说话</h2>
    <figure class="shot bK-evidence" data-safe-box="evidence-main"><img src="…" alt="证据截图"></figure>
    <figcaption class="bK-caption" data-step="2" data-safe-box="caption">关键位置被聚焦，来源保持可读</figcaption>
    <div class="bK-lock" data-step="3" data-safe-box="lock">因此得到这句结论</div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto minmax(650px,1fr) auto auto;gap:48px}
.bK-title{font-size:76px}
.bK-evidence{min-height:650px}
.bK-caption{font-size:26px}.bK-lock{font-size:34px;padding-bottom:64px}
```

## V09 产品截图展示（Path/Evidence）

截图占中上部 45%-65% 高度，说明改为底部短栏；不在截图旁硬塞窄侧栏。

```html
<section class="beat" id="bK" data-layout="V09" data-steps="2"
  data-core="界面如何完成任务" data-primitive="Path" data-visual-demo="screen-focus">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">看它怎么完成</h2>
    <div class="shot bK-shot" data-safe-box="shot"><img src="…" alt="产品界面"></div>
    <div class="bK-notes" data-step="2" data-safe-box="notes"><strong>一步完成</strong><span>只标注与口播同步的关键区域</span></div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto minmax(720px,1fr) auto;gap:48px}
.bK-title{font-size:76px}
.bK-shot{min-height:720px}
.bK-notes{display:grid;gap:14px;font-size:28px;padding-bottom:72px}
```

## V10 核心展开（System）

一个核心 + 最多 3 个能力。核心先落位，能力沿纵向或 2 列展开；连线使用独立轨道且不交叉。

```html
<section class="beat" id="bK" data-layout="V10" data-steps="3"
  data-core="一个核心驱动三项能力" data-primitive="System" data-visual-demo="core-capability-expand">
  <div class="scene bK">
    <h2 class="hero-title bK-title" data-safe-box="title">一个核心</h2>
    <div class="bK-core" data-safe-box="core">问题结构</div>
    <div class="bK-capabilities" data-safe-box="capabilities">
      <div>目标用户</div><div data-step="2">核心功能</div><div data-step="3">实践路径</div>
    </div>
    <div class="bK-lock" data-step="3" data-safe-box="lock">三项能力归于同一核心</div>
  </div>
</section>
```

```css
.bK{display:grid;grid-template-rows:auto 270px 1fr auto;gap:48px}
.bK-title{font-size:80px}
.bK-core{display:grid;place-items:center;font-size:52px}
.bK-capabilities{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:center;gap:24px}
.bK-capabilities>div{min-height:150px;display:grid;place-items:center;font-size:30px}
.bK-lock{font-size:30px;padding-bottom:64px}
```

## 登记扩展

没有合适骨架时允许 `VX-自定义名`，但必须在 beat 契约中登记：信息原语、上中下纵向锚点、主视觉占比、负空间作用、最终锁定区、静态重叠风险和动画方向。只是微调字号或间距不算新骨架。
