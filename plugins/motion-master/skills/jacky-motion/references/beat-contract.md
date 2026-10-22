# Beat 生成契约

每个 beat 写 HTML 前必须先填契约。契约是从口播信息到画面设计的桥，不是文档装饰。缺关键字段时，不进入 HTML。

## 合同模板

```md
beat_id:
core_message:
information_primitive: Claim / Contrast / Path / System / Evidence
spoken_duration_estimate:
screen_text:
track_role: main_track / narrator_only / b_roll_window
b_roll_window:

composition:
  aspect_ratio:
  stage_size:
  layout_skeleton:
  style_scene:
  anchor_axis:
  primary_zone:
  secondary_zone:
  negative_space_role:
  rhythm:
    title_line_height:
    body_line_height:
    group_gap:
    alignment_rule:
  portrait_fill:
    vertical_anchors:
    active_span_target:
    bottom_lock:

attention_path:
  first_glance:
  second_focus:
  final_lock:

camera_acts:
  glance:
  reconstruct:
  push:
  lock:

reconstruction:
  from_state:
  to_state:
  changed_relation:
  recipe:

motion_budget:
  structure_motion:
  supplement_groups:
  memory_lock:
  omitted_phases:

visual_demo:
  type:
  why_it_serves_information:

step_contract:
  - step:
    spoken_trigger:
    primary_focus:
    visual_demo:
    relation_change:
    persistent_context:
    final_state:
    duration_budget:

continuity_object:
  object:
  persists_from:
  persists_to:
  transform:

validation_risks:
  overlap:
  center_cluster:
  line_crossing:
  nav_collision:
  text_overflow:
```

## 字段规则

- `core_message`: 只允许一句话，不写并列观点。
- `screen_text`: 必须短于口播，只做视觉索引。
- `track_role`: 默认 `main_track`；解释句、过渡句、例子细节优先进入 `narrator_only` 或 `b_roll_window`。
- `aspect_ratio`: 只允许 `16:9` 或 `3:4`；`stage_size` 对应 `1920×1080` 或 `1080×1440`。
- `layout_skeleton`: 16:9 必须是 L01-L10/LX-*；3:4 必须是 V01-V10/VX-*，不得混用。
- `style_scene`: 写清这页靠什么识别所选风格，例如“浅蓝产品页 + 主截图 + 蓝色路径线”，不能写“好看”。
- `primary_zone`: 主视觉区域，说明左/右/上/下/全轴位置和大致占比。
- `negative_space_role`: 留白用于推进方向、对比缓冲、记忆定格或截图安全。
- `rhythm`: 写清标题行高、正文行高、组间距和对齐规则。
- `portrait_fill`: 仅 3:4 必填。写上/中/下纵向锚点、有效构图跨度目标和底部记忆锁；常规页跨度目标不得低于 62%。
- `first_glance`: 观众 1 秒内应该看的唯一对象。
- `final_lock`: 动画结束后的记忆点，也是截图验收帧。
- `camera_acts`: 四段式短视频镜头。`glance` 是视觉重心入场；`reconstruct` 是画面关系变化；`push` 是关键词/节点/证据被推近，非焦点退后；`lock` 是记忆定格。Claim 页可省略 `reconstruct`，但必须写明原因。
- `changed_relation`: 必须说明信息关系如何变化；只写“淡入/出现/上移”不合格。
- `motion_budget`: 每 beat 最多 1 个结构运动 + 2 组辅助出现 + 1 次最终强调。
- `visual_demo`: Contrast / Path / System / Evidence 必填；必须是具体演示，如 `path-line-draw` / `split-compare` / `evidence-spotlight`。
- `step_contract`: 多步 beat 必填；每步必须有 `primary_focus`、`visual_demo`、`persistent_context`、`final_state`。
- `continuity_object`: 长稿优先保留跨 beat 对象，让画面像连续演示而不是翻 PPT。
- `validation_risks`: 必须写真实风险，不能全写“无”。

## 不合格契约

- `core_message` 同时讲两件事。
- `first_glance` 写“整页”或“所有卡片”。
- `style_scene` 缺失，或只写风格名。
- `camera_acts` 写成动画效果清单，如“淡入、上移、出现、结束”，没有说明视觉重心、关系变化、焦点推进、记忆定格。
- `changed_relation` 写“元素依次出现”。
- CPSE beat 的 `visual_demo` 缺失或只写“淡入/出现”。
- 多步 beat 缺 `step_contract`，或 step 的 `final_state` 缺失。
- `layout_skeleton` 写“自由发挥”。
- 3:4 使用 L 骨架，或只修改舞台宽高而没有横转竖构图。
- `screen_text` 是口播原文。

## Step 质量

一个 step 是一次注意力推进，不是一个元素 reveal。只有以下情况才新增 step：

- 列表项被口播逐个讲述。
- 流程节点向前推进。
- 对比关系从旧状态转到新状态。
- 系统层级展开一层。
- 证据被聚焦、标注或落结论。
- 主视觉让位给辅助结构。

每个 step 只新增 1-3 个信息对象；已出现内容保持稳定，允许灰化、降亮、轻让位，禁止重播、重排、随机漂移。每步结束必须能稳定截图。

## 注意力质量分配

- 主视觉：45%-65%
- 辅助结构：20%-35%
- 上下文标签：5%-15%
- 装饰：0%-5%

留白可以大，但必须有方向。元素可以少，但主视觉必须足够重。
