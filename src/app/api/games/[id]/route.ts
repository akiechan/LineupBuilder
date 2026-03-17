import { NextRequest, NextResponse } from 'next/server';
import type { InValue } from '@libsql/client';
import db, { initPromise } from '@/lib/db';
import { deserializeGame, serializeForDb } from '@/lib/db-utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initPromise;
  const { id } = await params;
  const result = await db.execute({ sql: 'SELECT * FROM games WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(deserializeGame(result.rows[0] as Record<string, unknown>));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initPromise;
  const { id } = await params;
  const body = await request.json();
  const serialized = serializeForDb(body);
  const fields = Object.keys(serialized).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => serialized[f]);
  const result = await db.execute({
    sql: `UPDATE games SET ${setClause} WHERE id = ? RETURNING *`,
    args: [...values, id] as InValue[],
  });
  return NextResponse.json(deserializeGame(result.rows[0] as Record<string, unknown>));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initPromise;
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM games WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
