import { Move, PieceColor, PieceType } from './types';

export interface TaskDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'pawn' | 'tactics' | 'defense' | 'mastery';
  target: number;
  progress: number;
  completed: boolean;
}

export interface ExtraPionPattern {
  id: string;
  name: string;
  title: string;
  minLevel: number;
  themeAura: string;
  primaryColor: string;
  glowColor: string;
  description: string;
  icon: string;
}

export const EXTRA_PION_PATTERNS: ExtraPionPattern[] = [
  {
    id: 'zeus_thunder',
    name: 'Aegis of Olympus',
    title: 'Perisai Petir Zeus',
    minLevel: 1,
    themeAura: 'greek',
    primaryColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.65)',
    description: 'Petir Zeus keraunos melingkari perisai emas bertatahkan ukiran meander Yunani kuno.',
    icon: '⚡'
  },
  {
    id: 'ember_vanguard',
    name: 'Ember Vanguard',
    title: 'Garda Bara Api',
    minLevel: 1,
    themeAura: 'ember',
    primaryColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    description: 'Batu runik menyala dengan lintasan percikan api dan panah pengarah kosmik.',
    icon: '🔥'
  },
  {
    id: 'primal_claw',
    name: 'Primal Razor-Claw',
    title: 'Cakar Rimba Purba',
    minLevel: 2,
    themeAura: 'beast',
    primaryColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    description: 'Tiga garis cakar predator purba menyayat matriks petak dengan energi buas.',
    icon: '🐾'
  },
  {
    id: 'hyper_warp',
    name: 'Cosmic Hyper-Warp',
    title: 'Penggerak Distorsi Orbit',
    minLevel: 3,
    themeAura: 'war',
    primaryColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.55)',
    description: 'Cincin giroskop ganda berputar dengan retikel plasma dan simpul konstelasi.',
    icon: '🌀'
  },
  {
    id: 'sacred_lotus',
    name: 'Sacred Lotus Mandala',
    title: 'Mandala Teratai Abadi',
    minLevel: 4,
    themeAura: 'flower',
    primaryColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.55)',
    description: 'Mandala 8 kelopak mekar memancarkan riak suci dan serbuk sari keemasan.',
    icon: '🌸'
  },
  {
    id: 'titan_crown',
    name: 'Titan Sovereign Crown',
    title: 'Mahkota Kaisar Titan',
    minLevel: 5,
    themeAura: 'titan',
    primaryColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    description: 'Segel intan kaisar dengan vektor petir ungu dan aura keagungan mutlak.',
    icon: '👑'
  }
];

export const LEVEL_TITLES: { [level: number]: { en: string; id: string } } = {
  1: { en: 'Novice Tactician', id: 'Ahli Taktik Pemula' },
  2: { en: 'Vanguard Pathfinder', id: 'Penjelajah Garda Depan' },
  3: { en: 'Beast & Fleur Adept', id: 'Pawang Rimba & Bunga' },
  4: { en: 'Orbital Fleet Captain', id: 'Kapten Armada Orbit' },
  5: { en: 'Grandmaster of Shadows', id: 'Mahaguru Bayangan' },
  6: { en: 'Apex Lion Sovereign', id: 'Raja Penguasa Rimba' },
  7: { en: 'Celestial Overlord', id: 'Penguasa Galaksi Bintang' },
  8: { en: 'Mythic Chess Titan', id: 'Titan Catur Mitos' }
};

export interface ProgressionData {
  level: number;
  xp: number;
  totalGames: number;
  tasksCompletedTotal: number;
  selectedExtraPionFile: number; // 0..7 (default 3 = d-file or 4 = e-file)
  selectedPatternId: string;
  tacticsMode: boolean; // optional extra sidestep/tactics
  activeTasks: TaskDefinition[];
}

const ALL_TASK_TEMPLATES: Omit<TaskDefinition, 'progress' | 'completed'>[] = [
  {
    id: 'pion_pioneer',
    title: 'Pion Pioneer',
    subtitle: 'Langkah Sang Juara',
    description: 'Gerakkan Extra Pion (Pion Khusus) milikmu sebanyak 3 kali dalam satu pertandingan.',
    icon: '♟️',
    xpReward: 80,
    category: 'pawn',
    target: 3
  },
  {
    id: 'vanguard_strike',
    title: 'Vanguard Strike',
    subtitle: 'Serbuan Bidak Pion',
    description: 'Tangkap bidak lawan menggunakan pion mana saja.',
    icon: '⚔️',
    xpReward: 90,
    category: 'pawn',
    target: 1
  },
  {
    id: 'apex_incursion',
    title: 'Apex Incursion',
    subtitle: 'Penetrasi Garis Musuh',
    description: 'Majukan pion hingga mencapai baris ke-4 atau ke-5 ke arah wilayah musuh.',
    icon: '🚩',
    xpReward: 85,
    category: 'pawn',
    target: 1
  },
  {
    id: 'fortress_aegis',
    title: 'Fortress Aegis',
    subtitle: 'Benteng Raja Terlindungi',
    description: 'Lakukan rokade (Castling) raja ke sisi sayap raja atau sayap menteri.',
    icon: '🏰',
    xpReward: 75,
    category: 'defense',
    target: 1
  },
  {
    id: 'royal_check',
    title: 'Royal Check',
    subtitle: 'Ancaman Sang Raja',
    description: 'Berikan skak (Check) kepada raja lawan.',
    icon: '⚡',
    xpReward: 100,
    category: 'tactics',
    target: 1
  },
  {
    id: 'phalanx_advance',
    title: 'Phalanx Formation',
    subtitle: 'Garda Barisan Pion',
    description: 'Majukan 3 pion berbeda milikmu dalam pertandingan ini.',
    icon: '🛡️',
    xpReward: 70,
    category: 'pawn',
    target: 3
  },
  {
    id: 'trophy_officer',
    title: 'Trophy Hunter',
    subtitle: 'Pemburu Perwira Musuh',
    description: 'Tangkap perwira lawan (Kuda atau Gajah).',
    icon: '🎯',
    xpReward: 85,
    category: 'tactics',
    target: 1
  },
  {
    id: 'iron_vanguard',
    title: 'Iron Vanguard',
    subtitle: 'Ketahanan Garda Depan',
    description: 'Pertahankan Extra Pion milikmu tetap hidup hingga langkah ke-12.',
    icon: '⏳',
    xpReward: 95,
    category: 'defense',
    target: 12
  },
  {
    id: 'flank_assault',
    title: 'Flank Assault',
    subtitle: 'Serangan Sayap Papan',
    description: 'Lakukan langkah pion di lajur sayap (a, b, g, atau h).',
    icon: '🏹',
    xpReward: 65,
    category: 'pawn',
    target: 2
  }
];

export class ProgressionManager {
  private data: ProgressionData;
  private currentExtraPionSquare: number | null = null;
  private movedPawnSquares: Set<number> = new Set();
  private extraPionMoveCount: number = 0;
  private listeners: ((event: { type: 'xp' | 'level_up' | 'task_complete'; payload: any }) => void)[] = [];

  constructor() {
    this.data = this.loadData();
    if (this.data.activeTasks.length === 0) {
      this.rerollTasks();
    }
  }

  private loadData(): ProgressionData {
    try {
      const saved = localStorage.getItem('chessclash_leveling_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          level: parsed.level || 1,
          xp: parsed.xp || 0,
          totalGames: parsed.totalGames || 0,
          tasksCompletedTotal: parsed.tasksCompletedTotal || 0,
          selectedExtraPionFile: parsed.selectedExtraPionFile !== undefined ? parsed.selectedExtraPionFile : 3, // d-file
          selectedPatternId: parsed.selectedPatternId || 'ember_vanguard',
          tacticsMode: Boolean(parsed.tacticsMode),
          activeTasks: Array.isArray(parsed.activeTasks) && parsed.activeTasks.length > 0 ? parsed.activeTasks : []
        };
      }
    } catch {
      // fallback
    }

    return {
      level: 1,
      xp: 0,
      totalGames: 0,
      tasksCompletedTotal: 0,
      selectedExtraPionFile: 3, // d-file (d2 for white, d7 for black)
      selectedPatternId: 'ember_vanguard',
      tacticsMode: false,
      activeTasks: []
    };
  }

  public save(): void {
    try {
      localStorage.setItem('chessclash_leveling_v1', JSON.stringify(this.data));
    } catch {}
  }

  public subscribe(fn: (event: { type: 'xp' | 'level_up' | 'task_complete'; payload: any }) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(event: { type: 'xp' | 'level_up' | 'task_complete'; payload: any }): void {
    this.listeners.forEach(l => {
      try {
        l(event);
      } catch (err) {
        console.warn('Listener error in ProgressionManager:', err);
      }
    });
  }

  public getLevel(): number {
    return this.data.level;
  }

  public getXP(): number {
    return this.data.xp;
  }

  public getXPForNextLevel(): number {
    // 100 base + 50 per level
    return 100 + (this.data.level - 1) * 60;
  }

  public getLevelTitle(level: number = this.data.level): { en: string; id: string } {
    return LEVEL_TITLES[level] || { en: `Grandmaster Lvl ${level}`, id: `Mahaguru Tingkat ${level}` };
  }

  public getActiveTasks(): TaskDefinition[] {
    return this.data.activeTasks;
  }

  public getSelectedFile(): number {
    return this.data.selectedExtraPionFile;
  }

  public setSelectedFile(file: number): void {
    if (file >= 0 && file < 8) {
      this.data.selectedExtraPionFile = file;
      this.save();
    }
  }

  public getSelectedPattern(): ExtraPionPattern {
    const found = EXTRA_PION_PATTERNS.find(p => p.id === this.data.selectedPatternId);
    return found || EXTRA_PION_PATTERNS[0];
  }

  public setSelectedPattern(patternId: string): void {
    const pattern = EXTRA_PION_PATTERNS.find(p => p.id === patternId);
    if (pattern && this.data.level >= pattern.minLevel) {
      this.data.selectedPatternId = patternId;
      this.save();
    }
  }

  public isTacticsMode(): boolean {
    return this.data.tacticsMode;
  }

  public setTacticsMode(enabled: boolean): void {
    this.data.tacticsMode = enabled;
    this.save();
  }

  public rerollTasks(): void {
    // Pick 3 distinct random tasks from pool
    const shuffled = [...ALL_TASK_TEMPLATES].sort(() => 0.5 - Math.random());
    this.data.activeTasks = shuffled.slice(0, 3).map(t => ({
      ...t,
      progress: 0,
      completed: false
    }));
    this.save();
  }

  public addXP(amount: number, reason: string): { leveledUp: boolean; newLevel: number } {
    this.data.xp += amount;
    this.notify({ type: 'xp', payload: { amount, reason, totalXP: this.data.xp } });

    let leveledUp = false;
    let nextReq = this.getXPForNextLevel();

    while (this.data.xp >= nextReq) {
      this.data.xp -= nextReq;
      this.data.level += 1;
      leveledUp = true;
      nextReq = this.getXPForNextLevel();
      this.notify({
        type: 'level_up',
        payload: {
          level: this.data.level,
          title: this.getLevelTitle(this.data.level)
        }
      });
    }

    this.save();
    return { leveledUp, newLevel: this.data.level };
  }

  // GAME LIFECYCLE HOOKS
  public onGameStart(playerColor: PieceColor): void {
    this.movedPawnSquares.clear();
    this.extraPionMoveCount = 0;
    // Extra pion square initially based on selected file (e.g. file 3 = d-file)
    const rank = playerColor === 'w' ? 6 : 1;
    this.currentExtraPionSquare = rank * 8 + this.data.selectedExtraPionFile;
    this.data.totalGames += 1;
    this.save();
  }

  public getExtraPionSquare(): number | null {
    return this.currentExtraPionSquare;
  }

  public isExtraPion(sq: number): boolean {
    return this.currentExtraPionSquare !== null && this.currentExtraPionSquare === sq;
  }

  public onPlayerMove(move: Move, moveNumber: number, inCheckOpponent: boolean): void {
    let taskProgressMade = false;

    // Track if move is made by the Extra Pion
    const isThisExtraPion = this.currentExtraPionSquare !== null && move.from === this.currentExtraPionSquare;
    if (isThisExtraPion) {
      this.currentExtraPionSquare = move.to;
      this.extraPionMoveCount++;

      this.updateTaskProgress('pion_pioneer', 1);

      // Check apex incursion (reaching rank 3 or 4 for white / 4 or 3 for black)
      const toRank = Math.floor(move.to / 8);
      if (move.color === 'w' && toRank <= 4) {
        this.updateTaskProgress('apex_incursion', 1, true);
      } else if (move.color === 'b' && toRank >= 3) {
        this.updateTaskProgress('apex_incursion', 1, true);
      }
    }

    // Pawn capture
    if (move.piece === 'p' && (move.captured || move.flags === 'ep')) {
      this.updateTaskProgress('vanguard_strike', 1, true);
    }

    // Castling
    if (move.flags === 'castle') {
      this.updateTaskProgress('fortress_aegis', 1, true);
    }

    // Opponent King in check
    if (inCheckOpponent) {
      this.updateTaskProgress('royal_check', 1, true);
    }

    // Capturing an officer (Knight or Bishop)
    if (move.captured === 'n' || move.captured === 'b') {
      this.updateTaskProgress('trophy_officer', 1, true);
    }

    // Flank pawn move (files 0, 1, 6, 7 = a, b, g, h)
    if (move.piece === 'p') {
      const file = move.from % 8;
      if (file === 0 || file === 1 || file === 6 || file === 7) {
        this.updateTaskProgress('flank_assault', 1);
      }
      this.movedPawnSquares.add(move.from);
      if (this.movedPawnSquares.size >= 3) {
        this.updateTaskProgress('phalanx_advance', this.movedPawnSquares.size, true);
      }
    }

    // Extra Pion survived past move 12
    if (this.currentExtraPionSquare !== null && moveNumber >= 12) {
      this.updateTaskProgress('iron_vanguard', moveNumber, true);
    }
  }

  public onPawnCaptured(capturedSq: number): void {
    if (this.currentExtraPionSquare === capturedSq) {
      this.currentExtraPionSquare = null; // Fallen in battle
    }
  }

  private updateTaskProgress(taskId: string, incrementOrVal: number, setAbsolute: boolean = false): void {
    const task = this.data.activeTasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    if (setAbsolute) {
      task.progress = Math.min(task.target, Math.max(task.progress, incrementOrVal));
    } else {
      task.progress = Math.min(task.target, task.progress + incrementOrVal);
    }

    if (task.progress >= task.target) {
      task.completed = true;
      this.data.tasksCompletedTotal += 1;
      this.addXP(task.xpReward, `Misi Selesai: ${task.title}`);
      this.notify({
        type: 'task_complete',
        payload: {
          task,
          xpEarned: task.xpReward
        }
      });
    }

    this.save();
  }

  public onGameEnd(wonOrDraw: boolean): void {
    if (wonOrDraw) {
      this.addXP(45, 'Bonus Pertandingan');
    } else {
      this.addXP(20, 'Pengalaman Tempur');
    }
  }
}

export const progression = new ProgressionManager();
