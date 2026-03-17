import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import db, { initPromise } from '@/lib/db';

export async function GET() {
  await initPromise;
  const result = await db.execute({ sql: 'SELECT * FROM teams ORDER BY created_at DESC', args: [] });
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  await initPromise;
  const body = await request.json();
  const id = randomUUID();
  const result = await db.execute({
    sql: 'INSERT INTO teams (id, name, age_group, season, year) VALUES (?, ?, ?, ?, ?) RETURNING *',
    args: [id, body.name, body.age_group ?? null, body.season ?? null, body.year ?? null],
  });
  return NextResponse.json(result.rows[0], { status: 201 });
}
