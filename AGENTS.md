# Project Context

## Overview

本项目是一个基于 **WXT Framework** 开发的浏览器插件（Browser Extension）。
**核心功能**：提供中英文双向翻译。
**交互流程**：

1. 用户在网页中选中一段文本。
2. 右键点击，选择上下文菜单（Context Menu）中的“翻译\*\*\*”选项。
3. 插件弹出一个 UI 窗口（html dialog 元素）展示翻译结果。

## Tech Stack

- **Framework**: WXT (Web Extension Tools)
- **UI Library**: React
- **Styling**: Tailwind CSS, DaisyUI
- **Language**: TypeScript (Strict Mode)
- **Build Tool**: Vite (WXT 内置)
- **Linting**: ESLint

---

# Coding Standards & Guidelines

## TypeScript Rules

- **Strict Typing**: 严禁使用 `any` 类型。必须为所有 props、state 和 API 响应定义清晰的 Interface 或 Type。严禁杜撰类型，谨慎使用类型断言，不明确的用法需要先查找官方文档。
- **Generic Types**: 在编写复用组件或工具函数时，优先使用泛型以保持类型安全。
- **Null Safety**: 必须处理 `null` 和 `undefined` 的情况，使用 Optional Chaining (`?.`) 和 Nullish Coalescing (`??`)。

## Code Style & Linting

- **Functional Components**: 统一使用 React Functional Components + Hooks。
- **Tailwind Usage**:
  - 优先使用 Tailwind Utility Classes。
  - 使用 DaisyUI 组件类（如 `btn`, `modal`, `card`）来保持 UI 一致性。
  - 避免编写自定义 `.css` 文件，除非是处理 Shadow DOM 中的特殊样式隔离。
- **Comments**:
  - **必须写注释**：对于复杂的业务逻辑（如消息传递机制、文本解析算法）、API 调用封装以及类型定义，必须编写清晰的 JSDoc 注释。
  - 解释“为什么这样做”而不仅仅是“做了什么”。

## Best Practices

- **Modularity**: 将翻译服务（Translation Service）与 UI 层解耦。确保以后可以轻松更换翻译 API（如 Google, DeepL, OpenAI）。
- **Error Handling**: 在进行网络请求或异步操作时，必须包含 `try-catch` 块，并在 UI 中向用户反馈错误状态。
- **Performance**: 避免不必要的组件重渲染。在 Content Script 中操作 DOM 时要注意性能，尽量使用 Shadow DOM 以避免样式冲突。

---

# WXT Framework Specifics

## Directory Structure

遵循 WXT 的标准目录结构：

- `entrypoints/`: 包含插件的入口文件。
  - `background.ts`: 处理右键菜单事件、Service Workers 和跨页面消息转发。
  - `content.ts`: 用于在当前网页中注入 UI（Shadow DOM）或读取选中文字。
  - `popup/`: (如果使用点击图标弹窗) 定义 Extension Popup 的 React 入口。
- `components/`: 可复用的 React 组件（翻译卡片、设置按钮等）。
- `utils/`: 工具函数（消息通信封装、翻译 API 客户端）。
- `assets/`: 静态资源。

## Message Passing

- 使用 WXT 提供的 `browser.runtime.sendMessage` 和 `browser.runtime.onMessage` 的封装或原生 API 进行 Background Script 与 Content Script/Popup 之间的通信。
- 定义统一的消息类型（Types），确保通信的类型安全。

---

# Implementation Plan (Agent Context)

当 AI 协助编写代码时，请遵循以下逻辑流：

1. **Manifest Configuration**: 确保 `wxt.config.ts` 或 `manifest.json` 中声明了必要的权限（`contextMenus`, `activeTab`, `scripting` 等）。
2. **Context Menu Setup**: 在 `entrypoints/background.ts` 中初始化右键菜单，并监听点击事件。
3. **Event Handling**: 当菜单被点击时，获取 `info.selectionText`，并通过消息发送给前端 UI。
4. **UI Rendering**:
   - 如果是弹窗模式：计算选中文字坐标，在鼠标附近渲染一个绝对定位的 DaisyUI 卡片。
   - 确保使用 Shadow DOM 封装 UI，防止宿主网页样式干扰插件样式。
5. **Translation**: 调用封装好的翻译 Hook，获取数据并更新 UI 状态（Loading -> Success/Error）。

---

# User Rules

- 在生成代码时，优先提供**完整的代码块**而不是片段，以便于复制粘贴。
- 修改现有文件时，请先阅读该文件的现有逻辑，确保上下文连贯。
- 如果遇到 WXT 特有的配置问题（如 HMR 热更新、Manifest 生成），请参考 WXT 官方最佳实践。
