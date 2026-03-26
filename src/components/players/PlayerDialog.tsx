'use client';

import { useState, useEffect } from 'react';
import { useCreatePlayer, useUpdatePlayer } from '@/hooks/use-players';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Player } from '@/lib/database.types';

const defaultPositions = ['Forward', 'Midfield', 'Defense', 'Goalie'];

export default function PlayerDialog({
  open,
  onClose,
  player,
  teamId,
}: {
  open: boolean;
  onClose: () => void;
  player: Player | null;
  teamId: string;
}) {
  const [formData, setFormData] = useState({
    team_id: teamId,
    name: '',
    jersey_number: '' as string | number,
    gender: '',
    skill_level: 2,
    attendance_pattern: 1,
    goalie_preference: 3,
    position_preference: '',
  });

  const createPlayer = useCreatePlayer();
  const updatePlayer = useUpdatePlayer();

  useEffect(() => {
    if (player) {
      setFormData({
        team_id: player.team_id,
        name: player.name || '',
        jersey_number: player.jersey_number ?? '',
        gender: player.gender || '',
        skill_level: player.skill_level || 2,
        attendance_pattern: player.attendance_pattern || 1,
        goalie_preference: player.goalie_preference || 3,
        position_preference: player.position_preference || '',
      });
    } else {
      setFormData({
        team_id: teamId,
        name: '',
        jersey_number: '',
        gender: '',
        skill_level: 2,
        attendance_pattern: 1,
        goalie_preference: 3,
        position_preference: '',
      });
    }
  }, [player, teamId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      jersey_number: formData.jersey_number ? Number(formData.jersey_number) : null,
    };
    if (player) {
      updatePlayer.mutate({ id: player.id, ...dataToSave }, { onSuccess: onClose });
    } else {
      createPlayer.mutate(dataToSave, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{player ? 'Edit Player' : 'Add Player'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Player Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="jersey">Jersey Number</Label>
              <Input id="jersey" type="number" value={formData.jersey_number} onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
              <SelectTrigger><SelectValue placeholder="Select gender (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="position">Position Preference</Label>
            <Select value={formData.position_preference} onValueChange={(value) => setFormData({ ...formData, position_preference: value })}>
              <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
              <SelectContent>
                {defaultPositions.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="skill">Skill Level</Label>
              <Select value={String(formData.skill_level)} onValueChange={(v) => setFormData({ ...formData, skill_level: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Strong</SelectItem>
                  <SelectItem value="2">2 - Average</SelectItem>
                  <SelectItem value="3">3 - Developing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="attendance">Attendance</Label>
              <Select value={String(formData.attendance_pattern)} onValueChange={(v) => setFormData({ ...formData, attendance_pattern: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - High</SelectItem>
                  <SelectItem value="2">2 - Medium</SelectItem>
                  <SelectItem value="3">3 - Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="goalie">Goalie</Label>
              <Select value={String(formData.goalie_preference)} onValueChange={(v) => setFormData({ ...formData, goalie_preference: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Primary</SelectItem>
                  <SelectItem value="2">2 - Backup</SelectItem>
                  <SelectItem value="3">3 - No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">{player ? 'Update' : 'Add Player'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
