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
    guest_players: [],
    goals: [],
    score_us: null,
    score_opponent: null,
    notes: null,
    created_at: '',
    ...overrides,
  };
}

function countPlays(lineup: ReturnType<typeof generateLineup>, players: Player[]) {
  const playCount: Record<string, number> = {};
  players.forEach(p => { playCount[p.id] = 0; });
  lineup.forEach(period => {
    if (period.goalie) playCount[period.goalie]++;
    period.players.forEach(s => playCount[s.player_id]++);
  });
  return playCount;
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
      { player_id: 'p8', status: 'absent' },
      { player_id: 'p9', status: 'playing' },
      { player_id: 'p10', status: 'playing' },
    ];

    const game = makeGame({ attendance });
    const lineup = generateLineup(game, players, attendance);

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

    expect(results.size).toBeGreaterThan(1);
  });

  it('respects equal playing time priority', () => {
    const players = makePlayers(10);
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({ strategy_priorities: ['playing_time_weighted'] });

    const lineup = generateLineup(game, players, attendance);
    const playCount = countPlays(lineup, players);
    const counts = Object.values(playCount);

    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });

  it('16 players 4x4 with fair play #1 + gender #2: every player plays exactly once', () => {
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
      strategy_priorities: ['playing_time_weighted', 'gender_weighted'],
    });

    for (let run = 0; run < 50; run++) {
      const lineup = generateLineup(game, players, attendance);
      const playCount = countPlays(lineup, players);
      const counts = Object.values(playCount);
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...counts)).toBeLessThanOrEqual(1);
    }
  });

  it('gender swap works freely when fair play is NOT the first priority', () => {
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

    const lineup = generateLineup(game, players, attendance);
    expect(lineup.length).toBe(4);
  });

  it('skill #1 priority: no player plays 2x more than another', () => {
    // Simulates the 2nd grade scenario: ~14 players, mixed skills, skill as #1
    // Multiple goalie-eligible players for realistic rotation
    const players: Player[] = Array.from({ length: 14 }, (_, i) => ({
      id: `p${i + 1}`,
      team_id: 'team1',
      name: `Player ${i + 1}`,
      jersey_number: i + 1,
      gender: i < 5 ? 'Female' : 'Male',
      skill_level: (i < 4 ? 3 : i < 9 ? 2 : 1) as 1 | 2 | 3, // 4 advanced, 5 mid, 5 developing
      attendance_pattern: 1,
      goalie_preference: i < 3 ? 1 : 3, // 3 goalie-eligible
      position_preference: 'Field',
      created_at: '',
    }));
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({
      num_periods: 4,
      players_per_period: 6,
      has_goalie: true,
      goalie_rotation_periods: 1,
      strategy_priorities: ['skill_weighted'],
    });

    // Run 50 times — no one should get 2x another's time
    for (let run = 0; run < 50; run++) {
      const lineup = generateLineup(game, players, attendance);
      const playCount = countPlays(lineup, players);
      const counts = Object.values(playCount);
      const min = Math.min(...counts);
      const max = Math.max(...counts);

      // 14 players, 28 total slots (24 field + 4 goalie) = ~2 each
      // Spread should be at most 2 (e.g. 1 vs 3), never 2 vs 4
      expect(min).toBeGreaterThanOrEqual(1);
      expect(max - min).toBeLessThanOrEqual(2);
    }
  });

  it('skill #1 gives skilled players bonus slots over developing', () => {
    const players: Player[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `adv${i}`, team_id: 'team1', name: `Advanced ${i}`, jersey_number: i + 1,
        gender: 'Male', skill_level: 1 as 1 | 2 | 3, attendance_pattern: 1, // 1=Strong
        goalie_preference: 3, position_preference: 'Field', created_at: '',
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `dev${i}`, team_id: 'team1', name: `Developing ${i}`, jersey_number: i + 10,
        gender: 'Male', skill_level: 3 as 1 | 2 | 3, attendance_pattern: 1, // 3=Developing
        goalie_preference: 3, position_preference: 'Field', created_at: '',
      })),
    ];
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({
      num_periods: 4,
      players_per_period: 4,
      has_goalie: false,
      strategy_priorities: ['skill_weighted'],
    });

    // Over many runs, advanced players should get >= developing players on average
    let advTotal = 0, devTotal = 0;
    const runs = 50;
    for (let run = 0; run < runs; run++) {
      const lineup = generateLineup(game, players, attendance);
      const playCount = countPlays(lineup, players);
      players.forEach(p => {
        if (p.id.startsWith('adv')) advTotal += playCount[p.id];
        else devTotal += playCount[p.id];
      });
    }

    const advAvg = advTotal / (5 * runs);
    const devAvg = devTotal / (5 * runs);
    expect(advAvg).toBeGreaterThanOrEqual(devAvg);
  });

  it('each period has exactly playersPerPeriod field players', () => {
    const players = makePlayers(12);
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({ players_per_period: 5 });

    const lineup = generateLineup(game, players, attendance);
    lineup.forEach(period => {
      expect(period.players.length).toBe(5);
    });
  });

  it('late players are included but play fewer periods than on-time players', () => {
    const players = makePlayers(10);
    const attendance: AttendanceRecord[] = players.map((p, i) => ({
      player_id: p.id,
      status: i < 2 ? 'late' : 'playing', // p1, p2 are late
    }));
    const game = makeGame({
      has_goalie: false,
      players_per_period: 5,
      strategy_priorities: ['playing_time_weighted'],
    });

    let lateTotal = 0, onTimeTotal = 0;
    const runs = 30;
    for (let run = 0; run < runs; run++) {
      const lineup = generateLineup(game, players, attendance);
      const playCount = countPlays(lineup, players);

      // Late players should still appear but NOT in period 1
      expect(playCount['p1']).toBeGreaterThanOrEqual(1);
      expect(playCount['p2']).toBeGreaterThanOrEqual(1);
      const period1Ids = lineup[0].players.map(s => s.player_id);
      expect(period1Ids).not.toContain('p1');
      expect(period1Ids).not.toContain('p2');

      lateTotal += playCount['p1'] + playCount['p2'];
      for (let i = 3; i <= 10; i++) onTimeTotal += playCount[`p${i}`];
    }

    const lateAvg = lateTotal / (2 * runs);
    const onTimeAvg = onTimeTotal / (8 * runs);
    // Late players should average fewer periods than on-time
    expect(lateAvg).toBeLessThanOrEqual(onTimeAvg);
  });

  it('locked players are preserved when regenerating with existing lineup', () => {
    const players = makePlayers(10);
    const attendance: AttendanceRecord[] = players.map(p => ({ player_id: p.id, status: 'playing' }));
    const game = makeGame({ has_goalie: false, players_per_period: 5 });

    // Generate initial lineup
    const initial = generateLineup(game, players, attendance);

    // Lock p1 in period 1
    initial[0].players[0] = { ...initial[0].players[0], locked: true };
    const lockedPlayerId = initial[0].players[0].player_id;

    // Regenerate with locks
    const regenerated = generateLineup(game, players, attendance, initial);

    // The locked player should still be in period 1
    const period1Players = regenerated[0].players.map(s => s.player_id);
    expect(period1Players).toContain(lockedPlayerId);

    // And should be marked as locked
    const lockedSlot = regenerated[0].players.find(s => s.player_id === lockedPlayerId);
    expect(lockedSlot?.locked).toBe(true);
  });

  it('absent players are excluded even when late players are included', () => {
    const players = makePlayers(8);
    const attendance: AttendanceRecord[] = [
      { player_id: 'p1', status: 'playing' },
      { player_id: 'p2', status: 'late' },
      { player_id: 'p3', status: 'absent' },
      { player_id: 'p4', status: 'playing' },
      { player_id: 'p5', status: 'playing' },
      { player_id: 'p6', status: 'playing' },
      { player_id: 'p7', status: 'playing' },
      { player_id: 'p8', status: 'playing' },
    ];
    const game = makeGame({ has_goalie: false, players_per_period: 4 });

    const lineup = generateLineup(game, players, attendance);
    const allIds = new Set<string>();
    lineup.forEach(p => p.players.forEach(s => allIds.add(s.player_id)));

    expect(allIds.has('p2')).toBe(true);  // late: included
    expect(allIds.has('p3')).toBe(false); // absent: excluded
  });
});
