# INTEGRATION_GUIDE.md

Guia prático para conectar o MVP da SíndicoLab Academy ao mundo real:
vídeos hospedados no Vimeo e webhooks de checkout externo (Kiwify e afins).

---

## 1. Vídeos no Vimeo

O player agora usa o **Vimeo Player SDK** (`@vimeo/player`) via iframe.
A coluna `course_lessons.video_url` aceita qualquer URL do Vimeo:

| Formato aceito                                        | Exemplo                                       |
| ----------------------------------------------------- | --------------------------------------------- |
| Página pública                                        | `https://vimeo.com/76979871`                  |
| Embed direto                                          | `https://player.vimeo.com/video/76979871`     |
| Vídeo **não listado** (com hash secreto)              | `https://vimeo.com/76979871/abc123def4`       |
| Vídeo **não listado** no formato embed                | `https://player.vimeo.com/video/76979871?h=abc123def4` |

### Trocar um vídeo de aula

1. Suba o vídeo real no Vimeo (idealmente com privacidade **"Não listado"** +
   domínio embed restrito ao seu domínio white label).
2. Copie a URL da página do vídeo.
3. Atualize `course_lessons.video_url`:

```sql
update public.course_lessons
set video_url = 'https://vimeo.com/SEU_ID/HASH'
where slug = 'aula-1';
```

### Como funciona o rastreio de progresso

O componente `src/components/player/VimeoPlayer.tsx`:

- Escuta o evento `timeupdate` do Vimeo Player e emite `onProgress(sec)` a
  cada 10 segundos (throttle), gravando `lesson_progress.position_seconds` e
  recalculando `course_progress.percent`.
- Escuta `ended` para marcar `lesson_progress.completed_at`.
- Ao carregar a aula, faz `player.setCurrentTime(startAt)` a partir do último
  `position_seconds` salvo — o aluno retoma exatamente de onde parou.

> Nenhum arquivo MP4 é servido diretamente. Trocar o provedor futuramente
> (YouTube, Cloudflare Stream, Bunny) é só substituir o componente do player;
> a lógica de progresso e a rota do banco não mudam.

---

## 2. Webhook de checkout externo

**Edge Function:** `checkout-webhook`
**URL:** `https://<project-ref>.supabase.co/functions/v1/checkout-webhook`

Ao receber uma notificação de compra aprovada, a função:

1. Resolve o curso pelo `course_slug`.
2. Resolve o comprador pelo e-mail — se ainda não existir, dispara
   `auth.admin.inviteUserByEmail` (fluxo de convite: o comprador define a
   senha ao clicar no link recebido).
3. Faz `upsert` em `course_entitlements` (idempotente por `user_id + course_id`).
4. Registra a operação em `audit_logs` com o `external_order_id`.

### Estado atual — MVP

A função já está no ar e aceita um **payload genérico** (formato próprio):

```http
POST /functions/v1/checkout-webhook
Content-Type: application/json
x-webhook-secret: <valor de CHECKOUT_WEBHOOK_SECRET>

{
  "event": "purchase.approved",
  "email": "buyer@example.com",
  "full_name": "Nome do Comprador",
  "course_slug": "atendimento-guarida",
  "external_order_id": "kw_TESTE_001",
  "source": "kiwify"
}
```

### Teste rápido com `curl`

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/checkout-webhook" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $CHECKOUT_WEBHOOK_SECRET" \
  -d '{
    "event": "purchase.approved",
    "email": "aluno@vista-alegre.demo",
    "course_slug": "atendimento-guarida",
    "external_order_id": "kw_TESTE_001",
    "source": "kiwify"
  }'
```

Retorno esperado: `{ "ok": true, "user_id": "...", "course_id": "..." }`.

### Segredos necessários

| Nome                        | Onde configurar                        | Uso                                              |
| --------------------------- | -------------------------------------- | ------------------------------------------------ |
| `CHECKOUT_WEBHOOK_SECRET`   | Backend → Edge Functions → Secrets     | Header `x-webhook-secret` (validação simples)    |
| `SUPABASE_SERVICE_ROLE_KEY` | já provisionado pelo Lovable Cloud     | Convite/criação de usuário + `course_entitlements` |
| `SUPABASE_URL`              | já provisionado                        | Cliente admin                                    |

### Quando a Kiwify liberar as credenciais reais

Substitua **apenas** o bloco de autenticação do webhook por uma verificação
de assinatura HMAC no formato que a Kiwify documentar (normalmente header
`X-Kiwify-Signature` + segredo do produto). O restante da função
(resolução de curso, convite, entitlement, auditoria) já está pronto e
não precisa mudar.

O mesmo endpoint atende Hotmart, Eduzz ou Stripe: basta mapear o payload
do provedor para o shape genérico acima antes de gravar o entitlement, ou
criar variantes (`checkout-webhook-kiwify`, `checkout-webhook-hotmart`)
que reaproveitam a mesma lógica.

---

## 3. Avaliações e comentários

- **Avaliações** (`course_reviews`): 1–5 estrelas + texto curto na página do
  curso. Nota média e contagem aparecem no topo da seção. Só quem tem acesso
  ao curso (entitlement/enrollment) vê o formulário; a RLS já rejeita quem
  tentar burlar o `WITH CHECK`.
- **Comentários por aula** (`lesson_comments`): abaixo do player. Comentários
  de usuários com papel `org_admin` ou `platform_admin` recebem badge
  destacado ("Instrutor" / "Equipe"), inspirado no padrão Kiwify/Hotmart.
  Admins também podem alternar `is_answered` para sinalizar dúvidas resolvidas.
---

## 3. Convite de usuário (`invite-user`)

Edge Function chamada pela tela **/empresa** (org admin) para convidar novos
usuários por e-mail real. Respeita o campo `organizations.user_limit`.

### Contrato

`POST /functions/v1/invite-user` (JWT obrigatório — o chamador precisa estar
logado como `org_admin` da organização alvo ou `platform_admin`).

```json
{
  "organization_id": "uuid",
  "email": "novo@empresa.com",
  "role": "student",              // ou "org_admin"
  "full_name": "Nome opcional"
}
```

### Fluxo

1. Valida caller via `is_platform_admin` / `has_org_role`.
2. Conta assentos usados = membros ativos (`student` + `org_admin`) + convites
   pendentes. Rejeita com **409 `user_limit_reached`** se atingido.
3. Se o e-mail já pertence a um `profiles`, apenas cria/atualiza o vínculo em
   `organization_memberships`.
4. Caso contrário, `auth.admin.inviteUserByEmail` envia o e-mail de convite e
   já registra o `organization_memberships` de forma otimista (o assento é
   contado imediatamente).
5. Grava `organization_invites` (idempotente por `org + email + pending`) e
   `audit_logs`.

### Aumentar o limite

O `platform_admin` altera `organizations.user_limit` diretamente em **/admin**
(coluna Limite, edita e sai do foco para salvar).

---

## Fronteira de identidade entre organizações (multi-tenant)

Cada organização é um white-label distinto — empresa própria, CNPJ próprio,
contrato próprio. A arquitetura compartilha o motor (mesmo banco, mesma
autenticação Supabase), mas a **experiência do usuário nunca pode dar a
impressão de que existe uma conta guarda-chuva atravessando marcas**.

### Regra de UI (implementada)

Quando o tenant resolvido para o host atual **não corresponde a nenhuma
organização** da qual o usuário logado é membro ativo, e o usuário **não é
`platform_admin`**, a aplicação trata a sessão, **naquele domínio**, como
se o visitante estivesse deslogado:

- O header não exibe nome/avatar/"Sair" nem os links de área autenticada
  ("Minha área", "Empresa", "Admin"); mostra apenas o CTA "Entrar" como
  para qualquer visitante público.
- As rotas sob `_authenticated/*` fazem `navigate("/", replace: true)` no
  cliente quando a fronteira é violada — o usuário cai na landing pública
  do tenant atual em vez de ver dados/atalhos da conta de outra marca.
- A sessão Supabase **não é destruída**: ela continua válida no domínio
  onde o usuário realmente pertence. O corte é puramente de apresentação
  nesse host.

Implementação: `src/lib/tenant/useTenantIdentity.ts` deriva
`hasTenantAccess = isPlatformAdmin || memberships.some(m => m.organization_id === tenant.id && m.is_active)`;
`SiteHeader` e o shell `_authenticated` consomem esse sinal.

### Compradores B2C (checkout externo) pertencem à organização plataforma

Comprador avulso que chega via `checkout-webhook` (Kiwify/Hotmart/etc.) recebe:

1. `course_entitlements` (user_id + course_id) — direito real ao curso.
2. `organization_memberships` na organização com `is_platform = true`
   (SíndicoLab), com `role = 'student'` e `is_active = true`. Upsert em
   `(organization_id, user_id)` — idempotente.

A membership na organização plataforma existe **exclusivamente para
satisfazer `hasTenantAccess` no domínio principal** (`play.sindicolab.com`).
Sem ela, o comprador B2C — que nunca foi convidado por nenhuma
administradora — seria tratado como visitante anônimo pela fronteira de
identidade e expulso de `/inicio`, mesmo tendo comprado.

Regra dura: **comprador B2C nunca é atribuído a uma organização de
white-label** (Guarida, Vista Alegre, etc.). Só passa a pertencer a uma
administradora se for **explicitamente convidado** por ela depois, via
`/empresa` (Edge Function `invite-user`). Isso preserva o isolamento
contratual entre marcas: a Guarida não ganha acesso à lista de compradores
B2C só porque compartilham motor.

#### Teste manual — comprador B2C após checkout

1. Configure `CHECKOUT_WEBHOOK_SECRET` no ambiente da Edge Function.
2. Dispare o webhook simulando venda aprovada:
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/checkout-webhook" \
     -H "content-type: application/json" \
     -H "x-webhook-secret: $CHECKOUT_WEBHOOK_SECRET" \
     -d '{
       "event": "purchase.approved",
       "email": "comprador.b2c@example.com",
       "full_name": "Comprador B2C",
       "course_slug": "gestao-financeira-condominios",
       "external_order_id": "test_manual_001",
       "source": "manual_test"
     }'
   ```
3. Aceite o convite recebido por e-mail (ou defina a senha via reset).
4. Acesse `play.sindicolab.com` (domínio principal / demo do tenant plataforma)
   e faça login com `comprador.b2c@example.com`.
5. Resultado esperado:
   - `/inicio` carrega normalmente (não redireciona como visitante).
   - A seção "Meus cursos comprados" mostra o curso liberado via entitlement.
   - Ao abrir um subdomínio de white-label (`guarida.sindicolab.com` ou
     `/demo/guarida`), o header volta ao modo visitante — comprador B2C
     não é membro da Guarida.

### Regra de produção (obrigatória — NÃO otimizar)

Quando os subdomínios reais entrarem no ar
(`guarida.sindicolab.com`, `vista-alegre.sindicolab.com`, etc.), a sessão do
Supabase Auth **NUNCA** deve ser configurada para ser compartilhada entre
subdomínios:

- **Não** definir cookie de sessão em domínio compartilhado
  (`.sindicolab.com`, `.dominio.com` etc.).
- **Não** persistir o access/refresh token em `localStorage` sob uma
  origem-pai; manter o comportamento default do Supabase JS
  (`localStorage` da própria origem/subdomínio).
- Cada subdomínio mantém sua própria sessão isolada — exatamente como o
  navegador já faz por padrão. Isso é feature, não bug: reforça a
  fronteira de identidade acima em nível de plataforma.

Esta escolha **não deve ser "otimizada"** no futuro em nome de single
sign-on entre marcas, a menos que exista uma decisão de negócio explícita
e deliberada (contratual, com Rafael e Mari) permitindo a experiência
guarda-chuva. Até lá, o padrão é: **uma sessão por white-label**.
