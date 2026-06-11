<div align="center">

# Echo

**AI 视频总结与知识库工具**

懒得看视频？一键省流 —— 把 B 站、YouTube 和本地视频，沉淀成可检索、可追问、可导出的本地知识笔记。

[快速开始](#快速开始) · [核心能力](#核心能力) · [技术栈](#技术栈) · [项目结构](#项目结构)

</div>

---

自动转写、结构化总结、VLM 图文笔记、思维导图、知识库 RAG 问答 —— 一条流水线把视频变成文字资产，**数据全部落本地**，不上云。深度优化 B 站体验，同时支持 YouTube 与本地视频。

```
B 站 / YouTube / 本地视频  →  转写  →  文本笔记  →  图文笔记  →  思维导图  →  知识库
         ↓                          ↓                          ↓
    B 站扫码登录              可回溯的任务历史             跨视频 RAG 问答
```

贴一个链接（或拖入本地视频），剩下的交给流水线。每一步都是可回溯、可重跑的异步任务，长耗时也让人安心。

## 核心能力

### 图文笔记（VLM 理解型）`旗舰`

一版从零设计的笔记形态：视觉模型阅读原始笔记与全部截图的客观信息，**以画面为线索重新组织文章结构**。每张图跟在对应的知识段落之后 —— 不是正文里随手插图，也不是把截图堆在末尾。

- 视觉模型支持 OpenAI / Anthropic / 兼容接口 / 自定义端点，格式与认证自动适配
- 帧描述 → 客观事实列表，从源头杜绝流水账
- 精选配图（3–6 张），段落与图片交替呈现
- 合成超时 300s，自动预过滤低质量帧

> VLM 模式调用多模态模型处理截图，API 费用高于纯文本。想控成本可调小「最多截图数」或调大「截图最小间隔」；截图规划的提示词也可在设置页自定义。

### 文本笔记 · 思维导图 · 知识库

- **文本笔记** —— LLM 不只压缩，而是识别论点、案例、结论，生成结构化知识卡片；转写全文带章节时间轴与关键句定位，公式和代码自动格式化。不满意可换套模型**一键重跑**。
- **思维导图** —— 线性视频转放射状知识网络，支持缩放、拖拽、节点高亮，一眼看清逻辑脉络。
- **知识库** —— 跨视频 RAG 检索问答（语义 + 关键词），自动/手动标签与标签关系网络；支持本地 LLM，断网也能用。看的视频越多，这个本地知识库越值钱。

### 转写引擎

| 引擎 | 特点 |
|------|------|
| **FunASR（QwenASR）** | 阿里本地中文识别，效果超越 Whisper，CPU 约 34×、GPU 约 13×；支持 VAD / 自动标点 / 说话人识别 |
| **SiliconFlow ASR** | 长音频自动切片 + 并发识别，突破 60 分钟限制 |
| **多模态 ASR** | OpenAI 兼容音频模型（如 mimo-v2-omni），切片时长与重试可调 |
| **本地 Whisper** | CPU / CUDA 可选，全程离线 |

### 还有

- **多 P 与全集总结** —— 自动检测分 P，单个或批量建任务；全集模式聚合所有分 P 生成一篇总笔记。
- **导入导出** —— 导入 B 站 / YouTube 链接与本地视频（mp4 / mkv / mov / webm）；导出 Markdown、Obsidian，一键打包笔记和截图。
- **B 站风控** —— 桌面端内置扫码登录、自动保存 Cookies，也支持手动导入 `cookies.txt`。
- **桌面端** —— Windows / macOS 双平台，自绘窗口栏与统一 UI、动画启动画面、应用内自动更新。

## 技术栈

| 模块 | 选型 |
|------|------|
| 桌面端 | Electron + React + TypeScript + Vite |
| 后端服务 | FastAPI + SQLite |
| 视频下载 | yt-dlp |
| 语音转写 | FunASR（QwenASR）/ SiliconFlow ASR / 多模态 ASR / 本地 Whisper |
| 摘要生成 | OpenAI-compatible / Anthropic Claude / 本地规则降级 |
| 视觉模型 | OpenAI / Anthropic / 兼容接口（自动格式适配） |
| 知识库 RAG | Embedding 向量检索 + LLM Agent |
| 思维导图 / 知识网络 | ReactFlow / D3 Force Graph |
| 打包分发 | PyInstaller onedir + electron-builder + Docker |

## 快速开始

**环境要求**：Python `3.12` · Node.js `20+` · Windows / macOS · 可选 `ffmpeg`、CUDA

**1. 安装依赖**

```bash
uv sync --python 3.12 --all-packages
npm install --prefix apps/desktop
```

**2. 配置环境变量**

```bash
cp .env.example .env     # Windows: Copy-Item .env.example .env
```

`.env` 关键项（完整列表见 `.env.example`）：

```env
VIDEO_SUM_HOST=127.0.0.1
VIDEO_SUM_PORT=3838
VIDEO_SUM_ACCESS_TOKEN=replace-with-a-long-random-token

# 转写（SiliconFlow 为例）
VIDEO_SUM_TRANSCRIPTION_PROVIDER=siliconflow
VIDEO_SUM_SILICONFLOW_ASR_BASE_URL=https://api.siliconflow.cn/v1
VIDEO_SUM_SILICONFLOW_ASR_MODEL=TeleAI/TeleSpeechASR
VIDEO_SUM_SILICONFLOW_ASR_API_KEY=your-key

# LLM 摘要
VIDEO_SUM_LLM_ENABLED=true
VIDEO_SUM_LLM_PROVIDER=openai-compatible
VIDEO_SUM_LLM_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
VIDEO_SUM_LLM_MODEL=qwen3.5-plus
VIDEO_SUM_LLM_API_KEY=your-key

# B 站 Cookies（遇到风控时配置，桌面端建议优先用内置扫码登录）
VIDEO_SUM_YTDLP_COOKIES_FILE=
```

**3. 启动开发环境**

```bash
npm run dev     # 同时拉起 Vite 渲染层、Electron 桌面壳与 Python 后端
```

### 桌面端打包

```bash
npm run package:win     # Windows
npm run package:mac     # macOS
```

### Docker 浏览器版

```bash
# 本地构建并运行（镜像名 echo:local）
npm run docker:build
docker run --rm -p 3838:3838 \
  -v echo-data:/data \
  -e VIDEO_SUM_ACCESS_TOKEN=your-token \
  -e VIDEO_SUM_LLM_ENABLED=true \
  -e VIDEO_SUM_LLM_BASE_URL=https://coding.dashscope.aliyuncs.com/v1 \
  -e VIDEO_SUM_LLM_MODEL=qwen3.5-plus \
  -e VIDEO_SUM_LLM_API_KEY=your-key \
  -e VIDEO_SUM_SILICONFLOW_ASR_API_KEY=your-key \
  echo:local

# 或拉取已发布镜像
docker pull lycohana/echo:latest
```

访问 `http://127.0.0.1:3838`。容器内服务监听 `0.0.0.0:3838`，数据目录 `/data`。

> **从旧版迁移**：首次启动会自动从 BriefVid 目录迁移数据到 Echo 目录 —— 只复制缺失文件，不覆盖已有数据，也不删除旧目录。

## 项目结构

```
Echo/
├── apps/
│   ├── desktop/                 # Electron + React 桌面端（pages / components / api / 状态管理）
│   ├── web/                     # 浏览器版静态产物（Vite 构建输出）
│   └── service/                 # FastAPI 本地服务
│       └── src/video_sum_service/
│           ├── app.py                # FastAPI 入口
│           ├── worker.py             # 后台任务调度
│           ├── repository.py         # SQLite 持久化
│           ├── settings_manager.py   # 配置管理
│           ├── knowledge/            # 知识库（索引 / RAG / 标签 / 本地 LLM）
│           └── routers/              # API 路由
├── packages/
│   ├── core/                    # 下载 / 转写 / 摘要 / 图文笔记核心逻辑
│   └── infra/                   # 配置 / 运行时 / LLM 工具函数
├── docs/                        # 文档
├── tests/                       # 测试
└── .env.example
```

## 开发

依赖安装见 [快速开始](#快速开始)。常用命令：

```bash
# 单独启动后端
uv run --package video-sum-service python -m video_sum_service

# 测试
uv run pytest                              # Python
npm test --prefix apps/desktop             # 桌面端
npm run typecheck --prefix apps/desktop    # 类型检查
```

代码风格：Python PEP 8 + 类型注解，TypeScript 严格模式 + 函数式组件，Commit 遵循 Conventional Commits。

<details>
<summary>改了代码但运行时还是旧逻辑？</summary>

```bash
uv run --package video-sum-service python -c "import video_sum_core, video_sum_service; print(video_sum_core.__file__); print(video_sum_service.__file__)"
```

如果输出不是仓库内的源码路径，重新执行 `uv sync --python 3.12 --all-packages`。
</details>

## 路线图

- [x] 思维导图视图
- [x] 本地视频导入与处理
- [x] 知识笔记 Markdown / Obsidian 导出
- [x] 知识库系统（RAG / 标签 / 知识网络）
- [x] B 站风控处理（扫码登录 / Cookies）
- [x] 多 P 视频批量处理与全集总结
- [x] GPU 运行时一键安装
- [x] macOS 桌面端与自动更新
- [x] Anthropic / Claude 原生 API
- [x] VLM 理解型图文笔记
- [x] 视觉模型多提供商独立配置
- [x] 多模态 ASR 与 FunASR（QwenASR）本地识别
- [ ] 更多平台支持
- [ ] Notion 等第三方工具集成

