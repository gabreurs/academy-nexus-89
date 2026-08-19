update public.organization_branding b
set background_color = '#F6F6F4',
    surface_color    = '#FFFFFF',
    text_color       = '#17171B'
from public.organizations o
where o.id = b.organization_id
  and o.is_platform = false;

update public.organization_branding b
set background_color = '#F6F6F4',
    surface_color    = '#FFFFFF',
    text_color       = '#17171B',
    primary_color    = '#17171B',
    secondary_color  = '#3A3A42',
    accent_color     = '#2563EB'
from public.organizations o
where o.id = b.organization_id
  and o.is_platform = true;