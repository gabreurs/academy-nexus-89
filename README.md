# SíndicoLab Academy — MVP White Label

Plataforma educacional multi-tenant construída em TanStack Start (modo SPA, `ssr: false` global) sobre Lovable Cloud (Supabase). Toda lógica privilegiada roda no banco via RLS + funções `SECURITY DEFINER`; nenhum código do cliente carrega chaves de serviço.

## Contas de demonstração

Os usuários de demo **não podem** ser criados por migration (o schema `auth` é gerenciado). Crie-os manualmente pelo painel de autenticação do Lovable Cloud e depois vincule cada um à organização correta rodando o SQL abaixo.

### 1. Criar os usuários no painel de autenticação

Para cada linha da tabela, use **"Add user → Create new user"** com **"Auto-confirm email" marcado** (assim você já consegue logar sem clicar em link de e-mail):

| Papel                | E-mail                             | Senha (demo)      | Organização                    |
| -------------------- | ---------------------------------- | ----------------- | ------------------------------ |
| `platform_admin`     | `admin@sindicolab.demo`            | `SindicoLab#2026` | SíndicoLab                     |
| `org_admin`          | `admin@guarida.demo`               | `Guarida#2026`    | Guarida Administradora         |
| `student`            | `aluno@vista-alegre.demo`          | `Vista#2026`      | Vista Alegre Administradora    |

> Essas credenciais são apenas para a demonstração local com Rafael e Mari. Nunca reaproveite em produção.

### 2. Vincular cada usuário à organização (SQL)

Depois que os três usuários existirem em `auth.users`, execute este bloco (ele resolve o `user_id` pelo e-mail, então não depende de UUID copiado à mão):

```sql
insert into public.organization_memberships (user_id, organization_id, role, is_active)
select u.id, '11111111-1111-1111-1111-111111111111', 'platform_admin', true
from auth.users u where u.email = 'admin@sindicolab.demo'
on conflict (user_id, organization_id, role) do nothing;

insert into public.organization_memberships (user_id, organization_id, role, is_active)
select u.id, '22222222-2222-2222-2222-222222222222', 'org_admin', true
from auth.users u where u.email = 'admin@guarida.demo'
on conflict (user_id, organization_id, role) do nothing;

insert into public.organization_memberships (user_id, organization_id, role, is_active)
select u.id, '33333333-3333-3333-3333-333333333333', 'student', true
from auth.users u where u.email = 'aluno@vista-alegre.demo'
on conflict (user_id, organization_id, role) do nothing;
```

> O trigger `handle_new_user` já cria o registro em `public.profiles` automaticamente na criação do usuário.

### 3. Cenário de teste de isolamento

Logado como `aluno@vista-alegre.demo` (Vista Alegre):

1. Acessar `/curso/atendimento-guarida` → o card lateral deve mostrar **"Curso indisponível no catálogo da sua organização"** e a listagem de módulos/aulas exclusivas da Guarida NÃO deve aparecer (bloqueado pelo RLS `modules_read` / `lessons_read`).
2. Acessar diretamente `/curso/atendimento-guarida/aprender` → o player redireciona de volta para a página do curso com `?denied=1`; nenhum vídeo é reproduzido.

O `TenantDemoSwitcher` (canto inferior direito) só aparece para `platform_admin`.