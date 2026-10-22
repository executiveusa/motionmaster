# SRT Beat 契约增量

先完整填写共享的 [Beat 生成契约](beat-contract.md)。SRT 版只增加下列字段，其他视觉字段、质量标准和不合格判定全部保持一致。

## 新增字段

```yaml
track_role: motion | broll
srt_timing:
  cue_range:
  start_ms:
  end_ms:
b_roll:
  title:
  frame_subject:
step_contract:
  - step:
    at_ms:
    spoken_trigger:
```

## 字段规则

- `track_role` 只允许 `motion` 或 `broll`。
- `srt_timing` 必须来自真实 cue，满足 `start_ms < end_ms`。
- 相邻 beat 不重叠，未覆盖空档不得超过 500ms。
- `track_role=broll` 时必须填写 `b_roll`，标题为 4-14 个汉字的具体展示对象，并使用 `LX-BROLL`。
- 多步 motion beat 的 step 2..N 必须填写 `at_ms`；时间严格递增、落在 beat 内，并对应真实口播触发词。
- 时间字段只能控制何时推进，不能替代标准版的 `style_scene`、`attention_path`、`camera_acts`、`visual_demo`、`final_state` 和 `validation_risks`。

## SRT 专属不合格项

- 用字数或平均分段代替真实 SRT cue。
- 多步 beat 缺少绝对毫秒点。
- 时间段重叠、倒序或存在超过 500ms 的空档。
- B-roll 没有具体标题，或被普通空白页替代。
- 为赶时间删掉标准版视觉契约字段。
