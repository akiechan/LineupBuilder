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
    has_goalie: true,
    goalie_rotation_periods: 1,
    count_goalie_as_playing_time: true,
    avoid_consecutive_bench: false,
    goalie_counts_as_bench: false,
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
        has_goalie: game.has_goalie ?? true,
        goalie_rotation_periods: game.goalie_rotation_periods || 1,
        count_goalie_as_playing_time: game.count_goalie_as_playing_time ?? true,
        avoid_consecutive_bench: game.avoid_consecutive_bench ?? false,
        goalie_counts_as_bench: game.goalie_counts_as_bench ?? false,
        strategy_priorities: game.strategy_priorities || [],
      });
    } else {
      setFormData({
        team_id: teamId,
        game_date: '',
        opponent: '',
        num_periods: 4,
        players_per_period: 5,
        has_goalie: true,
        goalie_rotation_periods: 1,
        count_goalie_as_playing_time: true,
        avoid_consecutive_bench: false,
        goalie_counts_as_bench: false,
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

  const skillDistribution = formData.strategy_priorities.includes('skill_grouped')
    ? 'grouped'
    : formData.strategy_priorities.includes('skill_balanced')
    ? 'balanced'
    : 'none';

  const setSkillDistribution = (mode: 'none' | 'balanced' | 'grouped') => {
    const filtered = formData.strategy_priorities.filter(s => s !== 'skill_grouped' && s !== 'skill_balanced');
    if (mode !== 'none') filtered.push(mode === 'grouped' ? 'skill_grouped' : 'skill_balanced');
    setFormData({ ...formData, strategy_priorities: filtered });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{game ? 'Edit Game' : 'New Game'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="game_date">Game Date *</Label>
              <Input id="game_date" type="date" value={formData.game_date} onChange={(e) => setFormData({ ...formData, game_date: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="opponent">Opponent Team</Label>
              <Input id="opponent" placeholder="e.g., Blue Tigers" value={formData.opponent} onChange={(e) => setFormData({ ...formData, opponent: e.target.value })} />
            </div>
          </div>
          <div className={`grid gap-3 grid-cols-2 ${formData.has_goalie ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <div>
              <Label htmlFor="periods">Periods</Label>
              <Input id="periods" type="number" min="2" max="8" value={String(formData.num_periods)} onChange={(e) => setFormData({ ...formData, num_periods: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label htmlFor="players_per_period">Players/Period</Label>
              <Input id="players_per_period" type="number" min="3" max="15" value={String(formData.players_per_period)} onChange={(e) => setFormData({ ...formData, players_per_period: parseInt(e.target.value) || 0 })} />
            </div>
            {formData.has_goalie && <div>
              <Label htmlFor="goalie_rotation">Goalie Rotation</Label>
              <Input id="goalie_rotation" type="number" min="1" max="8" value={String(formData.goalie_rotation_periods)} onChange={(e) => setFormData({ ...formData, goalie_rotation_periods: parseInt(e.target.value) || 0 })} />
            </div>}
          </div>
          <div className="flex items-center gap-2 p-3 border rounded">
            <Checkbox
              id="has_goalie"
              checked={formData.has_goalie}
              onCheckedChange={(checked) => setFormData({ ...formData, has_goalie: checked as boolean })}
            />
            <label htmlFor="has_goalie" className="text-sm cursor-pointer">
              Game has a goalie position
            </label>
          </div>
          {formData.has_goalie && (
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
          )}
          <div className="flex items-center gap-2 p-3 border rounded">
            <Checkbox
              id="avoid_bench"
              checked={formData.avoid_consecutive_bench}
              onCheckedChange={(checked) => setFormData({ ...formData, avoid_consecutive_bench: checked as boolean })}
            />
            <label htmlFor="avoid_bench" className="text-sm cursor-pointer">
              Avoid consecutive bench (no player sits out two quarters in a row)
            </label>
          </div>
          {formData.has_goalie && formData.avoid_consecutive_bench && (
            <div className="flex items-center gap-2 p-3 border rounded ml-4">
              <Checkbox
                id="goalie_counts_as_bench"
                checked={formData.goalie_counts_as_bench}
                onCheckedChange={(checked) => setFormData({ ...formData, goalie_counts_as_bench: checked as boolean })}
              />
              <label htmlFor="goalie_counts_as_bench" className="text-sm cursor-pointer">
                Goalie counts as bench (player who plays goalie then sits out is treated as consecutively benched)
              </label>
            </div>
          )}
          <div>
            <Label>Weighting Priorities (select and order)</Label>
            <div className="space-y-2 mt-2">
              {['skill_weighted', 'attendance_weighted', 'gender_weighted', 'playing_time_weighted'].map((strategy) => {
                const visiblePriorities = formData.strategy_priorities.filter(s => s !== 'skill_grouped' && s !== 'skill_balanced');
                const isSelected = visiblePriorities.includes(strategy);
                const priorityIndex = visiblePriorities.indexOf(strategy);
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
          <div>
            <Label>Skill Distribution</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {([
                { value: 'none', label: 'Off', desc: '' },
                { value: 'balanced', label: 'Balanced', desc: 'Even mix per quarter' },
                { value: 'grouped', label: 'Grouped', desc: 'Similar skills together' },
              ] as const).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSkillDistribution(value)}
                  className={`p-2 sm:p-3 rounded-lg border-2 text-left transition-all ${
                    skillDistribution === value
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-xs sm:text-sm">{label}</div>
                  {desc && <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">{desc}</div>}
                </button>
              ))}
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
