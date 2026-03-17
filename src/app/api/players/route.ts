import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db';

export function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('team_id');
  if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 });
  const players = db.prepare('SELECT * FROM players WHERE team_id = ? ORDER BY name').all(teamId);
  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = randomUUID();
  const player = db.prepare(
    `INSERT INTO players (id, team_id, name, jersey_number, gender, skill_level, attendance_pattern, goalie_preference, position_preference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).get(
    id, body.team_id, body.name, body.jersey_number ?? null, body.gender ?? null,
    body.skill_level ?? 2, body.attendance_pattern ?? 1, body.goalie_preference ?? 3,
    body.position_preference ?? null
  );
  return NextResponse.json(player, { status: 201 });
}
