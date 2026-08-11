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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance_sessions: {
        Row: {
          church_name: string | null
          created_at: string
          display_name: string | null
          duration_seconds: number
          id: string
          joined_at: string
          kc_handle: string | null
          last_seen_at: string
          left_at: string | null
          meeting_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          church_name?: string | null
          created_at?: string
          display_name?: string | null
          duration_seconds?: number
          id?: string
          joined_at?: string
          kc_handle?: string | null
          last_seen_at?: string
          left_at?: string | null
          meeting_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          church_name?: string | null
          created_at?: string
          display_name?: string | null
          duration_seconds?: number
          id?: string
          joined_at?: string
          kc_handle?: string | null
          last_seen_at?: string
          left_at?: string | null
          meeting_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_name: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          church_name: string | null
          created_at: string
          display_name: string
          id: string
          meeting_id: string
          message: string
          status: Database["public"]["Enums"]["message_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          church_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          meeting_id: string
          message: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          church_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          meeting_id?: string
          message?: string
          status?: Database["public"]["Enums"]["message_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          branch: string | null
          church_code: string | null
          created_at: string
          id: string
          location: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          branch?: string | null
          church_code?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch?: string | null
          church_code?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          chat_enabled: boolean
          created_at: string
          description: string | null
          embed_url: string | null
          ended_at: string | null
          hand_raise_enabled: boolean
          host_id: string | null
          host_name: string | null
          id: string
          questions_enabled: boolean
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          stream_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chat_enabled?: boolean
          created_at?: string
          description?: string | null
          embed_url?: string | null
          ended_at?: string | null
          hand_raise_enabled?: boolean
          host_id?: string | null
          host_name?: string | null
          id?: string
          questions_enabled?: boolean
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          stream_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chat_enabled?: boolean
          created_at?: string
          description?: string | null
          embed_url?: string | null
          ended_at?: string | null
          hand_raise_enabled?: boolean
          host_id?: string | null
          host_name?: string | null
          id?: string
          questions_enabled?: boolean
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          stream_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          church_email: string | null
          church_id: string | null
          church_name: string | null
          created_at: string
          first_name: string
          id: string
          kc_handle: string
          last_login_at: string | null
          last_name: string
          phone: string | null
          photo_url: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          church_email?: string | null
          church_id?: string | null
          church_name?: string | null
          created_at?: string
          first_name?: string
          id: string
          kc_handle: string
          last_login_at?: string | null
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          church_email?: string | null
          church_id?: string | null
          church_name?: string | null
          created_at?: string
          first_name?: string
          id?: string
          kc_handle?: string
          last_login_at?: string | null
          last_name?: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answered_at: string | null
          answered_by: string | null
          church_name: string | null
          created_at: string
          display_name: string
          id: string
          meeting_id: string
          question: string
          status: Database["public"]["Enums"]["question_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          answered_by?: string | null
          church_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          meeting_id: string
          question: string
          status?: Database["public"]["Enums"]["question_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_at?: string | null
          answered_by?: string | null
          church_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          meeting_id?: string
          question?: string
          status?: Database["public"]["Enums"]["question_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      raised_hands: {
        Row: {
          acknowledged_at: string | null
          answered_at: string | null
          church_name: string | null
          created_at: string
          display_name: string
          id: string
          meeting_id: string
          raised_at: string
          status: Database["public"]["Enums"]["hand_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          answered_at?: string | null
          church_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          meeting_id: string
          raised_at?: string
          status?: Database["public"]["Enums"]["hand_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          answered_at?: string | null
          church_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          meeting_id?: string
          raised_at?: string
          status?: Database["public"]["Enums"]["hand_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raised_hands_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_configurations: {
        Row: {
          connection_status: string
          created_at: string
          embed_url: string | null
          id: string
          is_default: boolean
          playback_type: string
          provider: string
          stream_url: string | null
          updated_at: string
        }
        Insert: {
          connection_status?: string
          created_at?: string
          embed_url?: string | null
          id?: string
          is_default?: boolean
          playback_type?: string
          provider?: string
          stream_url?: string | null
          updated_at?: string
        }
        Update: {
          connection_status?: string
          created_at?: string
          embed_url?: string | null
          id?: string
          is_default?: boolean
          playback_type?: string
          provider?: string
          stream_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "meeting_manager"
        | "host"
        | "moderator"
        | "participant"
      attendance_status: "in_meeting" | "idle" | "left_meeting" | "logged_out"
      hand_status:
        | "raised"
        | "acknowledged"
        | "answered"
        | "lowered"
        | "dismissed"
      meeting_status:
        | "scheduled"
        | "starting_soon"
        | "live"
        | "ended"
        | "archived"
      message_status: "visible" | "hidden" | "deleted" | "pinned"
      question_status: "pending" | "answered" | "dismissed"
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
      app_role: [
        "super_admin",
        "admin",
        "meeting_manager",
        "host",
        "moderator",
        "participant",
      ],
      attendance_status: ["in_meeting", "idle", "left_meeting", "logged_out"],
      hand_status: [
        "raised",
        "acknowledged",
        "answered",
        "lowered",
        "dismissed",
      ],
      meeting_status: [
        "scheduled",
        "starting_soon",
        "live",
        "ended",
        "archived",
      ],
      message_status: ["visible", "hidden", "deleted", "pinned"],
      question_status: ["pending", "answered", "dismissed"],
    },
  },
} as const
