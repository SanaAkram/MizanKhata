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
      profiles: {
        Row: {
          account_type: string
          created_at: string
          full_name: string | null
          id: string
          is_premium: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          created_at?: string
          full_name?: string | null
          id: string
          is_premium?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_premium?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shop_businesses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          logo_color: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id: string
          logo_color?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          logo_color?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      shop_cashbook: {
        Row: {
          amount: number
          bill_id: string | null
          business_id: string | null
          category: string | null
          date: string
          id: string
          method: string
          note: string | null
          owner_id: string
          party_id: string | null
          party_name: string | null
          party_type: string | null
          type: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          business_id?: string | null
          category?: string | null
          date?: string
          id: string
          method?: string
          note?: string | null
          owner_id?: string
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          business_id?: string | null
          category?: string | null
          date?: string
          id?: string
          method?: string
          note?: string | null
          owner_id?: string
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          type?: string
        }
        Relationships: []
      }
      shop_customers: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id: string
          name: string
          owner_id?: string
          phone?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      shop_khata_tx: {
        Row: {
          amount: number
          bill_id: string | null
          business_id: string | null
          customer_id: string
          date: string
          id: string
          note: string | null
          owner_id: string
          ref: string | null
          type: string
        }
        Insert: {
          amount: number
          bill_id?: string | null
          business_id?: string | null
          customer_id: string
          date?: string
          id: string
          note?: string | null
          owner_id?: string
          ref?: string | null
          type: string
        }
        Update: {
          amount?: number
          bill_id?: string | null
          business_id?: string | null
          customer_id?: string
          date?: string
          id?: string
          note?: string | null
          owner_id?: string
          ref?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_khata_tx_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "shop_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_khata_tx_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "shop_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          amount: number
          business_id: string | null
          created_at: string
          delivered_at: string | null
          details: string | null
          direction: string
          due_date: string | null
          id: string
          owner_id: string
          party_id: string | null
          party_name: string | null
          party_type: string | null
          status: string
          title: string
        }
        Insert: {
          amount?: number
          business_id?: string | null
          created_at?: string
          delivered_at?: string | null
          details?: string | null
          direction?: string
          due_date?: string | null
          id: string
          owner_id?: string
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          status?: string
          title?: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          created_at?: string
          delivered_at?: string | null
          details?: string | null
          direction?: string
          due_date?: string | null
          id?: string
          owner_id?: string
          party_id?: string | null
          party_name?: string | null
          party_type?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          low_stock: number
          name: string
          owner_id: string
          purchase_price: number
          sale_price: number
          stock: number
          unit: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id: string
          low_stock?: number
          name: string
          owner_id?: string
          purchase_price?: number
          sale_price?: number
          stock?: number
          unit?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          low_stock?: number
          name?: string
          owner_id?: string
          purchase_price?: number
          sale_price?: number
          stock?: number
          unit?: string
        }
        Relationships: []
      }
      shop_profile: {
        Row: {
          address: string | null
          owner_id: string
          phone: string | null
          shop_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          owner_id?: string
          phone?: string | null
          shop_name?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          owner_id?: string
          phone?: string | null
          shop_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_purchases: {
        Row: {
          business_id: string | null
          date: string
          id: string
          owner_id: string
          price: number
          product_id: string | null
          qty: number
          ref: string | null
        }
        Insert: {
          business_id?: string | null
          date?: string
          id: string
          owner_id?: string
          price: number
          product_id?: string | null
          qty: number
          ref?: string | null
        }
        Update: {
          business_id?: string | null
          date?: string
          id?: string
          owner_id?: string
          price?: number
          product_id?: string | null
          qty?: number
          ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_push_sent: {
        Row: {
          id: string
          owner_id: string
          sent_at: string
        }
        Insert: {
          id: string
          owner_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      shop_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen: string
          owner_id: string
          p256dh: string
          renag_min: number
          tz_offset_min: number
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id: string
          last_seen?: string
          owner_id?: string
          p256dh: string
          renag_min?: number
          tz_offset_min?: number
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen?: string
          owner_id?: string
          p256dh?: string
          renag_min?: number
          tz_offset_min?: number
          user_agent?: string | null
        }
        Relationships: []
      }
      shop_routine_items: {
        Row: {
          active_from: string
          active_to: string
          at_time: string | null
          category: string
          count_unit: string | null
          created_at: string
          days: number[]
          enabled: boolean
          id: string
          interval_min: number | null
          kind: string
          label: string
          owner_id: string
          sort: number
          target_count: number
          window_min: number
        }
        Insert: {
          active_from?: string
          active_to?: string
          at_time?: string | null
          category?: string
          count_unit?: string | null
          created_at?: string
          days?: number[]
          enabled?: boolean
          id: string
          interval_min?: number | null
          kind?: string
          label: string
          owner_id?: string
          sort?: number
          target_count?: number
          window_min?: number
        }
        Update: {
          active_from?: string
          active_to?: string
          at_time?: string | null
          category?: string
          count_unit?: string | null
          created_at?: string
          days?: number[]
          enabled?: boolean
          id?: string
          interval_min?: number | null
          kind?: string
          label?: string
          owner_id?: string
          sort?: number
          target_count?: number
          window_min?: number
        }
        Relationships: []
      }
      shop_routine_log: {
        Row: {
          count: number
          created_at: string
          date: string
          id: string
          item_id: string
          note: string | null
          owner_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          count?: number
          created_at?: string
          date: string
          id: string
          item_id: string
          note?: string | null
          owner_id?: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          id?: string
          item_id?: string
          note?: string | null
          owner_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      shop_sale_items: {
        Row: {
          business_id: string | null
          id: string
          name: string
          owner_id: string
          price: number
          product_id: string | null
          qty: number
          sale_id: string
          unit: string
        }
        Insert: {
          business_id?: string | null
          id: string
          name: string
          owner_id?: string
          price: number
          product_id?: string | null
          qty: number
          sale_id: string
          unit?: string
        }
        Update: {
          business_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          price?: number
          product_id?: string | null
          qty?: number
          sale_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "shop_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sales: {
        Row: {
          business_id: string | null
          created_at: string
          credit_amount: number
          customer_id: string | null
          customer_name: string | null
          discount: number
          has_paper_photo: boolean
          id: string
          method: string
          note: string | null
          owner_id: string
          paid_cash: number
          photo_data_url: string | null
          tax: number
          time: string
          total: number
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          credit_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          has_paper_photo?: boolean
          id: string
          method?: string
          note?: string | null
          owner_id?: string
          paid_cash?: number
          photo_data_url?: string | null
          tax?: number
          time?: string
          total: number
        }
        Update: {
          business_id?: string | null
          created_at?: string
          credit_amount?: number
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          has_paper_photo?: boolean
          id?: string
          method?: string
          note?: string | null
          owner_id?: string
          paid_cash?: number
          photo_data_url?: string | null
          tax?: number
          time?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "shop_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_stock_moves: {
        Row: {
          business_id: string | null
          date: string
          id: string
          kind: string
          note: string | null
          owner_id: string
          party_id: string | null
          party_type: string | null
          product_id: string
          qty: number
          rate: number | null
          ref: string | null
        }
        Insert: {
          business_id?: string | null
          date?: string
          id: string
          kind: string
          note?: string | null
          owner_id?: string
          party_id?: string | null
          party_type?: string | null
          product_id: string
          qty: number
          rate?: number | null
          ref?: string | null
        }
        Update: {
          business_id?: string | null
          date?: string
          id?: string
          kind?: string
          note?: string | null
          owner_id?: string
          party_id?: string | null
          party_type?: string | null
          product_id?: string
          qty?: number
          rate?: number | null
          ref?: string | null
        }
        Relationships: []
      }
      shop_supplier_tx: {
        Row: {
          amount: number
          business_id: string | null
          date: string
          id: string
          note: string | null
          owner_id: string
          ref: string | null
          supplier_id: string
          type: string
        }
        Insert: {
          amount: number
          business_id?: string | null
          date?: string
          id: string
          note?: string | null
          owner_id?: string
          ref?: string | null
          supplier_id: string
          type: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          date?: string
          id?: string
          note?: string | null
          owner_id?: string
          ref?: string | null
          supplier_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_supplier_tx_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "shop_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_suppliers: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id: string
          name: string
          owner_id?: string
          phone?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      shop_work_sessions: {
        Row: {
          created_at: string
          duration_ms: number | null
          end_time: string | null
          id: string
          note: string | null
          owner_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          end_time?: string | null
          id: string
          note?: string | null
          owner_id?: string
          start_time: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          end_time?: string | null
          id?: string
          note?: string | null
          owner_id?: string
          start_time?: string
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
