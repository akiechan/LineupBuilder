import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type { InValue } from '@libsql/client';
import db, { initPromise } from '@/lib/db';
import { deserializeGame, serializeForDb } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  await initPromise;
  const teamId = request.nextUrl.searchParams.get('team_id');
  if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 });
  const result = await db.execute({ sql: 'SELECT * FROM games WHERE team_id = ? ORDER BY game_date DESC', args: [teamId] });
  return NextResponse.json(result.rows.map(r => deserializeGame(r as Record<string, unknown>)));
}

export async function POST(request: NextRequest) {
  await initPromise;
  const body = await request.json();
  const id = randomUUID();
  const serialized = serializeForDb(body);
  const result = await db.execute({
    sql: `INSERT INTO games (id, team_id, game_date, opponent, num_periods, players_per_period, has_goalie, goalie_rotation_periods, count_goalie_as_playing_time, strategy_priorities)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      id, serialized.team_id, serialized.game_date, serialized.opponent ?? null,
      serialized.num_periods ?? 4, serialized.players_per_period ?? 6,
      serialized.has_goalie ?? 1, serialized.goalie_rotation_periods ?? 1,
      serialized.count_goalie_as_playing_time ?? 1,
      serialized.strategy_priorities ?? '[]',
    ] as InValue[],
  });
  return NextResponse.json(deserializeGame(result.rows[0] as Record<string, unknown>), { status: 201 });
}
