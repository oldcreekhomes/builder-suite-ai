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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounting_settings: {
        Row: {
          ap_account_id: string | null
          created_at: string
          owner_id: string
          updated_at: string
          wip_account_id: string | null
        }
        Insert: {
          ap_account_id?: string | null
          created_at?: string
          owner_id: string
          updated_at?: string
          wip_account_id?: string | null
        }
        Update: {
          ap_account_id?: string | null
          created_at?: string
          owner_id?: string
          updated_at?: string
          wip_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_settings_ap_account_id_fkey"
            columns: ["ap_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_settings_wip_account_id_fkey"
            columns: ["wip_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
          parent_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          bank_account_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          difference: number
          id: string
          notes: string | null
          owner_id: string
          project_id: string | null
          reconciled_balance: number
          statement_beginning_balance: number
          statement_date: string
          statement_ending_balance: number
          status: string
          updated_at: string
        }
        Insert: {
          bank_account_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          difference?: number
          id?: string
          notes?: string | null
          owner_id: string
          project_id?: string | null
          reconciled_balance?: number
          statement_beginning_balance: number
          statement_date: string
          statement_ending_balance: number
          status?: string
          updated_at?: string
        }
        Update: {
          bank_account_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          difference?: number
          id?: string
          notes?: string | null
          owner_id?: string
          project_id?: string | null
          reconciled_balance?: number
          statement_beginning_balance?: number
          statement_date?: string
          statement_ending_balance?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bill_attachments: {
        Row: {
          bill_id: string | null
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          bill_id?: string | null
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          bill_id?: string | null
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_attachments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_categorization_examples: {
        Row: {
          account_id: string | null
          account_name: string | null
          cost_code_id: string | null
          cost_code_name: string | null
          created_at: string
          description: string
          id: string
          owner_id: string
          vendor_name: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          cost_code_id?: string | null
          cost_code_name?: string | null
          created_at?: string
          description: string
          id?: string
          owner_id: string
          vendor_name: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          cost_code_id?: string | null
          cost_code_name?: string | null
          created_at?: string
          description?: string
          id?: string
          owner_id?: string
          vendor_name?: string
        }
        Relationships: []
      }
      bill_lines: {
        Row: {
          account_id: string | null
          amount: number
          bill_id: string
          cost_code_id: string | null
          created_at: string
          id: string
          line_number: number
          line_type: Database["public"]["Enums"]["bill_line_type"]
          memo: string | null
          owner_id: string
          project_id: string | null
          quantity: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          bill_id: string
          cost_code_id?: string | null
          created_at?: string
          id?: string
          line_number?: number
          line_type: Database["public"]["Enums"]["bill_line_type"]
          memo?: string | null
          owner_id: string
          project_id?: string | null
          quantity?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bill_id?: string
          cost_code_id?: string | null
          created_at?: string
          id?: string
          line_number?: number
          line_type?: Database["public"]["Enums"]["bill_line_type"]
          memo?: string | null
          owner_id?: string
          project_id?: string | null
          quantity?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_date: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          notes: string | null
          owner_id: string
          project_id: string | null
          reconciled: boolean | null
          reconciliation_date: string | null
          reconciliation_id: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["bill_status"]
          terms: string | null
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          bill_date?: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          project_id?: string | null
          reconciled?: boolean | null
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          bill_date?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          project_id?: string | null
          reconciled?: boolean | null
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["bill_status"]
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_subcategory_selections: {
        Row: {
          cost_code_id: string
          created_at: string
          id: string
          included: boolean
          project_budget_id: string
          updated_at: string
        }
        Insert: {
          cost_code_id: string
          created_at?: string
          id?: string
          included?: boolean
          project_budget_id: string
          updated_at?: string
        }
        Update: {
          cost_code_id?: string
          created_at?: string
          id?: string
          included?: boolean
          project_budget_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_subcategory_selections_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_subcategory_selections_project_budget_id_fkey"
            columns: ["project_budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      check_lines: {
        Row: {
          account_id: string | null
          amount: number
          check_id: string
          cost_code_id: string | null
          created_at: string
          id: string
          line_number: number
          line_type: string
          memo: string | null
          owner_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          check_id: string
          cost_code_id?: string | null
          created_at?: string
          id?: string
          line_number?: number
          line_type: string
          memo?: string | null
          owner_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          check_id?: string
          cost_code_id?: string | null
          created_at?: string
          id?: string
          line_number?: number
          line_type?: string
          memo?: string | null
          owner_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_lines_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          account_number: string | null
          amount: number
          bank_account_id: string
          bank_name: string | null
          check_date: string
          check_number: string | null
          company_address: string | null
          company_city_state: string | null
          company_name: string | null
          created_at: string
          created_by: string
          id: string
          memo: string | null
          owner_id: string
          pay_to: string
          project_id: string | null
          reconciled: boolean
          reconciliation_date: string | null
          reconciliation_id: string | null
          routing_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          amount?: number
          bank_account_id: string
          bank_name?: string | null
          check_date?: string
          check_number?: string | null
          company_address?: string | null
          company_city_state?: string | null
          company_name?: string | null
          created_at?: string
          created_by: string
          id?: string
          memo?: string | null
          owner_id: string
          pay_to: string
          project_id?: string | null
          reconciled?: boolean
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          routing_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          bank_account_id?: string
          bank_name?: string | null
          check_date?: string
          check_number?: string | null
          company_address?: string | null
          company_city_state?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string
          id?: string
          memo?: string | null
          owner_id?: string
          pay_to?: string
          project_id?: string | null
          reconciled?: boolean
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          routing_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          company_name: string
          company_type: string
          created_at: string
          home_builder_id: string
          id: string
          phone_number: string | null
          state: string | null
          terms: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          company_name: string
          company_type: string
          created_at?: string
          home_builder_id: string
          id?: string
          phone_number?: string | null
          state?: string | null
          terms?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          company_name?: string
          company_type?: string
          created_at?: string
          home_builder_id?: string
          id?: string
          phone_number?: string | null
          state?: string | null
          terms?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
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
          {
            foreignKeyName: "fk_company_cost_codes_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_issues: {
        Row: {
          category: string
          company_name: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string | null
          priority: string
          solution: string | null
          solution_files: string[] | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          company_name: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location?: string | null
          priority?: string
          solution?: string | null
          solution_files?: string[] | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_name?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string | null
          priority?: string
          solution?: string | null
          solution_files?: string[] | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_representatives: {
        Row: {
          company_id: string
          created_at: string
          email: string
          first_name: string
          home_builder_id: string
          id: string
          last_name: string | null
          phone_number: string | null
          receive_bid_notifications: boolean | null
          receive_po_notifications: boolean | null
          receive_schedule_notifications: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          first_name: string
          home_builder_id: string
          id?: string
          last_name?: string | null
          phone_number?: string | null
          receive_bid_notifications?: boolean | null
          receive_po_notifications?: boolean | null
          receive_schedule_notifications?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          first_name?: string
          home_builder_id?: string
          id?: string
          last_name?: string | null
          phone_number?: string | null
          receive_bid_notifications?: boolean | null
          receive_po_notifications?: boolean | null
          receive_schedule_notifications?: boolean | null
          title?: string
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
          {
            foreignKeyName: "fk_company_representatives_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_code_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          cost_code_id: string
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          price: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          cost_code_id: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          price: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          cost_code_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_code_price_history_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_code_price_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          estimate: boolean | null
          has_bidding: boolean | null
          has_specifications: boolean | null
          has_subcategories: boolean | null
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
          estimate?: boolean | null
          has_bidding?: boolean | null
          has_specifications?: boolean | null
          has_subcategories?: boolean | null
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
          estimate?: boolean | null
          has_bidding?: boolean | null
          has_specifications?: boolean | null
          has_subcategories?: boolean | null
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
      credit_card_lines: {
        Row: {
          account_id: string | null
          amount: number
          cost_code_id: string | null
          created_at: string
          credit_card_id: string
          id: string
          line_number: number
          line_type: string
          memo: string | null
          owner_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          cost_code_id?: string | null
          created_at?: string
          credit_card_id: string
          id?: string
          line_number?: number
          line_type: string
          memo?: string | null
          owner_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          cost_code_id?: string | null
          created_at?: string
          credit_card_id?: string
          id?: string
          line_number?: number
          line_type?: string
          memo?: string | null
          owner_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_lines_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          credit_card_account_id: string
          id: string
          memo: string | null
          owner_id: string
          project_id: string | null
          reconciled: boolean
          reconciliation_date: string | null
          reconciliation_id: string | null
          status: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          vendor: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by: string
          credit_card_account_id: string
          id?: string
          memo?: string | null
          owner_id: string
          project_id?: string | null
          reconciled?: boolean
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          status?: string
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          vendor: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          credit_card_account_id?: string
          id?: string
          memo?: string | null
          owner_id?: string
          project_id?: string | null
          reconciled?: boolean
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          status?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: []
      }
      deposit_lines: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          deposit_id: string
          id: string
          line_number: number
          line_type: string
          memo: string | null
          owner_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          created_at?: string
          deposit_id: string
          id?: string
          line_number?: number
          line_type: string
          memo?: string | null
          owner_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          deposit_id?: string
          id?: string
          line_number?: number
          line_type?: string
          memo?: string | null
          owner_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_lines_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_sources: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          customer_name: string
          email: string | null
          id: string
          notes: string | null
          owner_id: string
          phone_number: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_name: string
          email?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          phone_number?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_name?: string
          email?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          phone_number?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          account_number: string | null
          amount: number
          bank_account_id: string
          bank_name: string | null
          company_address: string | null
          company_city_state: string | null
          company_name: string | null
          created_at: string
          created_by: string
          deposit_date: string
          deposit_source_id: string | null
          id: string
          memo: string | null
          owner_id: string
          project_id: string | null
          reconciled: boolean
          reconciliation_date: string | null
          reconciliation_id: string | null
          routing_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          amount?: number
          bank_account_id: string
          bank_name?: string | null
          company_address?: string | null
          company_city_state?: string | null
          company_name?: string | null
          created_at?: string
          created_by: string
          deposit_date?: string
          deposit_source_id?: string | null
          id?: string
          memo?: string | null
          owner_id: string
          project_id?: string | null
          reconciled?: boolean
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          routing_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          amount?: number
          bank_account_id?: string
          bank_name?: string | null
          company_address?: string | null
          company_city_state?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string
          deposit_date?: string
          deposit_source_id?: string | null
          id?: string
          memo?: string | null
          owner_id?: string
          project_id?: string | null
          reconciled?: boolean
          reconciliation_date?: string | null
          reconciliation_id?: string | null
          routing_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_deposit_source_id_fkey"
            columns: ["deposit_source_id"]
            isOneToOne: false
            referencedRelation: "deposit_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_files: {
        Row: {
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          issue_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          issue_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_files_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "company_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          description: string | null
          entry_date: string
          id: string
          owner_id: string
          posted_at: string | null
          source_id: string
          source_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          owner_id: string
          posted_at?: string | null
          source_id: string
          source_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_date?: string
          id?: string
          owner_id?: string
          posted_at?: string | null
          source_id?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          cost_code_id: string | null
          created_at: string
          credit: number
          debit: number
          id: string
          journal_entry_id: string
          line_number: number
          memo: string | null
          owner_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          cost_code_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id: string
          line_number?: number
          memo?: string | null
          owner_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          cost_code_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          id?: string
          journal_entry_id?: string
          line_number?: number
          memo?: string | null
          owner_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      pending_bill_lines: {
        Row: {
          account_id: string | null
          account_name: string | null
          amount: number
          cost_code_id: string | null
          cost_code_name: string | null
          created_at: string
          description: string | null
          id: string
          line_number: number
          line_type: string
          memo: string | null
          owner_id: string
          pending_upload_id: string
          project_id: string | null
          project_name: string | null
          quantity: number | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          amount?: number
          cost_code_id?: string | null
          cost_code_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_number?: number
          line_type: string
          memo?: string | null
          owner_id: string
          pending_upload_id: string
          project_id?: string | null
          project_name?: string | null
          quantity?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          amount?: number
          cost_code_id?: string | null
          cost_code_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          line_number?: number
          line_type?: string
          memo?: string | null
          owner_id?: string
          pending_upload_id?: string
          project_id?: string | null
          project_name?: string | null
          quantity?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_bill_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_bill_lines_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_bill_lines_pending_upload_id_fkey"
            columns: ["pending_upload_id"]
            isOneToOne: false
            referencedRelation: "pending_bill_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_bill_lines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_bill_uploads: {
        Row: {
          content_type: string | null
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          owner_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          owner_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          owner_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: []
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
      project_bids: {
        Row: {
          bid_package_id: string
          bid_status: string | null
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          price: number | null
          proposals: string[] | null
          reminder_date: string | null
          reminder_sent_at: string | null
          updated_at: string
        }
        Insert: {
          bid_package_id: string
          bid_status?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          price?: number | null
          proposals?: string[] | null
          reminder_date?: string | null
          reminder_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          bid_package_id?: string
          bid_status?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          price?: number | null
          proposals?: string[] | null
          reminder_date?: string | null
          reminder_sent_at?: string | null
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
      project_budgets: {
        Row: {
          actual_amount: number | null
          cost_code_id: string
          created_at: string
          id: string
          project_id: string
          quantity: number | null
          selected_bid_id: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          cost_code_id: string
          created_at?: string
          id?: string
          project_id: string
          quantity?: number | null
          selected_bid_id?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          cost_code_id?: string
          created_at?: string
          id?: string
          project_id?: string
          quantity?: number | null
          selected_bid_id?: string | null
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
          {
            foreignKeyName: "project_budgets_selected_bid_id_fkey"
            columns: ["selected_bid_id"]
            isOneToOne: false
            referencedRelation: "project_bids"
            referencedColumns: ["id"]
          },
        ]
      }
      project_check_settings: {
        Row: {
          company_address: string | null
          company_city_state: string | null
          company_name: string | null
          created_at: string
          id: string
          last_check_number: number | null
          owner_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_city_state?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          last_check_number?: number | null
          owner_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_city_state?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          last_check_number?: number | null
          owner_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_check_settings_project_id_fkey"
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
      project_po_counters: {
        Row: {
          created_at: string | null
          current_number: number
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_number?: number
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_number?: number
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_po_counters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_purchase_orders: {
        Row: {
          bid_package_id: string | null
          company_id: string
          cost_code_id: string
          created_at: string
          created_by: string
          extra: boolean
          files: Json | null
          id: string
          notes: string | null
          po_number: string | null
          project_id: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          bid_package_id?: string | null
          company_id: string
          cost_code_id: string
          created_at?: string
          created_by?: string
          extra?: boolean
          files?: Json | null
          id?: string
          notes?: string | null
          po_number?: string | null
          project_id: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          bid_package_id?: string | null
          company_id?: string
          cost_code_id?: string
          created_at?: string
          created_by?: string
          extra?: boolean
          files?: Json | null
          id?: string
          notes?: string | null
          po_number?: string | null
          project_id?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_purchase_orders_bid_package_id_fkey"
            columns: ["bid_package_id"]
            isOneToOne: false
            referencedRelation: "project_bid_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedule_tasks: {
        Row: {
          confirmed: boolean | null
          created_at: string
          duration: number
          end_date: string
          hierarchy_number: string | null
          id: string
          notes: string | null
          predecessor: Json | null
          progress: number | null
          project_id: string
          resources: string | null
          start_date: string
          task_name: string
          updated_at: string
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          duration?: number
          end_date: string
          hierarchy_number?: string | null
          id?: string
          notes?: string | null
          predecessor?: Json | null
          progress?: number | null
          project_id: string
          resources?: string | null
          start_date: string
          task_name: string
          updated_at?: string
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
          duration?: number
          end_date?: string
          hierarchy_number?: string | null
          id?: string
          notes?: string | null
          predecessor?: Json | null
          progress?: number | null
          project_id?: string
          resources?: string | null
          start_date?: string
          task_name?: string
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
          accounting_manager: string | null
          address: string
          construction_manager: string | null
          created_at: string
          id: string
          owner_id: string
          status: string
          total_lots: number | null
          updated_at: string
        }
        Insert: {
          accounting_manager?: string | null
          address: string
          construction_manager?: string | null
          created_at?: string
          id?: string
          owner_id: string
          status: string
          total_lots?: number | null
          updated_at?: string
        }
        Update: {
          accounting_manager?: string | null
          address?: string
          construction_manager?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          total_lots?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_manager_user"
            columns: ["construction_manager"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_links: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          expires_at: string
          id: string
          share_id: string
          share_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          expires_at: string
          id?: string
          share_id: string
          share_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          expires_at?: string
          id?: string
          share_id?: string
          share_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      takeoff_annotations: {
        Row: {
          annotation_type: string
          color: string | null
          created_at: string
          geometry: Json
          id: string
          label: string | null
          layer_name: string | null
          owner_id: string
          takeoff_item_id: string | null
          takeoff_sheet_id: string
          updated_at: string
          visible: boolean | null
        }
        Insert: {
          annotation_type: string
          color?: string | null
          created_at?: string
          geometry: Json
          id?: string
          label?: string | null
          layer_name?: string | null
          owner_id: string
          takeoff_item_id?: string | null
          takeoff_sheet_id: string
          updated_at?: string
          visible?: boolean | null
        }
        Update: {
          annotation_type?: string
          color?: string | null
          created_at?: string
          geometry?: Json
          id?: string
          label?: string | null
          layer_name?: string | null
          owner_id?: string
          takeoff_item_id?: string | null
          takeoff_sheet_id?: string
          updated_at?: string
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_annotations_takeoff_item_id_fkey"
            columns: ["takeoff_item_id"]
            isOneToOne: false
            referencedRelation: "takeoff_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_annotations_takeoff_sheet_id_fkey"
            columns: ["takeoff_sheet_id"]
            isOneToOne: false
            referencedRelation: "takeoff_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_items: {
        Row: {
          category: string
          color: string | null
          cost_code_id: string | null
          created_at: string
          description: string | null
          id: string
          item_type: string
          notes: string | null
          owner_id: string
          quantity: number
          takeoff_sheet_id: string
          total_cost: number | null
          unit_of_measure: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          category: string
          color?: string | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_type: string
          notes?: string | null
          owner_id: string
          quantity?: number
          takeoff_sheet_id: string
          total_cost?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string | null
          cost_code_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_type?: string
          notes?: string | null
          owner_id?: string
          quantity?: number
          takeoff_sheet_id?: string
          total_cost?: number | null
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_items_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takeoff_items_takeoff_sheet_id_fkey"
            columns: ["takeoff_sheet_id"]
            isOneToOne: false
            referencedRelation: "takeoff_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      takeoff_sheets: {
        Row: {
          ai_processing_height: number | null
          ai_processing_width: number | null
          created_at: string
          drawing_scale: string | null
          file_name: string
          file_path: string
          id: string
          name: string
          owner_id: string
          page_number: number | null
          scale_ratio: number | null
          takeoff_project_id: string
          updated_at: string
        }
        Insert: {
          ai_processing_height?: number | null
          ai_processing_width?: number | null
          created_at?: string
          drawing_scale?: string | null
          file_name: string
          file_path: string
          id?: string
          name: string
          owner_id: string
          page_number?: number | null
          scale_ratio?: number | null
          takeoff_project_id: string
          updated_at?: string
        }
        Update: {
          ai_processing_height?: number | null
          ai_processing_width?: number | null
          created_at?: string
          drawing_scale?: string | null
          file_name?: string
          file_path?: string
          id?: string
          name?: string
          owner_id?: string
          page_number?: number | null
          scale_ratio?: number | null
          takeoff_project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "takeoff_sheets_takeoff_project_id_fkey"
            columns: ["takeoff_project_id"]
            isOneToOne: false
            referencedRelation: "takeoff_projects"
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
          can_access_accounting: boolean
          can_access_manage_bills: boolean
          can_access_reports: boolean
          can_access_transactions: boolean
          created_at: string
          id: string
          receive_bill_payment_alerts: boolean
          sound_notifications_enabled: boolean
          toast_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_accounting?: boolean
          can_access_manage_bills?: boolean
          can_access_reports?: boolean
          can_access_transactions?: boolean
          created_at?: string
          id?: string
          receive_bill_payment_alerts?: boolean
          sound_notifications_enabled?: boolean
          toast_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_accounting?: boolean
          can_access_manage_bills?: boolean
          can_access_reports?: boolean
          can_access_transactions?: boolean
          created_at?: string
          id?: string
          receive_bill_payment_alerts?: boolean
          sound_notifications_enabled?: boolean
          toast_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      vendor_aliases: {
        Row: {
          alias: string
          company_id: string
          created_at: string
          id: string
          normalized_alias: string
          owner_id: string
        }
        Insert: {
          alias: string
          company_id: string
          created_at?: string
          id?: string
          normalized_alias: string
          owner_id: string
        }
        Update: {
          alias?: string
          company_id?: string
          created_at?: string
          id?: string
          normalized_alias?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_aliases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_task_above_atomic: {
        Args: {
          duration_param?: number
          end_date_param: string
          predecessor_param?: Json
          progress_param?: number
          project_id_param: string
          resources_param?: string
          start_date_param: string
          target_hierarchy_param: string
          task_name_param: string
        }
        Returns: string
      }
      approve_employee: { Args: { employee_id: string }; Returns: undefined }
      approve_pending_bill:
        | {
            Args: {
              bill_date_param: string
              due_date_param: string
              notes_param?: string
              pending_upload_id_param: string
              project_id_param: string
              reference_number_param?: string
              terms_param?: string
              vendor_id_param: string
            }
            Returns: string
          }
        | {
            Args: {
              bill_date_param: string
              due_date_param?: string
              notes_param?: string
              pending_upload_id_param: string
              project_id_param: string
              reference_number_param?: string
              review_notes_param?: string
              terms_param?: string
              vendor_id_param: string
            }
            Returns: string
          }
      create_project_task:
        | {
            Args: {
              duration_param?: number
              end_date_param: string
              hierarchy_number_param?: string
              predecessor_param?: string
              progress_param?: number
              project_id_param: string
              resources_param?: string
              start_date_param: string
              task_name_param: string
            }
            Returns: string
          }
        | {
            Args: {
              duration_param?: number
              end_date_param: string
              order_index_param?: number
              parent_id_param?: string
              predecessor_param?: string
              progress_param?: number
              project_id_param: string
              resources_param?: string
              start_date_param: string
              task_name_param: string
            }
            Returns: string
          }
      delete_bill_with_journal_entries: {
        Args: { bill_id_param: string }
        Returns: boolean
      }
      delete_check_with_journal_entries: {
        Args: { check_id_param: string }
        Returns: boolean
      }
      delete_credit_card_with_journal_entries: {
        Args: { credit_card_id_param: string }
        Returns: boolean
      }
      delete_deposit_with_journal_entries: {
        Args: { deposit_id_param: string }
        Returns: boolean
      }
      delete_manual_journal_entry: {
        Args: { journal_entry_id_param: string }
        Returns: boolean
      }
      delete_pending_bill_upload: {
        Args: { upload_id_param: string }
        Returns: boolean
      }
      delete_project_task: { Args: { task_id_param: string }; Returns: boolean }
      extract_address_code: { Args: { address_text: string }; Returns: string }
      generate_po_number: { Args: { p_project_id: string }; Returns: string }
      get_conversation_unread_count: {
        Args: { other_user_id_param: string }
        Returns: number
      }
      get_current_user_company: { Args: never; Returns: string }
      get_current_user_home_builder_id: { Args: never; Returns: string }
      get_current_user_home_builder_info: {
        Args: never
        Returns: {
          home_builder_id: string
          is_employee: boolean
        }[]
      }
      get_home_builders: {
        Args: never
        Returns: {
          company_name: string
          email: string
          id: string
        }[]
      }
      get_pending_employee_approvals: {
        Args: never
        Returns: {
          company_name: string
          created_at: string
          email: string
          id: string
        }[]
      }
      get_project_tasks: {
        Args: { project_id_param: string }
        Returns: {
          confirmed: boolean
          created_at: string
          duration: number
          end_date: string
          id: string
          order_index: number
          parent_id: string
          predecessor: string
          progress: number
          project_id: string
          resources: string
          start_date: string
          task_name: string
          updated_at: string
        }[]
      }
      get_reconciliation_defaults: {
        Args: { bank_account_id: string }
        Returns: {
          beginning_balance: number
          mode: string
          reconciliation_id: string
          source_completed_id: string
          statement_date: string
        }[]
      }
      get_user_role_and_home_builder: {
        Args: { user_id: string }
        Returns: {
          user_home_builder_id: string
          user_role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_conversation_as_read: {
        Args: { other_user_id_param: string }
        Returns: undefined
      }
      mark_message_as_read: {
        Args: { message_id_param: string }
        Returns: undefined
      }
      normalize_po_file_elem: {
        Args: { elem: Json; project_id: string }
        Returns: Json
      }
      reject_pending_bill: {
        Args: { pending_upload_id_param: string; review_notes_param?: string }
        Returns: boolean
      }
      reorder_project_tasks: {
        Args: {
          new_order_index_param: number
          new_parent_id_param?: string
          project_id_param?: string
          task_id_param: string
        }
        Returns: boolean
      }
      update_project_task:
        | {
            Args: {
              duration_param?: number
              end_date_param?: string
              hierarchy_number_param?: string
              id_param: string
              predecessor_param?: string
              progress_param?: number
              resources_param?: string
              start_date_param?: string
              task_name_param?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              duration_param?: number
              end_date_param?: string
              id_param: string
              order_index_param?: number
              parent_id_param?: string
              predecessor_param?: string
              progress_param?: number
              resources_param?: string
              start_date_param?: string
              task_name_param?: string
            }
            Returns: boolean
          }
      update_project_task_by_number: {
        Args: {
          duration_param?: number
          end_date_param?: string
          order_index_param?: number
          parent_id_param?: string
          predecessor_param?: string
          progress_param?: number
          project_id_param: string
          resources_param?: string
          start_date_param?: string
          task_name_param?: string
          task_number_param: number
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      app_role: "owner" | "accountant" | "employee"
      bill_line_type: "job_cost" | "expense"
      bill_status: "draft" | "posted" | "void" | "paid"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      app_role: ["owner", "accountant", "employee"],
      bill_line_type: ["job_cost", "expense"],
      bill_status: ["draft", "posted", "void", "paid"],
      user_type: ["home_builder", "employee"],
    },
  },
} as const
