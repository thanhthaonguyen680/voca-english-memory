export type VocabularyItem = {
  word: string;
  meaning?: string;
  ipa?: string;
};

export type Database = {
  public: {
    Tables: {
      vocabulary_entries: {
        Row: {
          id: string;
          user_id: string;
          word: string;
          meaning: string | null;
          word_type: string | null;
          language: string;
          topic_id: string | null;
          palace_room: string | null;
          palace_imagery: string | null;
          palace_mastery: number;
          ipa: string | null;
          usage_note: string | null;
          example_sentence: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word: string;
          meaning?: string | null;
          word_type?: string | null;
          language?: string;
          topic_id?: string | null;
          palace_room?: string | null;
          palace_imagery?: string | null;
          palace_mastery?: number;
          ipa?: string | null;
          usage_note?: string | null;
          example_sentence?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          word: string;
          meaning: string | null;
          word_type: string | null;
          language: string;
          topic_id: string | null;
          palace_room: string | null;
          palace_imagery: string | null;
          palace_mastery: number;
          ipa: string | null;
          usage_note: string | null;
          example_sentence: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      palace_room_stories: {
        Row: {
          topic_id: string;
          room_id: string;
          user_id: string;
          story: string;
          updated_at: string;
        };
        Insert: {
          topic_id: string;
          room_id: string;
          user_id: string;
          story: string;
          updated_at?: string;
        };
        Update: Partial<{
          topic_id: string;
          room_id: string;
          user_id: string;
          story: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      vocabulary_topics: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          language: string;
          icon: string;
          created_at: string;
          last_reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          language?: string;
          icon?: string;
          created_at?: string;
          last_reviewed_at?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          language: string;
          icon: string;
          created_at: string;
          last_reviewed_at: string | null;
        }>;
        Relationships: [];
      };
      stories: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          translation: string | null;
          vocabulary_used: VocabularyItem[];
          language: string;
          topic_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          translation?: string | null;
          vocabulary_used: VocabularyItem[];
          language?: string;
          topic_id?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          content: string;
          translation: string | null;
          vocabulary_used: VocabularyItem[];
          language: string;
          topic_id: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          gemini_api_key: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          gemini_api_key?: string | null;
          updated_at?: string;
        };
        Update: Partial<{
          user_id: string;
          gemini_api_key: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      chat_logs: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      vocab_scans: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      grammar_checks: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      meaning_fills: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      palace_generations: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      palace_rooms: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          name: string;
          icon: string;
          sort_order: number;
          created_at: string;
        }>;
        Relationships: [];
      };
      writings: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          overview: string | null;
          body: string;
          conclusion: string | null;
          feedback: string | null;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          overview?: string | null;
          body: string;
          conclusion?: string | null;
          feedback?: string | null;
          language?: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          title: string;
          overview: string | null;
          body: string;
          conclusion: string | null;
          feedback: string | null;
          language: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      gemini_api_key_pool: {
        Row: {
          id: string;
          label: string | null;
          api_key: string;
          sort_order: number;
          is_valid: boolean;
          last_error: string | null;
          last_used_at: string | null;
          invalidated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          label?: string | null;
          api_key: string;
          sort_order?: number;
          is_valid?: boolean;
          last_error?: string | null;
          last_used_at?: string | null;
          invalidated_at?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          label: string | null;
          api_key: string;
          sort_order: number;
          is_valid: boolean;
          last_error: string | null;
          last_used_at: string | null;
          invalidated_at: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
