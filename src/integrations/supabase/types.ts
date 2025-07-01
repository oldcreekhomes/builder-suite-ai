export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          company_name: string
          company_type: string
          created_at: string
          id: string
          owner_id: string
          phone_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          company_type: string
          created_at?: string
          id?: string
          owner_id: string
          phone_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          company_type?: string
          created_at?: string
          id?: string
          owner_id?: string
          phone_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_cost_codes: {
        Row: {
          company_id: string
          cost_code_id: string
          created_at: string
          id: string
        }
        Insert: {
          company_id: string
          cost_code_id: string
          created_at?: string
          id?: string
        }
        Update: {
          company_id?: string
          cost_code_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_cost_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_cost_codes_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      company_representatives: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string
          phone_number: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name: string
          phone_number?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          phone_number?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_representatives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          category: string | null
          code: string
          created_at: string
          has_bidding: boolean | null
          has_specifications: boolean | null
          id: string
          name: string
          owner_id: string
          parent_group: string | null
          price: number | null
          quantity: string | null
          unit_of_measure: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          has_bidding?: boolean | null
          has_specifications?: boolean | null
          id?: string
          name: string
          owner_id: string
          parent_group?: string | null
          price?: number | null
          quantity?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          has_bidding?: boolean | null
          has_specifications?: boolean | null
          id?: string
          name?: string
          owner_id?: string
          parent_group?: string | null
          price?: number | null
          quantity?: string | null
          unit_of_measure?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          confirmed_at: string | null
          email: string
          expires_at: string | null
          first_name: string
          home_builder_id: string | null
          id: string
          invitation_token: string | null
          invited_at: string
          invited_by: string
          last_name: string
          phone_number: string | null
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          confirmed_at?: string | null
          email: string
          expires_at?: string | null
          first_name: string
          home_builder_id?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string
          invited_by: string
          last_name: string
          phone_number?: string | null
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          confirmed_at?: string | null
          email?: string
          expires_at?: string | null
          first_name?: string
          home_builder_id?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string
          invited_by?: string
          last_name?: string
          phone_number?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_home_builder_id_fkey"
            columns: ["home_builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_by_home_builder: boolean
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string
          first_name: string | null
          home_builder_id: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          role: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          approved_by_home_builder?: boolean
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          home_builder_id?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          role?: string | null
          updated_at?: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          approved_by_home_builder?: boolean
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          home_builder_id?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          role?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_builder_id_fkey"
            columns: ["home_builder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_bidding: {
        Row: {
          cost_code_id: string
          created_at: string
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cost_code_id: string
          created_at?: string
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cost_code_id?: string
          created_at?: string
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bidding_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bidding_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_bidding_companies: {
        Row: {
          bid_status: string
          company_id: string
          created_at: string
          id: string
          project_bidding_id: string
          updated_at: string
        }
        Insert: {
          bid_status?: string
          company_id: string
          created_at?: string
          id?: string
          project_bidding_id: string
          updated_at?: string
        }
        Update: {
          bid_status?: string
          company_id?: string
          created_at?: string
          id?: string
          project_bidding_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bidding_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bidding_companies_project_bidding_id_fkey"
            columns: ["project_bidding_id"]
            isOneToOne: false
            referencedRelation: "project_bidding"
            referencedColumns: ["id"]
          },
        ]
      }
      project_budgets: {
        Row: {
          cost_code_id: string
          created_at: string
          id: string
          project_id: string
          quantity: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          cost_code_id: string
          created_at?: string
          id?: string
          project_id: string
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          cost_code_id?: string
          created_at?: string
          id?: string
          project_id?: string
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          description: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          is_deleted: boolean
          mime_type: string
          original_filename: string
          project_id: string
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          description?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          is_deleted?: boolean
          mime_type: string
          original_filename: string
          project_id: string
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          description?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          is_deleted?: boolean
          mime_type?: string
          original_filename?: string
          project_id?: string
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_photos: {
        Row: {
          description: string | null
          id: string
          project_id: string
          uploaded_at: string
          uploaded_by: string
          url: string
        }
        Insert: {
          description?: string | null
          id?: string
          project_id: string
          uploaded_at?: string
          uploaded_by: string
          url: string
        }
        Update: {
          description?: string | null
          id?: string
          project_id?: string
          uploaded_at?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          created_at: string
          id: string
          manager: string
          name: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          manager: string
          name: string
          owner_id: string
          status: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          manager?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_employee: {
        Args: { employee_id: string }
        Returns: undefined
      }
      confirm_invitation: {
        Args: { token: string }
        Returns: Json
      }
      create_user_from_invitation: {
        Args: { p_invitation_id: string; p_password: string }
        Returns: Json
      }
      get_home_builders: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          company_name: string
        }[]
      }
      get_pending_employee_approvals: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          company_name: string
          created_at: string
        }[]
      }
      invite_employee: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone_number?: string
          p_role?: string
        }
        Returns: string
      }
    }
    Enums: {
      user_type: "home_builder" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_type: ["home_builder", "employee"],
    },
  },
} as const
