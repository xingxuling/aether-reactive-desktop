# Living Album Cover｜媒体会话报告

状态：`BLOCKED / PARTIAL`。

- 前端 `MediaState` 已统一标题、艺术家、专辑、封面 URL、播放状态和 provider。
- Local File 模式会产生本地文件名元数据；没有元数据时继续使用 Generic Cover，不停止 Music Halo。
- Rust 目前只返回 GSMTC 边界报告，没有把 WinRT GSMTC 对象桥接成已验证 provider。
- 因此 UI 会显示 `GSMTC: metadata provider status is reported honestly`，不会把占位数据标成真实专辑信息。
