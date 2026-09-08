export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          affiliation: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          organization_id: string
          phone: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliation?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          organization_id: string
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliation?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          organization_id?: string
          phone?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      course_comments: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          is_answered: boolean
          is_hidden: boolean
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_hidden?: boolean
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_hidden?: boolean
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_delivery_sources: {
        Row: {
          course_id: string
          created_at: string
          delivery_type: string
          embed_url: string
          id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          delivery_type?: string
          embed_url: string
          id?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          delivery_type?: string
          embed_url?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_delivery_sources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_entitlements: {
        Row: {
          course_id: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          organization_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          course_id: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id?: string | null
          source?: string
          user_id: string
        }
        Update: {
          course_id?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_entitlements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_preview: boolean
          module_id: string
          slug: string
          sort_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          module_id: string
          slug: string
          sort_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean
          module_id?: string
          slug?: string
          sort_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          file_url: string
          id: string
          kind: string | null
          lesson_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_url: string
          id?: string
          kind?: string | null
          lesson_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_url?: string
          id?: string
          kind?: string | null
          lesson_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          course_id: string
          first_opened_at: string | null
          id: string
          last_accessed_at: string
          last_lesson_id: string | null
          open_count: number
          percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          first_opened_at?: string | null
          id?: string
          last_accessed_at?: string
          last_lesson_id?: string | null
          open_count?: number
          percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          first_opened_at?: string | null
          id?: string
          last_accessed_at?: string
          last_lesson_id?: string | null
          open_count?: number
          percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          id: string
          organization_id: string | null
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          banner_url: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          delivery_type: string
          description: string | null
          duration_minutes: number | null
          external_checkout_url: string | null
          id: string
          instructor_bio: string | null
          instructor_name: string | null
          is_featured: boolean
          is_required: boolean
          level: string | null
          owner_org_id: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          subtitle: string | null
          title: string
          trailer_url: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["course_visibility"]
        }
        Insert: {
          banner_url?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_type?: string
          description?: string | null
          duration_minutes?: number | null
          external_checkout_url?: string | null
          id?: string
          instructor_bio?: string | null
          instructor_name?: string | null
          is_featured?: boolean
          is_required?: boolean
          level?: string | null
          owner_org_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          title: string
          trailer_url?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["course_visibility"]
        }
        Update: {
          banner_url?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_type?: string
          description?: string | null
          duration_minutes?: number | null
          external_checkout_url?: string | null
          id?: string
          instructor_bio?: string | null
          instructor_name?: string | null
          is_featured?: boolean
          is_required?: boolean
          level?: string | null
          owner_org_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          title?: string
          trailer_url?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["course_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          organization_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          organization_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          organization_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          is_answered: boolean
          is_hidden: boolean
          lesson_id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_hidden?: boolean
          lesson_id: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          is_answered?: boolean
          is_hidden?: boolean
          lesson_id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          lesson_id: string
          position_seconds: number
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          lesson_id: string
          position_seconds?: number
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          lesson_id?: string
          position_seconds?: number
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          accent_color: string
          background_color: string
          banner_url: string | null
          dark_background_color: string
          dark_surface_color: string
          dark_text_color: string
          environment_name: string | null
          favicon_url: string | null
          logo_dark_url: string | null
          logo_light_url: string | null
          organization_id: string
          primary_color: string
          secondary_color: string
          surface_color: string
          text_color: string
          updated_at: string
          welcome_message: string | null
          welcome_title: string | null
        }
        Insert: {
          accent_color?: string
          background_color?: string
          banner_url?: string | null
          dark_background_color?: string
          dark_surface_color?: string
          dark_text_color?: string
          environment_name?: string | null
          favicon_url?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          organization_id: string
          primary_color?: string
          secondary_color?: string
          surface_color?: string
          text_color?: string
          updated_at?: string
          welcome_message?: string | null
          welcome_title?: string | null
        }
        Update: {
          accent_color?: string
          background_color?: string
          banner_url?: string | null
          dark_background_color?: string
          dark_surface_color?: string
          dark_text_color?: string
          environment_name?: string | null
          favicon_url?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          organization_id?: string
          primary_color?: string
          secondary_color?: string
          surface_color?: string
          text_color?: string
          updated_at?: string
          welcome_message?: string | null
          welcome_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_course_catalog: {
        Row: {
          auto_enroll: boolean
          course_id: string
          created_at: string
          id: string
          is_required: boolean
          is_visible: boolean
          organization_id: string
        }
        Insert: {
          auto_enroll?: boolean
          course_id: string
          created_at?: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          organization_id: string
        }
        Update: {
          auto_enroll?: boolean
          course_id?: string
          created_at?: string
          id?: string
          is_required?: boolean
          is_visible?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_course_catalog_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_course_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          created_at: string
          hostname: string
          id: string
          is_primary: boolean
          organization_id: string
        }
        Insert: {
          created_at?: string
          hostname: string
          id?: string
          is_primary?: boolean
          organization_id: string
        }
        Update: {
          created_at?: string
          hostname?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_platform: boolean
          name: string
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
          user_limit: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_platform?: boolean
          name: string
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          user_limit?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_platform?: boolean
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
          user_limit?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_course_list: {
        Row: {
          course_id: string
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_list_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_list_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      resolve_tenant_by_hostname: {
        Args: { p_hostname: string }
        Returns: {
          created_at: string
          id: string
          is_platform: boolean
          name: string
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
          user_limit: number
        }[]
      }
      user_org_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role: "platform_admin" | "org_admin" | "student"
      course_status: "draft" | "published" | "archived"
      course_visibility: "global" | "exclusive"
      enrollment_status: "active" | "completed" | "cancelled"
      invite_status: "pending" | "accepted" | "expired" | "revoked"
      org_status: "active" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["platform_admin", "org_admin", "student"],
      course_status: ["draft", "published", "archived"],
      course_visibility: ["global", "exclusive"],
      enrollment_status: ["active", "completed", "cancelled"],
      invite_status: ["pending", "accepted", "expired", "revoked"],
      org_status: ["active", "suspended"],
    },
  },
} as const
