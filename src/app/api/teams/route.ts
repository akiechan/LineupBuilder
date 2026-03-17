import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db from '@/lib/db';

export function GET() {
  const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
  return NextResponse.json(teams);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = randomUUID();
  const team = db.prepare(
    'INSERT INTO teams (id, name, age_group, season, year) VALUES (?, ?, ?, ?, ?) RETURNING *'
  ).get(id, body.name, body.age_group ?? null, body.season ?? null, body.year ?? null);
  return NextResponse.json(team, { status: 201 });
}
