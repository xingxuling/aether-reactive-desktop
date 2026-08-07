use windows::core::PCWSTR;
use windows::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyExW, RegDeleteValueW, RegSetValueExW, HKEY_CURRENT_USER, KEY_WRITE,
    REG_OPTION_NON_VOLATILE, REG_SZ,
};

const RUN_KEY: &str = "Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const VALUE_NAME: &str = "AetherReactiveDesktop";

pub fn set_launch_on_login(enabled: bool) -> Result<bool, String> {
    let subkey = wide(RUN_KEY);
    let value_name = wide(VALUE_NAME);
    let mut key = windows::Win32::System::Registry::HKEY::default();
    let result = unsafe {
        RegCreateKeyExW(
            HKEY_CURRENT_USER,
            PCWSTR(subkey.as_ptr()),
            None,
            PCWSTR::null(),
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            None,
            &mut key,
            None,
        )
    };
    if result.0 != 0 {
        return Err(format!("RegCreateKeyExW failed: {}", result.0));
    }

    let operation = if enabled {
        let executable = std::env::current_exe().map_err(|error| error.to_string())?;
        let command = format!("\"{}\" --background", executable.display());
        let data = wide(&command);
        let data_bytes =
            unsafe { std::slice::from_raw_parts(data.as_ptr() as *const u8, data.len() * 2) };
        let result = unsafe {
            RegSetValueExW(
                key,
                PCWSTR(value_name.as_ptr()),
                None,
                REG_SZ,
                Some(data_bytes),
            )
        };
        if result.0 != 0 {
            Err(format!("RegSetValueExW failed: {}", result.0))
        } else {
            Ok(())
        }
    } else {
        let result = unsafe { RegDeleteValueW(key, PCWSTR(value_name.as_ptr())) };
        if result.0 != 0 && result.0 != 2 {
            Err(format!("RegDeleteValueW failed: {}", result.0))
        } else {
            Ok(())
        }
    };
    unsafe {
        let _ = RegCloseKey(key);
    }
    operation.map(|_| enabled)
}

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}
