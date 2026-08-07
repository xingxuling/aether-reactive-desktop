# Windows Build / Installer｜本机交付报告

日期：2026-08-07。状态：`WINDOWS_BUILD_VERIFIED`（本机）、`INSTALLER_BUILT` 与 `INSTALLER_SMOKE_INSTALLED`；未宣称 clean VM、签名或完整安装验收。

## 本机产物

`npm run tauri build -- --ci` 完成 release EXE、MSI 和 NSIS 两种 bundle。

| 产物 | 大小 | SHA-256 | 结论 |
|---|---:|---|---|
| `src-tauri/target/release/bundle/msi/Aether Reactive Desktop_0.2.0_x64_en-US.msi` | 3,174,400 bytes | `35A65AF2CA183F258C5ED8AAA5FAAA27A309FC1B63ED71970A2DE22F4E6935B7` | 本机生成 |
| `src-tauri/target/release/bundle/nsis/Aether Reactive Desktop_0.2.0_x64-setup.exe` | 2,117,325 bytes | `A593A605AE47A2F07A833272BC0F81BCF0BAA9C610FF84163B657E35AAED6BB2` | 本机生成 |

Release EXE 使用 `--background` 启动并保持存活 8 秒，随后由验证步骤停止；本次修复后的 NSIS 安装器静默升级返回 exit code 0。以上证明当前机可构建与安装，不等同于 clean VM、签名、SmartScreen、完整安装/升级/卸载或真实壁纸验收。

当前安装包是未签名本地构建，产物位于被忽略的 `src-tauri/target/`，不会被当成源码提交。
