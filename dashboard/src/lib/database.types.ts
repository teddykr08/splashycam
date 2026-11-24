// Generated from the Supabase project "Splashy Cam" (after migration 0002).
// Regenerate after any schema change rather than editing by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      boxes: {
        Row: {
          delivered_at: string | null;
          created_at: string;
          filled_at: string | null;
          host_id: string;
          id: string;
          opened_at: string;
          shipped_at: string | null;
          status: Database["public"]["Enums"]["box_status"];
          token: string;
          tracking: string | null;
        };
        Insert: {
          delivered_at?: string | null;
          created_at?: string;
          filled_at?: string | null;
          host_id: string;
          id?: string;
          opened_at?: string;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["box_status"];
          token?: string;
          tracking?: string | null;
        };
        Update: {
          delivered_at?: string | null;
          created_at?: string;
          filled_at?: string | null;
          host_id?: string;
          id?: string;
          opened_at?: string;
          shipped_at?: string | null;
          status?: Database["public"]["Enums"]["box_status"];
          token?: string;
          tracking?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "boxes_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory: {
        Row: {
          id: number;
          units_made: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          units_made?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          units_made?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      host_leads: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          instagram: string;
          name: string | null;
          note: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          instagram: string;
          name?: string | null;
          note?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          instagram?: string;
          name?: string | null;
          note?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      host_applications: {
        Row: {
          created_at: string;
          email: string;
          game_starts_on: string;
          game_ends_on: string | null;
          id: string;
          instagram: string;
          name: string;
          player_count: number;
          school: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          game_starts_on: string;
          game_ends_on?: string | null;
          id?: string;
          instagram: string;
          name: string;
          player_count: number;
          school: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          game_starts_on?: string;
          game_ends_on?: string | null;
          id?: string;
          instagram?: string;
          name?: string;
          player_count?: number;
          school?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          created_at: string;
          delivery: string;
          email: string | null;
          host_code: string | null;
          host_id: string | null;
          id: string;
          instagram: string;
          name: string;
          school: string;
        };
        Insert: {
          created_at?: string;
          delivery: string;
          email?: string | null;
          host_code?: string | null;
          host_id?: string | null;
          id?: string;
          instagram: string;
          name: string;
          school: string;
        };
        Update: {
          created_at?: string;
          delivery?: string;
          email?: string | null;
          host_code?: string | null;
          host_id?: string | null;
          id?: string;
          instagram?: string;
          name?: string;
          school?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          source: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          source?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          source?: string;
        };
        Relationships: [];
      };
      hosts: {
        Row: {
          boxes_enabled: boolean;
          school: string | null;
          instagram: string | null;
          dashboard_token: string;
          venmo_handle: string | null;
          code: string;
          created_at: string;
          email: string;
          game_starts_at: string | null;
          id: string;
          name: string;
          ship_to: Json | null;
          user_id: string | null;
        };
        Insert: {
          boxes_enabled?: boolean;
          school?: string | null;
          instagram?: string | null;
          dashboard_token?: string;
          venmo_handle?: string | null;
          code: string;
          created_at?: string;
          email: string;
          game_starts_at?: string | null;
          id?: string;
          name: string;
          ship_to?: Json | null;
          user_id?: string | null;
        };
        Update: {
          boxes_enabled?: boolean;
          school?: string | null;
          instagram?: string | null;
          dashboard_token?: string;
          venmo_handle?: string | null;
          code?: string;
          created_at?: string;
          email?: string;
          game_starts_at?: string | null;
          id?: string;
          name?: string;
          ship_to?: Json | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          tracking: string | null;
          handoff_locked_at: string | null;
          handoff_wrong_count: number;
          handoff_wrong_since: string | null;
          shipped_at: string | null;
          pickup_code: string | null;
          payout_id: string | null;
          handed_off_at: string | null;
          buyer_response: string;
          buyer_responded_at: string | null;
          box_id: string | null;
          buyer_email: string;
          buyer_name: string;
          created_at: string;
          flag: string | null;
          host_cut_cents: number | null;
          host_id: string | null;
          id: string;
          paid_cents: number | null;
          refunded_cents: number;
          ship_to: Json | null;
          shipping: Database["public"]["Enums"]["shipping"];
          shopify_order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          units: number;
        };
        Insert: {
          tracking?: string | null;
          handoff_locked_at?: string | null;
          handoff_wrong_count?: number;
          handoff_wrong_since?: string | null;
          shipped_at?: string | null;
          pickup_code?: string | null;
          payout_id?: string | null;
          handed_off_at?: string | null;
          buyer_response?: string;
          buyer_responded_at?: string | null;
          box_id?: string | null;
          buyer_email: string;
          buyer_name: string;
          created_at?: string;
          flag?: string | null;
          host_cut_cents?: number | null;
          host_id?: string | null;
          id?: string;
          paid_cents?: number | null;
          refunded_cents?: number;
          ship_to?: Json | null;
          shipping: Database["public"]["Enums"]["shipping"];
          shopify_order_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          units: number;
        };
        Update: {
          tracking?: string | null;
          handoff_locked_at?: string | null;
          handoff_wrong_count?: number;
          handoff_wrong_since?: string | null;
          shipped_at?: string | null;
          pickup_code?: string | null;
          payout_id?: string | null;
          handed_off_at?: string | null;
          buyer_response?: string;
          buyer_responded_at?: string | null;
          box_id?: string | null;
          buyer_email?: string;
          buyer_name?: string;
          created_at?: string;
          flag?: string | null;
          host_cut_cents?: number | null;
          host_id?: string | null;
          id?: string;
          paid_cents?: number | null;
          refunded_cents?: number;
          ship_to?: Json | null;
          shipping?: Database["public"]["Enums"]["shipping"];
          shopify_order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          units?: number;
        };
        Relationships: [
          {
            foreignKeyName: "orders_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: {
          note: string | null;
          venmo_handle: string | null;
          week_start: string;
          amount_cents: number;
          created_at: string;
          host_id: string;
          id: string;
          paid_at: string | null;
        };
        Insert: {
          note?: string | null;
          venmo_handle?: string | null;
          week_start: string;
          amount_cents: number;
          created_at?: string;
          host_id: string;
          id?: string;
          paid_at?: string | null;
        };
        Update: {
          note?: string | null;
          venmo_handle?: string | null;
          week_start?: string;
          amount_cents?: number;
          created_at?: string;
          host_id?: string;
          id?: string;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      host_pipeline: {
        Row: {
          dm_at: string | null;
          dm_status: string | null;
          email: string | null;
          filled_form: boolean | null;
          form_at: string | null;
          game_ends_on: string | null;
          game_starts_on: string | null;
          instagram: string | null;
          name: string | null;
          player_count: number | null;
          school: string | null;
          source: string | null;
        };
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: {
      box_status: "open" | "shipped" | "expired";
      order_status: "waiting" | "charged" | "shipped" | "expired" | "cancelled";
      shipping: "box" | "alone";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
