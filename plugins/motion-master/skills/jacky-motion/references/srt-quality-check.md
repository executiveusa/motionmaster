# SRT 验收增量

先完整执行共享的 [质量检查](quality-check.md)。首屏、最密 beat、多步 beat 最后一步和收束页仍以截图为准；视觉失败不能用“时间已同步”抵消。

## SRT 静态校验

```bash
node <SKILL_ROOT>/scripts/validate-motion-html-srt.mjs path/to/output.html
```

必须通过：

- 每个 beat 都有合法 `data-start-ms` 与 `data-end-ms`。
- 时间严格递增、相邻不重叠、未覆盖空档不超过 500ms。
- 多步 beat 的 `data-step-times` 数量、顺序和范围正确。
- 首条 cue 到末条 cue 全部被 `motion` 或 `broll` 覆盖。
- B-roll 使用 `data-kind="broll"`、`LX-BROLL` 和具体 `data-broll-title`。
- RUNTIME CORE 与 RUNTIME JS 完整，beat 内没有独立计时器和事件监听。

## 自动播放检查

- 点击“准备录屏”后请求全屏并倒数 3 秒。
- Space 暂停/继续时主时钟同步冻结/恢复。
- ←/→ 跳 5 秒后，画面和 step 立即追上正确状态。
- `R` 从头重播的节奏可重复。
- 切出浏览器录制 B-roll 再返回，画面按主时钟追上当前区间。
- 最后一条 cue 结束后停在可靠终态，不循环、不黑屏。

## 浏览器视觉检查

```bash
node <SKILL_ROOT>/scripts/check-layout-browser-srt.mjs path/to/output.html
```

除标准版视觉门禁外，额外截取：

- 第一个 motion beat 的稳定帧。
- 至少一个多步 beat 的中间 step 和最终帧。
- motion → broll → motion 的切换点。
- 最后一条 cue 结束后的终态。

任一同步项或标准版视觉项失败，都不得交付。
