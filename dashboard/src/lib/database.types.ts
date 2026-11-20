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
          code: string;
          created_at: string;
          email: string;
          game_has_pot: boolean;
          game_starts_at: string | null;
          id: string;
          name: string;
          ship_to: Json | null;
          user_id: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          email: string;
          game_has_pot?: boolean;
          game_starts_at?: string | null;
          id?: string;
          name: string;
          ship_to?: Json | null;
          user_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          email?: string;
          game_has_pot?: boolean;
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
          box_id: string | null;
          buyer_email: string;
          buyer_name: string;
          created_at: string;
          flag: string | null;
          host_cut_cents: number | null;
          host_id: string | null;
          id: string;
          paid_cents: number | null;
          pot_cents: number | null;
          refunded_cents: number;
          ship_alone_if_not_full: boolean;
          ship_to: Json | null;
          shipping: Database["public"]["Enums"]["shipping"];
          shopify_order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          units: number;
        };
        Insert: {
          box_id?: string | null;
          buyer_email: string;
          buyer_name: string;
          created_at?: string;
          flag?: string | null;
          host_cut_cents?: number | null;
          host_id?: string | null;
          id?: string;
          paid_cents?: number | null;
          pot_cents?: number | null;
          refunded_cents?: number;
          ship_alone_if_not_full?: boolean;
          ship_to?: Json | null;
          shipping: Database["public"]["Enums"]["shipping"];
          shopify_order_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          units: number;
        };
        Update: {
          box_id?: string | null;
          buyer_email?: string;
          buyer_name?: string;
          created_at?: string;
          flag?: string | null;
          host_cut_cents?: number | null;
          host_id?: string | null;
          id?: string;
          paid_cents?: number | null;
          pot_cents?: number | null;
          refunded_cents?: number;
          ship_alone_if_not_full?: boolean;
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
          amount_cents: number;
          box_id: string | null;
          created_at: string;
          host_id: string;
          id: string;
          order_id: string | null;
          paid_at: string | null;
        };
        Insert: {
          amount_cents: number;
          box_id?: string | null;
          created_at?: string;
          host_id: string;
          id?: string;
          order_id?: string | null;
          paid_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          box_id?: string | null;
          created_at?: string;
          host_id?: string;
          id?: string;
          order_id?: string | null;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: true;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
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
