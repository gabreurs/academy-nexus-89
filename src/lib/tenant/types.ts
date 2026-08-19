export type Organization = {
  id: string;
  slug: string;
  name: string;
  is_platform: boolean;
  status: string;
};

export type Branding = {
  organization_id: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  dark_background_color: string;
  dark_surface_color: string;
  dark_text_color: string;
  welcome_title: string | null;
  welcome_message: string | null;
  environment_name: string | null;
};

export type ResolvedTenant = {
  organization: Organization;
  branding: Branding | null;
};