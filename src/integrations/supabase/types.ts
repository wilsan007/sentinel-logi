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
          signature_proof: string | null
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
          signature_proof?: string | null
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
          signature_proof?: string | null
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
      djibouti_holidays: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      exceptional_access_requests: {
        Row: {
          admin_response: string | null
          created_at: string
          id: string
          location_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          requested_by: string
          status: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          id?: string
          location_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          requested_by: string
          status?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          id?: string
          location_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptional_access_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptional_access_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
          },
        ]
      }
      exceptional_submission_access: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          is_active: boolean | null
          location_id: string
          reason: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          is_active?: boolean | null
          location_id: string
          reason: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          is_active?: boolean | null
          location_id?: string
          reason?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptional_submission_access_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exceptional_submission_access_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
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
          qr_code: string | null
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
          qr_code?: string | null
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
          qr_code?: string | null
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
          {
            foreignKeyName: "inventory_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
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
            foreignKeyName: "item_variants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
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
          qr_code: string | null
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
          qr_code?: string | null
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
          qr_code?: string | null
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
          {
            foreignKeyName: "personnel_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
          },
        ]
      }
      procurement_order_items: {
        Row: {
          created_at: string | null
          id: string
          item_status: string | null
          notes: string | null
          order_id: string
          quantity_accepted: number | null
          quantity_ordered: number
          quantity_received: number | null
          quantity_rejected: number | null
          rejection_reason: string | null
          stock_item_id: string
          total_price: number | null
          unit_price: number | null
          variant_specs: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_status?: string | null
          notes?: string | null
          order_id: string
          quantity_accepted?: number | null
          quantity_ordered: number
          quantity_received?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
          stock_item_id: string
          total_price?: number | null
          unit_price?: number | null
          variant_specs?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_status?: string | null
          notes?: string | null
          order_id?: string
          quantity_accepted?: number | null
          quantity_ordered?: number
          quantity_received?: number | null
          quantity_rejected?: number | null
          rejection_reason?: string | null
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
          invoice_amount: number | null
          invoice_date: string | null
          invoice_number: string | null
          location_id: string
          notes: string | null
          order_number: string
          payment_date: string | null
          payment_order_date: string | null
          payment_order_number: string | null
          payment_reference: string | null
          payment_slip_date: string | null
          payment_slip_number: string | null
          port_of_entry: string | null
          stage: Database["public"]["Enums"]["procurement_stage"] | null
          supplier_id: string | null
          total_amount: number | null
          tracking_number: string | null
          transport_mode: Database["public"]["Enums"]["transport_mode"] | null
          treasury_payment_date: string | null
          updated_at: string | null
          verification_notes: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          verified_by: string | null
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
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          location_id: string
          notes?: string | null
          order_number: string
          payment_date?: string | null
          payment_order_date?: string | null
          payment_order_number?: string | null
          payment_reference?: string | null
          payment_slip_date?: string | null
          payment_slip_number?: string | null
          port_of_entry?: string | null
          stage?: Database["public"]["Enums"]["procurement_stage"] | null
          supplier_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          treasury_payment_date?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
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
          invoice_amount?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          location_id?: string
          notes?: string | null
          order_number?: string
          payment_date?: string | null
          payment_order_date?: string | null
          payment_order_number?: string | null
          payment_reference?: string | null
          payment_slip_date?: string | null
          payment_slip_number?: string | null
          port_of_entry?: string | null
          stage?: Database["public"]["Enums"]["procurement_stage"] | null
          supplier_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          transport_mode?: Database["public"]["Enums"]["transport_mode"] | null
          treasury_payment_date?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
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
            foreignKeyName: "procurement_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "procurement_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_performance"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      procurement_quotes: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          document_url: string | null
          id: string
          is_selected: boolean | null
          notes: string | null
          order_id: string
          received_at: string | null
          supplier_id: string
          updated_at: string | null
          validity_date: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          document_url?: string | null
          id?: string
          is_selected?: boolean | null
          notes?: string | null
          order_id: string
          received_at?: string | null
          supplier_id: string
          updated_at?: string | null
          validity_date?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          document_url?: string | null
          id?: string
          is_selected?: boolean | null
          notes?: string | null
          order_id?: string
          received_at?: string | null
          supplier_id?: string
          updated_at?: string | null
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "procurement_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "view_supplier_performance"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      procurement_stage_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_stage: Database["public"]["Enums"]["procurement_stage"]
          notes: string | null
          order_id: string
          previous_stage:
            | Database["public"]["Enums"]["procurement_stage"]
            | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_stage: Database["public"]["Enums"]["procurement_stage"]
          notes?: string | null
          order_id: string
          previous_stage?:
            | Database["public"]["Enums"]["procurement_stage"]
            | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_stage?: Database["public"]["Enums"]["procurement_stage"]
          notes?: string | null
          order_id?: string
          previous_stage?:
            | Database["public"]["Enums"]["procurement_stage"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_stage_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "procurement_orders"
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
            foreignKeyName: "requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
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
          type_activite: string | null
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
          type_activite?: string | null
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
          type_activite?: string | null
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
      suspicious_activities: {
        Row: {
          activity_type: string
          description: string
          detected_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          related_id: string | null
          related_table: string
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
        }
        Insert: {
          activity_type: string
          description: string
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          related_id?: string | null
          related_table: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: string
        }
        Update: {
          activity_type?: string
          description?: string
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          related_id?: string | null
          related_table?: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
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
          {
            foreignKeyName: "fk_user_roles_location"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
          },
        ]
      }
      vehicle_authorized_drivers: {
        Row: {
          created_at: string
          id: string
          personnel_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          personnel_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          personnel_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_authorized_drivers_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_authorized_drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          cout: number | null
          created_at: string
          created_by: string | null
          date_emission: string | null
          date_expiration: string | null
          document_type: Database["public"]["Enums"]["vehicle_document_type"]
          document_url: string | null
          id: string
          notes: string | null
          numero_document: string | null
          organisme_emetteur: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cout?: number | null
          created_at?: string
          created_by?: string | null
          date_emission?: string | null
          date_expiration?: string | null
          document_type: Database["public"]["Enums"]["vehicle_document_type"]
          document_url?: string | null
          id?: string
          notes?: string | null
          numero_document?: string | null
          organisme_emetteur?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cout?: number | null
          created_at?: string
          created_by?: string | null
          date_emission?: string | null
          date_expiration?: string | null
          document_type?: Database["public"]["Enums"]["vehicle_document_type"]
          document_url?: string | null
          id?: string
          notes?: string | null
          numero_document?: string | null
          organisme_emetteur?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fuel_logs: {
        Row: {
          conducteur_id: string | null
          cout_total: number
          created_at: string
          date_plein: string
          enregistre_par: string | null
          id: string
          kilometrage: number
          litres: number
          plein_complet: boolean | null
          prix_litre: number
          station: string | null
          vehicle_id: string
        }
        Insert: {
          conducteur_id?: string | null
          cout_total: number
          created_at?: string
          date_plein?: string
          enregistre_par?: string | null
          id?: string
          kilometrage: number
          litres: number
          plein_complet?: boolean | null
          prix_litre: number
          station?: string | null
          vehicle_id: string
        }
        Update: {
          conducteur_id?: string | null
          cout_total?: number
          created_at?: string
          date_plein?: string
          enregistre_par?: string | null
          id?: string
          kilometrage?: number
          litres?: number
          plein_complet?: boolean | null
          prix_litre?: number
          station?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fuel_logs_conducteur_id_fkey"
            columns: ["conducteur_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_incidents: {
        Row: {
          cloture_date: string | null
          cloture_par: string | null
          conducteur_responsable_id: string | null
          cout_estimation: number | null
          cout_reel: number | null
          couvert_assurance: boolean | null
          created_at: string
          date_incident: string
          declare_par: string | null
          degre_responsabilite: string | null
          description: string
          expertise_date: string | null
          expertise_rapport: string | null
          id: string
          lieu: string | null
          montant_franchise: number | null
          notes: string | null
          numero_dossier_assurance: string | null
          photos_urls: string[] | null
          sanctions: string | null
          status: Database["public"]["Enums"]["incident_status"]
          tiers_implique: boolean | null
          tiers_info: Json | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cloture_date?: string | null
          cloture_par?: string | null
          conducteur_responsable_id?: string | null
          cout_estimation?: number | null
          cout_reel?: number | null
          couvert_assurance?: boolean | null
          created_at?: string
          date_incident: string
          declare_par?: string | null
          degre_responsabilite?: string | null
          description: string
          expertise_date?: string | null
          expertise_rapport?: string | null
          id?: string
          lieu?: string | null
          montant_franchise?: number | null
          notes?: string | null
          numero_dossier_assurance?: string | null
          photos_urls?: string[] | null
          sanctions?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          tiers_implique?: boolean | null
          tiers_info?: Json | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cloture_date?: string | null
          cloture_par?: string | null
          conducteur_responsable_id?: string | null
          cout_estimation?: number | null
          cout_reel?: number | null
          couvert_assurance?: boolean | null
          created_at?: string
          date_incident?: string
          declare_par?: string | null
          degre_responsabilite?: string | null
          description?: string
          expertise_date?: string | null
          expertise_rapport?: string | null
          id?: string
          lieu?: string | null
          montant_franchise?: number | null
          notes?: string | null
          numero_dossier_assurance?: string | null
          photos_urls?: string[] | null
          sanctions?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          tiers_implique?: boolean | null
          tiers_info?: Json | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_incidents_conducteur_responsable_id_fkey"
            columns: ["conducteur_responsable_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_incidents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenances: {
        Row: {
          cout: number | null
          created_at: string
          date_entretien: string
          description: string | null
          effectue_par: string | null
          id: string
          kilometrage: number
          prestataire: string | null
          prochain_entretien_date: string | null
          prochain_entretien_km: number | null
          type_entretien: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cout?: number | null
          created_at?: string
          date_entretien: string
          description?: string | null
          effectue_par?: string | null
          id?: string
          kilometrage: number
          prestataire?: string | null
          prochain_entretien_date?: string | null
          prochain_entretien_km?: number | null
          type_entretien: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cout?: number | null
          created_at?: string
          date_entretien?: string
          description?: string | null
          effectue_par?: string | null
          id?: string
          kilometrage?: number
          prestataire?: string | null
          prochain_entretien_date?: string | null
          prochain_entretien_km?: number | null
          type_entretien?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenances_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_repairs: {
        Row: {
          cout_main_oeuvre: number | null
          cout_pieces: number | null
          cout_total: number | null
          created_at: string
          date_debut: string
          date_fin: string | null
          description: string
          effectue_par: string | null
          est_termine: boolean | null
          garage: string | null
          id: string
          kilometrage: number | null
          pieces_changees: string[] | null
          repair_type: Database["public"]["Enums"]["repair_type"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cout_main_oeuvre?: number | null
          cout_pieces?: number | null
          cout_total?: number | null
          created_at?: string
          date_debut: string
          date_fin?: string | null
          description: string
          effectue_par?: string | null
          est_termine?: boolean | null
          garage?: string | null
          id?: string
          kilometrage?: number | null
          pieces_changees?: string[] | null
          repair_type: Database["public"]["Enums"]["repair_type"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cout_main_oeuvre?: number | null
          cout_pieces?: number | null
          cout_total?: number | null
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          description?: string
          effectue_par?: string | null
          est_termine?: boolean | null
          garage?: string | null
          id?: string
          kilometrage?: number | null
          pieces_changees?: string[] | null
          repair_type?: Database["public"]["Enums"]["repair_type"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_repairs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          annee: number | null
          assurance_dossier_numero: string | null
          capacite_reservoir: number | null
          carte_grise_numero: string | null
          conducteur_principal_id: string | null
          consommation_moyenne: number | null
          couleur: string | null
          created_at: string
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          immatriculation: string
          kilometrage_actuel: number
          location_id: string | null
          marque: string
          modele: string
          notes: string | null
          qr_code: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vin: string | null
        }
        Insert: {
          annee?: number | null
          assurance_dossier_numero?: string | null
          capacite_reservoir?: number | null
          carte_grise_numero?: string | null
          conducteur_principal_id?: string | null
          consommation_moyenne?: number | null
          couleur?: string | null
          created_at?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          immatriculation: string
          kilometrage_actuel?: number
          location_id?: string | null
          marque: string
          modele: string
          notes?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          vin?: string | null
        }
        Update: {
          annee?: number | null
          assurance_dossier_numero?: string | null
          capacite_reservoir?: number | null
          carte_grise_numero?: string | null
          conducteur_principal_id?: string | null
          consommation_moyenne?: number | null
          couleur?: string | null
          created_at?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          immatriculation?: string
          kilometrage_actuel?: number
          location_id?: string | null
          marque?: string
          modele?: string
          notes?: string | null
          qr_code?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_conducteur_principal_id_fkey"
            columns: ["conducteur_principal_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "view_camp_consumption_rate"
            referencedColumns: ["location_id"]
          },
        ]
      }
    }
    Views: {
      view_camp_consumption_rate: {
        Row: {
          avg_daily_consumption: number | null
          camp_name: string | null
          days_with_distribution: number | null
          food_category: string | null
          food_subtype: string | null
          location_id: string | null
          max_daily_consumption: number | null
          min_daily_consumption: number | null
          total_quantity_90_days: number | null
        }
        Relationships: []
      }
      view_supplier_performance: {
        Row: {
          avg_delivery_days: number | null
          completed_orders: number | null
          country: string | null
          current_rating: Database["public"]["Enums"]["supplier_rating"] | null
          is_active: boolean | null
          late_deliveries: number | null
          on_time_delivery_rate: number | null
          supplier_code: string | null
          supplier_id: string | null
          supplier_name: string | null
          total_order_value: number | null
          total_orders: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_test_user_roles: { Args: never; Returns: undefined }
      distribute_food_fifo: {
        Args: {
          p_amount_needed: number
          p_item_variant_id: string
          p_location_id: string
        }
        Returns: Json
      }
      get_camp_consumption_rate: {
        Args: { p_location_id?: string }
        Returns: {
          avg_daily_consumption: number
          camp_name: string
          days_with_distribution: number
          food_category: string
          food_subtype: string
          location_id: string
          max_daily_consumption: number
          min_daily_consumption: number
          total_quantity_90_days: number
        }[]
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
      get_supplier_performance: {
        Args: { p_supplier_id?: string }
        Returns: {
          avg_delivery_days: number
          completed_orders: number
          country: string
          current_rating: Database["public"]["Enums"]["supplier_rating"]
          is_active: boolean
          late_deliveries: number
          on_time_delivery_rate: number
          supplier_code: string
          supplier_id: string
          supplier_name: string
          total_order_value: number
          total_orders: number
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
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_chef_camp: { Args: { _user_id?: string }; Returns: boolean }
      is_national_supplier: {
        Args: { p_supplier_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin_central" | "chef_camp"
      category_type: "GEAR" | "FOOD"
      fuel_type: "ESSENCE" | "DIESEL" | "GPL"
      gender_type: "homme" | "femme" | "unisexe"
      incident_status: "DECLARE" | "EN_EXPERTISE" | "EN_REPARATION" | "CLOTURE"
      procurement_stage:
        | "DRAFT"
        | "SUPPLIER_SELECTION"
        | "ORDER_PLACED"
        | "PAYMENT_VERIFIED"
        | "IN_TRANSIT"
        | "CUSTOMS_ENTRY"
        | "QUOTE_REQUEST"
        | "QUOTE_SELECTION"
        | "INVOICE_RECEIVED"
        | "DELIVERY_PENDING"
        | "VERIFICATION"
        | "PAYMENT_ORDER"
        | "PAYMENT_TRACKING"
        | "PAID"
        | "RECEIVED"
        | "CANCELLED"
      repair_type: "LEGERE" | "LOURDE"
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
      vehicle_document_type:
        | "ASSURANCE"
        | "CARTE_GRISE"
        | "CONTROLE_TECHNIQUE"
        | "VIGNETTE"
        | "AUTRE"
      vehicle_status:
        | "OPERATIONNEL"
        | "EN_MAINTENANCE"
        | "EN_REPARATION"
        | "HORS_SERVICE"
        | "EN_MISSION"
      vehicle_type:
        | "VOITURE"
        | "CAMION"
        | "MOTO"
        | "BUS"
        | "UTILITAIRE"
        | "ENGIN_SPECIAL"
      verification_status:
        | "PENDING"
        | "VALIDATED"
        | "ADJUSTED"
        | "PARTIAL_REJECT"
        | "REJECTED"
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
      fuel_type: ["ESSENCE", "DIESEL", "GPL"],
      gender_type: ["homme", "femme", "unisexe"],
      incident_status: ["DECLARE", "EN_EXPERTISE", "EN_REPARATION", "CLOTURE"],
      procurement_stage: [
        "DRAFT",
        "SUPPLIER_SELECTION",
        "ORDER_PLACED",
        "PAYMENT_VERIFIED",
        "IN_TRANSIT",
        "CUSTOMS_ENTRY",
        "QUOTE_REQUEST",
        "QUOTE_SELECTION",
        "INVOICE_RECEIVED",
        "DELIVERY_PENDING",
        "VERIFICATION",
        "PAYMENT_ORDER",
        "PAYMENT_TRACKING",
        "PAID",
        "RECEIVED",
        "CANCELLED",
      ],
      repair_type: ["LEGERE", "LOURDE"],
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
      vehicle_document_type: [
        "ASSURANCE",
        "CARTE_GRISE",
        "CONTROLE_TECHNIQUE",
        "VIGNETTE",
        "AUTRE",
      ],
      vehicle_status: [
        "OPERATIONNEL",
        "EN_MAINTENANCE",
        "EN_REPARATION",
        "HORS_SERVICE",
        "EN_MISSION",
      ],
      vehicle_type: [
        "VOITURE",
        "CAMION",
        "MOTO",
        "BUS",
        "UTILITAIRE",
        "ENGIN_SPECIAL",
      ],
      verification_status: [
        "PENDING",
        "VALIDATED",
        "ADJUSTED",
        "PARTIAL_REJECT",
        "REJECTED",
      ],
    },
  },
} as const
