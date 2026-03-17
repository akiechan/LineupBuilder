'use client';

import { useState, useEffect } from 'react';
import { useCreateTeam, useUpdateTeam } from '@/hooks/use-teams';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Team } from '@/lib/database.types';

export default function TeamDialog({
  open,
  onClose,
  team,
}: {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}) {
  const [formData, setFormData] = useState({
    name: '',
    age_group: '',
    season: '',
    year: new Date().getFullYear(),
  });

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        age_group: team.age_group || '',
        season: team.season || '',
        year: team.year || new Date().getFullYear(),
      });
    } else {
      setFormData({ name: '', age_group: '', season: '', year: new Date().getFullYear() });
    }
  }, [team, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (team) {
      updateTeam.mutate({ id: team.id, ...formData }, { onSuccess: onClose });
    } else {
      createTeam.mutate(formData, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'New Team'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Team Name *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="age_group">Age Group</Label>
            <Input id="age_group" placeholder="e.g., U10, U12" value={formData.age_group} onChange={(e) => setFormData({ ...formData, age_group: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="season">Season</Label>
              <Select value={formData.season} onValueChange={(value) => setFormData({ ...formData, season: value })}>
                <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spring">Spring</SelectItem>
                  <SelectItem value="Summer">Summer</SelectItem>
                  <SelectItem value="Fall">Fall</SelectItem>
                  <SelectItem value="Winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={String(formData.year)} onValueChange={(value) => setFormData({ ...formData, year: Number(value) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() + i;
                    return <SelectItem key={year} value={String(year)}>{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">{team ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
