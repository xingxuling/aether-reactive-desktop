# Aether Reactive Desktop v0.2｜工程治理记录

## 结构识别

本轮任务不是给 v0.1 增加更多桌面玩具，而是把“桌面对真实环境产生反应”编译成可测试的运行时和 Windows 边界。权威顺序保持为：输入传感器 → `ReactiveDesktopState` → Scene projection → native host / visual surface。

## 约束

- Windows 原生能力与 React UI 解耦；Win32 不进入 React 组件。
- WorkerW、WASAPI、GSMTC、Aura、clean VM 和签名必须分别举证。
- 没有真实收据的能力只能标记为 CANDIDATE、BLOCKED 或 NOT CLAIMED。
- 旧模块只迁移、不删除；Pocket World 的确定性资产保留。
- 本地优先：不上传声音、窗口标题、项目路径或账号状态。

## 本轮执行顺序

Runtime → legacy 处置 → Scene/compositor → sensors → Windows adapters → UI → tests/build → evidence → 独立 GitHub repository。
