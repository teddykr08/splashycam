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
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      box_status: "open" | "shipped" | "expired";
      order_status: "waiting" | "charged" | "shipped" | "expired" | "cancelled";
      shipping: "box" | "alone";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
