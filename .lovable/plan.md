
# Plano técnico — SíndicoLab Academy (MVP funcional multi-tenant)

## Confirmações da Seção 0

- **Stack**: TanStack Start v1 + Vite 7 + Supabase (via Lovable Cloud). Framework mantido; comportamento final = SPA estática.
- **(a) `ssr: false` em todas as rotas**: aplicado em `__root.tsx` e em cada `createFileRoute(...)` (público, aluno, empresa, admin). Zero rotas SSR.
- **(b) Sem `createServerFn` e sem `src/routes/api/`**: nenhuma lógica de negócio no runtime do TanStack. Toda leitura/escrita do app roda no cliente contra o Supabase (com RLS como barreira real).
- **(c) Lógica privilegiada → Supabase Edge Functions** (mapeadas abaixo). `service_role` só existe dentro dessas Edge Functions.
- **(d) Build 100% estática**: saída de `bun run build` contém apenas HTML/CSS/JS/assets, publicável em Hostinger/qualquer host de arquivos estáticos. Documentado no `INTEGRATION_GUIDE.md` (inclui fallback SPA `index.html` e requisito de wildcard DNS + SSL para multi-tenant por hostname).

### Limitação estrutural conhecida (honesta)

TanStack Start é um framework SSR-first. Configurando `ssr:false` em todas as rotas obtemos uma SPA client-rendered, mas o **build padrão do template** ainda emite um handler de servidor (nitro/worker) para o entrypoint. Para hospedagem puramente estática precisamos:
1. Manter `ssr:false` em todas as rotas (garante que o HTML servido é uma shell vazia + JS).
2. Publicar apenas os assets client (`dist/client/`) na Hostinger, ignorando o bundle `.output/server`.
3. Configurar redirect universal `/* → /index.html` na hospedagem.

Isso é documentado no INTEGRATION_GUIDE. É viável e é o caminho aceito.

---

## Edge Functions (única superfície privilegiada)

| Função | Papel | Usa service_role? |
|---|---|---|
| `invite-user` | Admin de empresa/plataforma convida usuário (cria auth user, membership, envia magic link) | Sim |
| `accept-invite` | Valida token, cria/atualiza profile, vincula membership | Sim |
| `grant-course-access` | Admin plataforma concede entitlement (simula compra) | Sim |
| `import-users-csv` | Importa lote CSV para uma organização | Sim |
| `checkout-webhook` (stub) | Endpoint futuro Kiwify — documentado, não implementado ativamente | Sim |

Todo o resto (leitura de catálogo, progresso, avaliações, comentários, dashboards) é **cliente → Supabase com RLS**.

---

## Mapa de tabelas

`organizations`, `organization_domains`, `organization_branding`, `profiles`, `organization_memberships`, `organization_invites`, `plans`, `organization_subscriptions`, `course_categories`, `courses`, `course_modules`, `course_lessons`, `course_materials`, `organization_course_catalog`, `course_entitlements`, `enrollments`, `lesson_progress`, `course_progress`, `course_reviews`, `lesson_comments`, `audit_logs`.

Enum `app_role`: `platform_admin`, `org_admin`, `student`. Roles em `organization_memberships(user_id, org_id, role)` — nunca em `profiles`.

Função SECURITY DEFINER `has_org_role(user_id, org_id, role)` e `is_platform_admin(user_id)` para uso em políticas RLS.

## Mapa de papéis

- **platform_admin** (SíndicoLab): CRUD global (organizações, cursos, catálogo, acessos, moderação).
- **org_admin** (Guarida etc.): visualiza/convida/desativa usuários da própria org; leitura do catálogo contratado; leitura de progresso/avaliações da org.
- **student**: acessa apenas o próprio progresso; catálogo da própria org; conteúdo conforme entitlement.

## Mapa de rotas (todas `ssr:false`)

Públicas: `/`, `/catalogo`, `/curso/$courseSlug`, `/login`, `/esqueci-minha-senha`, `/definir-senha`, `/acesso-negado`, `/demo/$tenantSlug` (preview).

Aluno (`_authenticated`): `/inicio`, `/minha-aprendizagem`, `/curso/$courseSlug/aprender`, `/curso/$courseSlug/aula/$lessonSlug`, `/perfil`.

Empresa (`_authenticated/_org`): `/empresa`, `/empresa/usuarios`, `/empresa/convites`, `/empresa/progresso`, `/empresa/catalogo`, `/empresa/avaliacoes`.

Plataforma (`_authenticated/_platform`): `/admin`, `/admin/organizacoes`, `/admin/organizacoes/$id`, `/admin/cursos`, `/admin/cursos/$id`, `/admin/usuarios`, `/admin/acessos`, `/admin/comentarios`, `/admin/avaliacoes`.

## Mapa RLS (resumo)

- `organizations`: SELECT para membros; UPDATE para `platform_admin`.
- `organization_memberships`: usuário vê os próprios; `org_admin` vê os da própria org; `platform_admin` vê tudo.
- `courses`: SELECT se global OU exclusivo da própria org OU `platform_admin`. INSERT/UPDATE só `platform_admin`.
- `organization_course_catalog`: SELECT membros da org; escrita `platform_admin`.
- `course_entitlements` / `enrollments`: usuário vê os próprios; `org_admin` vê os da org; `platform_admin` vê tudo.
- `lesson_progress` / `course_progress`: usuário vê/edita só os próprios; `org_admin` lê agregado da org (via RPC).
- `course_reviews` / `lesson_comments`: leitura escopada por org do autor; escrita/edição do próprio; moderação por admin.
- `audit_logs`: só `platform_admin` lê; escrita via SECURITY DEFINER.

Toda tabela `public.*` recebe `GRANT` explícito ao role apropriado (`authenticated`, `service_role`, e `anon` só onde há SELECT público — cursos públicos, branding, domínios).

## Multi-tenant

Resolução 100% client-side:
1. `useTenant()` lê `window.location.hostname`;
2. Fallback demo: `/demo/$slug`, query `?tenant=`, ou seletor visível apenas a `platform_admin`;
3. Query em `organization_domains` retorna org; branding é injetado como CSS vars no `<html>`;
4. Demo **muda só visualização** — RLS continua governando dados.

## Escopo do MVP (o que realmente será construído)

Dado o volume do briefing (~30 seções), o MVP entregará **a arquitetura completa + fluxos funcionais end-to-end**, priorizando profundidade sobre variedade:

**Núcleo completo e funcional:**
- Schema completo + RLS + seed com 3 orgs (SíndicoLab, Guarida, Vista Alegre Administradora), 5 cursos condominiais, módulos/aulas, entitlements variados.
- Auth real (login, recuperar senha, definir senha, logout, rotas protegidas).
- Resolução de tenant + branding dinâmico via CSS vars.
- Catálogo, página de curso, player MP4 real com progresso persistido.
- Avaliações e comentários com CRUD real.
- Painel empresa (usuários, convites, progresso, catálogo).
- Painel plataforma (orgs, cursos, acessos manuais, preview white-label switcher).
- Edge Functions: `invite-user`, `accept-invite`, `grant-course-access`.
- INTEGRATION_GUIDE.md com deploy Hostinger + wildcard DNS + trade-off OG.

**Simplificado honestamente (documentado como próximo passo):**
- Import CSV: UI presente, parsing simples (sem validação industrial).
- Auditoria: tabela + escritas nos pontos-chave; sem UI de consulta rica.
- Moderação de comentários: soft-delete/ocultar; sem workflow complexo.
- Editor de branding: read-only no painel da empresa; edição só via admin plataforma.
- Checkout externo: campo + botão redirecionador; webhook Kiwify documentado, não implementado.
- Materiais de aula: link/download simples.

## Ordem de implementação

1. Habilitar Lovable Cloud.
2. Migrations: schema + RLS + grants + funções auxiliares + seed.
3. `ssr:false` global + estrutura de pastas (`src/features/*`, `src/lib/tenant`, `src/lib/permissions`).
4. Auth + rotas protegidas + `_authenticated` layout.
5. Tenant resolver + design tokens dinâmicos.
6. Catálogo + página do curso.
7. Player + progresso.
8. Avaliações + comentários.
9. Painel empresa.
10. Painel plataforma + preview switcher.
11. Edge Functions (invite/accept/grant).
12. INTEGRATION_GUIDE.md + README com credenciais de demo.
13. Verificação: build estática limpa, RLS testada com cenários cross-tenant.

## Aviso importante sobre expectativa

Este briefing descreve uma plataforma que, feita com profundidade real, é um projeto de várias semanas. Vou entregar o MVP funcional descrito acima em uma sequência de mensagens — não em uma única resposta. Cada bloco (schema, auth, tenant, player, painéis, edge functions) será uma etapa verificável. Serei explícito sobre o que ficou funcional vs. simplificado ao final.

**Confirma para eu começar pela Etapa 1 (habilitar Lovable Cloud + migrations de schema/RLS/seed)?**
