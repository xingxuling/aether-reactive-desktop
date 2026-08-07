# Windows Build / Installer｜本机交付报告

日期：2026-08-07。状态：`WINDOWS_BUILD_VERIFIED`（本机）与 `BUILD_CANDIDATE`；`INSTALLER_VERIFIED` 未宣称。

## 本机产物

`npm run tauri build -- --ci` 完成 release EXE、MSI 和 NSIS 两种 bundle。

| 产物 | 大小 | SHA-256 | 结论 |
|---|---:|---|---|
| `src-tauri/target/release/bundle/msi/Aether Reactive Desktop_0.2.0_x64_en-US.msi` | 3,174,400 bytes | `2C45A68F758880CEB0D07CF1FC726CE167D02C081A4157C06DA7A9CBF7A039E9` | 本机生成 |
| `src-tauri/target/release/bundle/nsis/Aether Reactive Desktop_0.2.0_x64-setup.exe` | 2,114,533 bytes | `9CD7D20586120E103DB914EC9CB472044C584F119CF9864A87C9FB0748854771` | 本机生成 |

Release EXE 使用 `--background` 启动并保持存活 8 秒，随后由验证步骤停止；这证明当前机可启动，不等同于 clean VM、签名、SmartScreen、安装/升级/卸载或真实壁纸验收。

当前安装包是未签名本地构建，产物位于被忽略的 `src-tauri/target/`，不会被当成源码提交。
