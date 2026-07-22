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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          word: string;
          meaning?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          word: string;
          meaning: string | null;
          created_at: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          translation?: string | null;
          vocabulary_used: VocabularyItem[];
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          content: string;
          translation: string | null;
          vocabulary_used: VocabularyItem[];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
