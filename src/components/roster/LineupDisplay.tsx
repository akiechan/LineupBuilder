'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Unlock, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { Player, LineupPeriod } from '@/lib/database.types';

const POSITIONS = ['Field', 'Forward', 'Midfield', 'Defense', 'Wing', 'Striker', 'Sweeper'];

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

  const updatePosition = (periodIndex: number, playerIndex: number, position: string) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    newLineup[periodIndex].players[playerIndex] = {
      ...newLineup[periodIndex].players[playerIndex],
      position,
    };
    onUpdateLineup(newLineup);
  };

  const swapPlayer = (periodIndex: number, playerIndex: number, newPlayerId: string) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    const oldPlayerId = newLineup[periodIndex].players[playerIndex].player_id;
    if (oldPlayerId === newPlayerId) return;

    // Find if the new player is already in a slot somewhere (field or goalie)
    for (let qi = 0; qi < newLineup.length; qi++) {
      // Check goalie
      if (newLineup[qi].goalie === newPlayerId) {
        // Swap: old player becomes goalie there, new player takes field slot here
        newLineup[qi].goalie = oldPlayerId;
        newLineup[periodIndex].players[playerIndex] = {
          ...newLineup[periodIndex].players[playerIndex],
          player_id: newPlayerId,
        };
        onUpdateLineup(newLineup);
        return;
      }
      // Check field players
      for (let pi = 0; pi < newLineup[qi].players.length; pi++) {
        if (newLineup[qi].players[pi].player_id === newPlayerId) {
          // Swap the two field slots
          newLineup[qi].players[pi] = {
            ...newLineup[qi].players[pi],
            player_id: oldPlayerId,
          };
          newLineup[periodIndex].players[playerIndex] = {
            ...newLineup[periodIndex].players[playerIndex],
            player_id: newPlayerId,
          };
          onUpdateLineup(newLineup);
          return;
        }
      }
    }

    // Player not found anywhere in lineup - just assign them
    newLineup[periodIndex].players[playerIndex] = {
      ...newLineup[periodIndex].players[playerIndex],
      player_id: newPlayerId,
    };
    onUpdateLineup(newLineup);
  };

  const swapGoalie = (periodIndex: number, newGoalieId: string) => {
    const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
    const oldGoalieId = newLineup[periodIndex].goalie;
    if (oldGoalieId === newGoalieId) return;

    // Find where the new goalie currently is
    for (let qi = 0; qi < newLineup.length; qi++) {
      if (newLineup[qi].goalie === newGoalieId) {
        newLineup[qi].goalie = oldGoalieId;
        newLineup[periodIndex].goalie = newGoalieId;
        onUpdateLineup(newLineup);
        return;
      }
      for (let pi = 0; pi < newLineup[qi].players.length; pi++) {
        if (newLineup[qi].players[pi].player_id === newGoalieId) {
          newLineup[qi].players[pi] = {
            ...newLineup[qi].players[pi],
            player_id: oldGoalieId,
          };
          newLineup[periodIndex].goalie = newGoalieId;
          onUpdateLineup(newLineup);
          return;
        }
      }
    }

    newLineup[periodIndex].goalie = newGoalieId;
    onUpdateLineup(newLineup);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    // Quarter reorder
    if (type === 'quarter') {
      if (source.index === destination.index) return;
      const newLineup = lineup.map(p => ({ ...p, players: [...p.players] }));
      const [moved] = newLineup.splice(source.index, 1);
      newLineup.splice(destination.index, 0, moved);
      newLineup.forEach((p, i) => { p.period = i + 1; });
      onUpdateLineup(newLineup);
      return;
    }

    // Player reorder/swap
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

  // All players in the lineup (for dropdowns)
  const allLineupPlayerIds = new Set<string>();
  lineup.forEach(p => {
    allLineupPlayerIds.add(p.goalie);
    p.players.forEach(s => allLineupPlayerIds.add(s.player_id));
  });
  const lineupPlayers = players.filter(p => allLineupPlayerIds.has(p.id));

  const playerLabel = (p: Player) =>
    p.jersey_number != null ? `#${p.jersey_number} ${p.name}` : p.name;

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
          Drag quarters to reorder. Drag players or use dropdowns to swap. Click position to change.
        </p>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="quarters" type="quarter" direction="horizontal">
          {(qProvided) => (
            <div
              ref={qProvided.innerRef}
              {...qProvided.droppableProps}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              {lineup.map((period, periodIndex) => {
                const goalie = getPlayerById(period.goalie);
                return (
                  <Draggable
                    key={`quarter-${periodIndex}`}
                    draggableId={`quarter-${periodIndex}`}
                    index={periodIndex}
                    isDragDisabled={!editMode}
                  >
                    {(qDragProvided, qSnapshot) => (
                      <Card
                        ref={qDragProvided.innerRef}
                        {...qDragProvided.draggableProps}
                        className={`print:break-inside-avoid ${qSnapshot.isDragging ? 'shadow-xl ring-2 ring-green-300' : ''}`}
                      >
                        <CardContent className="pt-4 px-3">
                          {/* Quarter header - drag handle */}
                          <div
                            {...qDragProvided.dragHandleProps}
                            className={`flex items-center justify-center gap-1 mb-3 rounded py-1 ${editMode ? 'cursor-grab active:cursor-grabbing hover:bg-green-50' : ''}`}
                          >
                            {editMode && <GripVertical className="w-4 h-4 text-green-400" />}
                            <h3 className="font-bold text-sm text-green-700">Q{period.period}</h3>
                          </div>

                          {/* Goalie */}
                          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-900 mb-0.5">
                              <Shield className="w-3.5 h-3.5" />
                              Goalie
                            </div>
                            {editMode ? (
                              <select
                                value={period.goalie}
                                onChange={(e) => swapGoalie(periodIndex, e.target.value)}
                                className="w-full text-sm font-semibold text-blue-900 bg-white border border-blue-200 rounded px-1.5 py-1 print:hidden"
                              >
                                {lineupPlayers
                                  .sort((a, b) => a.name.localeCompare(b.name))
                                  .map(p => (
                                    <option key={p.id} value={p.id}>{playerLabel(p)}</option>
                                  ))}
                              </select>
                            ) : (
                              <div className="font-semibold text-sm text-blue-900 truncate">
                                {goalie?.name || 'Unknown'}
                                {goalie?.jersey_number != null && ` (#${goalie.jersey_number})`}
                              </div>
                            )}
                          </div>

                          {/* Field players */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1.5">Field Players</div>
                            <Droppable droppableId={String(periodIndex)} type="player" isDropDisabled={!editMode}>
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
                                              {editMode ? (
                                                <select
                                                  value={playerSlot.player_id}
                                                  onChange={(e) => swapPlayer(periodIndex, playerIndex, e.target.value)}
                                                  className="flex-1 min-w-0 text-xs font-medium bg-gray-50 border border-gray-200 rounded px-1 py-0.5 print:hidden"
                                                >
                                                  {lineupPlayers
                                                    .sort((a, b) => a.name.localeCompare(b.name))
                                                    .map(p => (
                                                      <option key={p.id} value={p.id}>{playerLabel(p)}</option>
                                                    ))}
                                                </select>
                                              ) : (
                                                <div className="flex-1 min-w-0 truncate text-xs font-medium">
                                                  {player?.name || 'Unknown'}
                                                  {player?.jersey_number != null && ` (#${player.jersey_number})`}
                                                </div>
                                              )}
                                              {editMode ? (
                                                <select
                                                  value={playerSlot.position}
                                                  onChange={(e) => updatePosition(periodIndex, playerIndex, e.target.value)}
                                                  className="text-xs bg-gray-50 border border-gray-200 rounded px-1 py-0.5 shrink-0 max-w-[72px] print:hidden"
                                                >
                                                  {POSITIONS.map(pos => (
                                                    <option key={pos} value={pos}>{pos}</option>
                                                  ))}
                                                  {!POSITIONS.includes(playerSlot.position) && (
                                                    <option value={playerSlot.position}>{playerSlot.position}</option>
                                                  )}
                                                </select>
                                              ) : (
                                                <div className="text-xs text-gray-500 shrink-0">{playerSlot.position}</div>
                                              )}
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
                    )}
                  </Draggable>
                );
              })}
              {qProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
