export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      domains: {
        Row: {
          id: string;
          name: string;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          color: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      rings: {
        Row: {
          id: string;
          name: string;
          radius_range: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          radius_range: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          radius_range?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      resources: {
        Row: {
          id: string;
          title: string;
          resource_type: 'book' | 'course' | 'article';
          resource_url: string | null;
          domain_id: string;
          ring_id: string;
          rating: number | null;
          reason: string;
          recommender: string | null;
          author: string | null;
          publisher: string | null;
          published_year: number | null;
          isbn: string | null;
          description: string | null;
          cover_image_url: string | null;
          thumbnail: Json;
          status: 'approved' | 'archived';
          view_count: number;
          bookmark_count: number;
          weighted_score: number;
          published_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          resource_type: 'book' | 'course' | 'article';
          resource_url?: string | null;
          domain_id: string;
          ring_id: string;
          rating?: number | null;
          reason: string;
          recommender?: string | null;
          author?: string | null;
          publisher?: string | null;
          published_year?: number | null;
          isbn?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          thumbnail?: Json;
          status?: 'approved' | 'archived';
          view_count?: number;
          bookmark_count?: number;
          weighted_score?: number;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          resource_type?: 'book' | 'course' | 'article';
          resource_url?: string | null;
          domain_id?: string;
          ring_id?: string;
          rating?: number | null;
          reason?: string;
          recommender?: string | null;
          author?: string | null;
          publisher?: string | null;
          published_year?: number | null;
          isbn?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          thumbnail?: Json;
          status?: 'approved' | 'archived';
          view_count?: number;
          bookmark_count?: number;
          weighted_score?: number;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_recommendations: {
        Row: {
          id: string;
          title: string;
          resource_type: 'book' | 'course' | 'article';
          resource_url: string | null;
          domain_id: string;
          ring_id: string;
          rating: number | null;
          reason: string;
          recommender: string | null;
          author: string | null;
          isbn: string | null;
          status: 'pending' | 'approved' | 'rejected';
          duplicate_resource_id: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          approved_resource_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          resource_type: 'book' | 'course' | 'article';
          resource_url?: string | null;
          domain_id: string;
          ring_id: string;
          rating?: number | null;
          reason: string;
          recommender?: string | null;
          author?: string | null;
          isbn?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          duplicate_resource_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          approved_resource_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          resource_type?: 'book' | 'course' | 'article';
          resource_url?: string | null;
          domain_id?: string;
          ring_id?: string;
          rating?: number | null;
          reason?: string;
          recommender?: string | null;
          author?: string | null;
          isbn?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          duplicate_resource_id?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          approved_resource_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          id: string;
          resource_id: string;
          rating: number;
          review_text: string | null;
          session_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          rating: number;
          review_text?: string | null;
          session_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          rating?: number;
          review_text?: string | null;
          session_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      resource_stats: {
        Row: {
          resource_id: string;
          avg_rating: number;
          rating_count: number;
          view_count_7d: number;
          view_count_30d: number;
          last_updated_at: string;
        };
        Insert: {
          resource_id: string;
          avg_rating?: number;
          rating_count?: number;
          view_count_7d?: number;
          view_count_30d?: number;
          last_updated_at?: string;
        };
        Update: {
          resource_id?: string;
          avg_rating?: number;
          rating_count?: number;
          view_count_7d?: number;
          view_count_30d?: number;
          last_updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          resource_id: string;
          parent_comment_id: string | null;
          content: string;
          session_id: string;
          status: 'visible' | 'hidden';
          created_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          parent_comment_id?: string | null;
          content: string;
          session_id: string;
          status?: 'visible' | 'hidden';
          created_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          parent_comment_id?: string | null;
          content?: string;
          session_id?: string;
          status?: 'visible' | 'hidden';
          created_at?: string;
        };
        Relationships: [];
      };
      reading_notes: {
        Row: {
          id: string;
          resource_id: string;
          session_id: string;
          chapter: string | null;
          content: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          resource_id: string;
          session_id: string;
          chapter?: string | null;
          content: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          resource_id?: string;
          session_id?: string;
          chapter?: string | null;
          content?: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invite_codes: {
        Row: {
          code: string;
          is_active: boolean;
        };
        Insert: {
          code: string;
          is_active?: boolean;
        };
        Update: {
          code?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// 导出便捷类型
export type Resource = Database['public']['Tables']['resources']['Row'];
export type UserRecommendation = Database['public']['Tables']['user_recommendations']['Row'];
export type Rating = Database['public']['Tables']['ratings']['Row'];
export type Domain = Database['public']['Tables']['domains']['Row'];
export type Ring = Database['public']['Tables']['rings']['Row'];
