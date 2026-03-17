'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useGame, useUpdateGameAttendance, useUpdateGameLineup } from '@/hooks/use-games';
import { useTeam } from '@/hooks/use-teams';
import { usePlayers } from '@/hooks/use-players';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Printer } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceSection from '@/components/roster/AttendanceSection';
import LineupDisplay from '@/components/roster/LineupDisplay';
import PlayerStats from '@/components/roster/PlayerStats';
import { generateLineup } from '@/lib/generate-lineup';
import type { AttendanceRecord, LineupPeriod } from '@/lib/database.types';

export default function GameRosterPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('lineup');

  const { data: game, isLoading: gameLoading } = useGame(gameId);
  const { data: team } = useTeam(game?.team_id ?? null);
  const { data: players = [] } = usePlayers(game?.team_id ?? null);

  const updateAttendance = useUpdateGameAttendance(gameId);
  const updateLineup = useUpdateGameLineup(gameId);

  const handleGenerateLineup = () => {
    if (!game) return;
    setIsGenerating(true);
    try {
      const lineup = generateLineup(game, players);
      updateLineup.mutate(lineup as unknown as LineupPeriod[]);
    } catch (error) {
      alert('Error generating lineup: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (gameLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!game) return null;

  const attendance = (game.attendance || []) as AttendanceRecord[];
  const lineup = game.lineup as LineupPeriod[] | null;

  const playingPlayers = players.filter(p => {
    const record = attendance.find(a => a.player_id === p.id);
    return record?.status === 'playing';
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 print:hidden">
          <Link href={`/teams/${game.team_id}/games`}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Games
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{team?.name} - Game Day Lineup</h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(game.game_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            {game.opponent && ` vs ${game.opponent}`}
          </p>
        </div>

        <div className="space-y-6">
          <AttendanceSection
            players={players}
            attendance={attendance}
            onUpdateAttendance={(att) => updateAttendance.mutate(att)}
          />

          <div className="bg-white rounded-xl p-6 print:hidden">
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleGenerateLineup}
                disabled={isGenerating || playingPlayers.length === 0}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {lineup ? 'Regenerate Lineup' : 'Generate Lineup'}
              </Button>
              {lineup && (
                <Button onClick={() => window.print()} variant="outline" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
              )}
            </div>
          </div>

          {lineup && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md print:hidden">
                <TabsTrigger value="lineup">Lineup by Period</TabsTrigger>
                <TabsTrigger value="stats">Playing Time Summary</TabsTrigger>
              </TabsList>
              <TabsContent value="lineup" className="mt-6">
                <LineupDisplay
                  lineup={lineup}
                  players={players}
                  onUpdateLineup={(l) => updateLineup.mutate(l as unknown as LineupPeriod[])}
                />
              </TabsContent>
              <TabsContent value="stats" className="mt-6">
                <PlayerStats
                  lineup={lineup}
                  players={players}
                  countGoalieTime={game.count_goalie_as_playing_time ?? true}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
