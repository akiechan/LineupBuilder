import { NextRequest, NextResponse } from 'next/server';
import db, { initPromise } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initPromise;
  const { id } = await params;
  const body = await request.json();
  const fields = Object.keys(body).filter(k => k !== 'id' && k !== 'created_at');
  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => body[f]);
  const result = await db.execute({
    sql: `UPDATE players SET ${setClause} WHERE id = ? RETURNING *`,
    args: [...values, id],
  });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initPromise;
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM players WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
