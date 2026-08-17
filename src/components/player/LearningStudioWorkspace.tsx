import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CourseComments } from "@/components/course/CourseComments";
import { CourseReviews } from "@/components/course/CourseReviews";

type Course = {
  id: string; slug: string; title: string; subtitle: string | null;
  description: string | null; instructor_name: string | null;
  level: string | null;
};

type Material = { id: string; title: string; file_url: string; kind: string | null };

type Tab = "sobre" | "materiais" | "discussao" | "avaliacao";

/**
 * Ambiente de estudo para cursos `delivery_type = 'learning_studio_embed'`.
 *
 * IMPORTANTE: este componente só é montado DEPOIS do gate de acesso da rota.
 * Ele não faz verificação própria e não deve ser renderizado especulativamente
 * — montar este componente equivale a criar o <iframe> no DOM.
 *
 * Também não simulamos módulos/aulas: o conteúdo pedagógico vive dentro do
 * LearningStudio e nós não temos API para inspecioná-lo (cross-origin).
 */
export function LearningStudioWorkspace({
  course,
  embedUrl,
  materials,
  lastAccessedAt,
}: {
  course: Course;
  embedUrl: string;
  materials: Material[];
  lastAccessedAt: string | null;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("sobre");
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* navegador pode negar; mantemos o layout normal */
    }
  };

  return (
    <div className="player-shell min-h-screen flex flex-col">
      <header className="flex items-center gap-3 px-4 lg:px-6 h-14 border-b player-border shrink-0">
        <Link
          to="/curso/$courseSlug"
          params={{ courseSlug: course.slug }}
          className="text-xs uppercase tracking-widest player-muted hover:opacity-80"
        >
          ← Detalhes
        </Link>
        <p className="font-display text-sm md:text-base truncate">{course.title}</p>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="text-xs px-3 py-1.5 rounded-full player-surface border player-border hover:opacity-90"
            aria-label="Alternar tela cheia"
          >
            ⛶ <span className="hidden sm:inline">Tela cheia</span>
          </button>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            className="text-xs px-3 py-1.5 rounded-full player-surface border player-border hover:opacity-90 whitespace-nowrap"
          >
            {panelOpen ? "Ocultar painel" : "Painel"}
            <span className="hidden md:inline">{panelOpen ? "" : " · Materiais · Discussão"}</span>
          </button>
        </div>
      </header>

      <div className={"flex-1 min-h-0 grid " + (panelOpen ? "lg:grid-cols-[1fr_380px]" : "grid-cols-1")}>
        <div
          ref={stageRef}
          className="relative bg-black min-h-0 h-[72vh] lg:h-auto"
        >
          {/* O iframe existe apenas aqui — depois do gate — e some ao desmontar a rota. */}
          <iframe
            src={embedUrl}
            title={course.title}
            className="w-full h-full border-0 block"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen; microphone; camera"
            allowFullScreen
          />
          {isFull && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-10 text-xs px-3 py-1.5 rounded-full bg-black/70 text-white border border-white/20"
            >
              Sair da tela cheia (Esc)
            </button>
          )}
        </div>

        {panelOpen && (
          <aside className="player-surface border-t lg:border-t-0 lg:border-l player-border flex flex-col min-h-0">
            <nav className="flex gap-1 p-2 border-b player-border overflow-x-auto">
              {([
                ["sobre", "Sobre"],
                ["materiais", "Materiais"],
                ["discussao", "Discussão"],
                ["avaliacao", "Avaliação"],
              ] as [Tab, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={
                    "text-xs px-3 py-1.5 rounded-full whitespace-nowrap " +
                    (tab === id ? "player-cta" : "player-muted hover:bg-white/5")
                  }
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="p-4 overflow-y-auto grow text-sm">
              {tab === "sobre" && (
                <div className="space-y-3">
                  {course.subtitle && <p className="font-display text-base">{course.subtitle}</p>}
                  {course.description && <p className="player-muted whitespace-pre-wrap">{course.description}</p>}
                  <ul className="pt-2 space-y-1 text-xs player-muted">
                    {course.instructor_name && <li>Instrutor: {course.instructor_name}</li>}
                    {course.level && <li>Nível: {course.level}</li>}
                    <li>
                      {lastAccessedAt
                        ? `Último acesso: ${new Date(lastAccessedAt).toLocaleString("pt-BR")}`
                        : "Primeiro acesso agora"}
                    </li>
                  </ul>
                  <p className="text-xs player-muted pt-2 border-t player-border">
                    A trilha de aulas, exercícios e certificação deste curso é conduzida dentro
                    do próprio ambiente interativo acima.
                  </p>
                </div>
              )}

              {tab === "materiais" && (
                materials.length ? (
                  <ul className="space-y-2">
                    {materials.map((m) => (
                      <li key={m.id}>
                        <a
                          href={m.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-lg border player-border px-3 py-2 hover:bg-white/5"
                        >
                          <span className="block">{m.title}</span>
                          {m.kind && <span className="text-xs player-muted uppercase">{m.kind}</span>}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="player-muted">Nenhum material complementar disponível neste curso.</p>
                )
              )}

              {tab === "discussao" && <CourseComments courseId={course.id} />}
              {tab === "avaliacao" && <CourseReviews courseId={course.id} canReview />}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
