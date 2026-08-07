import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeFrequencyBands, smoothAmplitude } from "../../adapters/audio/audioAnalyzer";
import type { AudioMetrics } from "../../core/types";

const SUPPORTED_EXTENSIONS = [".mp3", ".wav", ".flac", ".ogg", ".m4a"];

interface AudioGraph {
  context: AudioContext;
  analyser: AnalyserNode;
}

export function useAudioAnalyzer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const graphRef = useRef<AudioGraph | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileNameRef = useRef<string | null>(null);
  const [metrics, setMetrics] = useState<AudioMetrics>({ energy: 0, low: 0, mid: 0, high: 0, amplitude: 0, frequency: [], isPlaying: false, fileName: null });
  const [status, setStatus] = useState("等待一段声音");
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) {
      setStatus("当前 WebView 不提供音频分析");
      return undefined;
    }
    if (!graphRef.current) {
      const context = new AudioContextCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      const source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);
      graphRef.current = { context, analyser };
    }
    const { context, analyser } = graphRef.current;
    contextRef.current = context;
    analyserRef.current = analyser;
    const frequency = new Uint8Array(analyser.frequencyBinCount);
    let animationFrame = 0;
    let previousAmplitude = 0;

    const sample = () => {
      analyser.getByteFrequencyData(frequency);
      const next = analyzeFrequencyBands(frequency, fileNameRef.current, !audio.paused);
      previousAmplitude = smoothAmplitude(previousAmplitude, next.amplitude);
      setMetrics({ ...next, amplitude: previousAmplitude, isPlaying: !audio.paused });
      animationFrame = requestAnimationFrame(sample);
    };
    const onPlay = () => {
      void context.resume();
      setStatus("正在把声音编译成光");
    };
    const onPause = () => setStatus("光环暂停，声音还在这里");
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    animationFrame = requestAnimationFrame(sample);
    return () => {
      cancelAnimationFrame(animationFrame);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
      setStatus("请拖入 MP3、WAV、FLAC、OGG 或 M4A");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    fileNameRef.current = file.name;
    setFileName(file.name);
    setStatus("已载入，按播放让它醒来");
    const audio = audioRef.current;
    if (audio) {
      audio.src = objectUrlRef.current;
      audio.load();
    }
  }, []);

  return { audioRef, handleFile, metrics, fileName, status };
}
