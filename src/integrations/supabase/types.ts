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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      interest_days: {
        Row: {
          account: string
          annual_rate_percent: number
          closing_balance: number
          created_at: string
          id: string
          interest_amount: number
          interest_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string
          annual_rate_percent: number
          closing_balance: number
          created_at?: string
          id?: string
          interest_amount: number
          interest_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string
          annual_rate_percent?: number
          closing_balance?: number
          created_at?: string
          id?: string
          interest_amount?: number
          interest_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interest_dismissed_corrections: {
        Row: {
          dismissed_at: string
          id: string
          month: string
          reason: string | null
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          month: string
          reason?: string | null
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          month?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interest_job_runs: {
        Row: {
          days_processed: number
          error_message: string | null
          id: string
          run_at: string
          status: string
          trigger: string
          user_id: string | null
        }
        Insert: {
          days_processed?: number
          error_message?: string | null
          id?: string
          run_at?: string
          status: string
          trigger: string
          user_id?: string | null
        }
        Update: {
          days_processed?: number
          error_message?: string | null
          id?: string
          run_at?: string
          status?: string
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      interest_rates: {
        Row: {
          account: string
          annual_rate_percent: number
          created_at: string
          effective_from_date: string
          id: string
        }
        Insert: {
          account?: string
          annual_rate_percent: number
          created_at?: string
          effective_from_date: string
          id?: string
        }
        Update: {
          account?: string
          annual_rate_percent?: number
          created_at?: string
          effective_from_date?: string
          id?: string
        }
        Relationships: []
      }
      interest_verifications: {
        Row: {
          computed_amount: number
          id: string
          month: string
          user_id: string
          verified_amount: number
          verified_at: string
        }
        Insert: {
          computed_amount: number
          id?: string
          month: string
          user_id: string
          verified_amount: number
          verified_at?: string
        }
        Update: {
          computed_amount?: number
          id?: string
          month?: string
          user_id?: string
          verified_amount?: number
          verified_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_bank_accounts: {
        Row: {
          account_type: string
          balance: number | null
          bank_name: string
          created_at: string
          id: string
          is_primary: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          balance?: number | null
          bank_name: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          balance?: number | null
          bank_name?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bank_transfers: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          from_account_id: string
          id: string
          to_account_id: string
          transfer_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          from_account_id: string
          id?: string
          to_account_id: string
          transfer_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          from_account_id?: string
          id?: string
          to_account_id?: string
          transfer_date?: string
          user_id?: string
        }
        Relationships: []
      }
      user_expenses: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string
          created_at: string | null
          date: string
          deductions: Json | null
          description: string
          id: number
          notes: string | null
          payment_method: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category: string
          created_at?: string | null
          date: string
          deductions?: Json | null
          description: string
          id?: number
          notes?: string | null
          payment_method?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string
          created_at?: string | null
          date?: string
          deductions?: Json | null
          description?: string
          id?: number
          notes?: string | null
          payment_method?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_financial_goals: {
        Row: {
          bank_account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          saved_amount: number | null
          status: string | null
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string | null
          user_id: string
          wallet_type: string
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          saved_amount?: number | null
          status?: string | null
          target_amount: number
          target_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          wallet_type: string
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          saved_amount?: number | null
          status?: string | null
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          wallet_type?: string
        }
        Relationships: []
      }
      user_income: {
        Row: {
          amount: number
          auto_interest_status: string | null
          bank_account_id: string | null
          category: string
          created_at: string | null
          date: string
          id: number
          is_auto_interest: boolean | null
          is_manually_edited: boolean | null
          notes: string | null
          payment_method: string | null
          source: string
          updated_at: string | null
          user_id: string
          wallet_target: string | null
        }
        Insert: {
          amount: number
          auto_interest_status?: string | null
          bank_account_id?: string | null
          category: string
          created_at?: string | null
          date: string
          id?: number
          is_auto_interest?: boolean | null
          is_manually_edited?: boolean | null
          notes?: string | null
          payment_method?: string | null
          source: string
          updated_at?: string | null
          user_id: string
          wallet_target?: string | null
        }
        Update: {
          amount?: number
          auto_interest_status?: string | null
          bank_account_id?: string | null
          category?: string
          created_at?: string | null
          date?: string
          id?: number
          is_auto_interest?: boolean | null
          is_manually_edited?: boolean | null
          notes?: string | null
          payment_method?: string | null
          source?: string
          updated_at?: string | null
          user_id?: string
          wallet_target?: string | null
        }
        Relationships: []
      }
      user_payment_history: {
        Row: {
          action: string
          amount: number | null
          created_at: string | null
          date: string
          description: string
          details: Json | null
          id: string
          person_name: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          amount?: number | null
          created_at?: string | null
          date: string
          description: string
          details?: Json | null
          id?: string
          person_name: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string | null
          date?: string
          description?: string
          details?: Json | null
          id?: string
          person_name?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_payment_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_udaar_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subwallets: {
        Row: {
          allocation_percentage: number
          balance: number | null
          bank_account_id: string | null
          color: string
          created_at: string | null
          goal_enabled: boolean | null
          goal_target_amount: number | null
          id: number
          name: string
          order_position: number | null
          parent_wallet_id: number | null
          parent_wallet_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allocation_percentage: number
          balance?: number | null
          bank_account_id?: string | null
          color: string
          created_at?: string | null
          goal_enabled?: boolean | null
          goal_target_amount?: number | null
          id?: number
          name: string
          order_position?: number | null
          parent_wallet_id?: number | null
          parent_wallet_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allocation_percentage?: number
          balance?: number | null
          bank_account_id?: string | null
          color?: string
          created_at?: string | null
          goal_enabled?: boolean | null
          goal_target_amount?: number | null
          id?: number
          name?: string
          order_position?: number | null
          parent_wallet_id?: number | null
          parent_wallet_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subwallets_parent_wallet_id_fkey"
            columns: ["parent_wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_udaar_entries: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          description: string
          id: string
          is_partial_payment: boolean | null
          linked_transactions: string[] | null
          original_amount: number | null
          parent_transaction_id: string | null
          person_name: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date: string
          description: string
          id?: string
          is_partial_payment?: boolean | null
          linked_transactions?: string[] | null
          original_amount?: number | null
          parent_transaction_id?: string | null
          person_name: string
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          is_partial_payment?: boolean | null
          linked_transactions?: string[] | null
          original_amount?: number | null
          parent_transaction_id?: string | null
          person_name?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number | null
          bank_account_id: string | null
          color: string
          created_at: string | null
          id: number
          name: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          bank_account_id?: string | null
          color: string
          created_at?: string | null
          id?: number
          name: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          bank_account_id?: string | null
          color?: string
          created_at?: string | null
          id?: number
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
