use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};
use windows::Win32::Media::Audio::{
    eConsole, eRender, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator,
    AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
    AUDCLNT_STREAMFLAGS_LOOPBACK,
};
use windows::Win32::System::Com::{
    CoCreateInstance, CoInitializeEx, CoTaskMemFree, CoUninitialize, CLSCTX_ALL,
    COINIT_MULTITHREADED,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemAudioReport {
    pub status: String,
    pub available: bool,
    pub endpoint: Option<String>,
    pub sample_rate: Option<u32>,
    pub channels: Option<u16>,
    pub captured_frames: u64,
    pub non_zero_frames: u64,
    pub message: String,
    pub checked_at: String,
}

#[derive(Default)]
pub struct AudioController {
    stop: Mutex<Option<Arc<AtomicBool>>>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AudioReactiveEvent {
    volume: f32,
    smoothed_volume: f32,
    bass: f32,
    mid: f32,
    treble: f32,
    spectral_flux: f32,
    onset: f32,
    beat_candidate: bool,
    energy: f32,
    energy_delta: f32,
    frequency_bins: Vec<f32>,
    silence: bool,
    audio_active: bool,
    source: &'static str,
    capture_latency_ms: Option<f32>,
    dsp_latency_ms: Option<f32>,
    render_latency_ms: Option<f32>,
    total_visual_response_latency_ms: Option<f32>,
    track_name: Option<String>,
    updated_at: String,
}

pub fn start(app: AppHandle, controller: State<'_, AudioController>) -> SystemAudioReport {
    stop(controller.inner());
    let should_stop = Arc::new(AtomicBool::new(false));
    if let Ok(mut current) = controller.stop.lock() {
        *current = Some(should_stop.clone());
    }
    let thread_flag = should_stop.clone();
    thread::spawn(move || {
        if let Err(error) = capture_loop(app.clone(), thread_flag) {
            let _ = app.emit("aether:audio-error", error);
        }
    });
    SystemAudioReport {
        status: "candidate".to_string(),
        available: true,
        endpoint: Some("default-render / WASAPI shared loopback".to_string()),
        sample_rate: None,
        channels: None,
        captured_frames: 0,
        non_zero_frames: 0,
        message: "WASAPI loopback capture thread started. Non-zero PCM evidence is emitted as a Reactive Audio State event; full device matrix verification remains open.".to_string(),
        checked_at: now_label(),
    }
}

pub fn stop(controller: &AudioController) -> SystemAudioReport {
    if let Ok(mut current) = controller.stop.lock() {
        if let Some(flag) = current.take() {
            flag.store(true, Ordering::Relaxed);
        }
    }
    SystemAudioReport {
        status: "stopped".to_string(),
        available: true,
        endpoint: None,
        sample_rate: None,
        channels: None,
        captured_frames: 0,
        non_zero_frames: 0,
        message: "WASAPI loopback capture stopped.".to_string(),
        checked_at: now_label(),
    }
}

fn capture_loop(app: AppHandle, should_stop: Arc<AtomicBool>) -> Result<(), String> {
    let initialized = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
    if initialized.is_err() {
        return Err(format!("CoInitializeEx failed: {initialized:?}"));
    }
    let result = capture_loop_inner(&app, &should_stop);
    unsafe { CoUninitialize() };
    result
}

fn capture_loop_inner(app: &AppHandle, should_stop: &AtomicBool) -> Result<(), String> {
    let enumerator: IMMDeviceEnumerator =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) }
            .map_err(|error| format!("CoCreateInstance(MMDeviceEnumerator): {error}"))?;
    let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole) }
        .map_err(|error| format!("GetDefaultAudioEndpoint(eRender): {error}"))?;
    let client: IAudioClient = unsafe { device.Activate(CLSCTX_ALL, None) }
        .map_err(|error| format!("IMMDevice::Activate(IAudioClient): {error}"))?;
    let format = unsafe { client.GetMixFormat() }
        .map_err(|error| format!("IAudioClient::GetMixFormat: {error}"))?;
    let format_info = unsafe { *format };
    let channels = format_info.nChannels.max(1);
    let sample_rate = format_info.nSamplesPerSec.max(1);
    let block_align = format_info.nBlockAlign.max(1) as usize;
    let bits_per_sample = format_info.wBitsPerSample;
    let initialize_result = unsafe {
        client.Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
            100_000,
            0,
            format,
            None,
        )
    };
    if let Err(error) = initialize_result {
        unsafe { CoTaskMemFree(Some(format as *const core::ffi::c_void)) };
        return Err(format!("IAudioClient::Initialize(loopback): {error}"));
    }
    let capture: IAudioCaptureClient = unsafe { client.GetService() }
        .map_err(|error| format!("IAudioClient::GetService(IAudioCaptureClient): {error}"))?;
    unsafe { client.Start() }.map_err(|error| format!("IAudioClient::Start: {error}"))?;

    let mut previous_bins = vec![0.0f32; 32];
    let mut smoothed_volume = 0.0f32;
    let mut previous_energy = 0.0f32;
    let mut captured_frames = 0u64;
    let mut non_zero_frames = 0u64;
    let mut last_emit = Instant::now() - Duration::from_millis(100);
    let mut last_dsp = Duration::from_millis(0);

    while !should_stop.load(Ordering::Relaxed) {
        let packet_frames = unsafe { capture.GetNextPacketSize() }
            .map_err(|error| format!("IAudioCaptureClient::GetNextPacketSize: {error}"))?;
        if packet_frames == 0 {
            if last_emit.elapsed() >= Duration::from_millis(120) {
                let silent = reactive_event(
                    &[],
                    &previous_bins,
                    &mut smoothed_volume,
                    &mut previous_energy,
                    sample_rate,
                    channels,
                    "system-loopback",
                    last_dsp,
                );
                app.emit("aether:audio-reactive", silent)
                    .map_err(|error| error.to_string())?;
                last_emit = Instant::now();
            }
            thread::sleep(Duration::from_millis(8));
            continue;
        }

        let mut data: *mut u8 = core::ptr::null_mut();
        let mut frames = 0u32;
        let mut flags = 0u32;
        unsafe { capture.GetBuffer(&mut data, &mut frames, &mut flags, None, None) }
            .map_err(|error| format!("IAudioCaptureClient::GetBuffer: {error}"))?;
        let started = Instant::now();
        let byte_len = frames as usize * block_align;
        let bytes = if data.is_null() || flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32 != 0 {
            &[][..]
        } else {
            unsafe { core::slice::from_raw_parts(data, byte_len) }
        };
        let samples = decode_pcm(
            bytes,
            frames as usize,
            channels,
            bits_per_sample,
            block_align,
        );
        captured_frames += frames as u64;
        if samples.iter().any(|sample| sample.abs() > 0.002) {
            non_zero_frames += frames as u64;
        }
        let event = reactive_event(
            &samples,
            &previous_bins,
            &mut smoothed_volume,
            &mut previous_energy,
            sample_rate,
            channels,
            "system-loopback",
            started.elapsed(),
        );
        previous_bins = event.frequency_bins.clone();
        last_dsp = started.elapsed();
        unsafe { capture.ReleaseBuffer(frames) }
            .map_err(|error| format!("IAudioCaptureClient::ReleaseBuffer: {error}"))?;
        if last_emit.elapsed() >= Duration::from_millis(24) {
            app.emit("aether:audio-reactive", event)
                .map_err(|error| error.to_string())?;
            last_emit = Instant::now();
        }
    }

    let _ = unsafe { client.Stop() };
    unsafe { CoTaskMemFree(Some(format as *const core::ffi::c_void)) };
    let _ = (captured_frames, non_zero_frames);
    Ok(())
}

fn decode_pcm(
    bytes: &[u8],
    frames: usize,
    channels: u16,
    bits_per_sample: u16,
    block_align: usize,
) -> Vec<f32> {
    let channel_count = channels.max(1) as usize;
    let bytes_per_sample = (block_align / channel_count).max(1);
    let mut samples = Vec::with_capacity(frames);
    for frame in 0..frames {
        let mut total = 0.0f32;
        for channel in 0..channel_count {
            let offset = frame * block_align + channel * bytes_per_sample;
            let value = if offset + bytes_per_sample <= bytes.len()
                && bits_per_sample >= 32
                && bytes_per_sample >= 4
            {
                f32::from_le_bytes([
                    bytes[offset],
                    bytes[offset + 1],
                    bytes[offset + 2],
                    bytes[offset + 3],
                ])
            } else if offset + 2 <= bytes.len() && bits_per_sample >= 16 {
                i16::from_le_bytes([bytes[offset], bytes[offset + 1]]) as f32 / 32768.0
            } else {
                0.0
            };
            total += value;
        }
        samples.push((total / channel_count as f32).clamp(-1.0, 1.0));
    }
    samples
}

fn reactive_event(
    samples: &[f32],
    previous_bins: &[f32],
    smoothed_volume: &mut f32,
    previous_energy: &mut f32,
    _sample_rate: u32,
    _channels: u16,
    source: &'static str,
    dsp_duration: Duration,
) -> AudioReactiveEvent {
    let bins = dft_bins(samples, 32);
    let volume = if samples.is_empty() {
        0.0
    } else {
        (samples.iter().map(|sample| sample * sample).sum::<f32>() / samples.len() as f32)
            .sqrt()
            .clamp(0.0, 1.0)
    };
    let attack = if volume >= *smoothed_volume {
        0.42
    } else {
        0.12
    };
    *smoothed_volume += (volume - *smoothed_volume) * attack;
    let bass = average(&bins, 0.0, 0.2);
    let mid = average(&bins, 0.2, 0.62);
    let treble = average(&bins, 0.62, 1.0);
    let energy = (bass * 0.5 + mid * 0.34 + treble * 0.16).clamp(0.0, 1.0);
    let spectral_flux = bins
        .iter()
        .enumerate()
        .map(|(index, value)| (value - previous_bins.get(index).copied().unwrap_or(0.0)).max(0.0))
        .sum::<f32>()
        / bins.len().max(1) as f32;
    let onset = (spectral_flux * 4.2).clamp(0.0, 1.0);
    let now = now_label();
    let event = AudioReactiveEvent {
        volume,
        smoothed_volume: *smoothed_volume,
        bass,
        mid,
        treble,
        spectral_flux: spectral_flux.clamp(0.0, 1.0),
        onset,
        beat_candidate: onset > 0.54 && energy > 0.12,
        energy,
        energy_delta: energy - *previous_energy,
        frequency_bins: bins,
        silence: *smoothed_volume < 0.035,
        audio_active: *smoothed_volume >= 0.035,
        source,
        capture_latency_ms: None,
        dsp_latency_ms: Some(dsp_duration.as_secs_f32() * 1000.0),
        render_latency_ms: None,
        total_visual_response_latency_ms: None,
        track_name: None,
        updated_at: now,
    };
    *previous_energy = energy;
    event
}

fn dft_bins(samples: &[f32], count: usize) -> Vec<f32> {
    if samples.is_empty() {
        return vec![0.0; count];
    }
    (0..count)
        .map(|index| {
            let frequency = (index + 1) as f32 / (count as f32 * 1.7);
            let mut real = 0.0f32;
            let mut imaginary = 0.0f32;
            for (sample_index, sample) in samples.iter().enumerate() {
                let angle = std::f32::consts::TAU * frequency * sample_index as f32;
                real += sample * angle.cos();
                imaginary -= sample * angle.sin();
            }
            (real.mul_add(real, imaginary * imaginary).sqrt() / (samples.len() as f32 * 0.42))
                .clamp(0.0, 1.0)
        })
        .collect()
}

fn average(values: &[f32], start: f32, end: f32) -> f32 {
    let first = (values.len() as f32 * start).floor() as usize;
    let last = ((values.len() as f32 * end).ceil() as usize)
        .max(first + 1)
        .min(values.len());
    values[first.min(values.len())..last].iter().sum::<f32>()
        / (last.saturating_sub(first.min(values.len())).max(1) as f32)
}

fn now_label() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
