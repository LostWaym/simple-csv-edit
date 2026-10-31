# 术语表

本文只帮助定位代码：**是什么、入口在哪、归谁管理**，不是实现说明或功能清单。

## 维护规范

- **收录范围**：项目特有或容易混淆的概念、模块入口、归属关系；不为每个字段、菜单项或配置行单独建条目。
- **条目格式**：`术语`：一句话定义 + 关键入口路径 + 必要的归属关系；通常只留一两个入口，必要时补资源目录。
- **不写实现**：不记录数值、字段、方法、事件、算法、调用流程、按钮或布局；到代码中查。
- **按需更新**：新增功能不等于新增术语；已有条目足以定位时不扩写。只在出现新概念、入口或职责变化、功能移除时更新。
- **合并去重**：相关概念尽量共用条目，按模块就近维护；不另列重复的界面一览、文件清单或开发历史。
- **约束集中**：难从局部代码看出的项目约定只在下方保留一处；通用开发规范与工程经验分别见 `AGENTS.md`、`docs/pitfalls.md`，不重复抄录。
- **使用方式**：先按索引定点读代码，确有跨模块依赖再扩大搜索；文档不能替代对当前实现的确认。
- **自检标准**：能否更快找到正确代码？若只是复述打开入口后就能看到的内容，应删去。

## 关键约束

- **依赖方向**：调用方 → 服务入口 → 宿主；禁止在业务代码里做全量搜索式查找或鸭子类型探测。
- **初始化归属**：依赖运行时上下文的初始化统一由一个明确的驱动点触发，不放在框架生命周期的隐式回调里。
- **单一出口**：同一类读写（配置、文件、坐标换算等）只走一个统一入口，不另写并行实现。

## 基础与架构

- **应用入口**：`main.go` 启动 Wails 窗口并绑定 `App`；`app.go` 的 `App` 是 Go 侧唯一导出结构。
- **后端 bindings 出口**：前端统一经 `frontend/src/utils/backend.ts` 调用 `frontend/wailsjs/go/main/App`，不直接散用生成函数。

## 前端

- **CsvEditor 视图**：`frontend/src/views/CsvEditor.vue`，外壳，装配工具栏、标签栏、状态栏与弹窗，并承载全局快捷键。
- **标签页与工作区**：`composables/useCsvWorkspace.ts` 持有全部标签（每标签一套文档/文件/导航实例），`components/TabBar.vue` 为标签栏入口，`components/CsvTabPanel.vue` 为单个标签的编辑面板（菜单、选区、滚动位置）。
- **网格与文件状态**：分别由 `composables/useCsvDocument.ts`（表格数据与结构操作）与 `composables/useCsvFile.ts`（保存/脏标记）持有；打开与新建由工作区负责。
- **冻结行列**：冻结数由标签级 `frozenRows`/`frozenCols` 持有（`useCsvWorkspace`），`components/CsvGrid.vue` 以 sticky 层渲染，冻结列偏移运行时测量；默认值来自设置，仅新建/打开时应用。
- **导航与撤销**：`composables/useGridNavigation.ts` 管理焦点、矩形选区、整行/整列选择与就地编辑；`composables/useUndoRedo.ts` 提供快照式历史栈，随标签独立。聚焦单元格由透明常驻输入框承接键入与输入法预输入，选中态不显示编辑框。
- **单元格编辑栏**：`components/CellEditBar.vue` 位于网格上方，展示并编辑聚焦单元格，提交统一走 `useCsvDocument.setCell`；目标行列在聚焦时快照。
- **选区与剪贴板**：矩形选区由 `useGridNavigation` 的锚点 + 焦点规范化得到；复制/粘贴走 `utils/clipboard.ts`（Wails runtime 优先）与 `utils/csv.ts` 的制表符表格序列化，跨标签共享。
- **数字填充**：`frontend/src/utils/fill.ts` 把单元格内容解析为递增/递减序列（保留前后缀与补零位宽）；手柄由 `components/CsvGrid.vue` 在单格聚焦时提供，写入统一走 `useCsvDocument.fillSequence`。
- **轻提示**：`composables/useToast.ts` + `components/ToastMessage.vue` 承载短时操作反馈，文案与时长为模块常量。
- **文件拖放**：`composables/useFileDrop.ts` 注册 Wails 文件拖放并持有拖拽遮罩状态；按路径打开由 `useCsvWorkspace.openPaths` 负责，拖放开关在 `main.go` 的 Wails 选项。
- **应用设置**：`composables/useSettings.ts` 持有并持久化设置项，`components/SettingsDialog.vue` 为设置入口。

## 后端

- **App 导出方法**：文件对话框与纯文本读写，签名以 `app.go` 为准，前端类型来自生成物。

## 数据与文件

- **CSV 统一出口**：`frontend/src/utils/csv.ts` 负责解析（去 BOM、混合换行归一）与序列化（按设置编码输出，默认 UTF-8 无 BOM），首行即普通数据、无表头行，其他位置不得另写解析逻辑。
- **列标签**：`frontend/src/utils/column.ts` 生成 A/B/C… 导航标签，仅用于界面展示，不参与数据。
- **过滤与高亮**：`frontend/src/utils/filter.ts` 负责关键词分段高亮与匹配定位；查询以空白分隔多个关键词且需全部命中，高亮与匹配共用同一判定；过滤不隐藏行。
