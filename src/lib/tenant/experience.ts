import type { ResolvedTenant } from "./types";

/**
 * MODELO DE EXPERIÊNCIA DA ACADEMY.
 *
 * Um único produto assume dois modelos comerciais:
 *
 *  - marketplace (B2C): a Academy é vitrine/descoberta; a apresentação
 *    institucional vive no site do próprio produto. `/` é storefront.
 *  - corporate  (B2B): a Academy pertence a uma empresa que dá acesso a
 *    um público autorizado. `/` precisa contextualizar antes da plataforma.
 *
 * Nada aqui é hardcode de organização: tudo deriva de campos do tenant.
 * Enquanto não existir coluna dedicada, `is_platform` decide o modelo e o
 * modo de acesso usa o default seguro (convite) — a arquitetura já aceita
 * os demais modos sem tocar em componente.
 */
export type AcademyType = "marketplace" | "corporate";
export type AccessMode = "purchase" | "invite_only" | "request_access" | "self_signup";
export type CatalogVisibility = "public" | "authenticated";

export type AcademyExperience = {
  type: AcademyType;
  accessMode: AccessMode;
  catalogVisibility: CatalogVisibility;
  /** Intensidade de marca sugerida por superfície (0–1), usada só para composição. */
  brandIntensity: { landing: number; catalog: number; learning: number; player: number };
  copy: {
    eyebrow: string;
    title: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    /** Frase de bloqueio quando o conteúdo exige vínculo. */
    gated: string;
    /** Como o acesso é concedido nesta Academy. */
    accessSteps: { title: string; description: string }[];
  };
};

const ACCESS_LABEL: Record<AccessMode, string> = {
  purchase: "Ver planos",
  invite_only: "Já tenho acesso",
  request_access: "Solicitar acesso",
  self_signup: "Criar meu cadastro",
};

function readMode(tenant: ResolvedTenant | null, type: AcademyType): AccessMode {
  const raw = (tenant?.organization as any)?.access_mode as string | undefined;
  if (raw && ["purchase", "invite_only", "request_access", "self_signup"].includes(raw)) {
    return raw as AccessMode;
  }
  return type === "marketplace" ? "purchase" : "invite_only";
}

export function resolveAcademyExperience(tenant: ResolvedTenant | null): AcademyExperience {
  const org = tenant?.organization;
  const type: AcademyType = org?.is_platform ? "marketplace" : "corporate";
  const accessMode = readMode(tenant, type);
  const name = org?.name ?? "Academy";
  const envName = tenant?.branding?.environment_name ?? `${name} Academy`;
  const title =
    tenant?.branding?.welcome_title ??
    (type === "marketplace"
      ? "Conhecimento para quem faz o condomínio funcionar."
      : "Conhecimento para uma gestão condominial cada vez melhor.");
  const lead =
    tenant?.branding?.welcome_message ??
    (type === "marketplace"
      ? "Cursos, trilhas e materiais produzidos com especialistas do mercado condominial."
      : `Programa educacional de ${name} para síndicos, conselheiros, colaboradores e parceiros.`);

  const accessSteps: Record<AccessMode, { title: string; description: string }[]> = {
    purchase: [
      { title: "Escolha um conteúdo", description: "Navegue pelo catálogo e veja o que faz sentido para o seu momento." },
      { title: "Garanta seu acesso", description: "A liberação é feita na sua conta assim que o acesso é confirmado." },
      { title: "Estude quando quiser", description: "Seu progresso fica salvo e você retoma de onde parou." },
    ],
    invite_only: [
      { title: "Receba o convite", description: `${name} libera o acesso para o público autorizado da Academy.` },
      { title: "Crie sua senha", description: "No primeiro acesso você define a senha e completa seu cadastro." },
      { title: "Comece a estudar", description: "Todo o acervo liberado para você aparece na sua área de estudos." },
    ],
    request_access: [
      { title: "Solicite acesso", description: "Envie sua solicitação informando seu vínculo com a empresa." },
      { title: "Aguarde a análise", description: `${name} confirma o vínculo e aprova a liberação.` },
      { title: "Acesse a Academy", description: "Você recebe o aviso de liberação e já pode estudar." },
    ],
    self_signup: [
      { title: "Crie seu cadastro", description: "O cadastro leva menos de um minuto." },
      { title: "Confirme seus dados", description: "Assim identificamos o acervo disponível para você." },
      { title: "Comece a estudar", description: "Os conteúdos liberados aparecem na sua área de estudos." },
    ],
  };

  return {
    type,
    accessMode,
    catalogVisibility: ((org as any)?.catalog_visibility as CatalogVisibility) ?? "public",
    brandIntensity:
      type === "marketplace"
        ? { landing: 0.7, catalog: 0.5, learning: 0.4, player: 0.15 }
        : { landing: 1, catalog: 0.6, learning: 0.45, player: 0.15 },
    copy: {
      eyebrow: envName,
      title,
      lead,
      primaryCta: type === "marketplace" ? "Explorar catálogo" : "Entrar na Academy",
      secondaryCta: ACCESS_LABEL[accessMode],
      gated:
        type === "marketplace"
          ? "Conteúdo disponível para alunos com acesso liberado."
          : `Conteúdo exclusivo para participantes da ${envName}.`,
      accessSteps: accessSteps[accessMode],
    },
  };
}
