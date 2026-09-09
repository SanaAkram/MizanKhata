export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      shop_cashbook: {
        Row: {
          amount: number
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
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          owner_id?: string
          phone?: string | null
        }
        Update: {
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
      shop_products: {
        Row: {
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
          date: string
          id: string
          owner_id: string
          price: number
          product_id: string | null
          qty: number
          ref: string | null
        }
        Insert: {
          date?: string
          id: string
          owner_id?: string
          price: number
          product_id?: string | null
          qty: number
          ref?: string | null
        }
        Update: {
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
      shop_routine_items: {
        Row: {
          at_time: string
          category: string
          created_at: string
          days: number[]
          enabled: boolean
          id: string
          label: string
          owner_id: string
          sort: number
          window_min: number
        }
        Insert: {
          at_time: string
          category?: string
          created_at?: string
          days?: number[]
          enabled?: boolean
          id: string
          label: string
          owner_id?: string
          sort?: number
          window_min?: number
        }
        Update: {
          at_time?: string
          category?: string
          created_at?: string
          days?: number[]
          enabled?: boolean
          id?: string
          label?: string
          owner_id?: string
          sort?: number
          window_min?: number
        }
        Relationships: []
      }
      shop_routine_log: {
        Row: {
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
          created_at: string
          id: string
          name: string
          owner_id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          owner_id?: string
          phone?: string | null
        }
        Update: {
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
