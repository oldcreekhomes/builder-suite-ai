export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          receive_bid_notifications: boolean | null
          receive_schedule_notifications: boolean | null
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
          receive_bid_notifications?: boolean | null
          receive_schedule_notifications?: boolean | null
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
          receive_bid_notifications?: boolean | null
          receive_schedule_notifications?: boolean | null
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
      cost_code_specifications: {
        Row: {
          cost_code_id: string
          created_at: string
          description: string | null
          files: string[] | null
          id: string
          updated_at: string
        }
        Insert: {
          cost_code_id: string
          created_at?: string
          description?: string | null
          files?: string[] | null
          id?: string
          updated_at?: string
        }
        Update: {
          cost_code_id?: string
          created_at?: string
          description?: string | null
          files?: string[] | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_specifications_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
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
        Relationships: []
      }
      marketplace_companies: {
        Row: {
          address: string | null
          company_name: string
          company_type: string
          created_at: string
          description: string | null
          id: string
          insurance_verified: boolean | null
          license_numbers: string[] | null
          phone_number: string | null
          rating: number | null
          review_count: number | null
          service_areas: string[] | null
          specialties: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          company_type: string
          created_at?: string
          description?: string | null
          id?: string
          insurance_verified?: boolean | null
          license_numbers?: string[] | null
          phone_number?: string | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          specialties?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          company_type?: string
          created_at?: string
          description?: string | null
          id?: string
          insurance_verified?: boolean | null
          license_numbers?: string[] | null
          phone_number?: string | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          specialties?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      marketplace_company_representatives: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean | null
          last_name: string
          marketplace_company_id: string
          phone_number: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean | null
          last_name: string
          marketplace_company_id: string
          phone_number?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean | null
          last_name?: string
          marketplace_company_id?: string
          phone_number?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_company_representatives_marketplace_company_id_fkey"
            columns: ["marketplace_company_id"]
            isOneToOne: false
            referencedRelation: "marketplace_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_bid_package_companies: {
        Row: {
          bid_package_id: string
          bid_status: string
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          price: number | null
          proposals: string[] | null
          reminder_date: string | null
          updated_at: string
        }
        Insert: {
          bid_package_id: string
          bid_status?: string
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          price?: number | null
          proposals?: string[] | null
          reminder_date?: string | null
          updated_at?: string
        }
        Update: {
          bid_package_id?: string
          bid_status?: string
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          price?: number | null
          proposals?: string[] | null
          reminder_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bidding_bid_package_companies_bid_package_id_fkey"
            columns: ["bid_package_id"]
            isOneToOne: false
            referencedRelation: "project_bid_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bidding_bid_package_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_bid_packages: {
        Row: {
          cost_code_id: string
          created_at: string
          due_date: string | null
          files: string[] | null
          id: string
          name: string
          project_id: string
          reminder_date: string | null
          reminder_day_of_week: number | null
          specifications: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cost_code_id: string
          created_at?: string
          due_date?: string | null
          files?: string[] | null
          id?: string
          name: string
          project_id: string
          reminder_date?: string | null
          reminder_day_of_week?: number | null
          specifications?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cost_code_id?: string
          created_at?: string
          due_date?: string | null
          files?: string[] | null
          id?: string
          name?: string
          project_id?: string
          reminder_date?: string | null
          reminder_day_of_week?: number | null
          specifications?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bidding_bid_packages_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_bidding_bid_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
        ]
      }
      project_folders: {
        Row: {
          created_at: string
          created_by: string
          folder_name: string
          folder_path: string
          id: string
          parent_path: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          folder_name: string
          folder_path: string
          id?: string
          parent_path?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          folder_name?: string
          folder_path?: string
          id?: string
          parent_path?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_folders_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
        ]
      }
      project_schedule_tasks: {
        Row: {
          created_at: string
          duration: number
          end_date: string
          id: string
          order_index: number | null
          parent_id: string | null
          predecessor: string | null
          progress: number | null
          project_id: string
          resources: string | null
          start_date: string
          task_name: string
          task_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: number
          end_date: string
          id?: string
          order_index?: number | null
          parent_id?: string | null
          predecessor?: string | null
          progress?: number | null
          project_id: string
          resources?: string | null
          start_date: string
          task_name: string
          task_number?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: number
          end_date?: string
          id?: string
          order_index?: number | null
          parent_id?: string | null
          predecessor?: string | null
          progress?: number | null
          project_id?: string
          resources?: string | null
          start_date?: string
          task_name?: string
          task_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_schedule_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          created_at: string
          id: string
          manager: string | null
          name: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          manager?: string | null
          name: string
          owner_id: string
          status: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          manager?: string | null
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_manager_user"
            columns: ["manager"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_chat_messages: {
        Row: {
          created_at: string
          file_urls: string[] | null
          id: string
          is_deleted: boolean
          message_text: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_urls?: string[] | null
          id?: string
          is_deleted?: boolean
          message_text?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_urls?: string[] | null
          id?: string
          is_deleted?: boolean
          message_text?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          id: string
          sound_notifications_enabled: boolean
          toast_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sound_notifications_enabled?: boolean
          toast_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sound_notifications_enabled?: boolean
          toast_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          confirmed: boolean
          created_at: string
          email: string
          first_name: string | null
          home_builder_id: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          confirmed?: boolean
          created_at?: string
          email: string
          first_name?: string | null
          home_builder_id?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          confirmed?: boolean
          created_at?: string
          email?: string
          first_name?: string | null
          home_builder_id?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
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
      create_project_task: {
        Args:
          | {
              project_id_param: string
              task_name_param: string
              start_date_param: string
              end_date_param: string
              duration_param?: number
              progress_param?: number
              predecessor_param?: string
              resources_param?: string
              parent_id_param?: string
              order_index_param?: number
            }
          | {
              project_id_param: string
              task_name_param: string
              start_date_param: string
              end_date_param: string
              duration_param?: number
              progress_param?: number
              predecessor_param?: string
              resources_param?: string
              parent_task_number_param?: number
              order_index_param?: number
            }
        Returns: string
      }
      delete_project_task: {
        Args: { task_id_param: string }
        Returns: boolean
      }
      get_conversation_unread_count: {
        Args: { other_user_id_param: string }
        Returns: number
      }
      get_current_user_company: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_home_builder_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_home_builder_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_employee: boolean
          home_builder_id: string
        }[]
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
      get_project_tasks: {
        Args: { project_id_param: string }
        Returns: {
          id: string
          project_id: string
          task_name: string
          start_date: string
          end_date: string
          duration: number
          progress: number
          predecessor: string
          resources: string
          parent_id: string
          order_index: number
          created_at: string
          updated_at: string
          task_number: number
        }[]
      }
      get_user_role_and_home_builder: {
        Args: { user_id: string }
        Returns: {
          user_role: string
          user_home_builder_id: string
        }[]
      }
      mark_conversation_as_read: {
        Args: { other_user_id_param: string }
        Returns: undefined
      }
      mark_message_as_read: {
        Args: { message_id_param: string }
        Returns: undefined
      }
      update_project_task: {
        Args:
          | {
              id_param: string
              task_name_param?: string
              start_date_param?: string
              end_date_param?: string
              duration_param?: number
              progress_param?: number
              predecessor_param?: string
              resources_param?: string
              parent_id_param?: string
              order_index_param?: number
            }
          | {
              id_param: string
              task_name_param?: string
              start_date_param?: string
              end_date_param?: string
              duration_param?: number
              progress_param?: number
              predecessor_param?: string
              resources_param?: string
              parent_task_number_param?: number
              order_index_param?: number
            }
        Returns: boolean
      }
      update_project_task_by_number: {
        Args:
          | {
              task_number_param: number
              project_id_param: string
              task_name_param?: string
              start_date_param?: string
              end_date_param?: string
              duration_param?: number
              progress_param?: number
              predecessor_param?: string
              resources_param?: string
              parent_id_param?: string
              order_index_param?: number
            }
          | {
              task_number_param: number
              project_id_param: string
              task_name_param?: string
              start_date_param?: string
              end_date_param?: string
              duration_param?: number
              progress_param?: number
              predecessor_param?: string
              resources_param?: string
              parent_task_number_param?: number
              order_index_param?: number
            }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      user_type: ["home_builder", "employee"],
    },
  },
} as const
