export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      connections_attempts: {
        Row: {
          completed_at: string | null;
          created_at: string;
          event_id: string;
          id: string;
          incorrect_guesses: Json;
          player_id: string;
          puzzle_id: string;
          solved_group_ids: string[];
          tile_map: Json;
          updated_at: string;
          version: number;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          incorrect_guesses?: Json;
          player_id: string;
          puzzle_id: string;
          solved_group_ids?: string[];
          tile_map: Json;
          updated_at?: string;
          version?: number;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          incorrect_guesses?: Json;
          player_id?: string;
          puzzle_id?: string;
          solved_group_ids?: string[];
          tile_map?: Json;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "connections_attempts_player_fkey";
            columns: ["event_id", "player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["event_id", "id"];
          },
          {
            foreignKeyName: "connections_attempts_puzzle_fkey";
            columns: ["event_id", "puzzle_id"];
            isOneToOne: false;
            referencedRelation: "connections_puzzles";
            referencedColumns: ["event_id", "id"];
          },
        ];
      };
      connections_puzzles: {
        Row: {
          created_at: string;
          event_id: string;
          groups: Json;
          id: string;
          public_id: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          groups: Json;
          id?: string;
          public_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          groups?: Json;
          id?: string;
          public_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "connections_puzzles_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          id: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          slug?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          auth_user_id: string;
          created_at: string;
          event_id: string;
          id: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          event_id: string;
          id?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      wordle_puzzles: {
        Row: {
          answer: string;
          created_at: string;
          event_id: string;
          id: string;
          public_id: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          event_id: string;
          id?: string;
          public_id: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          public_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wordle_puzzles_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
