'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Users } from 'lucide-react';
import type { Player } from '@/lib/database.types';

const skillLabels: Record<number, string> = { 1: 'Strong', 2: 'Average', 3: 'Developing' };
const attendanceLabels: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };
const goalieLabels: Record<number, string> = { 1: 'Primary', 2: 'Backup', 3: 'No' };

export default function PlayerTable({
  players,
  isLoading,
  onEdit,
  onDelete,
}: {
  players: Player[];
  isLoading: boolean;
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No players yet</h3>
        <p className="text-gray-500">Add players to start building your roster</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>Jersey</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Skill</TableHead>
            <TableHead>Attendance</TableHead>
            <TableHead>Goalie</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id}>
              <TableCell className="font-medium">{player.jersey_number || '-'}</TableCell>
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  player.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  player.gender === 'Female' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }>
                  {player.gender || '-'}
                </Badge>
              </TableCell>
              <TableCell>{player.position_preference || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  player.skill_level === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                  player.skill_level === 2 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-orange-50 text-orange-700 border-orange-200'
                }>
                  {skillLabels[player.skill_level] || 'Average'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  player.attendance_pattern === 1 ? 'bg-green-50 text-green-700 border-green-200' :
                  player.attendance_pattern === 2 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }>
                  {attendanceLabels[player.attendance_pattern] || 'High'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  player.goalie_preference === 1 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  player.goalie_preference === 2 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  'bg-gray-50 text-gray-700 border-gray-200'
                }>
                  {goalieLabels[player.goalie_preference] || 'No'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(player)} className="h-8 w-8">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(player.id)} className="h-8 w-8 text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
