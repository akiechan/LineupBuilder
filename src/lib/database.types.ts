export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          age_group: string | null;
          season: string | null;
          year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          age_group?: string | null;
          season?: string | null;
          year?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          age_group?: string | null;
          season?: string | null;
          year?: number | null;
        };
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          jersey_number: number | null;
          gender: string | null;
          skill_level: number;
          attendance_pattern: number;
          goalie_preference: number;
          position_preference: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          jersey_number?: number | null;
          gender?: string | null;
          skill_level?: number;
          attendance_pattern?: number;
          goalie_preference?: number;
          position_preference?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          jersey_number?: number | null;
          gender?: string | null;
          skill_level?: number;
          attendance_pattern?: number;
          goalie_preference?: number;
          position_preference?: string | null;
        };
      };
      games: {
        Row: {
          id: string;
          team_id: string;
          game_date: string;
          opponent: string | null;
          num_periods: number;
          players_per_period: number;
          goalie_rotation_periods: number;
          count_goalie_as_playing_time: boolean;
          has_goalie: boolean;
          strategy_priorities: string[];
          attendance: Json;
          lineup: Json;
          guest_players: Json;
          goals: Json;
          score_us: number | null;
          score_opponent: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          game_date: string;
          opponent?: string | null;
          num_periods?: number;
          players_per_period?: number;
          goalie_rotation_periods?: number;
          count_goalie_as_playing_time?: boolean;
          has_goalie?: boolean;
          strategy_priorities?: string[];
          attendance?: Json;
          lineup?: Json;
          guest_players?: Json;
          goals?: Json;
          score_us?: number | null;
          score_opponent?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          game_date?: string;
          opponent?: string | null;
          num_periods?: number;
          players_per_period?: number;
          goalie_rotation_periods?: number;
          count_goalie_as_playing_time?: boolean;
          has_goalie?: boolean;
          strategy_priorities?: string[];
          attendance?: Json;
          lineup?: Json;
          guest_players?: Json;
          goals?: Json;
          score_us?: number | null;
          score_opponent?: number | null;
          notes?: string | null;
        };
      };
    };
  };
}

export type Team = Database['public']['Tables']['teams']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];

export type GuestPlayer = {
  id: string;
  name: string;
  gender: string | null;
  skill_level: number;
  goalie_preference: number;
};

export type GoalRecord = {
  id: string;
  period: number;
  scorer_id: string | null; // null = opponent goal
  scorer_name: string;      // display name (player name or "Opponent")
};

export type AttendanceRecord = {
  player_id: string;
  status: 'playing' | 'late' | 'absent';
  arrives_period?: number; // which period the late player arrives (e.g., 2 = Q2)
};

export type LineupPlayerSlot = {
  player_id: string;
  position: string;
  locked: boolean;
};

export type LineupPeriod = {
  period: number;
  goalie: string;
  goalie_locked?: boolean;
  players: LineupPlayerSlot[];
};
