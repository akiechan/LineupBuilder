import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db';
import { deserializeGame, serializeForDb } from '@/lib/db-utils';

export function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('team_id');
  if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 });
  const rows = db.prepare('SELECT * FROM games WHERE team_id = ? ORDER BY game_date DESC').all(teamId);
  return NextResponse.json(rows.map(r => deserializeGame(r as Record<string, unknown>)));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = randomUUID();
  const serialized = serializeForDb(body);
  const game = db.prepare(
    `INSERT INTO games (id, team_id, game_date, opponent, num_periods, players_per_period, goalie_rotation_periods, count_goalie_as_playing_time, strategy_priorities)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).get(
    id, serialized.team_id, serialized.game_date, serialized.opponent ?? null,
    serialized.num_periods ?? 4, serialized.players_per_period ?? 6,
    serialized.goalie_rotation_periods ?? 1, serialized.count_goalie_as_playing_time ?? 1,
    serialized.strategy_priorities ?? '[]'
  );
  return NextResponse.json(deserializeGame(game as Record<string, unknown>), { status: 201 });
}
