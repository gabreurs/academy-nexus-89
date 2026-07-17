import { useEffect, useRef } from "react";
import Player from "@vimeo/player";

type Props = {
  videoUrl: string;
  startAt?: number;
  /** Fired at most once per `throttleMs` while playing. */
  onProgress?: (positionSeconds: number) => void;
  onEnded?: () => void;
  throttleMs?: number;
};

/**
 * Vimeo Player SDK wrapper.
 * `videoUrl` accepts any Vimeo link: https://vimeo.com/{id},
 * https://player.vimeo.com/video/{id}, or unlisted variants with a hash.
 */
export function VimeoPlayer({ videoUrl, startAt = 0, onProgress, onEnded, throttleMs = 10000 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const player = new Player(containerRef.current, {
      url: videoUrl as unknown as never,
      responsive: true,
      dnt: true,
    });

    let cancelled = false;
    player.ready().then(() => {
      if (cancelled) return;
      if (startAt && startAt > 1) player.setCurrentTime(startAt).catch(() => {});
    });

    const handleTime = (data: { seconds: number }) => {
      if (!onProgress) return;
      const now = Date.now();
      if (now - lastEmitRef.current >= throttleMs) {
        lastEmitRef.current = now;
        onProgress(data.seconds);
      }
    };
    const handleEnded = () => {
      onProgress?.(0);
      onEnded?.();
    };

    player.on("timeupdate", handleTime);
    player.on("ended", handleEnded);

    return () => {
      cancelled = true;
      player.off("timeupdate", handleTime);
      player.off("ended", handleEnded);
      player.destroy().catch(() => {});
    };
    // Recreate player when the video URL changes; other props are captured via refs/closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  return <div ref={containerRef} className="w-full h-full" />;
}

/**
 * Best-effort current-time getter for a Vimeo iframe already mounted in the DOM.
 * Kept for callers that need to persist progress on user-driven events
 * (e.g. "mark as completed" button) without waiting for the throttled tick.
 */
export async function getVimeoCurrentTime(container: HTMLElement | null): Promise<number> {
  if (!container) return 0;
  try {
    const p = new Player(container);
    const t = await p.getCurrentTime();
    return typeof t === "number" ? t : 0;
  } catch {
    return 0;
  }
}