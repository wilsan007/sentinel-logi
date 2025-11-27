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
          attribue_par: string
          created_at: string
          date_attribution: string
          id: string
          item_variant_id: string
          motif: string
          notes: string | null
          personnel_id: string
          quantite: number
        }
        Insert: {
          attribue_par: string
          created_at?: string
          date_attribution?: string
          id?: string
          item_variant_id: string
          motif: string
          notes?: string | null
          personnel_id: string
          quantite?: number
        }
        Update: {
          attribue_par?: string
          created_at?: string
          date_attribution?: string
          id?: string
          item_variant_id?: string
          motif?: string
          notes?: string | null
          personnel_id?: string
          quantite?: number
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
            foreignKeyName: "allocations_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
        ]
      }
      item_variants: {
        Row: {
          couleur: string | null
          created_at: string
          genre: Database["public"]["Enums"]["gender_type"] | null
          id: string
          location_id: string
          quantite: number
          seuil_alerte: number | null
          stock_item_id: string
          taille: string | null
          type_unite: Database["public"]["Enums"]["unit_type"] | null
          updated_at: string
        }
        Insert: {
          couleur?: string | null
          created_at?: string
          genre?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          location_id: string
          quantite?: number
          seuil_alerte?: number | null
          stock_item_id: string
          taille?: string | null
          type_unite?: Database["public"]["Enums"]["unit_type"] | null
          updated_at?: string
        }
        Update: {
          couleur?: string | null
          created_at?: string
          genre?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          location_id?: string
          quantite?: number
          seuil_alerte?: number | null
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
          photo_url: string | null
          prenom: string
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
          photo_url?: string | null
          prenom: string
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
          photo_url?: string | null
          prenom?: string
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
      request_status: "en_attente" | "approuve" | "traite" | "refuse"
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
      request_status: ["en_attente", "approuve", "traite", "refuse"],
      unit_type: ["kg", "litre", "boite", "unite"],
    },
  },
} as const
