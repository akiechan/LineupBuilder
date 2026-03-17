import Database from 'better-sqlite3';
import path from 'path';
import { mkdirSync } from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'lineup.db');
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age_group TEXT,
    season TEXT,
    year INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    jersey_number INTEGER,
    gender TEXT,
    skill_level INTEGER DEFAULT 2,
    attendance_pattern INTEGER DEFAULT 1,
    goalie_preference INTEGER DEFAULT 3,
    position_preference TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    game_date TEXT NOT NULL,
    opponent TEXT,
    num_periods INTEGER DEFAULT 4,
    players_per_period INTEGER DEFAULT 6,
    goalie_rotation_periods INTEGER DEFAULT 1,
    count_goalie_as_playing_time INTEGER DEFAULT 1,
    strategy_priorities TEXT DEFAULT '[]',
    attendance TEXT DEFAULT '[]',
    lineup TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
