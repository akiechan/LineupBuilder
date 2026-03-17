import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!team) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const fields = Object.keys(body).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => body[f]);
  const team = db.prepare(`UPDATE teams SET ${setClause} WHERE id = ? RETURNING *`).get(...values, id);
  return NextResponse.json(team);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
