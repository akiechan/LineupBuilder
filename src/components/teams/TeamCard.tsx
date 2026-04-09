'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { usePlayers } from '@/hooks/use-players';
import type { Team } from '@/lib/database.types';

export default function TeamCard({
  team,
  onEdit,
  onDelete,
}: {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
}) {
  const { data: players = [] } = usePlayers(team.id);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{team.name}</CardTitle>
            {team.age_group && (
              <p className="text-sm text-gray-500 mt-1">{team.age_group}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(team)} className="h-8 w-8">
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(team.id)}
              className="h-8 w-8 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Users className="w-4 h-4" />
          <span>{players.length} players</span>
        </div>
        {(team.season || team.year) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Calendar className="w-4 h-4" />
            <span>{team.season} {team.year}</span>
          </div>
        )}
        <div className="flex gap-2">
          <Link href={`/teams/${team.id}/players`} className="flex-1">
            <Button variant="outline" className="w-full">Manage Players</Button>
          </Link>
          <Link href={`/teams/${team.id}/games`} className="flex-1">
            <Button className="w-full bg-slate-800 hover:bg-slate-900">Games</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
