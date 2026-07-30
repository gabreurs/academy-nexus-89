import { useEffect, useRef, useState } from "react";
import { VimeoPlayer } from "./VimeoPlayer";

type Props = {
  videoUrl: string | null;
  startAt?: number;
  onProgress?: (positionSeconds: number) => void;
  onEnded?: () => void;
};

function isVimeo(url: string) {
  return /vimeo\.com/i.test(url);
}

/**
 * Escolhe o player correto para a aula:
 * - Vimeo -> SDK com rastreio de progresso nativo
 * - Qualquer outro embed (ex.: Learning Studio AI) -> iframe interativo
 *   com rastreio de tempo de permanência na aula.
 */
export function LessonMedia({ videoUrl, startAt = 0, onProgress, onEnded }: Props) {
  if (!videoUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center player-muted text-sm">
        Conteúdo em preparação.
      </div>
    );
  }
  if (isVimeo(videoUrl)) {
    return <VimeoPlayer videoUrl={videoUrl} startAt={startAt} onProgress={onProgress} onEnded={onEnded} />;
  }
  return <InteractiveEmbed url={videoUrl} startAt={startAt} onProgress={onProgress} />;
}

function InteractiveEmbed({
  url,
  startAt,
  onProgress,
}: {
  url: string;
  startAt: number;
  onProgress?: (s: number) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const elapsedRef = useRef(startAt);

  useEffect(() => {
    elapsedRef.current = startAt;
    if (!onProgress) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      elapsedRef.current += 15;
      onProgress(elapsedRef.current);
    }, 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center player-muted text-sm">
          Carregando aula interativa…
        </div>
      )}
      <iframe
        src={url}
        title="Aula interativa"
        className="w-full h-full border-0"
        onLoad={() => setLoaded(true)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
      />
    </div>
  );
}