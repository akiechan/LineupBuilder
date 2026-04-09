'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTeam } from '@/hooks/use-teams';
import { useGames, useCreateGame, useDeleteGame } from '@/hooks/use-games';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import GameCard from '@/components/games/GameCard';
import GameDialog from '@/components/games/GameDialog';
import type { Game } from '@/lib/database.types';

export default function GamesPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const { data: team } = useTeam(teamId);
  const { data: games = [], isLoading } = useGames(teamId);
  const createMutation = useCreateGame();
  const deleteMutation = useDeleteGame(teamId);

  const handleCopy = (game: Game) => {
    createMutation.mutate({
      team_id: game.team_id,
      game_date: game.game_date,
      opponent: game.opponent ? `${game.opponent} (Copy)` : 'Game Day (Copy)',
      num_periods: game.num_periods,
      players_per_period: game.players_per_period,
      has_goalie: game.has_goalie,
      goalie_rotation_periods: game.goalie_rotation_periods,
      count_goalie_as_playing_time: game.count_goalie_as_playing_time,
      avoid_consecutive_bench: game.avoid_consecutive_bench,
      strategy_priorities: game.strategy_priorities,
    });
  };

  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this game?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGame(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Teams
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-green-600 shrink-0" />
              {team?.name || 'Team'} - Games
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage games and generate rosters</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            New Game
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />)}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No games scheduled</h3>
            <p className="text-gray-500 mb-6">Create your first game to generate rosters</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-5 h-5 mr-2" />
              Create Game
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard key={game.id} game={game} onEdit={handleEdit} onCopy={handleCopy} onDelete={handleDelete} />
            ))}
          </div>
        )}

        <GameDialog open={dialogOpen} onClose={handleCloseDialog} game={editingGame} teamId={teamId} />
      </div>
    </div>
  );
}
