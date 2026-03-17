'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Player, LineupPeriod } from '@/lib/database.types';

export default function PlayerStats({
  lineup,
  players,
  countGoalieTime,
}: {
  lineup: LineupPeriod[];
  players: Player[];
  countGoalieTime: boolean;
}) {
  const getPlayerById = (id: string) => players.find(p => p.id === id);

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
  const sortedPlayers = Object.keys(stats)
    .map(playerId => {
      const player = getPlayerById(playerId);
      const total = stats[playerId].field + stats[playerId].goalie;
      return { playerId, player, ...stats[playerId], total };
    })
    .sort((a, b) => {
      if (a.player && b.player) return a.player.name.localeCompare(b.player.name);
      return 0;
    });

  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-lg">Playing Time Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {sortedPlayers.map(({ playerId, player, field, goalie, total }) => (
            <div key={playerId} className="flex items-center justify-between p-2 border rounded">
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {player?.name || 'Unknown'}
                  {player?.jersey_number && ` (#${player.jersey_number})`}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
