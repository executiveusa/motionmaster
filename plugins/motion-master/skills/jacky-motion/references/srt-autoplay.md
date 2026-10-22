# SRT 自动播放与 B-roll 时间轴（Phase 3.5）

SRT 是播放时钟，不是字幕层。最终 HTML 不逐句显示 SRT 文本，也不包含音频。先完成内容分镜和风格锁定，再用 SRT 把每个画面、step 与 B-roll 窗口钉到真实口播时间。

## 1. 解析 SRT

```bash
node <SKILL_ROOT>/scripts/parse-srt.mjs path/to/voiceover.srt
```

脚本输出按时间排序的 cue JSON：`index`、`startMs`、`endMs`、`text`。出现时间倒退、结束早于开始、cue 重叠或空文件时先修 SRT，不进入装配。

## 2. 建立覆盖表

从第一条 cue 的 `startMs` 到最后一条 cue 的 `endMs`，每一段只能属于以下一种轨道：

- `motion`：HTML 信息动画，承载关键判断、关系变化、框架、证据或记忆点。
- `broll`：真实产品、网站、操作、素材或案例展示，不重复做成信息卡片。

输出并停等确认：

```md
| 区间 | SRT cue | 轨道 | beat | 核心画面 / B-roll 小标题 | step 时间点 | 依据 |
|---|---:|---|---|---|---|---|
| 00:00.000-00:08.400 | 1-3 | motion | b1 | AI 放大模糊 | 03.200, 06.100 | 判断→原因→记忆锁定 |
| 00:08.400-00:15.900 | 4-7 | broll | br1 | 产品首页与提问入口 | — | 口播正在讲真实界面 |
```

覆盖规则：

1. `startMs` 取该段第一条 cue 的开始时间；`endMs` 取最后一条 cue 的结束时间。
2. 相邻区间不重叠；空档不超过 500ms。短空档并入前一段，较长静音必须明确保留在哪个画面。
3. 一个 motion beat 通常覆盖 8-30 秒；B-roll 窗口通常不少于 4 秒，过短就并入相邻主轨。
4. 只有口播语义发生变化时切 beat；不得按每条字幕切页。
5. step 时间点必须落在对应 beat 内，优先钉在触发词所在 cue 的 `startMs`，不要平均分配。
6. 最后一个 beat 的 `endMs` 必须等于或覆盖末条 cue 的 `endMs`。

## 3. HTML 时间属性

motion beat：

```html
<section class="beat" id="b2"
  data-kind="motion"
  data-layout="L04" data-steps="3"
  data-start-ms="15900" data-end-ms="33100"
  data-step-times="21400,27600"
  data-core="问题被补成一条可执行路径"
  data-primitive="Path"
  data-visual-demo="path-line-draw">
  ...
</section>
```

`data-step-times` 按 step 2、step 3... 的顺序写绝对毫秒；数量必须等于 `data-steps - 1`，时间严格递增并落在 `[startMs, endMs)`。

B-roll beat：

```html
<section class="beat" id="br1"
  data-kind="broll"
  data-layout="LX-BROLL" data-steps="1"
  data-start-ms="8400" data-end-ms="15900"
  data-core="展示产品首页与提问入口"
  data-primitive="Evidence"
  data-broll-title="产品首页与提问入口">
  <div class="scene broll-scene">
    <div class="broll-heading" data-safe-box="broll-heading">
      <span class="broll-index">B-ROLL 01</span>
      <h2 class="broll-title">产品首页与提问入口</h2>
    </div>
    <div class="broll-frame" data-safe-box="broll-frame" aria-label="产品首页与提问入口录屏画框">
      <span class="broll-corner broll-corner-a"></span>
      <span class="broll-corner broll-corner-b"></span>
      <span class="broll-corner broll-corner-c"></span>
      <span class="broll-corner broll-corner-d"></span>
    </div>
  </div>
</section>
```

B-roll 标题必须是 4-18 个字符的具体对象或动作，如“产品首页与提问入口”“拖拽生成页面过程”。禁止写“这里放素材”“待补画面”“适合插入”等制作备注。画框使用基座组件，不给每个 B-roll 临场写一套版式。

## 4. 自动播放行为

- 首次打开停在准备层；点击“准备录屏”后请求全屏并倒数 3 秒，从 `0ms` 开始。
- 使用 `performance.now()` 与 `requestAnimationFrame` 计算主时钟，不使用连续 `setTimeout`。
- Space 暂停/继续；←/→ 跳 5 秒；`R` 回到 0 并重新倒数；`F` 切换全屏。
- 页面切到后台时主时钟继续流逝；返回后直接落到当前 SRT 时间对应的 beat/step，不补播已经错过的动画。
- 播放到末条字幕结束后停在最后定格帧，画面不循环。

## 5. 对抗式检查

装配前反问：

1. 如果删掉 SRT 文本，只看覆盖表，所有口播时间是否都有画面责任人？
2. B-roll 是否真的是“需要看真实东西”，还是因为主轨设计困难而逃避信息可视化？
3. step 是否钉在语义触发词，而不是机械均分时长？
4. B-roll 标题是否一眼告诉录屏者要展示什么？
5. 浏览器切出再回来，画面是否按绝对时钟追上，而不是从旧动画继续？
6. 从头重播三次，关键切换是否发生在相同毫秒点？
