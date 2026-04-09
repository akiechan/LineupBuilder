'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useGame, useUpdateGame, useUpdateGameAttendance, useUpdateGameLineup, useUpdateGameGuestPlayers } from '@/hooks/use-games';
import { useTeam } from '@/hooks/use-teams';
import { usePlayers } from '@/hooks/use-players';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Printer, Share2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import AttendanceSection from '@/components/roster/AttendanceSection';
import GuestPlayerSection from '@/components/roster/GuestPlayerSection';
import LineupDisplay from '@/components/roster/LineupDisplay';
import PlayerStats from '@/components/roster/PlayerStats';
import GoalTracker from '@/components/roster/GoalTracker';
import { generateLineup } from '@/lib/generate-lineup';
import type { Game, Player, GuestPlayer, GoalRecord, AttendanceRecord, LineupPeriod } from '@/lib/database.types';

function guestToPlayer(guest: GuestPlayer, teamId: string): Player {
  return {
    id: guest.id,
    team_id: teamId,
    name: guest.name,
    jersey_number: null,
    gender: guest.gender,
    skill_level: guest.skill_level,
    attendance_pattern: 1,
    goalie_preference: guest.goalie_preference,
    position_preference: 'Field',
    created_at: '',
  };
}

export default function GameRosterPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [localAttendance, setLocalAttendance] = useState<AttendanceRecord[] | null>(null);
  const [localGuests, setLocalGuests] = useState<GuestPlayer[] | null>(null);

  const { data: game, isLoading: gameLoading } = useGame(gameId);
  const { data: team } = useTeam(game?.team_id ?? null);
  const { data: teamPlayers = [] } = usePlayers(game?.team_id ?? null);

  const updateGame = useUpdateGame();
  const updateAttendance = useUpdateGameAttendance(gameId);
  const updateLineup = useUpdateGameLineup(gameId);
  const updateGuestPlayers = useUpdateGameGuestPlayers(gameId);

  // Sync local state from server when game data loads
  useEffect(() => {
    if (game && localAttendance === null) {
      setLocalAttendance((game.attendance || []) as AttendanceRecord[]);
    }
    if (game && localGuests === null) {
      setLocalGuests((game.guest_players || []) as GuestPlayer[]);
    }
  }, [game, localAttendance, localGuests]);

  const guests = localGuests ?? (game?.guest_players || []) as GuestPlayer[];
  const attendance = localAttendance ?? (game?.attendance || []) as AttendanceRecord[];

  // Merge team players + guest players into one list
  const allPlayers: Player[] = [
    ...teamPlayers,
    ...guests.map(g => guestToPlayer(g, game?.team_id ?? '')),
  ];

  const handleUpdateAttendance = useCallback((att: AttendanceRecord[]) => {
    setLocalAttendance(att);
    updateAttendance.mutate(att);
  }, [updateAttendance]);

  const handleUpdateGuests = useCallback((newGuests: GuestPlayer[]) => {
    setLocalGuests(newGuests);
    updateGuestPlayers.mutate(newGuests);

    // Auto-add new guests to attendance as 'playing'
    const currentAttendance = localAttendance ?? [];
    const existingIds = new Set(currentAttendance.map(a => a.player_id));
    const newAttendance = [...currentAttendance];
    for (const guest of newGuests) {
      if (!existingIds.has(guest.id)) {
        newAttendance.push({ player_id: guest.id, status: 'playing' });
      }
    }
    // Remove attendance for deleted guests
    const guestIds = new Set(newGuests.map(g => g.id));
    const cleanedAttendance = newAttendance.filter(
      a => !a.player_id.startsWith('guest-') || guestIds.has(a.player_id)
    );
    if (cleanedAttendance.length !== currentAttendance.length || cleanedAttendance.length !== newAttendance.length) {
      setLocalAttendance(cleanedAttendance);
      updateAttendance.mutate(cleanedAttendance);
    }
  }, [updateGuestPlayers, updateAttendance, localAttendance]);

  const playingPlayers = attendance.length === 0
    ? allPlayers
    : allPlayers.filter(p => {
        const record = attendance.find(a => a.player_id === p.id);
        return record?.status === 'playing' || record?.status === 'late';
      });

  const handleGenerateLineup = () => {
    if (!game) return;
    const existingLineup = game.lineup as LineupPeriod[] | null;
    if (existingLineup && !confirm('A lineup already exists. Regenerating will replace it (locked players will be preserved). Continue?')) {
      return;
    }
    setIsGenerating(true);
    try {
      const newLineup = generateLineup(game, allPlayers, attendance, existingLineup ?? undefined);
      updateLineup.mutate(newLineup as unknown as LineupPeriod[]);
    } catch (error) {
      alert('Error generating lineup: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    const el = document.getElementById('print-lineup');
    if (!el) return;
    setIsSharing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'lineup.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${team?.name} Lineup` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lineup.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* user cancelled */ } finally {
      setIsSharing(false);
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

  const lineup = game.lineup as LineupPeriod[] | null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 print:hidden">
          <Link href={`/teams/${game.team_id}/games`}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Games
            </Button>
          </Link>
        </div>

        <div className="mb-6 print:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{team?.name} - Game Day</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {format(new Date(game.game_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            {game.opponent && ` vs ${game.opponent}`}
          </p>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold text-center">{team?.name}</h1>
          <p className="text-center text-sm text-gray-700">
            {format(new Date(game.game_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
            {game.opponent && ` vs ${game.opponent}`}
          </p>
        </div>

        <div className="space-y-6">
          <div className="print:hidden">
            <GuestPlayerSection
              guests={guests}
              onUpdate={handleUpdateGuests}
            />
          </div>

          <div className="print:hidden">
            <AttendanceSection
              players={allPlayers}
              attendance={attendance}
              numPeriods={game.num_periods || 4}
              onUpdateAttendance={handleUpdateAttendance}
            />
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 print:hidden">
            {/* Active settings summary */}
            {(() => {
              const chips: string[] = [];
              const visibleStrategies = (game.strategy_priorities || []).filter(
                s => s !== 'skill_grouped' && s !== 'skill_balanced'
              );
              const strategyLabels: Record<string, string> = {
                skill_weighted: 'Skill',
                attendance_weighted: 'Attendance',
                gender_weighted: 'Gender',
                playing_time_weighted: 'Equal Time',
              };
              if (visibleStrategies.length > 0) {
                chips.push(visibleStrategies.map(s => strategyLabels[s] || s).join(' > '));
              }
              if (game.avoid_consecutive_bench) chips.push('No consecutive bench');
              if (game.goalie_counts_as_bench) chips.push('Goalie = bench');
              if (!game.count_goalie_as_playing_time) chips.push('Goalie time not counted');
              return chips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {chips.map((chip, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{chip}</span>
                  ))}
                </div>
              ) : null;
            })()}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                onClick={handleGenerateLineup}
                disabled={isGenerating || playingPlayers.length === 0}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {lineup ? 'Regenerate Lineup' : 'Generate Lineup'}
              </Button>
              {lineup && (
                <>
                  <Button onClick={() => window.print()} variant="outline" className="gap-2">
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="gap-2" disabled={isSharing}>
                    <Share2 className="w-4 h-4" />
                    {isSharing ? 'Sharing...' : 'Share'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {lineup && (
            <div className="space-y-6">
              <div id="print-lineup">
                <LineupDisplay
                  lineup={lineup}
                  players={allPlayers}
                  attendance={attendance}
                  onUpdateLineup={(l) => updateLineup.mutate(l as unknown as LineupPeriod[])}
                />
              </div>
              <div className="print:hidden">
                <PlayerStats
                  lineup={lineup}
                  players={allPlayers}
                  attendance={attendance}
                  countGoalieTime={game.count_goalie_as_playing_time ?? true}
                />
              </div>
            </div>
          )}

          {/* Goal Log */}
          <GoalTracker
            goals={(game.goals || []) as GoalRecord[]}
            players={allPlayers}
            numPeriods={game.num_periods || 4}
            opponentName={game.opponent || 'Opponent'}
            onUpdate={(goals) => {
              const scoreUs = goals.filter(g => g.scorer_id !== null).length;
              const scoreOpp = goals.filter(g => g.scorer_id === null).length;
              updateGame.mutate({
                id: game.id,
                goals: goals as unknown as Game['goals'],
                score_us: scoreUs,
                score_opponent: scoreOpp,
              });
            }}
          />

          {/* Game Notes */}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="text-lg">Game Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Observations, player highlights, things to try next game..."
                defaultValue={game.notes ?? ''}
                onBlur={(e) => {
                  if (e.target.value !== (game.notes ?? '')) {
                    updateGame.mutate({ id: game.id, notes: e.target.value || null });
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
