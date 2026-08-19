ALTER TABLE public.organization_branding
  ADD COLUMN IF NOT EXISTS dark_background_color text NOT NULL DEFAULT '#0B0B0E',
  ADD COLUMN IF NOT EXISTS dark_surface_color   text NOT NULL DEFAULT '#141418',
  ADD COLUMN IF NOT EXISTS dark_text_color      text NOT NULL DEFAULT '#F3F3F5';

-- Neutros reais por tenant (light = branco/off-white; acento entra por ação, não por névoa)
UPDATE public.organization_branding b
SET background_color = '#FFFFFF',
    surface_color    = '#FFFFFF',
    text_color       = '#121214',
    dark_background_color = '#0B0B0E',
    dark_surface_color    = '#141418',
    dark_text_color       = '#F3F3F5'
FROM public.organizations o
WHERE o.id = b.organization_id;