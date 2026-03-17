import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db, { initPromise } from '@/lib/db';

export async function GET(request: NextRequest) {
  await initPromise;
  const teamId = request.nextUrl.searchParams.get('team_id');
  if (!teamId) return NextResponse.json({ error: 'team_id required' }, { status: 400 });
  const result = await db.execute({ sql: 'SELECT * FROM players WHERE team_id = ? ORDER BY name', args: [teamId] });
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  await initPromise;
  const body = await request.json();
  const id = randomUUID();
  const result = await db.execute({
    sql: `INSERT INTO players (id, team_id, name, jersey_number, gender, skill_level, attendance_pattern, goalie_preference, position_preference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
    args: [
      id, body.team_id, body.name, body.jersey_number ?? null, body.gender ?? null,
      body.skill_level ?? 2, body.attendance_pattern ?? 1, body.goalie_preference ?? 3,
      body.position_preference ?? null,
    ],
  });
  return NextResponse.json(result.rows[0], { status: 201 });
}
