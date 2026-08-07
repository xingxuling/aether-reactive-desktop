use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaSessionReport {
    pub status: String,
    pub provider: String,
    pub message: String,
    pub checked_at: String,
}

pub fn report(checked_at: String) -> MediaSessionReport {
    MediaSessionReport {
        status: "blocked".to_string(),
        provider: "Global System Media Transport Controls (GSMTC)".to_string(),
        message: "v0.2 keeps the GSMTC boundary explicit; a complete WinRT metadata bridge is not yet verified in this Tauri process. Music Halo continues with Generic Cover or Local File metadata instead of stopping.".to_string(),
        checked_at,
    }
}
