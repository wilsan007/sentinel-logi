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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      allocations: {
        Row: {
          actual_return_date: string | null
          attribue_par: string
          created_at: string
          date_attribution: string
          expected_return_date: string | null
          id: string
          is_active: boolean | null
          item_variant_id: string
          justification_text: string | null
          loan_status: string | null
          motif: string
          notes: string | null
          parent_allocation_id: string | null
          personnel_id: string
          quantite: number
          return_reason: Database["public"]["Enums"]["return_reason"] | null
          transaction_type:
            | Database["public"]["Enums"]["transaction_type"]
            | null
        }
        Insert: {
          actual_return_date?: string | null
          attribue_par: string
          created_at?: string
          date_attribution?: string
          expected_return_date?: string | null
          id?: string
          is_active?: boolean | null
          item_variant_id: string
          justification_text?: string | null
          loan_status?: string | null
          motif: string
          notes?: string | null
          parent_allocation_id?: string | null
          personnel_id: string
          quantite?: number
          return_reason?: Database["public"]["Enums"]["return_reason"] | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
        }
        Update: {
          actual_return_date?: string | null
          attribue_par?: string
          created_at?: string
          date_attribution?: string
          expected_return_date?: string | null
          id?: string
          is_active?: boolean | null
          item_variant_id?: string
          justification_text?: string | null
          loan_status?: string | null
          motif?: string
          notes?: string | null
          parent_allocation_id?: string | null
          personnel_id?: string
          quantite?: number
          return_reason?: Database["public"]["Enums"]["return_reason"] | null
          transaction_type?:
            | Database["public"]["Enums"]["transaction_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "allocations_item_variant_id_fkey"
            columns: ["item_variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_parent_allocation_id_fkey"
            columns: ["parent_allocation_id"]
            isOneToOne: false
            referencedRelation: "allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          arrival_date: string
          batch_number: string
          created_at: string | null
          created_by: string | null
          customs_document_ref: string | null
          expiry_date: string | null
          id: string
          is_depleted: boolean | null
          item_variant_id: string
          location_id: string
          original_quantity: number
          quantity: number
          supplier_id: string | null
          supplier_name: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          arrival_date?: string
          batch_number: string
          created_at?: string | null
          created_by?: string | null
          customs_document_ref?: string | null
          expiry_date?: string | null
          id?: string
          is_depleted?: boolean | null
          item_variant_id: string
          location_id: string
          original_quantity: number
          quantity?: number
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          arrival_date?: string
          batch_number?: string
          created_at?: string | null
          created_by?: string | null
          customs_document_ref?: string | null
          expiry_date?: string | null
          id?: string
          is_depleted?: boolean | null
          item_variant_id?: string
          location_id?: string
          original_quantity?: number
          quantity?: number
          supplier_id?: string | null
          supplier_name?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_item_variant_id_fkey"
            columns: ["item_variant_id"]
            isOneToOne: false
            referencedRelation: "item_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_variants: {
        Row: {
          couleur: string | null
          created_at: string
          female_only: boolean | null
          genre: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_unisex: boolean | null
          item_constraints: Json | null
          location_id: string
          male_only: boolean | null
          quantite: number
          requires_gender: boolean | null
          requires_size: boolean | null
          seuil_alerte: number | null
          sizing_standard: Database["public"]["Enums"]["sizing_standard"] | null
          stock_item_id: string
          taille: string | null
          type_unite: Database["public"]["Enums"]["unit_type"] | null
          updated_at: string
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          female_only?: boolean | null
          genre?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_unisex?: boolean | null
          item_constraints?: Json | null
          location_id: string
          male_only?: boolean | null
          quantite?: number
          requires_gender?: boolean | null
          requires_size?: boolean | null
          seuil_alerte?: number | null
          sizing_standard?:
            | Database["public"]["Enums"]["sizing_standard"]
            | null
          stock_item_id: string
          taille?: string | null
          type_unite?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string
        }
        Update: {
          couleur?: string | null
          created_at?: string
          female_only?: boolean | null
          genre?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_unisex?: boolean | null
          item_constraints?: Json | null
          location_id?: string
          male_only?: boolean | null
          quantite?: number
          requires_gender?: boolean | null
          requires_size?: boolean | null
          seuil_alerte?: number | null
          sizing_standard?:
            | Database["public"]["Enums"]["sizing_standard"]
            | null
          stock_item_id?: string
          taille?: string | null
          type_unite?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_variants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_variants_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          adresse: string | null
          chef_id: string | null
          code: string
          created_at: string
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          chef_id?: string | null
          code: string
          created_at?: string
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          chef_id?: string | null
          code?: string
          created_at?: string
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      personnel: {
        Row: {
          actif: boolean
          created_at: string
          date_entree: string
          grade: string
          id: string
          location_id: string
          matricule: string
          nom: string
          notes_tailles: string | null
          photo_url: string | null
          pointure_chaussures: string | null
          prenom: string
          sexe: Database["public"]["Enums"]["gender_type"] | null
          taille_beret: string | null
          taille_casquette: string | null
          taille_chapeau: string | null
          taille_chaussettes: string | null
          taille_chemise: string | null
          taille_pantalon: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          date_entree?: string
          grade: string
          id?: string
          location_id: string
          matricule: string
          nom: string
          notes_tailles?: string | null
          photo_url?: string | null
          pointure_chaussures?: string | null
          prenom: string
          sexe?: Database["public"]["Enums"]["gender_type"] | null
          taille_beret?: string | null
          taille_casquette?: string | null
          taille_chapeau?: string | null
          taille_chaussettes?: string | null
          taille_chemise?: string | null
          taille_pantalon?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          date_entree?: string
          grade?: string
          id?: string
          location_id?: string
          matricule?: string
          nom?: string
          notes_tailles?: string | null
          photo_url?: string | null
          pointure_chaussures?: string | null
          prenom?: string
          sexe?: Database["public"]["Enums"]["gender_type"] | null
          taille_beret?: string | null
          taille_casquette?: string | null
          taille_chapeau?: string | null
          taille_chaussettes?: string | null
          taille_chemise?: string | null
          taille_pantalon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnel_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_order_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          quantity_ordered: number
          quantity_received: number | null
          stock_item_id: string
          total_price: number | null
          unit_price: number | null
          variant_specs: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          stock_item_id: string
          total_price?: number | null
          unit_price?: number | null
          variant_specs?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          stock_item_id?: string
          total_price?: number | null
          unit_price?: number | null
          variant_specs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "procurement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_order_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customs_entry_date: string | null
          expected_delivery_date: string | null
          id: string
          location_id: string
          notes: string | null
          order_number: string
          payment_date: string | null
          payment_reference: string | null
          port_of_entry: string | null
          stage: Database["public"]["Enums"]["procurement_stage"] | null
          supplier_id: string | null
          total_amount: number | null
          tracking_number: string | null
          transport_mode: Database["public"]["Enums"]["transport_mode"] | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customs_entry_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id: string
          notes?: string | null
          order_number: string
          payment_date?: string | null
          payment_reference?: string | null
          port_of_entry?: string | null
          stage?: Database["public"]["Enums"]["procurement_stage"] | null
          supplier_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customs_entry_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          order_number?: string
          payment_date?: string | null
          payment_reference?: string | null
          port_of_entry?: string | null
          stage?: Database["public"]["Enums"]["procurement_stage"] | null
          supplier_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nom_complet: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nom_complet: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom_complet?: string
          updated_at?: string
        }
        Relationships: []
      }
      requests: {
        Row: {
          approuve_par: string | null
          created_at: string
          date_demande: string
          date_traitement: string | null
          demande_par: string
          id: string
          location_id: string
          notes: string | null
          quantite_demandee: number
          statut: Database["public"]["Enums"]["request_status"]
          stock_item_id: string
          updated_at: string
        }
        Insert: {
          approuve_par?: string | null
          created_at?: string
          date_demande?: string
          date_traitement?: string | null
          demande_par: string
          id?: string
          location_id: string
          notes?: string | null
          quantite_demandee: number
          statut?: Database["public"]["Enums"]["request_status"]
          stock_item_id: string
          updated_at?: string
        }
        Update: {
          approuve_par?: string | null
          created_at?: string
          date_demande?: string
          date_traitement?: string | null
          demande_par?: string
          id?: string
          location_id?: string
          notes?: string | null
          quantite_demandee?: number
          statut?: Database["public"]["Enums"]["request_status"]
          stock_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          categorie: Database["public"]["Enums"]["category_type"]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          sous_type: string | null
          type: string
          updated_at: string
        }
        Insert: {
          categorie: Database["public"]["Enums"]["category_type"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          sous_type?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          categorie?: Database["public"]["Enums"]["category_type"]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          sous_type?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          avg_delivery_days: number | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          on_time_delivery_rate: number | null
          payment_terms: string | null
          rating: Database["public"]["Enums"]["supplier_rating"] | null
          total_orders_completed: number | null
          updated_at: string | null
        }
        Insert: {
          avg_delivery_days?: number | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          on_time_delivery_rate?: number | null
          payment_terms?: string | null
          rating?: Database["public"]["Enums"]["supplier_rating"] | null
          total_orders_completed?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_delivery_days?: number | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          on_time_delivery_rate?: number | null
          payment_terms?: string | null
          rating?: Database["public"]["Enums"]["supplier_rating"] | null
          total_orders_completed?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      distribute_food_fifo: {
        Args: {
          p_amount_needed: number
          p_item_variant_id: string
          p_location_id: string
        }
        Returns: Json
      }
      get_expiring_batches: {
        Args: { days_ahead?: number }
        Returns: {
          batch_id: string
          batch_number: string
          days_until_expiry: number
          expiry_date: string
          item_type: string
          location_nom: string
          quantity: number
        }[]
      }
      get_overdue_loans: {
        Args: { p_location_id?: string }
        Returns: {
          allocation_id: string
          days_overdue: number
          expected_return_date: string
          item_subtype: string
          item_type: string
          personnel_nom: string
          personnel_prenom: string
        }[]
      }
      get_user_location: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin_central" | "chef_camp"
      category_type: "GEAR" | "FOOD"
      gender_type: "homme" | "femme" | "unisexe"
      procurement_stage:
        | "DRAFT"
        | "SUPPLIER_SELECTION"
        | "ORDER_PLACED"
        | "PAYMENT_VERIFIED"
        | "IN_TRANSIT"
        | "CUSTOMS_ENTRY"
        | "RECEIVED"
        | "CANCELLED"
      request_status: "en_attente" | "approuve" | "traite" | "refuse"
      return_reason:
        | "RETIRED"
        | "REVOKED"
        | "REFORMED"
        | "DAMAGED_EXCHANGE"
        | "SIZE_EXCHANGE"
        | "END_OF_LOAN"
      sizing_standard: "EU" | "US" | "ASIAN" | "UNIVERSAL"
      supplier_rating: "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR" | "BLACKLISTED"
      transaction_type:
        | "PERMANENT_ISSUE"
        | "LOAN"
        | "RETURN"
        | "EMERGENCY_DISTRIBUTION"
      transport_mode: "AIR" | "SEA" | "LAND" | "MULTIMODAL"
      unit_type: "kg" | "litre" | "boite" | "unite"
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
      app_role: ["admin_central", "chef_camp"],
      category_type: ["GEAR", "FOOD"],
      gender_type: ["homme", "femme", "unisexe"],
      procurement_stage: [
        "DRAFT",
        "SUPPLIER_SELECTION",
        "ORDER_PLACED",
        "PAYMENT_VERIFIED",
        "IN_TRANSIT",
        "CUSTOMS_ENTRY",
        "RECEIVED",
        "CANCELLED",
      ],
      request_status: ["en_attente", "approuve", "traite", "refuse"],
      return_reason: [
        "RETIRED",
        "REVOKED",
        "REFORMED",
        "DAMAGED_EXCHANGE",
        "SIZE_EXCHANGE",
        "END_OF_LOAN",
      ],
      sizing_standard: ["EU", "US", "ASIAN", "UNIVERSAL"],
      supplier_rating: ["EXCELLENT", "GOOD", "AVERAGE", "POOR", "BLACKLISTED"],
      transaction_type: [
        "PERMANENT_ISSUE",
        "LOAN",
        "RETURN",
        "EMERGENCY_DISTRIBUTION",
      ],
      transport_mode: ["AIR", "SEA", "LAND", "MULTIMODAL"],
      unit_type: ["kg", "litre", "boite", "unite"],
    },
  },
} as const
