import { describe, it, expect } from 'vitest';
import { generateLineup } from './generate-lineup';
import type { Player, Game, AttendanceRecord } from './database.types';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    team_id: 'team1',
    name: `Player ${i + 1}`,
    jersey_number: i + 1,
    gender: i % 3 === 0 ? 'Female' : 'Male',
    skill_level: ((i % 3) + 1) as 1 | 2 | 3,
    attendance_pattern: 1,
    goalie_preference: i === 0 ? 1 : 3,
    position_preference: 'Field',
    created_at: '',
  }));
}

function makeGame(overrides?: Partial<Game>): Game {
  return {
    id: 'game1',
    team_id: 'team1',
    game_date: '2026-03-20',
    opponent: 'Test Team',
    num_periods: 4,
    players_per_period: 5,
    goalie_rotation_periods: 1,
    count_goalie_as_playing_time: true,
    has_goalie: true,
    strategy_priorities: ['playing_time_weighted'],
    attendance: [],
    lineup: null,
    created_at: '',
    ...overrides,
  };
}

describe('generateLineup', () => {
  it('only includes players marked as playing in attendance', () => {
    const players = makePlayers(10);
    const attendance: AttendanceRecord[] = [
      { player_id: 'p1', status: 'playing' },
      { player_id: 'p2', status: 'playing' },
      { player_id: 'p3', status: 'playing' },
      { player_id: 'p4', status: 'playing' },
      { player_id: 'p5', status: 'playing' },
      { player_id: 'p6', status: 'playing' },
      { player_id: 'p7', status: 'playing' },
      { player_id: 'p8', status: 'absent' },  // absent - not in game.attendance
      { player_id: 'p9', status: 'playing' },
      { player_id: 'p10', status: 'playing' },
    ];
    // p8 is absent
    const playingAttendance = attendance.filter(a => a.status === 'playing');
    const absentAttendance = attendance;

    const game = makeGame({ attendance: absentAttendance });
    const lineup = generateLineup(game, players, absentAttendance);

    // p8 should NOT appear anywhere in the lineup
    const allPlayerIds = new Set<string>();
    lineup.forEach(period => {
      if (period.goalie) allPlayerIds.add(period.goalie);
      period.players.forEach(s => allPlayerIds.add(s.player_id));
    });

    expect(allPlayerIds.has('p8')).toBe(false);
    expect(allPlayerIds.size).toBeGreaterThan(0);
  });

  it('excludes players not in attendance array (treated as absent)', () => {
    const players = makePlayers(8);
    // Only p1-p6 in attendance, p7 and p8 are missing (treated as absent)
    const attendance: AttendanceRecord[] = [
      { player_id: 'p1', status: 'playing' },
      { player_id: 'p2', status: 'playing' },
      { player_id: 'p3', status: 'playing' },
      { player_id: 'p4', status: 'playing' },
      { player_id: 'p5', status: 'playing' },
      { player_id: 'p6', status: 'playing' },
    ];

    const game = makeGame();
    const lineup = generateLineup(game, players, attendance);

    const allPlayerIds = new Set<string>();
    lineup.forEach(period => {
      if (period.goalie) allPlayerIds.add(period.goalie);
      period.players.forEach(s => allPlayerIds.add(s.player_id));
    });

    expect(allPlayerIds.has('p7')).toBe(false);
    expect(allPlayerIds.has('p8')).toBe(false);
  });

  it('treats empty attendance as all players playing', () => {
    const players = makePlayers(8);
    const game = makeGame();
    const lineup = generateLineup(game, players, []);

    const allPlayerIds = new Set<string>();
    lineup.forEach(period => {
      if (period.goalie) allPlayerIds.add(period.goalie);
      period.players.forEach(s => allPlayerIds.add(s.player_id));
    });

    // All 8 players should appear
    expect(allPlayerIds.size).toBe(8);
  });

  it('generates lineup without goalie when has_goalie is false', () => {
    const players = makePlayers(8);
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({ has_goalie: false });
    const lineup = generateLineup(game, players, attendance);

    lineup.forEach(period => {
      expect(period.goalie).toBe('');
    });
  });

  it('produces different results on repeated calls (randomness)', () => {
    const players = makePlayers(12);
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame();

    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const lineup = generateLineup(game, players, attendance);
      const key = lineup.map(p => p.players.map(s => s.player_id).join(',')).join('|');
      results.add(key);
    }

    // Should have at least 2 different results in 10 tries
    expect(results.size).toBeGreaterThan(1);
  });

  it('respects equal playing time priority', () => {
    const players = makePlayers(10);
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({ strategy_priorities: ['playing_time_weighted'] });

    const lineup = generateLineup(game, players, attendance);

    // Count total play time per player
    const playCount: Record<string, number> = {};
    players.forEach(p => { playCount[p.id] = 0; });
    lineup.forEach(period => {
      if (period.goalie) playCount[period.goalie]++;
      period.players.forEach(s => playCount[s.player_id]++);
    });

    const counts = Object.values(playCount);
    const min = Math.min(...counts);
    const max = Math.max(...counts);

    // With equal time as first priority, spread should be at most 2
    expect(max - min).toBeLessThanOrEqual(2);
  });
});
