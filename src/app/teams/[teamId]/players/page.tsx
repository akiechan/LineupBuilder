'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTeam } from '@/hooks/use-teams';
import { usePlayers, useDeletePlayer } from '@/hooks/use-players';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PlayerDialog from '@/components/players/PlayerDialog';
import PlayerTable from '@/components/players/PlayerTable';
import type { Player } from '@/lib/database.types';

export default function TeamPlayersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const { data: team } = useTeam(teamId);
  const { data: players = [], isLoading } = usePlayers(teamId);
  const deleteMutation = useDeletePlayer(teamId);

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this player?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPlayer(null);
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{team?.name || 'Team'} - Players</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage player roster and details</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
            <Plus className="w-5 h-5 mr-2" />
            Add Player
          </Button>
        </div>

        <PlayerTable players={players} isLoading={isLoading} onEdit={handleEdit} onDelete={handleDelete} />
        <PlayerDialog open={dialogOpen} onClose={handleCloseDialog} player={editingPlayer} teamId={teamId} />
      </div>
    </div>
  );
}
