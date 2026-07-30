insert into public.courses (id, slug, title, subtitle, description, level, instructor_name, duration_minutes, category_id, owner_org_id, visibility, status, is_featured)
values
 ('a0000002-0000-0000-0000-000000000001','conselheiros-fiscais','Curso para Conselheiros Fiscais de Condomínios Residenciais','Fiscalização de contas com segurança jurídica','Aula interativa completa sobre o papel do conselho fiscal: análise de prestação de contas, pareceres, responsabilidades legais e boas práticas de fiscalização.','Intermediário','SíndicoLab',90,'c1111111-0000-0000-0000-000000000005',null,'global','published',true),
 ('a0000002-0000-0000-0000-000000000002','porteiro-alta-performance','Como se Tornar um Porteiro Condominial de Alta Performance','Excelência na portaria','Formação interativa para porteiros: controle de acesso, comunicação, postura profissional e rotinas de alta performance.','Iniciante','SíndicoLab',80,'c1111111-0000-0000-0000-000000000001',null,'global','published',false),
 ('a0000002-0000-0000-0000-000000000003','ia-gestao-condominial','Inteligência Artificial Aplicada à Gestão Condominial','Produtividade com IA no dia a dia do síndico','Como usar IA para automatizar comunicação, análises financeiras, atas e atendimento na gestão de condomínios.','Intermediário','SíndicoLab',100,'c1111111-0000-0000-0000-000000000002',null,'global','published',true),
 ('a0000002-0000-0000-0000-000000000004','sindico-profissional','Curso de Síndico Profissional','Da base à atuação profissional','Trilha interativa completa para quem quer atuar como síndico profissional: legislação, finanças, pessoas e operação.','Intermediário','SíndicoLab',120,'c1111111-0000-0000-0000-000000000002',null,'global','published',true),
 ('a0000002-0000-0000-0000-000000000005','captacao-clientes-sindicos','Captação de Clientes para Síndicos Profissionais','Comercial e posicionamento','Estratégias práticas de prospecção, proposta comercial, precificação e posicionamento para síndicos profissionais.','Avançado','SíndicoLab',75,'c1111111-0000-0000-0000-000000000002',null,'global','published',false),
 ('a0000002-0000-0000-0000-000000000006','limpeza-alta-performance','Curso de Limpeza de Alta Performance','Padrões e produtividade na conservação','Técnicas, produtos, segurança e rotinas de limpeza profissional em áreas comuns de condomínios.','Iniciante','SíndicoLab',70,'c1111111-0000-0000-0000-000000000001',null,'global','published',false),
 ('a0000002-0000-0000-0000-000000000007','oratoria-sindicos','Técnicas de Oratória para Síndicos','Conduza assembleias com autoridade','Como falar em público, conduzir assembleias, lidar com objeções e comunicar decisões difíceis.','Intermediário','SíndicoLab',60,'c1111111-0000-0000-0000-000000000004',null,'global','published',false),
 ('a0000002-0000-0000-0000-000000000008','tecnologia-comunicacao-condominial','Revolução da Tecnologia e Comunicação na Gestão Condominial','Ferramentas digitais para condomínios','Panorama de tecnologias, canais digitais e comunicação eficiente entre síndico, moradores e equipe.','Iniciante','SíndicoLab',65,'c1111111-0000-0000-0000-000000000002',null,'global','published',false)
on conflict (slug) do nothing;

insert into public.course_modules (id, course_id, title, description, sort_order)
select ('a0000003-0000-0000-0000-00000000000' || right(c.id::text,1))::uuid, c.id, 'Aula interativa', 'Experiência completa do curso em formato interativo', 1
from public.courses c
where c.id::text like 'a0000002-0000-0000-0000-%'
on conflict (id) do nothing;

insert into public.course_lessons (id, course_id, module_id, slug, title, description, video_url, duration_seconds, sort_order, is_preview)
values
 ('a0000004-0000-0000-0000-000000000001','a0000002-0000-0000-0000-000000000001','a0000003-0000-0000-0000-000000000001','aula-interativa','Curso completo — Conselheiros Fiscais','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/ZcAQHWQV6XdPT2AqxDqy',5400,1,true),
 ('a0000004-0000-0000-0000-000000000002','a0000002-0000-0000-0000-000000000002','a0000003-0000-0000-0000-000000000002','aula-interativa','Curso completo — Porteiro de Alta Performance','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/PaaFEpSThYHjY427bBWW',4800,1,true),
 ('a0000004-0000-0000-0000-000000000003','a0000002-0000-0000-0000-000000000003','a0000003-0000-0000-0000-000000000003','aula-interativa','Curso completo — IA na Gestão Condominial','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/sLvnjknjro1whwLQpwh3',6000,1,true),
 ('a0000004-0000-0000-0000-000000000004','a0000002-0000-0000-0000-000000000004','a0000003-0000-0000-0000-000000000004','aula-interativa','Curso completo — Síndico Profissional','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/wNftWMyvb7GAEW4A1th9',7200,1,true),
 ('a0000004-0000-0000-0000-000000000005','a0000002-0000-0000-0000-000000000005','a0000003-0000-0000-0000-000000000005','aula-interativa','Curso completo — Captação de Clientes','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/FuIgcCDHyg2JWcsCPwKU',4500,1,true),
 ('a0000004-0000-0000-0000-000000000006','a0000002-0000-0000-0000-000000000006','a0000003-0000-0000-0000-000000000006','aula-interativa','Curso completo — Limpeza de Alta Performance','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/Bk4pUQ5hHyfYKZdQNqmg',4200,1,true),
 ('a0000004-0000-0000-0000-000000000007','a0000002-0000-0000-0000-000000000007','a0000003-0000-0000-0000-000000000007','aula-interativa','Curso completo — Oratória para Síndicos','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/hSeukht9MRuDBl8jSBIL',3600,1,true),
 ('a0000004-0000-0000-0000-000000000008','a0000002-0000-0000-0000-000000000008','a0000003-0000-0000-0000-000000000008','aula-interativa','Curso completo — Tecnologia e Comunicação','Percorra os capítulos no seu ritmo.','https://learningstudioai.com/share/BBEcHIFU2prw3KbfxgJw',3900,1,true)
on conflict (id) do nothing;

insert into public.organization_course_catalog (organization_id, course_id, is_visible)
select o.id, c.id, true
from public.organizations o
cross join public.courses c
where c.id::text like 'a0000002-0000-0000-0000-%'
on conflict do nothing;