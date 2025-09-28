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
      document_processing_jobs: {
        Row: {
          ai_extracted_data: Json | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          ocr_confidence: number | null
          ocr_text: string | null
          processing_type: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          created_at?: string
          document_id: string
          error_message?: string | null
          id?: string
          ocr_confidence?: number | null
          ocr_text?: string | null
          processing_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_extracted_data?: Json | null
          created_at?: string
          document_id?: string
          error_message?: string | null
          id?: string
          ocr_confidence?: number | null
          ocr_text?: string | null
          processing_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          trip_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_recommendations: {
        Row: {
          address: string | null
          coordinates: Json | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          opening_hours: string | null
          phone: string | null
          price_level: number | null
          rating: number | null
          recommendation_type: string
          source_data: Json | null
          step_id: string
          trip_id: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          coordinates?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          opening_hours?: string | null
          phone?: string | null
          price_level?: number | null
          rating?: number | null
          recommendation_type: string
          source_data?: Json | null
          step_id: string
          trip_id: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          coordinates?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          opening_hours?: string | null
          phone?: string | null
          price_level?: number | null
          rating?: number | null
          recommendation_type?: string
          source_data?: Json | null
          step_id?: string
          trip_id?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      travel_segments: {
        Row: {
          activity_price: string | null
          address: string | null
          booking_required: boolean | null
          checkin_time: string | null
          checkout_time: string | null
          confidence: number
          created_at: string
          departure_times: string[] | null
          description: string | null
          document_id: string
          duration: string | null
          end_date: string | null
          enriched: Json | null
          facilities: string[] | null
          iata_code: string | null
          icao_code: string | null
          id: string
          is_multi_day: boolean | null
          main_exhibitions: string[] | null
          opening_hours: string | null
          parent_segment_id: string | null
          phone: string | null
          provider: string | null
          raw_data: Json | null
          reference_number: string | null
          route: string | null
          segment_group_id: string | null
          segment_type: string
          sequence_order: number | null
          star_rating: number | null
          start_date: string | null
          terminals: string[] | null
          ticket_price: string | null
          title: string
          trip_id: string | null
          updated_at: string
          user_id: string | null
          validated: boolean
          website: string | null
        }
        Insert: {
          activity_price?: string | null
          address?: string | null
          booking_required?: boolean | null
          checkin_time?: string | null
          checkout_time?: string | null
          confidence?: number
          created_at?: string
          departure_times?: string[] | null
          description?: string | null
          document_id: string
          duration?: string | null
          end_date?: string | null
          enriched?: Json | null
          facilities?: string[] | null
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          is_multi_day?: boolean | null
          main_exhibitions?: string[] | null
          opening_hours?: string | null
          parent_segment_id?: string | null
          phone?: string | null
          provider?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          route?: string | null
          segment_group_id?: string | null
          segment_type: string
          sequence_order?: number | null
          star_rating?: number | null
          start_date?: string | null
          terminals?: string[] | null
          ticket_price?: string | null
          title: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
          validated?: boolean
          website?: string | null
        }
        Update: {
          activity_price?: string | null
          address?: string | null
          booking_required?: boolean | null
          checkin_time?: string | null
          checkout_time?: string | null
          confidence?: number
          created_at?: string
          departure_times?: string[] | null
          description?: string | null
          document_id?: string
          duration?: string | null
          end_date?: string | null
          enriched?: Json | null
          facilities?: string[] | null
          iata_code?: string | null
          icao_code?: string | null
          id?: string
          is_multi_day?: boolean | null
          main_exhibitions?: string[] | null
          opening_hours?: string | null
          parent_segment_id?: string | null
          phone?: string | null
          provider?: string | null
          raw_data?: Json | null
          reference_number?: string | null
          route?: string | null
          segment_group_id?: string | null
          segment_type?: string
          sequence_order?: number | null
          star_rating?: number | null
          start_date?: string | null
          terminals?: string[] | null
          ticket_price?: string | null
          title?: string
          trip_id?: string | null
          updated_at?: string
          user_id?: string | null
          validated?: boolean
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_travel_segments_trip_id"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_segments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_segments_parent_segment_id_fkey"
            columns: ["parent_segment_id"]
            isOneToOne: false
            referencedRelation: "travel_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_step_segments: {
        Row: {
          created_at: string
          id: string
          position_in_step: number
          role: string | null
          segment_id: string
          step_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position_in_step: number
          role?: string | null
          segment_id: string
          step_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position_in_step?: number
          role?: string | null
          segment_id?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_step_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "travel_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_step_segments_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "travel_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_steps: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          primary_location: string | null
          start_date: string | null
          step_id: string
          step_title: string
          step_type: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          primary_location?: string | null
          start_date?: string | null
          step_id: string
          step_title: string
          step_type: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          primary_location?: string | null
          start_date?: string | null
          step_id?: string
          step_title?: string
          step_type?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_abandoned_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_grouped_segments: {
        Args: { p_trip_id: string }
        Returns: {
          child_segments: Json
          end_date: string
          group_id: string
          parent_segment: Json
          start_date: string
          total_days: number
        }[]
      }
      get_user_session_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      group_similar_segments: {
        Args: { p_trip_id: string }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
