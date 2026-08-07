import { createContext, useContext } from "react";
import type { AetherEvent, AetherState, SelectedToy } from "../types";

export interface RuntimeContextValue {
  state: AetherState;
  publish: (event: AetherEvent, options?: { broadcast?: boolean }) => void;
  selectToy: (toy: SelectedToy) => void;
  openTreeSpirit: (alwaysOnTop?: boolean) => Promise<void>;
  persistNow: () => Promise<boolean>;
}

export const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function useRuntime(): RuntimeContextValue {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("useRuntime must be used inside RuntimeContext");
  return value;
}
