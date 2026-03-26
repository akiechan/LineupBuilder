'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Users, ChevronUp, ChevronDown } from 'lucide-react';
import type { Player } from '@/lib/database.types';

const skillLabels: Record<number, string> = { 1: 'Strong', 2: 'Average', 3: 'Developing' };
const attendanceLabels: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };
const goalieLabels: Record<number, string> = { 1: 'Primary', 2: 'Backup', 3: 'No' };

type SortField = 'jersey_number' | 'name' | 'gender' | 'position_preference' | 'skill_level' | 'attendance_pattern' | 'goalie_preference';
type SortDir = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...players].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const av = a[sortField];
    const bv = b[sortField];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
  };

  const sortableHead = (label: string, field: SortField) => (
    <TableHead
      className="cursor-pointer hover:text-gray-900 select-none"
      onClick={() => toggleSort(field)}
    >
      {label}<SortIcon field={field} />
    </TableHead>
  );

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
            {sortableHead('Jersey', 'jersey_number')}
            {sortableHead('Name', 'name')}
            {sortableHead('Gender', 'gender')}
            {sortableHead('Position', 'position_preference')}
            {sortableHead('Skill', 'skill_level')}
            {sortableHead('Attendance', 'attendance_pattern')}
            {sortableHead('Goalie', 'goalie_preference')}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((player) => (
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
