import { useEffect, useRef, useState } from "react";
import { VimeoPlayer } from "./VimeoPlayer";

type Props = {
  videoUrl: string | null;
  startAt?: number;
  onProgress?: (positionSeconds: number) => void;
  onEnded?: () => void;
  /** Exige um clique explícito antes de carregar/iniciar o embed interativo. */
  requireStart?: boolean;
  /** Título mostrado no cartão de início. */
  title?: string;
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
export function LessonMedia({ videoUrl, startAt = 0, onProgress, onEnded, requireStart = false, title }: Props) {
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
  return (
    <InteractiveEmbed
      url={videoUrl}
      startAt={startAt}
      onProgress={onProgress}
      requireStart={requireStart}
      title={title}
      key={videoUrl}
    />
  );
}

function InteractiveEmbed({
  url,
  startAt,
  onProgress,
  requireStart,
  title,
}: {
  url: string;
  startAt: number;
  onProgress?: (s: number) => void;
  requireStart?: boolean;
  title?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(!requireStart);
  const elapsedRef = useRef(startAt);

  useEffect(() => {
    elapsedRef.current = startAt;
    if (!onProgress || !started) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      elapsedRef.current += 15;
      onProgress(elapsedRef.current);
    }, 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, started]);

  if (!started) {
    return (
      <button
        onClick={() => setStarted(true)}
        className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6 hover:opacity-90 transition"
      >
        <span className="text-4xl">▶</span>
        <span className="text-base font-display">{title ?? "Aula interativa"}</span>
        <span className="text-sm player-muted">
          {startAt > 0 ? "Continuar de onde você parou" : "Clique para iniciar a aula"}
        </span>
      </button>
    );
  }

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