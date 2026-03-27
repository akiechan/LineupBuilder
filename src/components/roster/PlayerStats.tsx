'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { Player, LineupPeriod, AttendanceRecord } from '@/lib/database.types';

export default function PlayerStats({
  lineup,
  players,
  attendance,
  countGoalieTime,
}: {
  lineup: LineupPeriod[];
  players: Player[];
  attendance: AttendanceRecord[];
  countGoalieTime: boolean;
}) {
  const getPlayerStatus = (playerId: string) => {
    if (attendance.length === 0) return 'playing';
    const record = attendance.find(a => a.player_id === playerId);
    return record?.status || 'absent';
  };

  const getPlayerById = (id: string) => players.find(p => p.id === id);

  // --- Detect warnings ---
  const warnings: string[] = [];

  // Duplicate players in the same period
  lineup.forEach((period) => {
    const idsInPeriod: string[] = [];
    if (period.goalie) idsInPeriod.push(period.goalie);
    period.players.forEach(s => idsInPeriod.push(s.player_id));
    const seen = new Set<string>();
    for (const id of idsInPeriod) {
      if (seen.has(id)) {
        const p = getPlayerById(id);
        warnings.push(`${p?.name || 'Unknown'} appears multiple times in Q${period.period}`);
      }
      seen.add(id);
    }
  });

  // Goalie assigned to player who doesn't want goalie (preference = 3)
  lineup.forEach((period) => {
    if (!period.goalie) return;
    const goalie = getPlayerById(period.goalie);
    if (goalie && goalie.goalie_preference === 3) {
      warnings.push(`${goalie.name} is goalie in Q${period.period} but prefers not to play goalie`);
    }
  });

  // Playing time imbalance: if any non-absent player has 0 periods while others have 2+
  const calculateStats = () => {
    const stats: Record<string, { field: number; goalie: number }> = {};
    lineup.forEach((period) => {
      if (countGoalieTime && period.goalie) {
        if (!stats[period.goalie]) stats[period.goalie] = { field: 0, goalie: 0 };
        stats[period.goalie].goalie++;
      }
      period.players.forEach((playerSlot) => {
        if (!stats[playerSlot.player_id]) stats[playerSlot.player_id] = { field: 0, goalie: 0 };
        stats[playerSlot.player_id].field++;
      });
    });
    return stats;
  };

  const stats = calculateStats();

  // Check for players not playing at all
  const activePlayers = players.filter(p => {
    const status = getPlayerStatus(p.id);
    return status === 'playing' || status === 'late';
  });
  activePlayers.forEach(p => {
    const total = (stats[p.id]?.field ?? 0) + (stats[p.id]?.goalie ?? 0);
    if (total === 0) {
      warnings.push(`${p.name} is available but has 0 playing time`);
    }
  });

  // Check for large playing time gap
  if (activePlayers.length > 0) {
    const totals = activePlayers.map(p => (stats[p.id]?.field ?? 0) + (stats[p.id]?.goalie ?? 0));
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    if (max - min > 2) {
      warnings.push(`Playing time spread is ${min}-${max} periods (${max - min} gap)`);
    }
  }

  // Deduplicate
  const uniqueWarnings = [...new Set(warnings)];

  const statusOrder = { playing: 0, late: 1, absent: 2 };

  const allPlayers = players
    .map(player => {
      const status = getPlayerStatus(player.id);
      const playerStats = stats[player.id] || { field: 0, goalie: 0 };
      const total = playerStats.field + playerStats.goalie;
      return { player, status, ...playerStats, total };
    })
    .sort((a, b) => {
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] ?? 2) - (statusOrder[b.status as keyof typeof statusOrder] ?? 2);
      if (statusDiff !== 0) return statusDiff;
      return a.player.name.localeCompare(b.player.name);
    });

  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-lg">Playing Time Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {uniqueWarnings.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {uniqueWarnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {allPlayers.map(({ player, status, field, goalie, total }) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 border rounded ${
                status === 'absent'
                  ? 'bg-gray-50 border-gray-200 opacity-50'
                  : status === 'late'
                  ? 'bg-yellow-50 border-yellow-200'
                  : ''
              }`}
            >
              <div className="flex-1">
                <div className={`font-medium text-sm ${status === 'absent' ? 'text-gray-400' : ''}`}>
                  {player.name}
                  {player.jersey_number != null && ` (#${player.jersey_number})`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status === 'absent' ? (
                  <Badge variant="outline" className="bg-gray-100 text-gray-400 border-gray-200">
                    Absent
                  </Badge>
                ) : status === 'late' && total === 0 ? (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
                    Late
                  </Badge>
                ) : (
                  <>
                    {field > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {field} Field
                      </Badge>
                    )}
                    {goalie > 0 && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {goalie} Goalie
                      </Badge>
                    )}
                    <Badge className="bg-gray-800 text-white">{total} Total</Badge>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
