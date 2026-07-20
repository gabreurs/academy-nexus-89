
UPDATE public.organization_branding
SET
  primary_color   = '#111827',
  secondary_color = '#0F172A',
  accent_color    = '#4F46E5',
  background_color = '#F7F5F2',
  surface_color   = '#FFFFFF',
  text_color      = '#111827',
  environment_name = COALESCE(environment_name, 'SíndicoLab Academy'),
  welcome_title   = COALESCE(welcome_title, 'Educação para o mercado condominial'),
  welcome_message = COALESCE(welcome_message, 'Formação contínua para administradoras, síndicos, porteiros e equipes condominiais — em um único ecossistema.')
WHERE organization_id = (SELECT id FROM public.organizations WHERE slug = 'sindicolab');

INSERT INTO public.organization_branding (
  organization_id, primary_color, secondary_color, accent_color,
  background_color, surface_color, text_color,
  environment_name, welcome_title, welcome_message
)
SELECT o.id, '#111827', '#0F172A', '#4F46E5', '#F7F5F2', '#FFFFFF', '#111827',
       'SíndicoLab Academy',
       'Educação para o mercado condominial',
       'Formação contínua para administradoras, síndicos, porteiros e equipes condominiais — em um único ecossistema.'
FROM public.organizations o
WHERE o.slug = 'sindicolab'
  AND NOT EXISTS (SELECT 1 FROM public.organization_branding b WHERE b.organization_id = o.id);
