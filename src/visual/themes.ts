import type { ThemeId } from "../core/types";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  accent: string;
  accentSoft: string;
  skyTop: string;
  skyBottom: string;
  ground: string;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  "deep-sky": {
    id: "deep-sky",
    label: "深空",
    accent: "#73c9ff",
    accentSoft: "rgba(115, 201, 255, .25)",
    skyTop: "#050b1a",
    skyBottom: "#1b3761",
    ground: "#071226",
  },
  dawn: {
    id: "dawn",
    label: "晨曦",
    accent: "#ffdca6",
    accentSoft: "rgba(255, 220, 166, .24)",
    skyTop: "#261a2a",
    skyBottom: "#b56e70",
    ground: "#1d182b",
  },
  aurora: {
    id: "aurora",
    label: "极光",
    accent: "#9ce6cf",
    accentSoft: "rgba(156, 230, 207, .25)",
    skyTop: "#071b24",
    skyBottom: "#254f68",
    ground: "#07171d",
  },
};

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES[id] ?? THEMES["deep-sky"];
}
