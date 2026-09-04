# Apex 队友战绩助手

一个**完全独立于游戏**的 Apex Legends 队友战绩查看工具：不注入、不读内存、不 Hook，只通过公开 API 拉取战绩并显示。因为全程不碰游戏进程，所以不会被 Easy Anti-Cheat（EAC）当作外挂。

## 功能

- 输入 1–3 个队友的游戏昵称 + 平台（Steam / EA / PlayStation / Xbox），一键查询。
- 展示：等级、段位、K/D、击杀、场均伤害、胜场、总伤害、对局数、常用英雄 TOP。
- 隐私资料 / 查无此人时优雅提示。
- 双数据源可切换：Tracker Network（默认）与 Mozambique Here。
- API Key 仅保存在本机 `userData/config.json`，只发送给对应数据源官网。

## 环境要求

- Windows（Apex 主力平台）
- Node.js 18+（本机已用 Node 24 验证）

## 运行

```bash
npm install     # 安装依赖（含 Electron 二进制）
npm run dev     # 开发模式启动
```

> **网络受限时的 Electron 二进制**：若 `npm install` 在下载 Electron 二进制时失败（GitHub 不可达 / 证书问题），可用国内镜像：
>
> ```powershell
> $env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
> npm install
> # 或仅补下二进制：node node_modules/electron/install.js
> ```

打包发布：

```bash
npm run build   # 生成 out/ 目录
npm run start   # 预览构建产物
```

## 获取 API Key（首次使用前必做）

1. **Tracker Network**（推荐，默认数据源）：
   - 打开 <https://tracker.gg/developers> 注册并创建应用。
   - 在「设置」页填入你的 `TRN-Api-Key`。
2. **Mozambique Here**（可选，数据更全）：
   - 打开 <https://apexlegendsapi.com> 获取免费 key。
   - 在「设置」页填入，并切换数据源。

> 免费额度通常足够个人使用；两个数据源均需自行遵守其速率限制与使用条款。

## 目录结构

```
src/
├─ shared/types.ts          # 统一类型定义（主进程 / preload / 渲染进程共用）
├─ main/                    # Electron 主进程
│  ├─ index.ts              # 窗口创建 + IPC 处理
│  ├─ config.ts             # 本地配置读写
│  └─ providers/            # 数据源抽象层
│     ├─ index.ts           # 按配置选择 provider
│     ├─ trn.ts             # Tracker Network 实现
│     ├─ mozambique.ts      # Mozambique Here 实现
│     └─ utils.ts           # 数值解析工具
├─ preload/                 # contextBridge 安全桥
└─ renderer/                # React 渲染进程
   └─ src/
      ├─ App.tsx            # 主界面（查询 / 设置）
      └─ components/        # StatsCard / SettingsPanel
```

## 安全与合规

- 本工具是**独立的只读客户端**：仅发起 HTTPS 请求、显示数据，不读取/修改游戏内存、不注入 DLL、不 Hook 渲染、不模拟输入。
- 若后续需要「游戏内浮层」，请走 **Overwolf** 平台（与 EAC 官方合作/白名单），本项目的 React UI 与数据层可复用。
- 本工具与 EA / Respawn 无任何关联，非官方软件；请自行确认符合各数据源与游戏的服务条款，使用风险自负。

## 说明

- 战绩数据来自第三方公开 API，可能与游戏内实时数据存在延迟或差异。
- 部分玩家将资料设为隐私，此时无法查到战绩，属正常现象。
- Tracker Network 数据源中的段位按 RP 估算（阈值随赛季调整），Mozambique Here 数据源可返回精确段位与分段。
