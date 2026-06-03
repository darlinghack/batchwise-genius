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
      batches: {
        Row: {
          course_name: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["batch_status"]
          trainer_id: string
          trainer_name: string
          updated_at: string
        }
        Insert: {
          course_name: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          trainer_id: string
          trainer_name?: string
          updated_at?: string
        }
        Update: {
          course_name?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          trainer_id?: string
          trainer_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_index: number
          created_at: string
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          explanation: string
          id: string
          options: Json
          position: number
          question_text: string
          quiz_id: string
        }
        Insert: {
          correct_index?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          explanation?: string
          id?: string
          options?: Json
          position?: number
          question_text: string
          quiz_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          explanation?: string
          id?: string
          options?: Json
          position?: number
          question_text?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_templates: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          duration_minutes: number
          id: string
          num_questions: number
          source_quiz_id: string | null
          title: string
          topic_name: string
          trainer_id: string
          type: Database["public"]["Enums"]["quiz_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          duration_minutes?: number
          id?: string
          num_questions?: number
          source_quiz_id?: string | null
          title: string
          topic_name?: string
          trainer_id: string
          type?: Database["public"]["Enums"]["quiz_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          duration_minutes?: number
          id?: string
          num_questions?: number
          source_quiz_id?: string | null
          title?: string
          topic_name?: string
          trainer_id?: string
          type?: Database["public"]["Enums"]["quiz_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_templates_source_quiz_id_fkey"
            columns: ["source_quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          batch_id: string | null
          cloned_from_quiz_id: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          duration_minutes: number
          id: string
          num_questions: number
          share_code: string
          source_template_id: string | null
          status: Database["public"]["Enums"]["quiz_status"]
          title: string
          topic_id: string | null
          topic_name: string
          trainer_id: string
          type: Database["public"]["Enums"]["quiz_type"]
          updated_at: string
        }
        Insert: {
          batch_id?: string | null
          cloned_from_quiz_id?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          duration_minutes?: number
          id?: string
          num_questions?: number
          share_code?: string
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["quiz_status"]
          title: string
          topic_id?: string | null
          topic_name?: string
          trainer_id: string
          type?: Database["public"]["Enums"]["quiz_type"]
          updated_at?: string
        }
        Update: {
          batch_id?: string | null
          cloned_from_quiz_id?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          duration_minutes?: number
          id?: string
          num_questions?: number
          share_code?: string
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["quiz_status"]
          title?: string
          topic_id?: string | null
          topic_name?: string
          trainer_id?: string
          type?: Database["public"]["Enums"]["quiz_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_cloned_from_quiz_id_fkey"
            columns: ["cloned_from_quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "quiz_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          answers: Json
          college_name: string
          id: string
          percentage: number
          points: number
          quiz_id: string
          roll_number: string
          score: number
          student_email: string
          student_name: string
          submitted_at: string
          time_taken_seconds: number
          total: number
        }
        Insert: {
          answers?: Json
          college_name?: string
          id?: string
          percentage?: number
          points?: number
          quiz_id: string
          roll_number?: string
          score?: number
          student_email: string
          student_name: string
          submitted_at?: string
          time_taken_seconds?: number
          total?: number
        }
        Update: {
          answers?: Json
          college_name?: string
          id?: string
          percentage?: number
          points?: number
          quiz_id?: string
          roll_number?: string
          score?: number
          student_email?: string
          student_name?: string
          submitted_at?: string
          time_taken_seconds?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      template_questions: {
        Row: {
          correct_index: number
          created_at: string
          difficulty: Database["public"]["Enums"]["quiz_difficulty"]
          explanation: string
          id: string
          options: Json
          position: number
          question_text: string
          template_id: string
        }
        Insert: {
          correct_index?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          explanation?: string
          id?: string
          options?: Json
          position?: number
          question_text: string
          template_id: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          difficulty?: Database["public"]["Enums"]["quiz_difficulty"]
          explanation?: string
          id?: string
          options?: Json
          position?: number
          question_text?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "quiz_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          batch_id: string
          created_at: string
          day_number: number
          id: string
          status: Database["public"]["Enums"]["topic_status"]
          title: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          day_number?: number
          id?: string
          status?: Database["public"]["Enums"]["topic_status"]
          title: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          day_number?: number
          id?: string
          status?: Database["public"]["Enums"]["topic_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "super_admin" | "trainer"
      batch_status: "upcoming" | "active" | "completed"
      quiz_difficulty: "easy" | "medium" | "hard"
      quiz_status: "draft" | "published" | "closed"
      quiz_type: "daily" | "weekend"
      topic_status: "planned" | "completed"
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
      app_role: ["super_admin", "trainer"],
      batch_status: ["upcoming", "active", "completed"],
      quiz_difficulty: ["easy", "medium", "hard"],
      quiz_status: ["draft", "published", "closed"],
      quiz_type: ["daily", "weekend"],
      topic_status: ["planned", "completed"],
    },
  },
} as const
