# SRT HTML 装配增量

先执行共享的 [HTML 生产规范](html-production.md) 中的视觉与内容要求。本文件只说明如何把同一套画面装进 SRT 自动播放运行时。

## 装配顺序

1. 复制本 Skill 的 `assets/base-template-srt.html`，不修改 RUNTIME CORE 与 RUNTIME JS。
2. 整块注入所选 `assets/styles/{id}.css`；该目录直接共享标准版风格 CSS。
3. 按标准版分镜、版式骨架、风格场面和 beat 契约生成内容层。
4. 按 SRT 覆盖表给每个 beat 登记开始、结束和 step 时间。
5. 为非信息动画区间生成正式 B-roll beat。
6. 注册时间线，运行静态校验与浏览器截图验收。

## 必填属性

所有 beat 保留标准版属性，并增加：

```html
<section
  class="beat"
  data-beat="b3"
  data-kind="motion"
  data-start-ms="21400"
  data-end-ms="38200"
  data-step-times="27600,33100"
></section>
```

- `data-kind` 只允许 `motion` 或 `broll`。
- `data-step-times` 只登记 step 2..N；没有多步时省略。
- CPSE 原语继续填写 `data-visual-demo`；关键容器继续填写 `data-safe-box`。

B-roll 结构：

```html
<section
  class="beat"
  data-beat="b4"
  data-kind="broll"
  data-layout="LX-BROLL"
  data-broll-title="演示实际操作"
  data-start-ms="38200"
  data-end-ms="49100"
>
  <div class="broll-scene">
    <div class="broll-frame">
      <span class="broll-label">B-ROLL</span>
      <span class="broll-index">04</span>
      <h2>演示实际操作</h2>
    </div>
  </div>
</section>
```

## 时间线纪律

- SRT 只决定时间，不降低视觉质量或改变所选风格。
- CSS 静止态必须是最终帧；使用 `gsap.from/fromTo` + `clearProps`。
- beat 内禁止新增事件监听、`setTimeout` 或独立时钟。
- step 时间必须来自语义触发 cue，不平均切分。
- 动画必须在 beat 结束前停止，留下稳定可截图的最终帧。

## 视觉一致性

- 七种风格、CSS token、版式和签名组件均从标准版共享目录读取。
- 每个 beat 最多 1 个结构运动 + 2 组辅助出现 + 1 次锁定强调。
- 核心 beat 仍需 `glance → reconstruct → push → lock`；SRT 只改变触发时刻。
- 任何视觉冲突都回到标准版质量门禁解决，不在 SRT 层另造补丁风格。
