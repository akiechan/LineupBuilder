'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { Player, GoalRecord } from '@/lib/database.types';

export default function GoalTracker({
  goals,
  players,
  numPeriods,
  opponentName,
  onUpdate,
}: {
  goals: GoalRecord[];
  players: Player[];
  numPeriods: number;
  opponentName: string;
  onUpdate: (goals: GoalRecord[]) => void;
}) {
  const [addingPeriod, setAddingPeriod] = useState<number | null>(null);

  const addGoal = (period: number, scorerId: string | null, scorerName: string) => {
    const goal: GoalRecord = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      period,
      scorer_id: scorerId,
      scorer_name: scorerName,
    };
    onUpdate([...goals, goal]);
    setAddingPeriod(null);
  };

  const removeGoal = (id: string) => {
    onUpdate(goals.filter(g => g.id !== id));
  };

  const ourGoals = goals.filter(g => g.scorer_id !== null);
  const theirGoals = goals.filter(g => g.scorer_id === null);

  const goalsByPeriod = (period: number) =>
    goals.filter(g => g.period === period).sort((a, b) => {
      // Our goals first, then opponent
      if (a.scorer_id && !b.scorer_id) return -1;
      if (!a.scorer_id && b.scorer_id) return 1;
      return 0;
    });

  return (
    <Card className="print:hidden">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            Goal Log
            <span className="ml-3 text-base font-normal text-gray-500">
              {ourGoals.length} - {theirGoals.length}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: numPeriods }, (_, i) => i + 1).map(period => {
          const periodGoals = goalsByPeriod(period);
          return (
            <div key={period} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-green-700">Q{period}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => setAddingPeriod(addingPeriod === period ? null : period)}
                >
                  <Plus className="w-3 h-3" />
                  Goal
                </Button>
              </div>

              {periodGoals.length > 0 && (
                <div className="space-y-1 mb-2">
                  {periodGoals.map(goal => (
                    <div
                      key={goal.id}
                      className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                        goal.scorer_id ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <span>
                        {goal.scorer_id ? '⚽' : '↙'}{' '}
                        {goal.scorer_name}
                      </span>
                      <button onClick={() => removeGoal(goal.id)} className="p-1.5 hover:bg-white/50 rounded -mr-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {periodGoals.length === 0 && addingPeriod !== period && (
                <div className="text-xs text-gray-300 text-center py-1">No goals</div>
              )}

              {addingPeriod === period && (
                <div className="border-t pt-2 mt-1 space-y-1">
                  <div className="text-xs text-gray-500 mb-1">Who scored?</div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                    {players
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => addGoal(period, p.id, p.name)}
                          className="text-xs text-left px-2.5 py-2.5 rounded border border-green-200 bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-800 truncate min-h-[40px]"
                        >
                          {p.jersey_number != null && `#${p.jersey_number} `}{p.name}
                        </button>
                      ))}
                    <button
                      onClick={() => addGoal(period, null, opponentName || 'Opponent')}
                      className="text-xs text-left px-2.5 py-2.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 col-span-2 min-h-[40px]"
                    >
                      {opponentName || 'Opponent'} goal
                    </button>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={() => setAddingPeriod(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
