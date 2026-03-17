import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { deserializeGame, serializeForDb } from '@/lib/db-utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(deserializeGame(game as Record<string, unknown>));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const serialized = serializeForDb(body);
  const fields = Object.keys(serialized).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => serialized[f]);
  const game = db.prepare(`UPDATE games SET ${setClause} WHERE id = ? RETURNING *`).get(...values, id);
  return NextResponse.json(deserializeGame(game as Record<string, unknown>));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare('DELETE FROM games WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
