import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { analyzePcmWindow } from "../../sensors/audio/audioDsp";
import { createMediaStateFromFile } from "../../sensors/media-session/mediaSessionSensor";
import type { AudioReactiveState, MediaState } from "../../core/reactive-state/types";

interface LocalAudioPlayerProps {
  onAudio: (state: AudioReactiveState) => void;
  onMedia: (state: MediaState) => void;
}

export function LocalAudioPlayer({ onAudio, onMedia }: LocalAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const graphRef = useRef<{ context: AudioContext; analyser: AnalyserNode } | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const previousBinsRef = useRef<number[]>([]);
  const fileNameRef = useRef<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState("选择一个本地音频文件");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !window.AudioContext) return undefined;
    if (!graphRef.current) {
      const context = new window.AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.64;
      const source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);
      graphRef.current = { context, analyser };
    }
    const graph = graphRef.current;
    const samples = new Float32Array(graph.analyser.fftSize);
    let animationFrame = 0;
    const sample = () => {
      // An empty local player must not overwrite system audio or an explicit
      // Demo Pulse with a synthetic zero-volume local-file state.
      if (fileNameRef.current) {
        graph.analyser.getFloatTimeDomainData(samples);
        const next = analyzePcmWindow(samples, previousBinsRef.current, "local-file", fileNameRef.current);
        previousBinsRef.current = next.frequencyBins;
        onAudio({ ...next, audioActive: !audio.paused && !next.silence, source: "local-file" });
      }
      animationFrame = window.requestAnimationFrame(sample);
    };
    const onPlay = () => {
      void graph.context.resume();
      setMessage("本地文件正在驱动场景");
    };
    const onPause = () => setMessage("本地文件已暂停，桌面保持环境呼吸");
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    animationFrame = window.requestAnimationFrame(sample);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [onAudio]);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !audioRef.current) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    fileNameRef.current = file.name;
    setFileName(file.name);
    setMessage("已载入，播放后开始响应");
    audioRef.current.src = objectUrlRef.current;
    audioRef.current.load();
    onMedia(createMediaStateFromFile(file.name));
  };

  return (
    <div className="local-audio-player">
      <label className="file-picker">
        <input type="file" accept="audio/*,.flac,.m4a" onChange={onFile} />
        <span className="file-picker-icon">∿</span>
        <span><strong>{fileName ?? "加入本地音频"}</strong><small>{message}</small></span>
      </label>
      <audio ref={audioRef} controls preload="metadata" />
    </div>
  );
}
