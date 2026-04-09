import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize tables (runs on first import, idempotent)
const initPromise = db.batch([
  `CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age_group TEXT,
    season TEXT,
    year INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS players (
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
  )`,
  `CREATE TABLE IF NOT EXISTS games (
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
  )`,
], 'write').then(() => Promise.all([
  db.execute(`ALTER TABLE games ADD COLUMN has_goalie INTEGER DEFAULT 1`).catch(() => {}),
  db.execute(`ALTER TABLE games ADD COLUMN guest_players TEXT DEFAULT '[]'`).catch(() => {}),
  db.execute(`ALTER TABLE games ADD COLUMN score_us INTEGER`).catch(() => {}),
  db.execute(`ALTER TABLE games ADD COLUMN score_opponent INTEGER`).catch(() => {}),
  db.execute(`ALTER TABLE games ADD COLUMN notes TEXT`).catch(() => {}),
  db.execute(`ALTER TABLE games ADD COLUMN goals TEXT DEFAULT '[]'`).catch(() => {}),
  db.execute(`ALTER TABLE games ADD COLUMN avoid_consecutive_bench INTEGER DEFAULT 0`).catch(() => {}),
]));

export { initPromise };
export default db;
