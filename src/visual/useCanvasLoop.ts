import { useEffect, type RefObject } from "react";

interface CanvasLoopOptions {
  paused?: boolean;
  ecoMode?: boolean;
}

export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement>,
  draw: (context: CanvasRenderingContext2D, width: number, height: number, time: number) => void,
  options: CanvasLoopOptions = {},
): void {
  const { paused = false, ecoMode = false } = options;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    let frame = 0;
    let lastFrame = 0;
    let running = true;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(rect.height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = (now: number) => {
      if (!running) return;
      const minFrameGap = 1000 / (ecoMode ? 26 : 60);
      if (!paused && now - lastFrame >= minFrameGap) {
        lastFrame = now;
        const rect = canvas.getBoundingClientRect();
        draw(context, rect.width, rect.height, now / 1000);
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [canvasRef, draw, ecoMode, paused]);
}

export function seededNoise(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
