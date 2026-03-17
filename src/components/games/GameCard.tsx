'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ClipboardList, Edit } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Game } from '@/lib/database.types';

const strategyLabels: Record<string, string> = {
  skill_weighted: 'Skill',
  attendance_weighted: 'Attendance',
  gender_weighted: 'Gender',
  playing_time_weighted: 'Equal Time',
};

export default function GameCard({
  game,
  onEdit,
  onDelete,
}: {
  game: Game;
  onEdit: (game: Game) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {game.opponent ? `vs ${game.opponent}` : 'Game Day'}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(game.game_date + 'T00:00:00'), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(game)} className="h-8 w-8">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(game.id)} className="h-8 w-8 text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div>{game.num_periods || 4} periods</div>
          {game.strategy_priorities && game.strategy_priorities.length > 0 && (
            <div>Priority: {game.strategy_priorities.map(s => strategyLabels[s]).join(' > ')}</div>
          )}
        </div>
        <Link href={`/games/${game.id}/roster`}>
          <Button className="w-full bg-green-600 hover:bg-green-700 gap-2">
            <ClipboardList className="w-4 h-4" />
            Manage Lineup
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
