import { useEffect, useRef, useState } from "react";
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const player = new Player(containerRef.current, {
      url: videoUrl as unknown as never,
      responsive: true,
      dnt: true,
    });

    let cancelled = false;
    setFailed(false);
    player
      .ready()
      .then(() => {
        if (cancelled) return;
        if (startAt && startAt > 1) player.setCurrentTime(startAt).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
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

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center player-muted text-sm text-center px-6">
          Vídeo indisponível no momento.
        </div>
      )}
    </div>
  );
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