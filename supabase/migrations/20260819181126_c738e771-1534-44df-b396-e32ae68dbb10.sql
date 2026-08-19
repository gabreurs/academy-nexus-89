UPDATE public.organization_branding b
SET logo_dark_url = '/__l5e/assets-v1/ffe4838d-9866-4f51-9d42-b9cc0b13cb65/casa-logo-white.png',
    logo_light_url = '/__l5e/assets-v1/37b5bd36-2c1c-4b11-b8b4-baf21ee96f0e/casa-logo-black.png'
FROM public.organizations o
WHERE o.id = b.organization_id AND o.slug = 'casa';