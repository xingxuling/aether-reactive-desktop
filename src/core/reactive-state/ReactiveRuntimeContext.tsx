import { createContext, useContext } from "react";
import type { ReactiveDesktopState, ReactiveStateEvent } from "./types";

export interface ReactiveRuntimeContextValue {
  state: ReactiveDesktopState;
  dispatch: (event: ReactiveStateEvent, broadcast?: boolean) => void;
  persistNow: () => Promise<boolean>;
}

export const ReactiveRuntimeContext = createContext<ReactiveRuntimeContextValue | null>(null);

export function useReactiveRuntime(): ReactiveRuntimeContextValue {
  const value = useContext(ReactiveRuntimeContext);
  if (!value) throw new Error("useReactiveRuntime must be used inside ReactiveRuntimeContext");
  return value;
}
