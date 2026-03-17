'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Unlock, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Player, LineupPeriod } from '@/lib/database.types';

export default function LineupDisplay({
  lineup,
  players,
  onUpdateLineup,
}: {
  lineup: LineupPeriod[];
  players: Player[];
  onUpdateLineup: (lineup: LineupPeriod[]) => void;
}) {
  const [editMode, setEditMode] = useState(false);

  const getPlayerById = (id: string) => players.find(p => p.id === id);

  const toggleLock = (periodIndex: number, playerIndex: number) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex].players[playerIndex] = {
      ...newLineup[periodIndex].players[playerIndex],
      locked: !newLineup[periodIndex].players[playerIndex].locked,
    };
    onUpdateLineup(newLineup);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    const srcPeriodIndex = parseInt(source.droppableId);
    const dstPeriodIndex = parseInt(destination.droppableId);
    const srcPlayer = newLineup[srcPeriodIndex].players[source.index];
    const dstPlayer = newLineup[dstPeriodIndex].players[destination.index];

    if (srcPlayer.locked) return;

    if (source.droppableId === destination.droppableId) {
      newLineup[srcPeriodIndex].players.splice(source.index, 1);
      newLineup[srcPeriodIndex].players.splice(destination.index, 0, srcPlayer);
    } else {
      if (dstPlayer && !dstPlayer.locked) {
        newLineup[srcPeriodIndex].players[source.index] = dstPlayer;
        newLineup[dstPeriodIndex].players[destination.index] = srcPlayer;
      }
    }
    onUpdateLineup(newLineup);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold">Generated Lineup</h2>
        <button onClick={() => setEditMode(!editMode)} className="text-sm text-blue-600 hover:text-blue-700">
          {editMode ? 'Done Editing' : 'Edit Lineup'}
        </button>
      </div>

      {editMode && (
        <p className="text-xs text-gray-500 print:hidden">
          Drag players to reorder within a quarter, or between quarters to swap. Lock a player to prevent swapping.
        </p>
      )}

      {/* All quarters in one row on desktop, stacked on mobile */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {lineup.map((period, periodIndex) => {
            const goalie = getPlayerById(period.goalie);
            return (
              <Card key={period.period} className="print:break-inside-avoid">
                <CardContent className="pt-4 px-3">
                  <h3 className="font-bold text-sm text-center mb-3 text-green-700">Q{period.period}</h3>
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-900 mb-0.5">
                      <Shield className="w-3.5 h-3.5" />
                      Goalie
                    </div>
                    <div className="font-semibold text-sm text-blue-900 truncate">
                      {goalie?.name || 'Unknown'}
                      {goalie?.jersey_number != null && ` (#${goalie.jersey_number})`}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1.5">Field Players</div>
                    <Droppable droppableId={String(periodIndex)} isDropDisabled={!editMode}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`space-y-1.5 min-h-[40px] rounded transition-colors ${snapshot.isDraggingOver ? 'bg-green-50' : ''}`}
                        >
                          {period.players.map((playerSlot, playerIndex) => {
                            const player = getPlayerById(playerSlot.player_id);
                            return (
                              <Draggable
                                key={`${periodIndex}-${playerSlot.player_id}`}
                                draggableId={`${periodIndex}-${playerSlot.player_id}`}
                                index={playerIndex}
                                isDragDisabled={!editMode || playerSlot.locked}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`p-1.5 rounded border text-sm ${
                                      playerSlot.locked
                                        ? 'bg-yellow-50 border-yellow-300'
                                        : snapshot.isDragging
                                        ? 'bg-blue-50 border-blue-300 shadow-lg'
                                        : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      {editMode && !playerSlot.locked && (
                                        <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab active:cursor-grabbing shrink-0">
                                          <GripVertical className="w-3.5 h-3.5" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0 truncate text-xs font-medium">
                                        {player?.name || 'Unknown'}
                                        {player?.jersey_number != null && ` (#${player.jersey_number})`}
                                      </div>
                                      {editMode && (
                                        <button onClick={() => toggleLock(periodIndex, playerIndex)} className="p-0.5 hover:bg-gray-100 rounded print:hidden shrink-0">
                                          {playerSlot.locked ? <Lock className="w-3.5 h-3.5 text-yellow-600" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
