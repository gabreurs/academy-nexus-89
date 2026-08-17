ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'native',
  ADD COLUMN IF NOT EXISTS embed_url text;
DO $$ BEGIN
  ALTER TABLE public.courses ADD CONSTRAINT courses_delivery_type_check
    CHECK (delivery_type IN ('native','learning_studio_embed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.course_categories (slug,name,description,sort_order) VALUES
 ('ia-tecnologia','IA e Tecnologia','Inteligência artificial aplicada ao mercado condominial',1),
 ('sindico-carreira','Síndico Profissional e Carreira','Formação, posicionamento e crescimento profissional',2),
 ('assembleias-conselhos','Assembleias e Conselhos','Governança, assembleias e órgãos de fiscalização',3),
 ('operacao-condominial','Operação Condominial','Portaria, zeladoria e serviços de campo',4)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order;

WITH src(slug,title,cat,code) AS (VALUES
 ('curso-ia-gestao-condominial-v2','Curso de IA para Gestão Condominial v2','ia-tecnologia','1iE7xOld3ePd74eKo1iG'),
 ('gestao-condominial-inteligente-ia-empresa','Gestão Condominial Inteligente com IA — Crie sua empresa','ia-tecnologia','TfWKwiYdixr8WRsm09y8'),
 ('ia-gestao-condominial','Curso de Inteligência Artificial Aplicada à Gestão Condominial','ia-tecnologia','sLvnjknjro1whwLQpwh3'),
 ('analise-cotacoes-condominiais-chatgpt','Análise de Cotações Condominiais com ChatGPT','ia-tecnologia','SqHm00X4ozvy8ZMjmnsW'),
 ('app-condominio-chatgpt-lovable','Como Criar um App de Condomínio com ChatGPT e Lovable','ia-tecnologia','FRYVxpUpKobS03xTEo4l'),
 ('manual-gpts-mercado-condominial','Manual Completo de Criação de GPTs no ChatGPT para o Mercado Condominial','ia-tecnologia','qEBz0pCnB3oqqxC7HMBq'),
 ('sindico-profissional','Curso de Síndico Profissional','sindico-carreira','wNftWMyvb7GAEW4A1th9'),
 ('ensaio-carreira-sindicos-profissionais','Ensaio sobre a Carreira de Síndicos Profissionais','sindico-carreira','cjsMjhq6rMFxkYXDUoNa'),
 ('competencias-sindico-profissional','Competências do Síndico Profissional','sindico-carreira','ridN27iuuzwACoHhKycL'),
 ('empresa-sindicatura-atuacao-nacional','Como Desenvolver uma Empresa de Sindicatura com Atuação Nacional','sindico-carreira','IuMBC4lJMMdJl09CpTHn'),
 ('estrategias-reeleicao-gestao-condominial','Estratégias para Reeleição na Gestão Condominial','sindico-carreira','ZgJABzPQ8830EUzOwrN3'),
 ('oratoria-sindicos','Técnicas de Oratória para Síndicos','sindico-carreira','hSeukht9MRuDBl8jSBIL'),
 ('captacao-de-clientes','Captação de Clientes','sindico-carreira','WJy9VRDv8km8QkUVEZbB'),
 ('captacao-clientes-sindicos','Captação de Clientes para Síndicos Profissionais','sindico-carreira','FuIgcCDHyg2JWcsCPwKU'),
 ('conselheiros-fiscais-consultivos','Curso para Conselheiros Fiscais e Consultivos de Condomínio','assembleias-conselhos','9BMKdNtIJtGDAPpXSOMc'),
 ('conselheiros-fiscais','Curso para Conselheiros Fiscais de Condomínios Residenciais','assembleias-conselhos','ZcAQHWQV6XdPT2AqxDqy'),
 ('presidente-mesa-assembleias','Presidente da Mesa em Assembleias de Condomínio','assembleias-conselhos','oWp0ZKnNdf7f9LveqiQe'),
 ('dinamicas-votacao-assembleias','Dinâmicas de Votação e Preparação de Assembleias Condominiais','assembleias-conselhos','HcafIZENhIwLMqhMwjcX'),
 ('procuracoes-assembleias-condominios','Procurações em Assembleias de Condomínios','assembleias-conselhos','iJQSUopeXRwE5LYEOddE'),
 ('relacionamento-conselho-fiscal-consultivo','Relacionamento com o Conselho Fiscal e Consultivo','assembleias-conselhos','bd5GvC5LJulmlSfgjTu1'),
 ('subsindicos-condominios-residenciais','Curso Completo para Subsíndicos de Condomínios Residenciais','assembleias-conselhos','0f71ttYrSJ6S2L9FhvyZ'),
 ('apresentando-resultados-da-gestao','Apresentando os Resultados da Gestão ao Final de Cada Ano','assembleias-conselhos','5eIkK2ah7opw3x0Ja9bD'),
 ('porteiro-alta-performance','Como se Tornar um Porteiro Condominial de Alta Performance','operacao-condominial','PaaFEpSThYHjY427bBWW'),
 ('zelador-alta-performance','Zelador Condominial de Alta Performance','operacao-condominial','XZxxojlhhn7mQg1hGyJt'),
 ('limpeza-alta-performance','Curso de Limpeza de Alta Performance','operacao-condominial','Bk4pUQ5hHyfYKZdQNqmg')
)
INSERT INTO public.courses (slug,title,status,visibility,owner_org_id,category_id,delivery_type,embed_url,instructor_name)
SELECT s.slug, s.title, 'published', 'global', NULL, cc.id, 'learning_studio_embed',
       'https://learningstudioai.com/share/'||s.code, 'SíndicoLab'
  FROM src s JOIN public.course_categories cc ON cc.slug = s.cat
ON CONFLICT (slug) DO UPDATE SET
  title=EXCLUDED.title, status='published', visibility='global', owner_org_id=NULL,
  category_id=EXCLUDED.category_id, delivery_type='learning_studio_embed', embed_url=EXCLUDED.embed_url;

DO $$
DECLARE c RECORD; m_id uuid;
BEGIN
  FOR c IN SELECT id, embed_url, title FROM public.courses WHERE delivery_type='learning_studio_embed' AND embed_url IS NOT NULL LOOP
    SELECT id INTO m_id FROM public.course_modules WHERE course_id=c.id ORDER BY sort_order LIMIT 1;
    IF m_id IS NULL THEN
      INSERT INTO public.course_modules (course_id,title,sort_order) VALUES (c.id,'Conteúdo do curso',1) RETURNING id INTO m_id;
    END IF;
    IF EXISTS (SELECT 1 FROM public.course_lessons WHERE course_id=c.id) THEN
      UPDATE public.course_lessons SET video_url=c.embed_url
        WHERE id=(SELECT id FROM public.course_lessons WHERE course_id=c.id ORDER BY sort_order LIMIT 1);
    ELSE
      INSERT INTO public.course_lessons (module_id,course_id,slug,title,video_url,sort_order,is_preview)
      VALUES (m_id,c.id,'aula-completa','Curso completo — '||c.title,c.embed_url,1,true);
    END IF;
  END LOOP;
END $$;

UPDATE public.courses
   SET status='archived',
       owner_org_id = CASE WHEN visibility='global' THEN NULL ELSE owner_org_id END
 WHERE slug IN ('formacao-porteiros','gestao-conflitos','seguranca-condominial','governanca-sindicos','tecnologia-comunicacao-condominial');
DELETE FROM public.organization_course_catalog oc
 USING public.courses c WHERE c.id=oc.course_id AND c.status='archived';

UPDATE public.organizations
   SET slug='casa', name='Administradora CASA'
 WHERE id='33333333-3333-3333-3333-333333333333';
UPDATE public.organization_domains
   SET hostname='casa.sindicolab.academy'
 WHERE organization_id='33333333-3333-3333-3333-333333333333';
UPDATE public.organization_branding SET
  primary_color='#111111', secondary_color='#2B2B2B', accent_color='#FFC20E',
  background_color='#0B0B0C', surface_color='#141416', text_color='#F5F5F4',
  environment_name='CASA Academy',
  welcome_title='CASA Academy',
  welcome_message='Educação condominial para síndicos, conselheiros e equipes dos condomínios administrados pela CASA.'
 WHERE organization_id='33333333-3333-3333-3333-333333333333';

UPDATE public.organizations SET status='suspended' WHERE slug='apsa';
DELETE FROM public.organization_course_catalog WHERE organization_id=(SELECT id FROM public.organizations WHERE slug='apsa');

INSERT INTO public.organization_course_catalog (organization_id, course_id, is_visible)
SELECT o.id, c.id, true
  FROM public.organizations o
  CROSS JOIN public.courses c
 WHERE o.slug IN ('sindicolab','casa')
   AND c.delivery_type='learning_studio_embed' AND c.status='published'
ON CONFLICT (organization_id, course_id) DO UPDATE SET is_visible=true;