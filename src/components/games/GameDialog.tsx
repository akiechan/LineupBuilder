'use client';

import { useState, useEffect } from 'react';
import { useCreateGame, useUpdateGame } from '@/hooks/use-games';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { Game } from '@/lib/database.types';

export default function GameDialog({
  open,
  onClose,
  game,
  teamId,
}: {
  open: boolean;
  onClose: () => void;
  game: Game | null;
  teamId: string;
}) {
  const [formData, setFormData] = useState({
    team_id: teamId,
    game_date: '',
    opponent: '',
    num_periods: 4,
    players_per_period: 5,
    goalie_rotation_periods: 1,
    count_goalie_as_playing_time: true,
    strategy_priorities: [] as string[],
  });

  const createGame = useCreateGame();
  const updateGame = useUpdateGame();

  useEffect(() => {
    if (game) {
      setFormData({
        team_id: game.team_id,
        game_date: game.game_date || '',
        opponent: game.opponent || '',
        num_periods: game.num_periods || 4,
        players_per_period: game.players_per_period || 5,
        goalie_rotation_periods: game.goalie_rotation_periods || 1,
        count_goalie_as_playing_time: game.count_goalie_as_playing_time ?? true,
        strategy_priorities: game.strategy_priorities || [],
      });
    } else {
      setFormData({
        team_id: teamId,
        game_date: '',
        opponent: '',
        num_periods: 4,
        players_per_period: 5,
        goalie_rotation_periods: 1,
        count_goalie_as_playing_time: true,
        strategy_priorities: [],
      });
    }
  }, [game, teamId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (game) {
      updateGame.mutate({ id: game.id, ...formData }, { onSuccess: onClose });
    } else {
      createGame.mutate(formData, { onSuccess: onClose });
    }
  };

  const toggleStrategy = (strategy: string) => {
    const current = [...formData.strategy_priorities];
    const index = current.indexOf(strategy);
    if (index > -1) current.splice(index, 1);
    else current.push(strategy);
    setFormData({ ...formData, strategy_priorities: current });
  };

  const moveStrategyUp = (strategy: string) => {
    const current = [...formData.strategy_priorities];
    const index = current.indexOf(strategy);
    if (index > 0) {
      [current[index - 1], current[index]] = [current[index], current[index - 1]];
      setFormData({ ...formData, strategy_priorities: current });
    }
  };

  const moveStrategyDown = (strategy: string) => {
    const current = [...formData.strategy_priorities];
    const index = current.indexOf(strategy);
    if (index < current.length - 1 && index > -1) {
      [current[index], current[index + 1]] = [current[index + 1], current[index]];
      setFormData({ ...formData, strategy_priorities: current });
    }
  };

  const strategyLabels: Record<string, string> = {
    skill_weighted: 'Skill Level',
    attendance_weighted: 'Attendance Pattern',
    gender_weighted: 'Gender Balance',
    playing_time_weighted: 'Equal Playing Time',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{game ? 'Edit Game' : 'New Game'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="game_date">Game Date *</Label>
              <Input id="game_date" type="date" value={formData.game_date} onChange={(e) => setFormData({ ...formData, game_date: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="opponent">Opponent Team</Label>
              <Input id="opponent" placeholder="e.g., Blue Tigers" value={formData.opponent} onChange={(e) => setFormData({ ...formData, opponent: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="periods">Periods</Label>
              <Input id="periods" type="number" min="2" max="8" value={formData.num_periods} onChange={(e) => setFormData({ ...formData, num_periods: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="players_per_period">Players/Period</Label>
              <Input id="players_per_period" type="number" min="3" max="15" value={formData.players_per_period} onChange={(e) => setFormData({ ...formData, players_per_period: Number(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="goalie_rotation">Goalie Rotation</Label>
              <Input id="goalie_rotation" type="number" min="1" max="8" value={formData.goalie_rotation_periods} onChange={(e) => setFormData({ ...formData, goalie_rotation_periods: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded">
            <Checkbox
              id="count_goalie"
              checked={formData.count_goalie_as_playing_time}
              onCheckedChange={(checked) => setFormData({ ...formData, count_goalie_as_playing_time: checked as boolean })}
            />
            <label htmlFor="count_goalie" className="text-sm cursor-pointer">
              Count goalie time as equal playing time
            </label>
          </div>
          <div>
            <Label>Weighting Priorities (select and order)</Label>
            <div className="space-y-2 mt-2">
              {['skill_weighted', 'attendance_weighted', 'gender_weighted', 'playing_time_weighted'].map((strategy) => {
                const isSelected = formData.strategy_priorities.includes(strategy);
                const priorityIndex = formData.strategy_priorities.indexOf(strategy);
                return (
                  <div key={strategy} className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox id={strategy} checked={isSelected} onCheckedChange={() => toggleStrategy(strategy)} />
                    <label htmlFor={strategy} className="flex-1 cursor-pointer">
                      {strategyLabels[strategy]}
                      {isSelected && <span className="ml-2 text-xs text-green-600 font-medium">Priority {priorityIndex + 1}</span>}
                    </label>
                    {isSelected && (
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => moveStrategyUp(strategy)} disabled={priorityIndex === 0} className="h-7 px-2">&#8593;</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => moveStrategyDown(strategy)} disabled={priorityIndex === formData.strategy_priorities.length - 1} className="h-7 px-2">&#8595;</Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">{game ? 'Update Game' : 'Create Game'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
