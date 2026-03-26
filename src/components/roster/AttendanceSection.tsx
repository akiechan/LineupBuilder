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
  numPeriods,
  onUpdateAttendance,
}: {
  players: Player[];
  attendance: AttendanceRecord[];
  numPeriods: number;
  onUpdateAttendance: (attendance: AttendanceRecord[]) => void;
}) {
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && attendance.length === 0 && players.length > 0) {
      initialized.current = true;
      onUpdateAttendance(players.map(p => ({ player_id: p.id, status: 'playing' as const })));
    }
  }, [attendance.length, players, onUpdateAttendance]);

  const getRecord = (playerId: string) => attendance.find(a => a.player_id === playerId);

  const getPlayerStatus = (playerId: string) => {
    const record = getRecord(playerId);
    if (!record && attendance.length === 0) return 'playing';
    return record?.status || 'absent';
  };

  const toggleStatus = (playerId: string) => {
    const currentStatus = getPlayerStatus(playerId);
    const statusOrder: Array<'playing' | 'absent' | 'late'> = ['playing', 'absent', 'late'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    let baseAttendance = attendance.length === 0
      ? players.map(p => ({ player_id: p.id, status: 'playing' as const }))
      : attendance;

    const newAttendance = baseAttendance.filter(a => a.player_id !== playerId);
    if (newStatus !== 'absent') {
      const record: AttendanceRecord = { player_id: playerId, status: newStatus };
      if (newStatus === 'late') record.arrives_period = 2; // default to Q2
      newAttendance.push(record);
    }
    onUpdateAttendance(newAttendance);
  };

  const setArrivesPeriod = (playerId: string, period: number) => {
    const newAttendance = attendance.map(a =>
      a.player_id === playerId ? { ...a, arrives_period: period } : a
    );
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
            const record = getRecord(player.id);
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <div key={player.id} className={`rounded-lg border-2 transition-all ${config.color}`}>
                <button
                  onClick={() => toggleStatus(player.id)}
                  className="w-full p-3 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{player.name}</div>
                      {player.id.startsWith('guest-')
                        ? <div className="text-xs opacity-75">Guest</div>
                        : player.jersey_number ? <div className="text-xs opacity-75">#{player.jersey_number}</div> : null}
                    </div>
                  </div>
                </button>
                {status === 'late' && (
                  <div className="px-3 pb-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {Array.from({ length: numPeriods - 1 }, (_, i) => i + 2).map(q => (
                      <button
                        key={q}
                        onClick={() => setArrivesPeriod(player.id, q)}
                        className={`flex-1 text-xs py-1 rounded font-medium transition-all ${
                          (record?.arrives_period ?? 2) === q
                            ? 'bg-yellow-600 text-white'
                            : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        Q{q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
