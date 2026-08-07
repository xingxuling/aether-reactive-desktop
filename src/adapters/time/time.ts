import type { TimePhase, TimeState } from "../../core/types";

export function getTimeState(date = new Date()): TimeState {
  const hour = date.getHours();
  const minute = date.getMinutes();
  let phase: TimePhase;
  if (hour >= 6 && hour < 8) phase = "dawn";
  else if (hour >= 8 && hour < 18) phase = "day";
  else if (hour >= 18 && hour < 20) phase = "dusk";
  else phase = "night";

  const dayProgress = (hour * 60 + minute) / (24 * 60);
  return {
    iso: date.toISOString(),
    hour,
    minute,
    phase,
    label: phase === "dawn" ? "晨光" : phase === "day" ? "白昼" : phase === "dusk" ? "暮色" : "夜航",
    isDay: phase === "dawn" || phase === "day" || phase === "dusk",
    dayProgress,
  };
}

export function formatClock(time: Pick<TimeState, "hour" | "minute">): string {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}
