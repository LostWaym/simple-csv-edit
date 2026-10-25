# 项目实现约定

本文件记录本项目（simple-csv-edit）的具体技术栈、目录结构与校验命令。通用规范见 `AGENTS.md`，坑点见 `docs/pitfalls.md`。

## 技术栈

- 形态：Wails 2 桌面应用（Go 后端 + Web 前端）
- 后端：Go 1.23
- 前端：Vue 3 + TypeScript + Vite
- 工具链：Wails v2.10、Node 24、npm 11
- CSV 解析：papaparse（前端统一出口见 `utils/csv.ts`）
- 应用定位：简单的 CSV 编辑工具（具体功能待补充）

## 目录结构

- 后端入口为根目录 `main.go` 与 `app.go`，内部实现放 `internal/` 下按职责分包。
- 前端按职责分目录，禁止散落：
  - `frontend/src/components/`：可复用 UI 组件
  - `frontend/src/views/`：页面级视图
  - `frontend/src/composables/`：可复用组合式逻辑（`useXxx`）
  - `frontend/src/stores/`：跨组件共享状态
  - `frontend/src/types/`：手写类型定义
  - `frontend/src/utils/`：无响应式状态的纯函数与外部能力封装（如后端 bindings 调用）
  - `frontend/src/constants/`：模块级常量，避免散落字面量
- `frontend/wailsjs/` 由 Wails 生成，**禁止手改**。

## 后端职责边界

- Go 端只作为**能力有限的系统层**：数据读取、数据保存、打开文件浏览框（以及系统原生对话框等无法在前端完成的操作）。
- 业务逻辑、解析、校验、状态管理、界面交互一律放在前端；不要在 Go 端实现可用前端完成的功能。
- 新增 Go 导出方法前先确认前端确实无法完成；能放前端的就不要下沉到 Go。
- Go 端方法保持薄封装：接收参数 → 调用系统能力 → 返回结果，不承载业务规则。

## 前后端契约

- 后端导出的方法与参数/返回值是契约的**唯一来源**。
- 前端调用与类型来自生成的 bindings；禁止手写重复的 DTO 或方法签名副本。
- 修改导出接口后需重新生成 bindings，不得手动同步。

## 构建与类型校验命令

1. 前端类型检查：`npm run typecheck`（位于 `frontend/`）
2. 前端构建：`npm run build`（位于 `frontend/`）
3. 后端静态检查：`go vet ./...`
4. 后端构建：`go build ./...`
5. 整合构建：`wails build`
