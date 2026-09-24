"use client";

import { useCallback, useRef, useState } from "react";

/*
 * Shared control of an <audio> or <video> element: play state, a smoothly
 * updated current time, seeking, and playing just one range (HANDOFF §6.18
 * "Play" on a flagged moment).
 */

export interface MediaPlayback {
  /** Pass as the element's ref. */
  bind: (element: HTMLMediaElement | null) => void | (() => void);
  playing: boolean;
  time: number;
  duration: number;
  toggle: () => void;
  seek: (seconds: number) => void;
  playRange: (start: number, end: number) => void;
}

export function useMediaPlayback(knownDuration = 0): MediaPlayback {
  const element = useRef<HTMLMediaElement | null>(null);
  const stopAt = useRef<number | null>(null);
  const frame = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);

  const bind = useCallback((node: HTMLMediaElement | null) => {
    element.current = node;
    if (!node) return;

    const loop = () => {
      const t = node.currentTime;
      if (stopAt.current !== null && t >= stopAt.current) {
        stopAt.current = null;
        node.pause();
      }
      setTime(t);
      frame.current = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(loop);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(frame.current);
      setTime(node.currentTime);
    };
    const onMeta = () => {
      if (Number.isFinite(node.duration)) setMediaDuration(node.duration);
    };
    const onSeeked = () => setTime(node.currentTime);

    node.addEventListener("play", onPlay);
    node.addEventListener("pause", onPause);
    node.addEventListener("ended", onPause);
    node.addEventListener("loadedmetadata", onMeta);
    node.addEventListener("durationchange", onMeta);
    node.addEventListener("seeked", onSeeked);
    onMeta();
    return () => {
      cancelAnimationFrame(frame.current);
      node.removeEventListener("play", onPlay);
      node.removeEventListener("pause", onPause);
      node.removeEventListener("ended", onPause);
      node.removeEventListener("loadedmetadata", onMeta);
      node.removeEventListener("durationchange", onMeta);
      node.removeEventListener("seeked", onSeeked);
    };
  }, []);

  const duration = mediaDuration || knownDuration;

  const seek = useCallback(
    (seconds: number) => {
      const node = element.current;
      const target = Math.min(Math.max(0, seconds), duration || seconds);
      if (node) node.currentTime = target;
      setTime(target);
    },
    [duration],
  );

  const toggle = useCallback(() => {
    const node = element.current;
    if (!node) return;
    stopAt.current = null;
    if (node.paused) void node.play().catch(() => undefined);
    else node.pause();
  }, []);

  const playRange = useCallback(
    (start: number, end: number) => {
      const node = element.current;
      if (!node) return;
      seek(start);
      stopAt.current = end;
      void node.play().catch(() => undefined);
    },
    [seek],
  );

  return { bind, playing, time, duration, toggle, seek, playRange };
}
