'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Trash2 } from 'lucide-react';
import type { GuestPlayer } from '@/lib/database.types';

export default function GuestPlayerSection({
  guests,
  onUpdate,
}: {
  guests: GuestPlayer[];
  onUpdate: (guests: GuestPlayer[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<string>('Male');
  const [skillLevel, setSkillLevel] = useState(2);
  const [goaliePreference, setGoaliePreference] = useState(3);

  const handleAdd = () => {
    if (!name.trim()) return;
    const guest: GuestPlayer = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      gender,
      skill_level: skillLevel,
      goalie_preference: goaliePreference,
    };
    onUpdate([...guests, guest]);
    setName('');
    setGender('Male');
    setSkillLevel(2);
    setGoaliePreference(3);
    setShowForm(false);
  };

  const handleRemove = (id: string) => {
    onUpdate(guests.filter(g => g.id !== id));
  };

  const skillLabels = ['', 'Beginner', 'Intermediate', 'Advanced'];
  const goalieLabels = ['', 'Wants to', 'Willing', 'Prefers not'];

  return (
    <Card className="print:hidden">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5" />
            Guest Players
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Add Guest
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="border rounded-lg p-4 mb-4 bg-blue-50 space-y-3">
            <div>
              <Label htmlFor="guest-name">Name *</Label>
              <Input
                id="guest-name"
                placeholder="Guest player name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Gender</Label>
                <div className="flex gap-1 mt-1">
                  {['Male', 'Female'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium border transition-all ${
                        gender === g
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Skill</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSkillLevel(s)}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium border transition-all ${
                        skillLevel === s
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {skillLabels[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Goalie</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGoaliePreference(g)}
                      className={`flex-1 px-2 py-1.5 rounded text-xs font-medium border transition-all ${
                        goaliePreference === g
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {goalieLabels[g]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={!name.trim()} className="bg-green-600 hover:bg-green-700">
                Add
              </Button>
            </div>
          </div>
        )}

        {guests.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {guests.map(guest => (
              <div
                key={guest.id}
                className="p-3 rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{guest.name}</div>
                  <div className="text-xs opacity-75">
                    Guest · {guest.gender} · {skillLabels[guest.skill_level]}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(guest.id)}
                  className="p-1 hover:bg-blue-100 rounded shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        ) : !showForm ? (
          <p className="text-sm text-gray-400 text-center py-2">No guest players added</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
