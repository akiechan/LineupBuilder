'use client';

import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Check, Clock, X } from 'lucide-react';
import type { Player, AttendanceRecord } from '@/lib/database.types';

const statusConfig = {
  playing: { icon: Check, color: 'bg-green-100 text-green-700 border-green-300', label: 'Playing' },
  late: { icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Late' },
  absent: { icon: X, color: 'bg-gray-100 text-gray-500 border-gray-300', label: 'Absent' },
} as const;

export default function AttendanceSection({
  players,
  attendance,
  onUpdateAttendance,
}: {
  players: Player[];
  attendance: AttendanceRecord[];
  onUpdateAttendance: (attendance: AttendanceRecord[]) => void;
}) {
  // Auto-initialize all players to 'playing' when attendance is empty
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && attendance.length === 0 && players.length > 0) {
      initialized.current = true;
      onUpdateAttendance(players.map(p => ({ player_id: p.id, status: 'playing' as const })));
    }
  }, [attendance.length, players, onUpdateAttendance]);

  const getPlayerStatus = (playerId: string) => {
    const record = attendance.find(a => a.player_id === playerId);
    // Show as 'playing' if attendance hasn't been initialized yet
    if (!record && attendance.length === 0) return 'playing';
    return record?.status || 'absent';
  };

  const toggleStatus = (playerId: string) => {
    const currentStatus = getPlayerStatus(playerId);
    const statusOrder: Array<'playing' | 'absent' | 'late'> = ['playing', 'absent', 'late'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    // If attendance is empty, initialize all players first
    let baseAttendance = attendance.length === 0
      ? players.map(p => ({ player_id: p.id, status: 'playing' as const }))
      : attendance;

    const newAttendance = baseAttendance.filter(a => a.player_id !== playerId);
    if (newStatus !== 'absent') {
      newAttendance.push({ player_id: playerId, status: newStatus });
    }
    onUpdateAttendance(newAttendance);
  };

  const playingCount = attendance.length === 0 ? players.length : attendance.filter(a => a.status === 'playing').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;

  return (
    <Card className="print:hidden">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Attendance
          </CardTitle>
          <div className="flex gap-3 text-sm">
            <span className="text-green-600 font-medium">{playingCount} playing</span>
            {lateCount > 0 && <span className="text-yellow-600 font-medium">{lateCount} late</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {players.map((player) => {
            const status = getPlayerStatus(player.id);
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <button
                key={player.id}
                onClick={() => toggleStatus(player.id)}
                className={`p-3 rounded-lg border-2 transition-all hover:shadow-md ${config.color}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">{player.name}</div>
                    {player.id.startsWith('guest-')
                      ? <div className="text-xs opacity-75">Guest</div>
                      : player.jersey_number ? <div className="text-xs opacity-75">#{player.jersey_number}</div> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Click to change: Playing &rarr; Absent &rarr; Late &rarr; Playing
        </p>
      </CardContent>
    </Card>
  );
}
