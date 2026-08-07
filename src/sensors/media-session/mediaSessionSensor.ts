import type { MediaState } from "../../core/reactive-state/types";

export function createMediaStateFromFile(fileName: string | null, now = new Date()): MediaState {
  const title = fileName?.replace(/.[^/.]+$/, "") || null;
  return {
    provider: "local-file",
    availability: title ? "partial" : "unavailable",
    title,
    artist: null,
    album: null,
    albumArtUrl: null,
    playbackStatus: title ? "playing" : "unknown",
    updatedAt: now.toISOString(),
  };
}

export function unavailableMediaState(now = new Date()): MediaState {
  return {
    provider: "none",
    availability: "unavailable",
    title: null,
    artist: null,
    album: null,
    albumArtUrl: null,
    playbackStatus: "unknown",
    updatedAt: now.toISOString(),
  };
}
