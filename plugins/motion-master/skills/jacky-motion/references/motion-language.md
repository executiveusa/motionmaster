# 运动语言：正向动画语法

你是研究过 Apple / Anthropic 发布动画的 motion designer。做动画不是调 CSS transition，是**模拟一个有重量、有惯性的物理世界**。禁令（见文末）只能保底；高级感来自下面的正向语法。

三条信念：

1. **动画是物理学，不是曲线**。`linear` 是数字，`expo.out` 是物体。每次选缓动都在回答"这个元素有多重"。
2. **时间分配比曲线形状更重要**。均匀节奏是技术演示，有节奏的动画才是叙事。在正确的时刻慢下来，比用对 easing 更重要。
3. **礼让观众**。关键信息出现前停一拍（≥300ms），让人脑来得及"看见"。AI 默认做信息密度满格、没有停顿的动画——那是新手。

评价标准只有一个：观众第一反应。"挺流畅的"=合格；"这元素像有重量地落下来"=高级；"我想截图"=传播。

---

## 1. Easing 体系（默认值，写进每条时间线）

| GSAP 写法 | 物理感 | 用在哪 |
|---|---|---|
| `ease:'expo.out'` | 迅速启动、缓慢刹车 | **默认主 easing**：入场、揭示、让位、灰化 |
| `ease:'back.out(1.4)'` | 轻微过冲回弹 | 强调落位：结论词、标注、tag、当前节点点亮 |
| `ease:'power2.inOut'` | 对称匀滑 | 持续位移：让位、镜头感平移、连续对象搬家 |
| `ease:'expo.inOut'` | 两头缓中间快 | 大结构重组：split 分离、层级展开 |

禁止 `linear`、默认 `ease`、`power1.out` 全场通用。**同屏不同元素可以不同 easing**——主角 back.out，配角 expo.out，这就是层次。

## 2. Beat 入场 = 四段式短视频镜头

每个核心 beat 不是“元素出现”，而是一支 1-2 秒的短视频镜头。默认按四段式编排：

| 段 | 对应短视频动作 | 节奏 | 手法 |
|---|---|---|---|
| glance | 视觉重心入场 | 稍慢、庄重 | 主标题/主数字/主证据先进，0.8-1.1s，expo.out |
| reconstruct | 画面重构 | 快但清楚 | 结构运动一次到位：分离、连接、层级展开、对象让位，0.5-0.8s |
| push | 关键信息推进 | 有远近变化 | 关键词、标注、当前节点、焦点框推进；非焦点退后/降亮/轻 blur，0.45-0.75s |
| lock | 记忆定格 | 一次轻强调后**完全停住** | 亮度/描边/一次 back.out 缩放/短线落位，≤0.4s |

预算硬约束：每 beat 最多 1 个结构运动 + 2 组辅助出现 + 1 次最终强调；入场总时长 900-1600ms；总时长必须小于该 beat 口播时长（中文 ≈ 4 字/秒）。

**先设计最终定格帧，再反推运动**。如果静止帧已经能讲清关系，就不要硬做重构。

四段式不是形式主义。每段必须回答一个信息问题：

```md
glance: 第一眼落在哪个对象？为什么它最重要？
reconstruct: 画面里哪个关系发生了变化？没有关系变化就省略，并说明原因。
push: 哪个关键词/节点/证据被推近？其它信息如何退到后景？
lock: 最后一帧观众记住什么？是否能直接截图当封面？
```

不合格写法：
- `glance: 标题淡入；reconstruct: 卡片出现；push: 文案出现；lock: 结束`
- 所有页面都是同一套 fade/stagger
- 没有远近、灰化、让位、连线、分离、聚焦，只是把元素依次显示出来

## 3. Step 推进 = 单动作 + settle

一次点击只演一件事：新增元素入场（或一次关系变化）→ 350-800ms 内完成 → 稳定停住。已出现内容保持不动（允许灰化/降亮/轻让位，禁止重播、重排、漂移）。

```js
// 标准 step：新增内容从下方 14px 落入，终点 = CSS 静止态
TL.b4 = {
  step(b, n){
    gsap.from(b.querySelectorAll('[data-step="' + n + '"]'), {
      opacity: 0, y: 14, duration: .7, ease: 'expo.out',
      stagger: .06, clearProps: 'transform,opacity'
    });
  }
};
```

## 4. Final-state-first 写法契约（稳定性的根）

- 所有元素的 **CSS 静止态 = 最终可见态**；时间线只用 `gsap.from` / `gsap.fromTo`，终点回到静止态，并带 `clearProps:'transform,opacity'`（有 filter 动画就加上 filter）。
- 永远不要用 `gsap.to` 把元素**留在**某个非 CSS 状态——动画挂了、被跳过、被回退，画面都必须正确。
- **禁止裸用 `gsap.set(el, {clearProps})`**：GSAP 3.x 的这个调用会把目标元素重新 append 到父节点末尾，打乱 `<br>`/`<span>` 与文本的顺序（旧版偶发排版错乱的根源之一）。`gsap.from/fromTo` 里带 `clearProps` 是安全的；需要手动清理时用运行时的 `settle()` 逻辑（纯 DOM removeProperty）。
- 状态高亮优先用 CSS + `data-current-step` 属性选择器实现，JS 只负责触发入场。
- 回退（←）不播动画，运行时会直接落最终态——这是特性，不要试图给回退加动画。

## 5. 高级感技巧库（可直接抄）

### 5.1 数字滚动（L07 数据主屏）

```js
enter(b){
  const el = b.querySelector('[data-count-to]');
  const target = Number(el.dataset.countTo);
  const o = { v: 0 };
  gsap.to(o, { v: target, duration: 1.4, ease: 'expo.out',
    onUpdate: () => el.textContent = Math.round(o.v),
    onComplete: () => el.textContent = target });   // 终点显式落准
}
```

### 5.2 连接线生长（L04 流程）

```js
// .flow-link 静止态是完整线；from scaleX:0 生长（transform-origin 已在基座设好）
gsap.from(b.querySelector('.bK-link-' + n), { scaleX: 0, duration: .6,
  ease: 'expo.inOut', clearProps: 'transform' });
```

SVG 路径版：`stroke-dasharray: L; stroke-dashoffset: L` 为初始，`gsap.from(path,{strokeDashoffset:L})` 收到 0（CSS 静止态设 `stroke-dashoffset:0`）。

### 5.3 焦点切换 = 降亮 + 去饱和 + **blur**

只降 opacity 的非焦点元素仍然锐利，没有退到后景。基座的 `data-dim-at` 已内置 opacity+saturate；需要更强景深时在 beat CSS 里给 `.dim` 加 blur：

```css
.bK [data-dim-at].dim{filter:saturate(.5) blur(3px)}
```

### 5.4 关键结论前悬停一拍

```js
gsap.timeline()
  .from(evidence, { opacity: 0, y: 18, duration: .8, ease: 'expo.out' })
  .from(conclusion, { opacity: 0, y: 16, duration: .8, ease: 'back.out(1.4)',
      clearProps: 'transform,opacity' }, '+=0.45');   // ← 这 0.45s 停顿就是"礼让观众"
```

### 5.5 强调落位（memory lock，一次性，不循环）

```js
gsap.from(keyword, { scale: .92, duration: .45, ease: 'back.out(2)',
  clearProps: 'transform' });
```

### 5.6 文字 mask reveal（大标题质感入场）

```css
.bK-title{clip-path:inset(0 0 0 0)}  /* 静止态完整 */
```
```js
gsap.from(title, { clipPath: 'inset(0 0 100% 0)', y: 24, duration: 1.0,
  ease: 'expo.out', clearProps: 'clip-path,transform' });
```

### 5.7 结构让位（number-to-system / 截图让位结论）

```js
// 主视觉从居中让位到左轴：静止态就是让位后的位置，from 初始偏移
gsap.timeline()
  .from(hero, { x: 360, scale: 1.18, duration: .9, ease: 'expo.inOut',
      clearProps: 'transform' })
  .from(sidePanel, { opacity: 0, x: 40, duration: .7, ease: 'expo.out',
      clearProps: 'transform,opacity' }, '-=.25');
```

### 5.8 模拟打字/终端（chunk reveal，不用 setInterval 单字蹦）

一次出 2-5 字、间隔 40-120ms 不规律，模拟真实 token 流。只在确有"AI 输出/终端"语义时使用。

## 6. Recipe 速查（分镜表里声明）

| recipe | 原语 | from → to | 关键动作 |
|---|---|---|---|
| claim-lockup | Claim | 空场 → 一句强判断 | glance + lock，不做重构 |
| split-reveal | Contrast | 混合态 → 左右分离 | 旧稳新亮，最后锁差异 |
| path-build | Path | 起点 → 完整路径 | 节点逐个点亮，线在轨道内生长 |
| stack-expand | System | 抽象概念 → 2-4 层展开 | 主概念让位/锚定，层级依次开 |
| matrix-fill | System | 空阵 → 分批填充 | 按行/组进，讲到谁聚焦谁 |
| evidence-spotlight | Evidence | 证据全貌 → 焦点+标注+结论 | 主证据锐化，其余降噪 |
| screenshot-annotation | Path/Evidence | 大截图 → 框选+旁注 | 截图先稳，框选后进 |
| number-to-system | Evidence | 大数字 → 背后结构 | 数字让位，结构接管 |
| concept-expand | System | 核心 → ≤3 模块外扩 | 核心定场，模块分批出 |

每个 recipe 结束必须停在稳定 hero frame：无残留 blur / 半透明 / transform 错位；不看口播也知道该看哪里；可直接截图当封面。

## 7. 禁止（保底线）

- 大幅飞入、旋转入场、弹跳循环、反复 pulse、长时间 blur 文字
- 所有 beat 共用一个无语义 fade/stagger 函数（默认入场只是兜底，核心 beat 必须有自己的 TL）
- step 推进重播整页；多项同时 stagger 涌入（一次最多新增 1-3 个信息对象）
- 为凑"四段式"硬做没有关系变化的重构（Claim 页只要 glance+lock）
- 收尾 fade to black——**戛然而止，hold 最后一帧**
- 动画总时长超过口播时长

## 8. 交付前 60 秒自检

- [ ] 每条时间线默认 `expo.out`，强调用 `back.out`，没有 linear/ease？
- [ ] 主角和配角的 easing / 时长有区分？
- [ ] 关键结论前有 ≥300ms 悬停？
- [ ] 焦点切换带 blur/去饱和，不只是降 opacity？
- [ ] 全部 `gsap.from/fromTo` + `clearProps`，没有把元素留在非 CSS 态的 `gsap.to`？
- [ ] 每个 beat 的最终帧完全静止、可截图、有记忆点？
- [ ] 至少 2/3 的核心 beat 有自己的 TL 签名动效，不是全靠默认入场？
- [ ] 动画时长 < 口播时长（4 字/秒估算）？
