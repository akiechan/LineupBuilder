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

  it('16 players 4x4 with fair play #1 + gender #2: every player plays exactly once', () => {
    // Simulates the Kindergarten Dolphins scenario: 16 kids, 4 periods, 4 per period, no goalie
    // 10 boys, 6 girls — gender swap must NOT drop anyone to 0 periods
    const players: Player[] = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      team_id: 'team1',
      name: `Player ${i + 1}`,
      jersey_number: i + 1,
      gender: i < 6 ? 'Female' : 'Male', // 6 girls, 10 boys
      skill_level: 2 as 1 | 2 | 3,
      attendance_pattern: 1,
      goalie_preference: 3,
      position_preference: 'Field',
      created_at: '',
    }));
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({
      num_periods: 4,
      players_per_period: 4,
      has_goalie: false,
      strategy_priorities: ['playing_time_weighted', 'gender_weighted'],
    });

    // Run 50 times to catch probabilistic failures
    for (let run = 0; run < 50; run++) {
      const lineup = generateLineup(game, players, attendance);

      const playCount: Record<string, number> = {};
      players.forEach(p => { playCount[p.id] = 0; });
      lineup.forEach(period => {
        period.players.forEach(s => playCount[s.player_id]++);
      });

      // 16 slots / 16 players = exactly 1 each. No one should have 0.
      const counts = Object.values(playCount);
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...counts)).toBeLessThanOrEqual(1);
    }
  });

  it('gender swap works freely when fair play is NOT the first priority', () => {
    // When gender is #1 and fair play is #2, gender can freely swap
    const players: Player[] = Array.from({ length: 16 }, (_, i) => ({
      id: `p${i + 1}`,
      team_id: 'team1',
      name: `Player ${i + 1}`,
      jersey_number: i + 1,
      gender: i < 6 ? 'Female' : 'Male',
      skill_level: 2 as 1 | 2 | 3,
      attendance_pattern: 1,
      goalie_preference: 3,
      position_preference: 'Field',
      created_at: '',
    }));
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({
      num_periods: 4,
      players_per_period: 4,
      has_goalie: false,
      strategy_priorities: ['gender_weighted', 'playing_time_weighted'],
    });

    // Should not throw — gender swaps are unrestricted
    const lineup = generateLineup(game, players, attendance);
    expect(lineup.length).toBe(4);
  });
});
