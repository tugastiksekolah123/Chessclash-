import { ChessEngine, squareToCoords, coordsToSquare } from '../chess/engine';
import { think } from '../chess/ai';
import { audio, THEME_TRACKS, MusicTrack } from '../audio/procedural';
import { p2p, P2PPayload } from '../p2p/signaling';
import { K, getPieceSVG, getPieceName, getExtraPionSVG } from '../theme/assets';
import { AILevel, GameMode, Move, PieceColor, PieceType, ThemeType, TimeControl } from '../chess/types';
import { progression, EXTRA_PION_PATTERNS, ExtraPionPattern } from '../chess/progression';

export const TIME_CONTROLS: TimeControl[] = [
  { id: 'none', name: 'No clock', minutes: 0, increment: 0 },
  { id: 'bullet', name: '1+0 Bullet', minutes: 1, increment: 0 },
  { id: 'blitz', name: '3+2 Blitz', minutes: 3, increment: 2 },
  { id: 'rapid', name: '10+5 Rapid', minutes: 10, increment: 5 },
  { id: 'classical', name: '15+10 Classical', minutes: 15, increment: 10 },
  { id: 'custom', name: 'Custom', minutes: 5, increment: 3 }
];

export class ChessApp {
  private container: HTMLElement;
  private engine: ChessEngine;
  private currentTheme: ThemeType = 'flower';
  private isDarkMode: boolean = false;
  private currentMode: GameMode = 'ai';
  private aiLevel: AILevel = 3;
  private playerColor: PieceColor = 'w';
  private timeControl: TimeControl = TIME_CONTROLS[2]; // 3+2 Blitz default
  private whiteTime: number = 180;
  private blackTime: number = 180;
  private timerInterval: number | null = null;
  private isFlipped: boolean = false;
  private selectedSquare: number | null = null;
  private legalMoves: Move[] = [];
  private currentViewIndex: number = -1; // -1 = current live position, otherwise historic move index
  private pendingPromotionMove: { from: number; to: number } | null = null;
  private isAIThinking: boolean = false;
  private showCoordinates: boolean = true;
  private showHints: boolean = true;
  private autoPromoteQueen: boolean = false;
  private animSpeed: number = 1;
  private currentScreen: 'landing' | 'game' = 'landing';
  private deferredPrompt: any = null;
  private pvpTab: 'create' | 'join' = 'create';
  private roomCodeInput: string = '';
  private isRoomCreated: boolean = false;
  private showLevelingModal: boolean = false;
  private activeLevelUpModal: { level: number; title: { en: string; id: string } } | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.engine = new ChessEngine();
    this.loadPreferences();

    progression.subscribe((ev) => {
      if (ev.type === 'task_complete') {
        audio.playTaskComplete();
        this.showToast(`🎯 Misi Selesai: ${ev.payload.task.title} (+${ev.payload.xpEarned} XP)`);
        this.render();
      } else if (ev.type === 'level_up') {
        audio.playLevelUp();
        this.activeLevelUpModal = { level: ev.payload.level, title: ev.payload.title };
        this.render();
      }
    });

    // Check for room invite URL parameter (?room=XYZ)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        this.currentMode = 'p2p';
        this.pvpTab = 'join';
        this.roomCodeInput = roomParam.trim().toUpperCase();
      }
    }

    this.setupP2PListeners();
    this.setupPWA();
    this.render();
  }

  private loadPreferences(): void {
    try {
      const savedTheme = localStorage.getItem('chess_theme') as ThemeType;
      if (savedTheme === 'flower' || savedTheme === 'war' || savedTheme === 'beast') this.currentTheme = savedTheme;
      const savedDark = localStorage.getItem('chess_dark');
      if (savedDark !== null) this.isDarkMode = savedDark === 'true';
      const savedCoords = localStorage.getItem('chess_coords');
      if (savedCoords !== null) this.showCoordinates = savedCoords === 'true';
      const savedHints = localStorage.getItem('chess_hints');
      if (savedHints !== null) this.showHints = savedHints === 'true';
    } catch {}
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('chess_theme', this.currentTheme);
      localStorage.setItem('chess_dark', String(this.isDarkMode));
      localStorage.setItem('chess_coords', String(this.showCoordinates));
      localStorage.setItem('chess_hints', String(this.showHints));
    } catch {}
  }

  public applyTheme(theme: ThemeType): void {
    this.currentTheme = theme;
    this.savePreferences();
    audio.setTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    this.render();
  }

  public toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.savePreferences();
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    this.render();
  }

  private setupP2PListeners(): void {
    p2p.onMessage((payload: P2PPayload) => {
      this.handleP2PMessage(payload);
    });

    p2p.onStatus((connected: boolean) => {
      if (connected) {
        this.showToast(`🎉 Lawan terhubung ke Room ${p2p.roomCode}!`);
        audio.play('ui');
        if (this.currentScreen === 'landing') {
          this.startNewGame();
        } else {
          this.render();
        }
      } else if (this.currentMode === 'p2p') {
        if (this.currentScreen === 'game') {
          this.showToast('Lawan terputus dari room...');
        }
        this.render();
      }
    });
  }

  private handleP2PMessage(payload: P2PPayload): void {
    switch (payload.type) {
      case 'room_ready':
        if (!p2p.isHost) {
          this.playerColor = p2p.myColor;
          this.isFlipped = this.playerColor === 'b';
          this.showToast(`Bergabung ke Room ${p2p.roomCode}!`);
          if (this.currentScreen === 'landing') {
            this.startNewGame();
          } else {
            this.render();
          }
        }
        break;

      case 'room_leave':
        this.showToast('Lawan telah keluar dari room.');
        this.render();
        break;

      case 'move':
        if (payload.move) {
          const success = this.engine.makeMove(payload.move);
          if (success) {
            audio.play(payload.move.captured ? 'capture' : 'move');
            if (payload.whiteTime !== undefined) this.whiteTime = payload.whiteTime;
            if (payload.blackTime !== undefined) this.blackTime = payload.blackTime;
            this.handleMovePostProcess(payload.move);
          }
        }
        break;

      case 'emote':
        if (payload.emote) {
          this.showToast(`Opponent: ${payload.emote}`);
          audio.play('ui');
        }
        break;

      case 'draw_offer':
        audio.play('draw_offer');
        if (confirm('Opponent offered a draw. Do you accept? / Lawan menawarkan remis. Terima?')) {
          p2p.send({ type: 'draw_accept' });
          this.engine.claimDraw('Agreed Draw (P2P)');
          this.stopTimer();
          audio.play('stalemate');
          this.render();
        } else {
          p2p.send({ type: 'draw_decline' });
        }
        break;

      case 'draw_accept':
        this.engine.claimDraw('Agreed Draw (P2P)');
        this.stopTimer();
        audio.play('stalemate');
        this.showToast('Draw accepted! Remis disepakati.');
        this.render();
        break;

      case 'draw_decline':
        this.showToast('Draw offer declined. Penawaran remis ditolak.');
        break;

      case 'resign':
        const winner = p2p.myColor;
        this.engine.resign(winner === 'w' ? 'b' : 'w');
        this.stopTimer();
        audio.play('victory');
        this.showToast('Opponent resigned. You win!');
        this.render();
        break;

      case 'takeback_request':
        if (confirm('Opponent requested a takeback. Allow? / Lawan minta batalkan langkah. Izinkan?')) {
          p2p.send({ type: 'takeback_accept' });
          this.engine.undoMove();
          this.render();
        } else {
          p2p.send({ type: 'takeback_decline' });
        }
        break;

      case 'takeback_accept':
        this.engine.undoMove();
        this.showToast('Takeback granted!');
        this.render();
        break;

      case 'takeback_decline':
        this.showToast('Takeback request declined.');
        break;

      case 'rematch':
        if (confirm('Lawan ingin bermain lagi (rematch)! Mulai permainan baru?')) {
          this.startNewGame();
        }
        break;
    }
  }

  private setupPWA(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.render();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.showToast('chessclash installed successfully!');
      this.render();
    });
  }

  public promptInstall(): void {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then(() => {
        this.deferredPrompt = null;
        this.render();
      });
    } else {
      this.showToast('To install on iOS: Tap Share → Add to Home Screen.');
    }
  }

  public showToast(msg: string, duration = 3000): void {
    const existing = document.getElementById('chess-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'chess-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--card);
      color: var(--ink);
      border: 2px solid var(--acc);
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 8px 24px var(--sh);
      z-index: 9999;
      pointer-events: none;
      animation: fadeIn 0.2s ease-out;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  public startNewGame(): void {
    this.engine.reset();
    this.currentViewIndex = -1;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.isAIThinking = false;

    // Reset clocks
    if (this.timeControl.minutes > 0) {
      this.whiteTime = this.timeControl.minutes * 60;
      this.blackTime = this.timeControl.minutes * 60;
      this.startTimer();
    } else {
      this.stopTimer();
    }

    this.currentScreen = 'game';
    if (this.currentMode === 'p2p') {
      this.playerColor = p2p.myColor;
    }
    this.isFlipped = this.playerColor === 'b';
    progression.onGameStart(this.playerColor);
    audio.play('ui');
    this.render();

    // If AI is playing White, trigger first move
    if (this.currentMode === 'ai' && this.playerColor === 'b') {
      this.triggerAIMove();
    }
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      if (this.engine.result !== 'in_progress') {
        this.stopTimer();
        return;
      }

      if (this.engine.state.turn === 'w') {
        this.whiteTime = Math.max(0, this.whiteTime - 1);
        if (this.whiteTime <= 10 && this.whiteTime > 0) audio.play('time_low');
        if (this.whiteTime === 0) {
          this.engine.timeout('w');
          this.stopTimer();
          audio.play('flag_fall');
          this.render();
        }
      } else {
        this.blackTime = Math.max(0, this.blackTime - 1);
        if (this.blackTime <= 10 && this.blackTime > 0) audio.play('time_low');
        if (this.blackTime === 0) {
          this.engine.timeout('b');
          this.stopTimer();
          audio.play('flag_fall');
          this.render();
        }
      }
      this.updateClockDisplay();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private updateClockDisplay(): void {
    const wEl = document.getElementById('white-clock');
    const bEl = document.getElementById('black-clock');
    if (wEl) {
      wEl.textContent = this.formatTime(this.whiteTime);
      if (this.whiteTime < 20) wEl.classList.add('urgent');
      else wEl.classList.remove('urgent');
    }
    if (bEl) {
      bEl.textContent = this.formatTime(this.blackTime);
      if (this.blackTime < 20) bEl.classList.add('urgent');
      else bEl.classList.remove('urgent');
    }
  }

  private async triggerAIMove(): Promise<void> {
    if (this.isAIThinking || this.engine.result !== 'in_progress') return;
    this.isAIThinking = true;
    this.render();

    try {
      const res = await think(this.engine, this.aiLevel);
      if (res && res.move) {
        this.engine.makeMove(res.move);
        audio.play(res.move.captured ? 'capture' : 'move');
        this.handleMovePostProcess(res.move);
      }
    } catch (err) {
      console.error('AI error:', err);
    } finally {
      this.isAIThinking = false;
      this.render();
    }
  }

  private handleMovePostProcess(move: Move): void {
    // Add increment to the player who just moved
    const movedColor = move.color;
    if (this.timeControl.increment > 0) {
      if (movedColor === 'w') this.whiteTime += this.timeControl.increment;
      else this.blackTime += this.timeControl.increment;
    }

    // Play check or endgame sounds
    if (this.engine.result === 'checkmate') {
      audio.play('checkmate');
      this.stopTimer();
      const isWinner = this.engine.state.turn !== this.playerColor;
      progression.onGameEnd(isWinner);
    } else if (this.engine.result === 'stalemate' || this.engine.result === 'threefold' || this.engine.result === 'fifty_moves' || this.engine.result === 'insufficient_material') {
      audio.play('stalemate');
      this.stopTimer();
      progression.onGameEnd(true);
    } else if (this.engine.isInCheck(this.engine.state.turn)) {
      audio.play('check');
    }

    this.render();

    // Trigger cool capture VFX if a piece was taken
    if (move.captured || move.flags === 'ep') {
      const capPiece = move.captured || 'p';
      const capColor: PieceColor = move.color === 'w' ? 'b' : 'w';
      this.triggerCaptureEffect(move.to, capPiece, capColor);
    }

    // Trigger AI response if playing vs AI
    if (this.currentMode === 'ai' && this.engine.state.turn !== this.playerColor && this.engine.result === 'in_progress') {
      setTimeout(() => this.triggerAIMove(), 250);
    }
  }

  private handleSquareClick(sq: number): void {
    if (this.currentViewIndex !== -1) {
      // Return to live view on click
      this.currentViewIndex = -1;
      this.render();
      return;
    }

    if (this.engine.result !== 'in_progress' || this.isAIThinking) return;

    // Gating for P2P and AI turn
    if (this.currentMode === 'p2p' && this.engine.state.turn !== p2p.myColor) return;
    if (this.currentMode === 'ai' && this.engine.state.turn !== this.playerColor) return;

    const piece = this.engine.state.board[sq];

    // If already selected a piece, check if target square is a legal move
    if (this.selectedSquare !== null) {
      const matchedMove = this.legalMoves.find(m => m.to === sq);
      if (matchedMove) {
        // Check for promotion
        const movingPiece = this.engine.state.board[this.selectedSquare];
        const isPawn = movingPiece && movingPiece.type === 'p';
        const isPromotionRank = (movingPiece?.color === 'w' && Math.floor(sq / 8) === 0) ||
                                (movingPiece?.color === 'b' && Math.floor(sq / 8) === 7);

        if (isPawn && isPromotionRank) {
          if (this.autoPromoteQueen) {
            this.executeMove({ ...matchedMove, promotion: 'q' });
          } else {
            this.pendingPromotionMove = { from: this.selectedSquare, to: sq };
            this.render();
          }
          return;
        }

        this.executeMove(matchedMove);
        return;
      }
    }

    // Select new piece
    if (piece && piece.color === this.engine.state.turn) {
      this.selectedSquare = sq;
      this.legalMoves = this.engine.getLegalMoves(this.engine.state.turn).filter(m => m.from === sq);
      if (piece.type === 'p' && progression.isExtraPion(sq)) {
        audio.playExtraPionSelect();
      } else {
        audio.play('select');
      }
      this.render();
    } else {
      this.selectedSquare = null;
      this.legalMoves = [];
      this.render();
    }
  }

  private executeMove(move: Move): void {
    const success = this.engine.makeMove(move);
    if (!success) return;

    if (move.captured) {
      progression.onPawnCaptured(move.to);
    }
    const enemyColor: PieceColor = move.color === 'w' ? 'b' : 'w';
    progression.onPlayerMove(move, this.engine.history.length, this.engine.isInCheck(enemyColor));

    if (move.captured && this.currentTheme === 'beast' && move.piece === 'r') {
      audio.play('punch');
    } else {
      audio.play(move.captured ? 'capture' : 'move');
    }

    // Trigger visual capture choreographies
    if (move.captured) {
      if (this.currentTheme === 'war' || this.currentTheme === 'beast') {
        const boardEl = document.querySelector('.board-container');
        if (boardEl) {
          boardEl.classList.add('board-microshake');
          setTimeout(() => boardEl.classList.remove('board-microshake'), 240);
        }
      }
    }

    // Send P2P payload if online
    if (this.currentMode === 'p2p') {
      p2p.send({
        type: 'move',
        move,
        whiteTime: this.whiteTime,
        blackTime: this.blackTime
      });
    }

    this.selectedSquare = null;
    this.legalMoves = [];
    this.pendingPromotionMove = null;
    this.handleMovePostProcess(move);
  }

  public render(): void {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (this.currentScreen === 'landing') {
      this.renderLandingScreen();
    } else {
      this.renderGameScreen();
    }
  }

  // Mini 4x4 Board Preview Communicating the Theme's Board Visual World
  private renderMiniBoardPreview(theme: ThemeType): string {
    let ltColor = '#fbf8f0';
    let dkColor = '#a8c196';
    const piece1 = getPieceSVG('q', 'w', theme);
    const piece2 = getPieceSVG('k', 'b', theme);

    if (theme === 'war') {
      ltColor = '#f2f5fa';
      dkColor = '#9fb0cc';
    } else if (theme === 'beast') {
      ltColor = '#faebd7';
      dkColor = '#b88655';
    } else if (theme === 'greek') {
      ltColor = '#fdfefe';
      dkColor = '#b8c7db';
    }

    let cells = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const isDark = (r + c) % 2 === 1;
        const bg = isDark ? dkColor : ltColor;
        let p = '';
        if (r === 2 && c === 1) p = `<div style="width: 82%; height: 82%; display: flex; align-items: center; justify-content: center;">${piece1}</div>`;
        if (r === 1 && c === 2) p = `<div style="width: 82%; height: 82%; display: flex; align-items: center; justify-content: center;">${piece2}</div>`;
        cells += `<div style="background: ${bg}; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; position: relative;">${p}</div>`;
      }
    }

    return `
      <div style="width: 84px; height: 84px; display: grid; grid-template-columns: repeat(4, 1fr); border-radius: 8px; overflow: hidden; border: 1.5px solid var(--bd-border); box-shadow: 0 4px 10px rgba(0,0,0,0.12); flex-shrink: 0;">
        ${cells}
      </div>
    `;
  }

  // 4. LANDING SCREEN — FULL PRE-GAME CHOOSER
  private renderLandingScreen(): void {
    const k = K[this.currentTheme];

    this.container.innerHTML = `
      <div id="s0" style="max-width: 960px; margin: 0 auto; padding: 24px 16px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        
        <!-- Header & Theme Title -->
        <header style="text-align: center; margin-bottom: 22px;">
          <div style="display: inline-flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 30px;">⚔️</span>
            <h1 style="font-family: var(--font-display); font-size: 42px; font-weight: 800; letter-spacing: -0.5px;">
              chessclash
            </h1>
            <span style="font-size: 11px; font-weight: 800; background: var(--acc); color: var(--on); padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase;">
              v2.0
            </span>
          </div>
          <p style="font-size: 16px; font-weight: 600; color: var(--acc); margin-bottom: 4px;">
            Tactical Worlds • Quests &amp; Leveling • Apex Extra Pion
          </p>
          <p style="font-size: 13px; color: var(--mute); max-width: 600px; margin: 0 auto;">
            Pilih konsep duniamu. Selesaikan misi acak, naikkan tingkat komando, dan kendalikan Pion Khusus dengan pola luar biasa.
          </p>

          <!-- Leveling & Extra Pion Quick Banner -->
          <div style="margin-top: 14px; display: inline-flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; background: var(--card); border: 1.5px solid var(--bd-border); border-radius: 12px; padding: 10px 18px; box-shadow: 0 4px 14px var(--sh);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">⭐</span>
              <div style="text-align: left;">
                <div style="font-size: 13px; font-weight: 800;">Tingkat ${progression.getLevel()}: ${progression.getLevelTitle().id}</div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <div class="level-mini-bar" style="width: 70px;">
                    <div class="level-mini-fill" style="width: ${Math.min(100, (progression.getXP() / progression.getXPForNextLevel()) * 100)}%;"></div>
                  </div>
                  <span style="font-size: 11px; color: var(--mute); font-family: var(--font-mono);">${progression.getXP()}/${progression.getXPForNextLevel()} XP</span>
                </div>
              </div>
            </div>
            <div style="height: 24px; width: 1px; background: var(--bd-border);"></div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
              <span style="font-size: 16px;">${progression.getSelectedPattern().icon}</span>
              <span style="font-weight: 700;">Pion Khusus: <span style="color: ${progression.getSelectedPattern().primaryColor};">${progression.getSelectedPattern().name}</span></span>
            </div>
            <button id="btn-landing-forge" style="padding: 6px 14px; border-radius: 8px; border: 1px solid var(--acc); background: var(--acc); color: var(--on); font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15); transition: transform 0.15s ease;">
              ⚡ Misi &amp; Pion Forge
            </button>
          </div>
        </header>

        <!-- 4 Visual World Theme Cards with Mini-Board & Piece Previews -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 20px;">
          
          <!-- Card 1: Flower Theme -->
          <div class="theme-card ${this.currentTheme === 'flower' ? 'active-card' : ''}" id="pick-flower" style="
            background: var(--card);
            border: 3px solid ${this.currentTheme === 'flower' ? 'var(--acc)' : 'var(--bd-border)'};
            border-radius: 16px;
            padding: 18px;
            cursor: pointer;
            box-shadow: 0 8px 24px var(--sh);
            transition: all 0.25s ease;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h2 style="font-family: var(--font-flower); font-size: 21px; font-weight: 700; color: #cf3f77;">
                🌸 Pion en Fleur
              </h2>
              <span style="font-size: 11px; font-weight: 700; background: rgba(207, 63, 119, 0.15); color: #cf3f77; padding: 4px 8px; border-radius: 6px;">
                Botanical
              </span>
            </div>
            <p style="font-size: 12.5px; color: var(--mute); line-height: 1.4; margin-bottom: 14px;">
              ${K.flower.s}
            </p>
            <div style="display: flex; gap: 10px; align-items: center;">
              ${this.renderMiniBoardPreview('flower')}
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; flex: 1; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 8px;">
                <div title="Bud Pawn">${getPieceSVG('p', 'w', 'flower')}</div>
                <div title="Cosmos Knight">${getPieceSVG('n', 'b', 'flower')}</div>
                <div title="Peony Queen">${getPieceSVG('q', 'w', 'flower')}</div>
                <div title="Dahlia King">${getPieceSVG('k', 'b', 'flower')}</div>
              </div>
            </div>
          </div>

          <!-- Card 2: War Theme -->
          <div class="theme-card ${this.currentTheme === 'war' ? 'active-card' : ''}" id="pick-war" style="
            background: var(--card);
            border: 3px solid ${this.currentTheme === 'war' ? 'var(--acc)' : 'var(--bd-border)'};
            border-radius: 16px;
            padding: 18px;
            cursor: pointer;
            box-shadow: 0 8px 24px var(--sh);
            transition: all 0.25s ease;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h2 style="font-family: var(--font-war); font-size: 21px; font-weight: 800; color: #0fb5a8; letter-spacing: 0.5px;">
                ⚙️ Kessler Armory
              </h2>
              <span style="font-size: 11px; font-weight: 700; background: rgba(15, 181, 168, 0.15); color: #0fb5a8; padding: 4px 8px; border-radius: 6px;">
                Orbital War
              </span>
            </div>
            <p style="font-size: 12.5px; color: var(--mute); line-height: 1.4; margin-bottom: 14px;">
              ${K.war.s}
            </p>
            <div style="display: flex; gap: 10px; align-items: center;">
              ${this.renderMiniBoardPreview('war')}
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; flex: 1; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 8px;">
                <div title="Cosmic Tank">${getPieceSVG('p', 'w', 'war')}</div>
                <div title="Hover Walker">${getPieceSVG('n', 'b', 'war')}</div>
                <div title="Dreadnought Queen">${getPieceSVG('q', 'w', 'war')}</div>
                <div title="Flagship King">${getPieceSVG('k', 'b', 'war')}</div>
              </div>
            </div>
          </div>

          <!-- Card 3: Beast Theme -->
          <div class="theme-card ${this.currentTheme === 'beast' ? 'active-card' : ''}" id="pick-beast" style="
            background: var(--card);
            border: 3px solid ${this.currentTheme === 'beast' ? 'var(--acc)' : 'var(--bd-border)'};
            border-radius: 16px;
            padding: 18px;
            cursor: pointer;
            box-shadow: 0 8px 24px var(--sh);
            transition: all 0.25s ease;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h2 style="font-family: var(--font-flower); font-size: 21px; font-weight: 800; color: #d97706; letter-spacing: 0.2px;">
                🦁 Primal Beasts
              </h2>
              <span style="font-size: 11px; font-weight: 700; background: rgba(217, 119, 6, 0.15); color: #d97706; padding: 4px 8px; border-radius: 6px;">
                Wild Animals
              </span>
            </div>
            <p style="font-size: 12.5px; color: var(--mute); line-height: 1.4; margin-bottom: 14px;">
              ${K.beast.s}
            </p>
            <div style="display: flex; gap: 10px; align-items: center;">
              ${this.renderMiniBoardPreview('beast')}
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; flex: 1; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 8px;">
                <div title="Dire Wolf">${getPieceSVG('p', 'w', 'beast')}</div>
                <div title="Black Panther">${getPieceSVG('n', 'b', 'beast')}</div>
                <div title="Fierce Tigress">${getPieceSVG('q', 'w', 'beast')}</div>
                <div title="Apex Lion King">${getPieceSVG('k', 'b', 'beast')}</div>
              </div>
            </div>
          </div>

          <!-- Card 4: Greek Mythology Theme (Para Dewa Olympus) -->
          <div class="theme-card ${this.currentTheme === 'greek' ? 'active-card' : ''}" id="pick-greek" style="
            background: var(--card);
            border: 3px solid ${this.currentTheme === 'greek' ? 'var(--acc)' : 'var(--bd-border)'};
            border-radius: 16px;
            padding: 18px;
            cursor: pointer;
            box-shadow: 0 8px 24px var(--sh);
            transition: all 0.25s ease;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h2 style="font-family: var(--font-flower); font-size: 21px; font-weight: 800; color: #eab308; letter-spacing: 0.2px;">
                ⚡ Mount Olympus
              </h2>
              <span style="font-size: 11px; font-weight: 700; background: rgba(234, 179, 8, 0.18); color: #b45309; padding: 4px 8px; border-radius: 6px;">
                Greek Gods
              </span>
            </div>
            <p style="font-size: 12.5px; color: var(--mute); line-height: 1.4; margin-bottom: 14px;">
              ${K.greek.s}
            </p>
            <div style="display: flex; gap: 10px; align-items: center;">
              ${this.renderMiniBoardPreview('greek')}
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; flex: 1; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 8px;">
                <div title="Spartan Hoplite">${getPieceSVG('p', 'w', 'greek')}</div>
                <div title="Pegasus Steed">${getPieceSVG('n', 'b', 'greek')}</div>
                <div title="Athena Wisdom Queen">${getPieceSVG('q', 'w', 'greek')}</div>
                <div title="Zeus Thunder King">${getPieceSVG('k', 'b', 'greek')}</div>
              </div>
            </div>
          </div>

        </div>

        <!-- Connected Theme Music Selector & Player (Directly Below Theme Cards with Preview Buttons) -->
        <div style="background: var(--card); border: 2px solid var(--bd-border); border-radius: 16px; padding: 18px 20px; box-shadow: 0 8px 24px var(--sh); margin-bottom: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--acc); display: flex; align-items: center; gap: 6px;">
                <span>🎵 Soundtrack Dunia: ${k.n}</span>
              </div>
              <span style="font-size: 12px; color: var(--mute);">
                Musik tema terhubung dengan duniamu. Klik tombol ▶ untuk mendengarkan preview sebelum bertanding.
              </span>
            </div>
            <button id="btn-landing-toggle-music" style="padding: 6px 14px; border-radius: 8px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; background: ${audio.getMusicEnabled() ? 'var(--acc)' : 'var(--bd-border)'}; color: ${audio.getMusicEnabled() ? 'var(--on)' : 'var(--ink)'}; box-shadow: 0 2px 8px var(--sh);">
              ${audio.getMusicEnabled() ? '✓ Musik: Nyala (ON)' : '✕ Musik: Mati (OFF)'}
            </button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
            ${THEME_TRACKS[this.currentTheme].map(t => {
              const isSelected = audio.getCurrentTrack().id === t.id;
              return `
                <button class="landing-track-btn" data-tid="${t.id}" style="padding: 10px 14px; border-radius: 10px; border: 2px solid ${isSelected ? 'var(--acc)' : 'var(--bd-border)'}; background: ${isSelected ? 'rgba(0,0,0,0.03)' : 'transparent'}; text-align: left; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;">
                  <div>
                    <div style="font-weight: 700; font-size: 13px; color: ${isSelected ? 'var(--acc)' : 'var(--ink)'};">
                      ${t.name}
                    </div>
                    <div style="font-size: 11px; color: var(--mute); margin-top: 2px;">
                      ${t.subname}
                    </div>
                  </div>
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: ${isSelected ? 'var(--acc)' : 'var(--card)'}; color: ${isSelected ? 'var(--on)' : 'var(--ink)'}; font-size: 12px; font-weight: 800; border: 1px solid var(--bd-border); flex-shrink: 0;">
                    ▶
                  </span>
                </button>
              `;
            }).join('')}
          </div>
          <p style="font-size: 11px; color: var(--mute); margin-top: 10px; font-style: italic;">
            ℹ️ ${audio.getCurrentTrack().description}
          </p>
        </div>

        <!-- Configuration Panel -->
        <div style="background: var(--card); border: 2px solid var(--bd-border); border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px var(--sh); margin-bottom: 24px;">
          
          <!-- Mode Selector -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--mute); margin-bottom: 8px;">
              Game Mode • Mode Permainan
            </label>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              <button class="mode-btn ${this.currentMode === 'ai' ? 'active-mode' : ''}" data-mode="ai" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 2px solid var(--bd-border); background: ${this.currentMode === 'ai' ? 'var(--acc)' : 'transparent'}; color: ${this.currentMode === 'ai' ? 'var(--on)' : 'var(--ink)'}; font-weight: 700; cursor: pointer;">
                🤖 vs AI (${k.ai})
              </button>
              <button class="mode-btn ${this.currentMode === 'pass_and_play' ? 'active-mode' : ''}" data-mode="pass_and_play" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 2px solid var(--bd-border); background: ${this.currentMode === 'pass_and_play' ? 'var(--acc)' : 'transparent'}; color: ${this.currentMode === 'pass_and_play' ? 'var(--on)' : 'var(--ink)'}; font-weight: 700; cursor: pointer;">
                👥 Pass & Play (Local)
              </button>
              <button class="mode-btn ${this.currentMode === 'p2p' ? 'active-mode' : ''}" data-mode="p2p" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 2px solid var(--bd-border); background: ${this.currentMode === 'p2p' ? 'var(--acc)' : 'transparent'}; color: ${this.currentMode === 'p2p' ? 'var(--on)' : 'var(--ink)'}; font-weight: 700; cursor: pointer;">
                🌐 Online (Room Join)
              </button>
            </div>
          </div>

          <!-- AI Level Selector (Shown when vs AI is picked) -->
          ${this.currentMode === 'ai' ? `
            <div style="margin-bottom: 20px; padding: 14px; background: rgba(0,0,0,0.03); border-radius: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--mute);">
                  AI Difficulty • Tingkat Kesulitan AI
                </label>
                <span style="font-size: 13px; font-weight: 700; color: var(--acc);">
                  Level ${this.aiLevel}: ${this.getAIName(this.aiLevel)}
                </span>
              </div>
              <div style="display: flex; gap: 6px;">
                ${[1, 2, 3, 4, 5].map(lvl => `
                  <button class="lvl-btn" data-lvl="${lvl}" style="flex: 1; padding: 8px 4px; border-radius: 6px; border: 1px solid var(--bd-border); background: ${this.aiLevel === lvl ? 'var(--acc)' : 'var(--card)'}; color: ${this.aiLevel === lvl ? 'var(--on)' : 'var(--ink)'}; font-weight: 700; font-size: 12px; cursor: pointer;">
                    Lvl ${lvl}
                  </button>
                `).join('')}
              </div>
              <p style="font-size: 12px; color: var(--mute); margin-top: 6px;">
                ${this.getAIDescription(this.aiLevel)}
              </p>
            </div>

            <!-- Color Selector for AI mode -->
            <div style="margin-bottom: 20px;">
              <label style="display: block; font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--mute); margin-bottom: 8px;">
                Play As • Bermain Sebagai
              </label>
              <div style="display: flex; gap: 8px;">
                <button class="color-btn" data-col="w" style="flex: 1; padding: 8px; border-radius: 8px; border: 2px solid ${this.playerColor === 'w' ? 'var(--acc)' : 'var(--bd-border)'}; background: var(--card); font-weight: 700; cursor: pointer;">
                  ⚪ White (Putih)
                </button>
                <button class="color-btn" data-col="b" style="flex: 1; padding: 8px; border-radius: 8px; border: 2px solid ${this.playerColor === 'b' ? 'var(--acc)' : 'var(--bd-border)'}; background: var(--card); font-weight: 700; cursor: pointer;">
                  ⚫ Black (Hitam)
                </button>
                <button class="color-btn" data-col="rand" style="flex: 1; padding: 8px; border-radius: 8px; border: 2px solid var(--bd-border); background: var(--card); font-weight: 700; cursor: pointer;">
                  🎲 Random (Acak)
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Online Room Join Mode Controls -->
          ${this.currentMode === 'p2p' ? `
            <div style="margin-bottom: 20px; padding: 16px; background: rgba(0,0,0,0.03); border: 2px solid var(--acc); border-radius: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <label style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--acc); display: flex; align-items: center; gap: 6px;">
                  🌐 Sistem Room Join PVP
                </label>
                <span style="font-size: 12px; color: var(--mute);">
                  Main bersama teman lewat kode room
                </span>
              </div>

              <!-- Sub-tabs: Buat Room vs Gabung Room -->
              <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                <button id="tab-create-room" style="flex: 1; padding: 10px; border-radius: 8px; border: 2px solid ${this.pvpTab === 'create' ? 'var(--acc)' : 'var(--bd-border)'}; background: ${this.pvpTab === 'create' ? 'var(--card)' : 'transparent'}; color: var(--ink); font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.15s ease;">
                  🏠 Buat Room (Host)
                </button>
                <button id="tab-join-room" style="flex: 1; padding: 10px; border-radius: 8px; border: 2px solid ${this.pvpTab === 'join' ? 'var(--acc)' : 'var(--bd-border)'}; background: ${this.pvpTab === 'join' ? 'var(--card)' : 'transparent'}; color: var(--ink); font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.15s ease;">
                  🔑 Gabung Room (Guest)
                </button>
              </div>

              ${this.pvpTab === 'create' ? `
                <!-- Color Selector for Host -->
                <div style="margin-bottom: 14px;">
                  <label style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--mute); margin-bottom: 6px;">
                    Pilih Sisi Host • Play As
                  </label>
                  <div style="display: flex; gap: 8px;">
                    <button class="color-btn" data-col="w" style="flex: 1; padding: 8px; border-radius: 8px; border: 2px solid ${this.playerColor === 'w' ? 'var(--acc)' : 'var(--bd-border)'}; background: var(--card); font-weight: 700; cursor: pointer;">
                      ⚪ White (Putih)
                    </button>
                    <button class="color-btn" data-col="b" style="flex: 1; padding: 8px; border-radius: 8px; border: 2px solid ${this.playerColor === 'b' ? 'var(--acc)' : 'var(--bd-border)'}; background: var(--card); font-weight: 700; cursor: pointer;">
                      ⚫ Black (Hitam)
                    </button>
                    <button class="color-btn" data-col="rand" style="flex: 1; padding: 8px; border-radius: 8px; border: 2px solid var(--bd-border); background: var(--card); font-weight: 700; cursor: pointer;">
                      🎲 Random (Acak)
                    </button>
                  </div>
                </div>

                ${this.isRoomCreated && p2p.roomCode ? `
                  <div style="background: var(--card); border: 1px solid var(--bd-border); border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--mute); display: block; margin-bottom: 6px;">
                      Kode Room Anda (Bagikan ke Teman / Lawan)
                    </span>
                    <div class="room-code-tag" style="font-size: 24px; margin-bottom: 12px;">
                      <span>${p2p.roomCode}</span>
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap;">
                      <button id="btn-copy-room-code" style="padding: 8px 16px; border-radius: 8px; background: var(--acc); color: var(--on); border: none; font-weight: 700; font-size: 13px; cursor: pointer;">
                        📋 Salin Kode
                      </button>
                      <button id="btn-copy-room-link" style="padding: 8px 16px; border-radius: 8px; background: var(--bg); color: var(--ink); border: 1px solid var(--bd-border); font-weight: 700; font-size: 13px; cursor: pointer;">
                        🔗 Salin Link Join
                      </button>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 600; color: ${p2p.connected ? '#22c55e' : '#f59e0b'};">
                      <span class="radar-dot ${p2p.connected ? 'connected' : 'waiting'}"></span>
                      <span>${p2p.connected ? '🎉 Lawan terhubung! Bersiap masuk arena...' : 'Menunggu lawan memasukkan kode atau membuka link...'}</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--mute);">
                    <button id="btn-recreate-room" style="background: none; border: none; color: var(--mute); text-decoration: underline; cursor: pointer;">
                      🔄 Buat Kode Lain
                    </button>
                    <span>Pertandingan akan otomatis dimulai begitu lawan bergabung</span>
                  </div>
                ` : `
                  <button id="btn-create-room-now" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--acc); color: var(--on); border: none; font-weight: 800; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ✨ Buat Room & Dapatkan Kode
                  </button>
                `}
              ` : `
                <!-- Join Room by Code -->
                <div>
                  <label style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--mute); margin-bottom: 6px;">
                    Masukkan Kode Room Lawan (Enter Room Code)
                  </label>
                  <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="input-room-code" placeholder="Contoh: CLASH-8X2Y" value="${this.roomCodeInput}" style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 2px solid var(--bd-border); background: var(--bg); color: var(--ink); font-family: var(--font-mono); font-size: 16px; font-weight: 700; text-transform: uppercase;" />
                    <button id="btn-paste-code" style="padding: 10px 14px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); color: var(--ink); font-weight: 700; cursor: pointer;">
                      📋 Tempel
                    </button>
                  </div>
                  ${this.roomCodeInput ? `
                    <div style="margin-bottom: 10px; font-size: 12px; color: var(--acc); font-weight: 600;">
                      🔗 Kode Room: <strong>${this.roomCodeInput}</strong>
                    </div>
                  ` : ''}
                  <button id="btn-join-room-submit" style="width: 100%; padding: 12px; border-radius: 8px; background: var(--acc); color: var(--on); border: none; font-weight: 800; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    🚀 Gabung Room & Mulai Bertanding
                  </button>
                  ${p2p.isConnecting ? `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; font-size: 12px; font-weight: 600; color: #f59e0b;">
                      <span class="radar-dot waiting"></span>
                      <span>Menghubungkan ke room ${p2p.roomCode || this.roomCodeInput}...</span>
                    </div>
                  ` : ''}
                </div>
              `}
            </div>
          ` : ''}

          <!-- Time Controls Selector -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--mute); margin-bottom: 8px;">
              Time Control • Kontrol Waktu
            </label>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
              ${TIME_CONTROLS.map(tc => `
                <button class="tc-btn" data-tcid="${tc.id}" style="padding: 8px; border-radius: 8px; border: 2px solid ${this.timeControl.id === tc.id ? 'var(--acc)' : 'var(--bd-border)'}; background: ${this.timeControl.id === tc.id ? 'var(--card)' : 'transparent'}; font-size: 13px; font-weight: 700; color: var(--ink); cursor: pointer;">
                  ${tc.name}
                </button>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Action Enter Button & Footer Toolbar -->
        <div style="display: flex; flex-direction: column; gap: 14px; align-items: center;">
          <button id="btn-enter-arena" style="
            width: 100%;
            max-width: 440px;
            padding: 16px 28px;
            background: var(--acc);
            color: var(--on);
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 800;
            font-family: var(--font-display);
            letter-spacing: 0.5px;
            cursor: pointer;
            box-shadow: 0 8px 24px var(--ring);
            transition: transform 0.15s ease;
          ">
            ${this.currentMode === 'p2p'
              ? (this.pvpTab === 'create'
                  ? (this.isRoomCreated ? '⚔️ Masuk Papan Tunggu • Enter Board' : '✨ Buat Room & Masuk • Create Room')
                  : '🚀 Masuk Room • Join Room')
              : '⚔️ Enter Arena • Masuk Arena'}
          </button>

          <div style="display: flex; gap: 16px; align-items: center; font-size: 13px; color: var(--mute);">
            <button id="btn-mute-landing" style="background: none; border: none; cursor: pointer; color: var(--ink); font-weight: 600;">
              ${audio.getMuted() ? '🔇 Audio: Off' : '🔊 Audio: On'}
            </button>
            <span>•</span>
            <button id="btn-dark-landing" style="background: none; border: none; cursor: pointer; color: var(--ink); font-weight: 600;">
              ${this.isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </button>
            ${this.deferredPrompt ? `
              <span>•</span>
              <button id="btn-pwa-landing" style="background: var(--acc); color: var(--on); border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-weight: 700;">
                📲 Install App
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Overlays (Leveling, Level Up) -->
        ${this.renderLevelingModal()}
        ${this.renderLevelUpModal()}

      </div>
    `;

    this.bindLandingEvents();
  }

  private getAIName(lvl: AILevel): string {
    switch (lvl) {
      case 1: return 'Pawn Sprout';
      case 2: return 'Knight Errant';
      case 3: return "Bishop's Gambit";
      case 4: return 'Rook Sentinel';
      case 5: return "Queen's Endgame";
    }
  }

  private getAIDescription(lvl: AILevel): string {
    switch (lvl) {
      case 1: return '1-ply: Random legal moves with capture checks (Beginner)';
      case 2: return '2-ply: Minimax tactical evaluation (Casual)';
      case 3: return '3-ply: Minimax + piece-square tables (Club)';
      case 4: return '4-ply: Alpha-beta pruning + mobility + king safety (Advanced)';
      case 5: return '5-ply: Alpha-beta + quiescence + iterative deepening (Master)';
    }
  }

  private bindLandingEvents(): void {
    // Leveling modal internal controls on landing screen
    document.getElementById('btn-close-leveling-modal')?.addEventListener('click', () => {
      this.showLevelingModal = false;
      this.render();
    });

    document.getElementById('btn-close-leveling-bottom')?.addEventListener('click', () => {
      this.showLevelingModal = false;
      this.render();
    });

    document.getElementById('btn-reroll-quests')?.addEventListener('click', () => {
      progression.rerollTasks();
      audio.play('ui');
      this.showToast('🎲 3 Misi acak diperbarui!');
      this.render();
    });

    document.querySelectorAll('.pion-file-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const file = parseInt((e.currentTarget as HTMLElement).dataset.file || '3', 10);
        progression.setSelectedFile(file);
        audio.play('ui');
        this.render();
      });
    });

    document.querySelectorAll('.pion-pattern-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const patId = (e.currentTarget as HTMLElement).dataset.pid;
        if (patId) {
          progression.setSelectedPattern(patId);
          audio.playExtraPionSelect();
          this.showToast(`Pola Pion Khusus dipilih: ${progression.getSelectedPattern().name}`);
          this.render();
        }
      });
    });

    document.getElementById('btn-claim-levelup')?.addEventListener('click', () => {
      this.activeLevelUpModal = null;
      this.render();
    });

    // Forge / Quests Modal
    document.getElementById('btn-landing-forge')?.addEventListener('click', () => {
      audio.play('ui');
      this.showLevelingModal = true;
      this.render();
    });

    // Theme pickers with click & audible hover feedback
    const flowerCard = document.getElementById('pick-flower');
    flowerCard?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('flower');
    });
    flowerCard?.addEventListener('mouseenter', () => {
      audio.playThemeHover('flower');
    });

    const warCard = document.getElementById('pick-war');
    warCard?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('war');
    });
    warCard?.addEventListener('mouseenter', () => {
      audio.playThemeHover('war');
    });

    const beastCard = document.getElementById('pick-beast');
    beastCard?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('beast');
    });
    beastCard?.addEventListener('mouseenter', () => {
      audio.playThemeHover('beast');
    });

    const greekCard = document.getElementById('pick-greek');
    greekCard?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('greek');
    });
    greekCard?.addEventListener('mouseenter', () => {
      audio.playThemeHover('greek');
    });

    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audio.play('ui');
        const mode = (e.currentTarget as HTMLElement).dataset.mode as GameMode;
        this.currentMode = mode;
        this.render();
      });
    });

    // AI Levels
    document.querySelectorAll('.lvl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audio.play('ui');
        const lvl = parseInt((e.currentTarget as HTMLElement).dataset.lvl || '3', 10) as AILevel;
        this.aiLevel = lvl;
        this.render();
      });
    });

    // Colors
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audio.play('ui');
        const col = (e.currentTarget as HTMLElement).dataset.col;
        if (col === 'rand') {
          this.playerColor = Math.random() < 0.5 ? 'w' : 'b';
        } else {
          this.playerColor = col as PieceColor;
        }
        this.render();
      });
    });

    // Time controls
    document.querySelectorAll('.tc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audio.play('ui');
        const tcid = (e.currentTarget as HTMLElement).dataset.tcid;
        const found = TIME_CONTROLS.find(t => t.id === tcid);
        if (found) this.timeControl = found;
        this.render();
      });
    });

    // Room Join PVP Events
    document.getElementById('tab-create-room')?.addEventListener('click', () => {
      audio.play('ui');
      this.pvpTab = 'create';
      this.render();
    });

    document.getElementById('tab-join-room')?.addEventListener('click', () => {
      audio.play('ui');
      this.pvpTab = 'join';
      this.render();
    });

    document.getElementById('btn-create-room-now')?.addEventListener('click', async () => {
      audio.initOnGesture();
      const code = await p2p.createRoom(this.playerColor);
      this.isRoomCreated = true;
      audio.play('ui');
      this.showToast(`Room dibuat: ${code}! Bagikan kode ke lawan.`);
      this.render();
    });

    document.getElementById('btn-copy-room-code')?.addEventListener('click', () => {
      if (p2p.roomCode) {
        navigator.clipboard.writeText(p2p.roomCode);
        audio.play('ui');
        this.showToast('📋 Kode Room disalin ke clipboard!');
      }
    });

    document.getElementById('btn-copy-room-link')?.addEventListener('click', () => {
      const url = p2p.getShareUrl();
      if (url) {
        navigator.clipboard.writeText(url);
        audio.play('ui');
        this.showToast('🔗 Link bergabung Room disalin!');
      }
    });

    document.getElementById('btn-recreate-room')?.addEventListener('click', async () => {
      audio.initOnGesture();
      const code = await p2p.createRoom(this.playerColor);
      this.showToast(`Room baru dibuat: ${code}`);
      this.render();
    });

    const roomInputEl = document.getElementById('input-room-code') as HTMLInputElement;
    roomInputEl?.addEventListener('input', (e) => {
      this.roomCodeInput = (e.target as HTMLInputElement).value.trim().toUpperCase();
    });

    document.getElementById('btn-paste-code')?.addEventListener('click', async () => {
      audio.initOnGesture();
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          let code = text.trim();
          if (code.includes('room=')) {
            const match = code.match(/room=([^&]+)/);
            if (match) code = decodeURIComponent(match[1]);
          }
          this.roomCodeInput = code.toUpperCase();
          this.render();
        }
      } catch {
        this.showToast('Silakan ketik atau gunakan Ctrl+V untuk menempel');
      }
    });

    document.getElementById('btn-join-room-submit')?.addEventListener('click', async () => {
      audio.initOnGesture();
      const inputVal = (document.getElementById('input-room-code') as HTMLInputElement)?.value.trim().toUpperCase();
      const code = this.roomCodeInput || inputVal;
      if (!code) {
        this.showToast('Ketik kode room terlebih dahulu!');
        return;
      }
      this.roomCodeInput = code;
      this.showToast(`Menghubungkan ke Room ${code}...`);
      await p2p.joinRoom(code);
      this.render();
    });

    // Enter Arena
    document.getElementById('btn-enter-arena')?.addEventListener('click', async () => {
      audio.initOnGesture();
      if (this.currentMode === 'p2p') {
        if (this.pvpTab === 'create') {
          if (!this.isRoomCreated) {
            const code = await p2p.createRoom(this.playerColor);
            this.isRoomCreated = true;
            this.showToast(`Room dibuat: ${code}!`);
            this.render();
          } else {
            this.startNewGame();
          }
        } else {
          const inputVal = (document.getElementById('input-room-code') as HTMLInputElement)?.value.trim().toUpperCase();
          const code = this.roomCodeInput || inputVal;
          if (!code) {
            this.showToast('Ketik kode room terlebih dahulu!');
            return;
          }
          this.roomCodeInput = code;
          this.showToast(`Menghubungkan ke Room ${code}...`);
          await p2p.joinRoom(code);
          this.render();
        }
      } else {
        this.startNewGame();
      }
    });

    // Footer tools
    document.getElementById('btn-landing-toggle-music')?.addEventListener('click', () => {
      audio.initOnGesture();
      audio.toggleMusic();
      this.render();
    });

    document.querySelectorAll('.landing-track-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        audio.initOnGesture();
        const tid = (e.currentTarget as HTMLElement).dataset.tid;
        if (tid) {
          audio.selectTrack(tid);
          audio.play('ui');
          this.render();
        }
      });
    });

    document.getElementById('btn-mute-landing')?.addEventListener('click', () => {
      audio.toggleMute();
      this.render();
    });

    document.getElementById('btn-dark-landing')?.addEventListener('click', () => {
      this.toggleDarkMode();
    });

    document.getElementById('btn-pwa-landing')?.addEventListener('click', () => {
      this.promptInstall();
    });
  }

  // 8. GAME VIEW — BOARD + SURROUNDING PANELS
  private renderGameScreen(): void {
    const k = K[this.currentTheme];
    const stateToDisplay = this.currentViewIndex === -1 
      ? this.engine.state 
      : this.engine.history[this.currentViewIndex].state;

    const inCheck = this.engine.isInCheck(stateToDisplay.turn, stateToDisplay);
    const kingSq = this.engine.findKing(stateToDisplay.turn, stateToDisplay);
    const lastMove = this.engine.history.length > 0 ? this.engine.history[this.engine.history.length - 1].move : null;

    // Captured pieces calculation
    const capturedWhite: PieceType[] = [];
    const capturedBlack: PieceType[] = [];
    for (const h of this.engine.history) {
      if (h.move.captured) {
        if (h.move.color === 'w') capturedBlack.push(h.move.captured);
        else capturedWhite.push(h.move.captured);
      }
    }

    this.container.innerHTML = `
      <div id="gm" style="max-width: 1000px; margin: 0 auto; padding: 12px 16px; min-height: 100vh; display: flex; flex-direction: column;">
        
        <!-- Toolbar (Top) -->
        <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btn-back-landing" title="Back to menu" style="padding: 6px 12px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); color: var(--ink); font-weight: 700; cursor: pointer;">
              ← Menu
            </button>
            <!-- #sg Segmented Theme Control -->
            <div id="sg" style="display: inline-flex; background: var(--card); border: 1px solid var(--bd-border); border-radius: 8px; padding: 2px;">
              <button id="sg-flower" aria-pressed="${this.currentTheme === 'flower'}" style="padding: 4px 10px; border-radius: 6px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; background: ${this.currentTheme === 'flower' ? 'var(--acc)' : 'transparent'}; color: ${this.currentTheme === 'flower' ? 'var(--on)' : 'var(--ink)'};">
                🌸 Flower
              </button>
              <button id="sg-war" aria-pressed="${this.currentTheme === 'war'}" style="padding: 4px 10px; border-radius: 6px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; background: ${this.currentTheme === 'war' ? 'var(--acc)' : 'transparent'}; color: ${this.currentTheme === 'war' ? 'var(--on)' : 'var(--ink)'};">
                ⚙️ War
              </button>
              <button id="sg-beast" aria-pressed="${this.currentTheme === 'beast'}" style="padding: 4px 10px; border-radius: 6px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; background: ${this.currentTheme === 'beast' ? 'var(--acc)' : 'transparent'}; color: ${this.currentTheme === 'beast' ? 'var(--on)' : 'var(--ink)'};">
                🦁 Beast
              </button>
              <button id="sg-greek" aria-pressed="${this.currentTheme === 'greek'}" style="padding: 4px 10px; border-radius: 6px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; background: ${this.currentTheme === 'greek' ? 'var(--acc)' : 'transparent'}; color: ${this.currentTheme === 'greek' ? 'var(--on)' : 'var(--ink)'};">
                ⚡ Olympus
              </button>
            </div>

            <!-- Music Player Controller (Bisa dipilih dinyalakan / dimatikan & pilih lagu) -->
            <div style="display: inline-flex; align-items: center; gap: 3px; background: var(--card); border: 1px solid var(--bd-border); border-radius: 8px; padding: 2px 4px;">
              <button id="btn-toggle-music" title="${audio.isMusicActive() ? 'Matikan Musik' : 'Nyalakan Musik'}" style="display: flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 6px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; background: ${audio.isMusicActive() ? 'var(--acc)' : 'transparent'}; color: ${audio.isMusicActive() ? 'var(--on)' : 'var(--ink)'};">
                <span class="equalizer-wrapper">
                  <span class="equalizer-bar ${audio.isMusicActive() ? '' : 'paused'}"></span>
                  <span class="equalizer-bar ${audio.isMusicActive() ? '' : 'paused'}"></span>
                  <span class="equalizer-bar ${audio.isMusicActive() ? '' : 'paused'}"></span>
                </span>
                <span>${audio.isMusicActive() ? 'Musik: ON' : 'Musik: OFF'}</span>
              </button>
              <button id="btn-track-menu" title="Pilih Lagu Tema (Choose Track)" style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--bg); font-size: 11px; font-weight: 700; cursor: pointer; color: var(--ink); white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis;">
                🎵 ${audio.getCurrentTrack().name} ▾
              </button>
            </div>

            ${this.currentMode === 'p2p' ? `
              <button id="btn-room-badge" title="Room Info & Share" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); font-size: 11px; font-weight: 700; cursor: pointer; color: var(--ink);">
                <span class="radar-dot ${p2p.connected ? 'connected' : 'waiting'}"></span>
                <span>Room: ${p2p.roomCode || 'CLASH'}</span>
              </button>
            ` : ''}
          </div>

          <!-- Middle: Turn or AI thinking indicator -->
          <div style="font-size: 13px; font-weight: 700; text-align: center; color: var(--acc);">
            ${this.isAIThinking ? `⏳ ${k.t2}` : stateToDisplay.turn === this.playerColor ? k.t1 : `${stateToDisplay.turn === 'w' ? 'White' : 'Black'} to move`}
          </div>

          <!-- Right toolbar tools -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <!-- Level HUD Button -->
            <button id="btn-open-leveling" class="level-hud-btn" title="Misi &amp; Tingkat Pion Khusus">
              <span>⭐ Lvl ${progression.getLevel()}</span>
              <div class="level-mini-bar">
                <div class="level-mini-fill" style="width: ${Math.min(100, (progression.getXP() / progression.getXPForNextLevel()) * 100)}%;"></div>
              </div>
              <span style="font-size: 11px; opacity: 0.85;">${progression.getXP()}/${progression.getXPForNextLevel()} XP</span>
            </button>
            <button id="btn-toggle-audio" title="Audio mute" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">
              ${audio.getMuted() ? '🔇' : '🔊'}
            </button>
            <button id="btn-rain-effect" title="${k.sp}" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">
              ${this.currentTheme === 'flower' ? '🌸' : '⚡'}
            </button>
            <button id="btn-dark-toggle" title="Dark mode" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">
              ${this.isDarkMode ? '🌙' : '☀️'}
            </button>
            <button id="btn-open-settings" title="Settings" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">
              ⚙️
            </button>
          </div>
        </header>

        <!-- Main Workspace (Board + Side Panel) -->
        <div style="display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start;" class="workspace-grid">
          
          <div style="display: flex; flex-direction: column; gap: 10px;">
            
            <!-- Top Player Banner (Black or White based on orientation) -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: var(--card); border: 1px solid var(--bd-border); border-radius: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 14px; height: 14px; border-radius: 50%; background: ${this.isFlipped ? '#f6adc4' : '#6a55c8'}; border: 1px solid var(--bd-border);"></div>
                <span style="font-weight: 700; font-size: 14px;">
                  ${this.isFlipped ? 'White' : (this.currentMode === 'ai' ? k.ai : 'Black')}
                </span>
                <!-- Captured piece tray -->
                <div style="display: flex; gap: 2px; margin-left: 8px;">
                  ${(this.isFlipped ? capturedWhite : capturedBlack).map(p => `
                    <div style="width: 18px; height: 18px;">${getPieceSVG(p, this.isFlipped ? 'w' : 'b', this.currentTheme)}</div>
                  `).join('')}
                </div>
              </div>
              <div id="${this.isFlipped ? 'white-clock' : 'black-clock'}" style="font-family: var(--font-mono); font-size: 18px; font-weight: 800; background: rgba(0,0,0,0.06); padding: 4px 10px; border-radius: 6px;">
                ${this.formatTime(this.isFlipped ? this.whiteTime : this.blackTime)}
              </div>
            </div>

            <!-- 8x8 Chess Board -->
            <div class="board-container">
              <div class="chess-grid" id="board-grid">
                ${this.renderSquares(stateToDisplay, kingSq, inCheck, lastMove)}
              </div>
            </div>

            <!-- Bottom Player Banner -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: var(--card); border: 1px solid var(--bd-border); border-radius: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 14px; height: 14px; border-radius: 50%; background: ${this.isFlipped ? '#6a55c8' : '#f6adc4'}; border: 1px solid var(--bd-border);"></div>
                <span style="font-weight: 700; font-size: 14px;">
                  ${this.isFlipped ? (this.currentMode === 'ai' ? k.ai : 'Black') : 'White (You)'}
                </span>
                <!-- Captured piece tray -->
                <div style="display: flex; gap: 2px; margin-left: 8px;">
                  ${(this.isFlipped ? capturedBlack : capturedWhite).map(p => `
                    <div style="width: 18px; height: 18px;">${getPieceSVG(p, this.isFlipped ? 'b' : 'w', this.currentTheme)}</div>
                  `).join('')}
                </div>
              </div>
              <div id="${this.isFlipped ? 'black-clock' : 'white-clock'}" style="font-family: var(--font-mono); font-size: 18px; font-weight: 800; background: rgba(0,0,0,0.06); padding: 4px 10px; border-radius: 6px;">
                ${this.formatTime(this.isFlipped ? this.blackTime : this.whiteTime)}
              </div>
            </div>

          </div>

          <!-- Side / Bottom Control & History Panel -->
          <div style="background: var(--card); border: 1px solid var(--bd-border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            
            <!-- Quick Actions Bar -->
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <button id="btn-flip" title="Flip Board" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-weight: 600; font-size: 12px; cursor: pointer;">
                🔄 Flip
              </button>
              <button id="btn-undo" title="Takeback move" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-weight: 600; font-size: 12px; cursor: pointer;">
                ↩️ Undo
              </button>
              <button id="btn-draw" title="Offer draw" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-weight: 600; font-size: 12px; cursor: pointer;">
                🤝 Draw
              </button>
              <button id="btn-resign" title="Resign" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-weight: 600; font-size: 12px; cursor: pointer; color: #e53935;">
                🏳️ Resign
              </button>
              ${this.currentMode === 'p2p' ? `
                <button id="btn-emotes" title="Chat Emotes" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-weight: 600; font-size: 12px; cursor: pointer;">
                  💬 Emotes
                </button>
                <button id="btn-room-info" title="Room Status & Info" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-weight: 600; font-size: 12px; cursor: pointer;">
                  🌐 Room Info
                </button>
              ` : ''}
            </div>

            <!-- Move History Navigation Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--bd-border); padding-bottom: 6px;">
              <span style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: var(--mute);">
                Move History • Riwayat Langkah
              </span>
              <!-- Navigation buttons -->
              <div style="display: flex; gap: 4px;">
                <button id="nav-first" title="First move" style="padding: 2px 8px; border-radius: 4px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">|&lt;</button>
                <button id="nav-prev" title="Previous move" style="padding: 2px 8px; border-radius: 4px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">&lt;</button>
                <button id="nav-next" title="Next move" style="padding: 2px 8px; border-radius: 4px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">&gt;</button>
                <button id="nav-last" title="Current live move" style="padding: 2px 8px; border-radius: 4px; border: 1px solid var(--bd-border); background: var(--card); cursor: pointer;">&gt;|</button>
              </div>
            </div>

            <!-- Moves List in SAN -->
            <div id="moves-container" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; font-family: var(--font-mono); font-size: 13px;">
              ${this.renderMoveList()}
            </div>

            <!-- FEN / PGN Export Tools -->
            <div style="display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid var(--bd-border);">
              <button id="btn-export-fen" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-size: 12px; font-weight: 700; cursor: pointer;">
                📋 Copy FEN
              </button>
              <button id="btn-export-pgn" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-size: 12px; font-weight: 700; cursor: pointer;">
                📜 Copy PGN
              </button>
              <button id="btn-import-fen" style="flex: 1; padding: 6px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--card); font-size: 12px; font-weight: 700; cursor: pointer;">
                📥 Import
              </button>
            </div>

            <!-- In-Game Active Quests HUD -->
            <div class="quest-hud-card" id="quest-hud-card" style="margin-top: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--bd-border); padding-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--acc);">
                  <span>📜</span>
                  <span>Misi Acak (Random Quests)</span>
                </div>
                <button id="btn-open-quests-modal" style="font-size: 11px; background: none; border: none; color: var(--acc); font-weight: 700; cursor: pointer;">
                  Kelola / Forge ↗
                </button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${progression.getActiveTasks().map(task => `
                  <div class="quest-item-row" title="${task.description}">
                    <span style="font-size: 14px;">${task.icon}</span>
                    <div style="flex: 1; min-width: 0;">
                      <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 11px; margin-bottom: 2px;">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.title}</span>
                        <span style="color: ${task.completed ? '#22c55e' : 'var(--mute)'}; font-size: 10px;">${task.completed ? '✓ Selesai' : `${task.progress}/${task.target}`}</span>
                      </div>
                      <div class="quest-progress-track">
                        <div class="quest-progress-fill ${task.completed ? 'completed' : ''}" style="width: ${Math.min(100, (task.progress / task.target) * 100)}%;"></div>
                      </div>
                    </div>
                    <span style="font-size: 10px; font-weight: 800; color: #f59e0b;">+${task.xpReward} XP</span>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

        </div>

        <!-- Overlays (Promotion, Game Over, Settings, Leveling, Level Up) -->
        ${this.renderPromotionModal()}
        ${this.renderGameOverModal()}
        ${this.renderLevelingModal()}
        ${this.renderLevelUpModal()}

      </div>
    `;

    this.bindGameEvents();
  }

  private renderSquares(state: any, kingSq: number, inCheck: boolean, lastMove: Move | null): string {
    let squaresHTML = '';

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const file = this.isFlipped ? 7 - col : col;
        const rank = this.isFlipped ? 7 - row : row;
        const sq = coordsToSquare(file, rank);
        const isDark = (file + rank) % 2 === 1;
        const piece = state.board[sq];

        const isSelected = this.selectedSquare === sq;
        const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
        const isKingInCheck = inCheck && kingSq === sq;
        const legalMove = this.legalMoves.find(m => m.to === sq);
        const selPiece = this.selectedSquare !== null ? state.board[this.selectedSquare] : null;

        const isExtraPion = piece && piece.type === 'p' && progression.isExtraPion(sq);
        const isSelExtraPion = this.selectedSquare !== null && selPiece?.type === 'p' && progression.isExtraPion(this.selectedSquare);
        const curPattern = progression.getSelectedPattern();

        squaresHTML += `
          <div class="square ${isDark ? 'sq-dark' : 'sq-light'} ${isSelected ? 'selected' : ''} ${isLastMove ? 'last-move' : ''} ${isKingInCheck ? 'in-check' : ''}" data-sq="${sq}">
            ${piece ? `
              <div class="piece" draggable="true" data-sq="${sq}">
                ${isExtraPion ? getExtraPionSVG(piece.color, this.currentTheme, curPattern.id) : getPieceSVG(piece.type, piece.color, this.currentTheme, sq)}
              </div>
              ${isExtraPion ? `
                <div class="extra-pion-base-aura" style="--pion-glow: ${curPattern.glowColor}; --pion-color: ${curPattern.primaryColor};"></div>
                <div class="extra-pion-badge" title="Apex Extra Pion: ${curPattern.name}">${curPattern.icon}</div>
              ` : ''}
            ` : ''}

            ${legalMove && this.showHints ? `
              ${isSelExtraPion ? `
                ${this.renderExtraPionWay(legalMove, curPattern)}
              ` : this.currentTheme === 'war' ? `
                ${(this.selectedSquare !== null && state.board[this.selectedSquare]?.type === 'p') ? `
                  ${legalMove.captured || legalMove.flags === 'ep' ? `
                    <!-- Cosmic War Pawn Ambush Lock Reticle -->
                    <div class="cosmic-pawn-ambush-lock">
                      <svg viewBox="0 0 44 44" class="cosmic-lock-svg">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#ff0055" stroke-width="1.8" stroke-dasharray="5 3" class="lock-ring-spin"/>
                        <circle cx="22" cy="22" r="11" fill="none" stroke="#19d3c5" stroke-width="1.2" stroke-dasharray="2 4"/>
                        <polygon points="22,6 38,22 22,38 6,22" fill="none" stroke="#ff0055" stroke-width="1.5" stroke-dasharray="4 2"/>
                        <line x1="12" y1="12" x2="32" y2="32" stroke="#ff0055" stroke-width="2.5" stroke-linecap="round"/>
                        <line x1="32" y1="12" x2="12" y2="32" stroke="#ff0055" stroke-width="2.5" stroke-linecap="round"/>
                        <circle cx="22" cy="22" r="3.5" fill="#19d3c5"/>
                        <circle cx="22" cy="22" r="1.5" fill="#ffffff"/>
                      </svg>
                    </div>
                  ` : `
                    <!-- Cosmic War Pawn Way Pattern (Warp Trajectory & Starlight Constellation) -->
                    <div class="cosmic-pawn-way">
                      <svg viewBox="0 0 44 44" class="cosmic-way-svg">
                        <!-- Constellation Warp Grid -->
                        <polygon points="22,3 35,16 35,28 22,41 9,28 9,16" fill="rgba(25, 211, 197, 0.12)" stroke="var(--acc)" stroke-width="1.5" stroke-dasharray="4 2"/>
                        <!-- Forward Cosmic Warp Chevrons -->
                        <path d="M15 26 L22 19 L29 26" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M17 31 L22 26 L27 31" fill="none" stroke="#ff4f9a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <!-- Pulsing 4-Point Cosmic Star Core -->
                        <g transform="translate(22, 12)">
                          <polygon points="0,-6 2,-2 6,0 2,2 0,6 -2,2 -6,0 -2,-2" fill="var(--acc)" class="cosmic-star-spin"/>
                          <circle cx="0" cy="0" r="2" fill="#ffffff"/>
                        </g>
                        <!-- Starlight Node Stars -->
                        <circle cx="9" cy="16" r="1.5" fill="var(--acc)"/>
                        <circle cx="35" cy="16" r="1.5" fill="var(--acc)"/>
                        <circle cx="9" cy="28" r="1.5" fill="var(--acc)"/>
                        <circle cx="35" cy="28" r="1.5" fill="var(--acc)"/>
                      </svg>
                    </div>
                  `}
                ` : `
                  ${legalMove.captured || legalMove.flags === 'ep' ? `
                    <div class="war-target-x-lock">
                      <svg viewBox="0 0 44 44" class="lock-x-svg">
                        <!-- Rotating outer dashed lock-on ring -->
                        <circle cx="22" cy="22" r="17" fill="none" stroke="#ff1744" stroke-width="1.8" stroke-dasharray="8 4" class="lock-ring-spin"/>
                        <!-- Inner range ring -->
                        <circle cx="22" cy="22" r="10" fill="none" stroke="#ff5252" stroke-width="1" opacity="0.6"/>
                        <!-- Prominent Glowing Heavy Crosshair 'X' -->
                        <line x1="9" y1="9" x2="35" y2="35" stroke="#ff1744" stroke-width="3.5" stroke-linecap="round"/>
                        <line x1="35" y1="9" x2="9" y2="35" stroke="#ff1744" stroke-width="3.5" stroke-linecap="round"/>
                        <line x1="9" y1="9" x2="35" y2="35" stroke="#ffee58" stroke-width="1.4" stroke-linecap="round"/>
                        <line x1="35" y1="9" x2="9" y2="35" stroke="#ffee58" stroke-width="1.4" stroke-linecap="round"/>
                        <!-- 4 Outer Target Chevrons -->
                        <polygon points="22,1 25,5 19,5" fill="#ff1744"/>
                        <polygon points="22,43 25,39 19,39" fill="#ff1744"/>
                        <polygon points="1,22 5,25 5,19" fill="#ff1744"/>
                        <polygon points="43,22 39,25 39,19" fill="#ff1744"/>
                        <circle cx="22" cy="22" r="3" fill="#ff1744"/>
                        <circle cx="22" cy="22" r="1.5" fill="#ffffff"/>
                      </svg>
                    </div>
                  ` : `
                    <div class="war-target-waypoint">
                      <svg viewBox="0 0 32 32" class="waypoint-svg">
                        <polygon points="16,4 28,16 16,28 4,16" fill="none" stroke="var(--acc)" stroke-width="2" stroke-dasharray="4 2"/>
                        <line x1="16" y1="8" x2="16" y2="24" stroke="var(--acc)" stroke-width="1.8"/>
                        <line x1="8" y1="16" x2="24" y2="16" stroke="var(--acc)" stroke-width="1.8"/>
                        <circle cx="16" cy="16" r="3" fill="var(--acc)"/>
                      </svg>
                    </div>
                  `}
                `}
              ` : this.currentTheme === 'beast' ? `
                ${legalMove.captured || legalMove.flags === 'ep' ? `
                  ${selPiece?.type === 'r' ? `
                    <!-- 1. Silverback Gorilla: Colossus Crushing Punch Knuckle Strike Lock -->
                    <div class="beast-punch-lock">
                      <svg viewBox="0 0 44 44" class="punch-lock-svg">
                        <circle cx="22" cy="22" r="19" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="5 3" class="lock-ring-spin"/>
                        <circle cx="22" cy="22" r="13" fill="none" stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="3 3"/>
                        <rect x="13" y="15" width="18" height="15" rx="4" fill="#78350f" stroke="#ef4444" stroke-width="2"/>
                        <line x1="17" y1="15" x2="17" y2="23" stroke="#f59e0b" stroke-width="1.8"/>
                        <line x1="22" y1="15" x2="22" y2="23" stroke="#f59e0b" stroke-width="1.8"/>
                        <line x1="27" y1="15" x2="27" y2="23" stroke="#f59e0b" stroke-width="1.8"/>
                        <line x1="22" y1="4" x2="22" y2="11" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
                        <line x1="22" y1="33" x2="22" y2="40" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
                        <line x1="4" y1="22" x2="11" y2="22" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
                        <line x1="33" y1="22" x2="40" y2="22" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
                      </svg>
                    </div>
                  ` : selPiece?.type === 'n' ? `
                    <!-- 2. Shadow Panther: Leaping Pounce Claws Lock -->
                    <div class="beast-panther-lock">
                      <svg viewBox="0 0 44 44" class="panther-lock-svg">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#9333ea" stroke-width="1.8" stroke-dasharray="6 3" class="lock-ring-spin"/>
                        <path d="M10 14 Q22 20 34 10" stroke="#f43f5e" stroke-width="3.6" fill="none" stroke-linecap="round"/>
                        <path d="M12 24 Q22 30 32 20" stroke="#f43f5e" stroke-width="3.6" fill="none" stroke-linecap="round"/>
                        <path d="M10 14 Q22 20 34 10" stroke="#fef08a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <path d="M12 24 Q22 30 32 20" stroke="#fef08a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <circle cx="17" cy="34" r="2.2" fill="#10b981"/>
                        <circle cx="27" cy="34" r="2.2" fill="#10b981"/>
                      </svg>
                    </div>
                  ` : selPiece?.type === 'b' ? `
                    <!-- 3. Apex Falcon: Diving Razor Talons Grasp Lock -->
                    <div class="beast-falcon-lock">
                      <svg viewBox="0 0 44 44" class="falcon-lock-svg">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="4 2" class="lock-ring-spin"/>
                        <path d="M14 8 Q17 22 12 28" stroke="#ef4444" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                        <path d="M20 6 Q21 24 18 30" stroke="#ef4444" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                        <path d="M24 6 Q23 24 26 30" stroke="#ef4444" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                        <path d="M30 8 Q27 22 32 28" stroke="#ef4444" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                        <circle cx="22" cy="18" r="3.5" fill="#fef08a"/>
                      </svg>
                    </div>
                  ` : selPiece?.type === 'q' ? `
                    <!-- 4. Savage Tigress: Quad Saber Claw Shred Lock -->
                    <div class="beast-tigress-lock">
                      <svg viewBox="0 0 44 44" class="tigress-lock-svg">
                        <circle cx="22" cy="22" r="19" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="5 3" class="lock-ring-spin"/>
                        <line x1="8" y1="10" x2="32" y2="38" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
                        <line x1="14" y1="6" x2="38" y2="34" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
                        <line x1="6" y1="18" x2="26" y2="42" stroke="#ef4444" stroke-width="3.2" stroke-linecap="round"/>
                        <line x1="18" y1="4" x2="42" y2="30" stroke="#ef4444" stroke-width="3.2" stroke-linecap="round"/>
                        <line x1="8" y1="10" x2="32" y2="38" stroke="#fef08a" stroke-width="1.4" stroke-linecap="round"/>
                        <line x1="14" y1="6" x2="38" y2="34" stroke="#fef08a" stroke-width="1.4" stroke-linecap="round"/>
                      </svg>
                    </div>
                  ` : selPiece?.type === 'k' ? `
                    <!-- 5. Apex Lion King: Royal Lion Roar Crest Lock -->
                    <div class="beast-lion-lock">
                      <svg viewBox="0 0 44 44" class="lion-lock-svg">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="#eab308" stroke-width="2.2" stroke-dasharray="4 3" class="lock-ring-spin"/>
                        <polygon points="22,6 36,22 22,38 8,22" fill="none" stroke="#f97316" stroke-width="1.5" stroke-dasharray="3 2"/>
                        <line x1="11" y1="11" x2="33" y2="33" stroke="#ef4444" stroke-width="3.6" stroke-linecap="round"/>
                        <line x1="33" y1="11" x2="11" y2="33" stroke="#ef4444" stroke-width="3.6" stroke-linecap="round"/>
                        <line x1="11" y1="11" x2="33" y2="33" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
                        <line x1="33" y1="11" x2="11" y2="33" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
                        <circle cx="22" cy="22" r="4" fill="#f59e0b"/>
                      </svg>
                    </div>
                  ` : `
                    <!-- 6. Dire Wolf: Snapping Razor Fangs & Claws Lock -->
                    <div class="beast-wolf-lock">
                      <svg viewBox="0 0 44 44" class="wolf-lock-svg">
                        <circle cx="22" cy="22" r="17" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="6 3" class="lock-ring-spin"/>
                        <polygon points="15,10 17,20 19,10" fill="#fef08a" stroke="#ef4444" stroke-width="1.2"/>
                        <polygon points="25,10 27,20 29,10" fill="#fef08a" stroke="#ef4444" stroke-width="1.2"/>
                        <polygon points="16,34 18,24 20,34" fill="#fef08a" stroke="#ef4444" stroke-width="1.2"/>
                        <polygon points="24,34 26,24 28,34" fill="#fef08a" stroke="#ef4444" stroke-width="1.2"/>
                        <line x1="8" y1="12" x2="32" y2="36" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
                        <line x1="14" y1="8" x2="38" y2="32" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
                        <line x1="8" y1="12" x2="32" y2="36" stroke="#fef08a" stroke-width="1.4" stroke-linecap="round"/>
                        <line x1="14" y1="8" x2="38" y2="32" stroke="#fef08a" stroke-width="1.4" stroke-linecap="round"/>
                      </svg>
                    </div>
                  `}
                ` : `
                  ${selPiece?.type === 'r' ? `
                    <!-- Gorilla Knuckle Stamp Waypoint -->
                    <div class="beast-punch-waypoint">
                      <svg viewBox="0 0 36 36" class="punch-waypoint-svg">
                        <rect x="9" y="11" width="18" height="14" rx="4" fill="var(--acc)" opacity="0.9"/>
                        <line x1="13.5" y1="11" x2="13.5" y2="18" stroke="#150f0a" stroke-width="1.6"/>
                        <line x1="18" y1="11" x2="18" y2="18" stroke="#150f0a" stroke-width="1.6"/>
                        <line x1="22.5" y1="11" x2="22.5" y2="18" stroke="#150f0a" stroke-width="1.6"/>
                        <path d="M6 28 Q18 33 30 28" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round"/>
                      </svg>
                    </div>
                  ` : selPiece?.type === 'b' ? `
                    <!-- Falcon Wingtip Waypoint -->
                    <div class="beast-paw-waypoint">
                      <svg viewBox="0 0 36 36" class="paw-waypoint-svg">
                        <path d="M18 10 L6 14 L12 22 L18 19 L24 22 L30 14 Z" fill="var(--acc)" opacity="0.9"/>
                        <circle cx="18" cy="27" r="3" fill="#f97316"/>
                      </svg>
                    </div>
                  ` : `
                    <!-- Wild Animal Paw Print Waypoint with Curved Sharp Claws -->
                    <div class="beast-paw-waypoint">
                      <svg viewBox="0 0 36 36" class="paw-waypoint-svg">
                        <ellipse cx="10" cy="11" rx="2.8" ry="4.2" transform="rotate(-25, 10, 11)" fill="var(--acc)" opacity="0.85"/>
                        <path d="M8 7 Q9 4 11 3" stroke="#f97316" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <ellipse cx="15.5" cy="8" rx="2.8" ry="4.6" transform="rotate(-8, 15.5, 8)" fill="var(--acc)"/>
                        <path d="M15 3 Q15.5 0.5 17 0" stroke="#f97316" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <ellipse cx="21.5" cy="8" rx="2.8" ry="4.6" transform="rotate(8, 21.5, 8)" fill="var(--acc)"/>
                        <path d="M21 0 Q22.5 0.5 23 3" stroke="#f97316" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <ellipse cx="27" cy="11" rx="2.8" ry="4.2" transform="rotate(25, 27, 11)" fill="var(--acc)" opacity="0.85"/>
                        <path d="M27 3 Q29 4 30 7" stroke="#f97316" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <path d="M12 21 C11 16 16 14 18.5 14 C21 14 26 16 25 21 C24 26 21 28 18.5 28 C16 28 13 26 12 21 Z" fill="var(--acc)"/>
                      </svg>
                    </div>
                  `}
                `}
              ` : `
                ${legalMove.captured || legalMove.flags === 'ep' 
                  ? '<div class="capture-ring"></div>' 
                  : '<div class="move-dot"></div>'}
              `}
            ` : ''}

            ${this.showCoordinates && (this.isFlipped ? row === 7 : row === 7) ? `
              <span class="coord-label coord-file">${String.fromCharCode('a'.charCodeAt(0) + file)}</span>
            ` : ''}

            ${this.showCoordinates && (this.isFlipped ? col === 0 : col === 0) ? `
              <span class="coord-label coord-rank">${8 - rank}</span>
            ` : ''}
          </div>
        `;
      }
    }

    return squaresHTML;
  }

  private renderMoveList(): string {
    if (this.engine.history.length === 0) {
      return '<div style="color: var(--mute); font-style: italic; padding: 8px 0;">No moves played yet. Belum ada langkah.</div>';
    }

    let rows = '';
    for (let i = 0; i < this.engine.history.length; i += 2) {
      const whiteMove = this.engine.history[i];
      const blackMove = this.engine.history[i + 1];
      const moveNum = Math.floor(i / 2) + 1;

      rows += `
        <div style="display: grid; grid-template-columns: 36px 1fr 1fr; gap: 8px; padding: 2px 4px; border-radius: 4px;">
          <span style="color: var(--mute);">${moveNum}.</span>
          <span class="move-step ${this.currentViewIndex === i ? 'active-step' : ''}" data-idx="${i}" style="cursor: pointer; padding: 2px 6px; border-radius: 4px; ${this.currentViewIndex === i ? 'background: var(--acc); color: var(--on);' : ''}">
            ${whiteMove.move.san || 'move'}
          </span>
          ${blackMove ? `
            <span class="move-step ${this.currentViewIndex === i + 1 ? 'active-step' : ''}" data-idx="${i + 1}" style="cursor: pointer; padding: 2px 6px; border-radius: 4px; ${this.currentViewIndex === i + 1 ? 'background: var(--acc); color: var(--on);' : ''}">
              ${blackMove.move.san || 'move'}
            </span>
          ` : '<span></span>'}
        </div>
      `;
    }
    return rows;
  }

  private renderPromotionModal(): string {
    if (!this.pendingPromotionMove) return '';
    const movingPiece = this.engine.state.board[this.pendingPromotionMove.from];
    const color = movingPiece?.color || 'w';
    const pieces: PieceType[] = ['q', 'r', 'b', 'n'];

    return `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: var(--card); border: 2px solid var(--acc); border-radius: 16px; padding: 20px; max-width: 360px; width: 90%; text-align: center;">
          <h3 style="font-family: var(--font-display); font-size: 20px; font-weight: 800; margin-bottom: 12px;">
            Choose Promotion • Pilih Promosi
          </h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            ${pieces.map(type => `
              <button class="promo-choice-btn" data-type="${type}" style="padding: 10px; border-radius: 10px; border: 1px solid var(--bd-border); background: rgba(0,0,0,0.04); cursor: pointer;">
                <div style="width: 44px; height: 44px; margin: 0 auto;">${getPieceSVG(type, color, this.currentTheme)}</div>
                <span style="font-size: 11px; font-weight: 700; margin-top: 4px; display: block;">${getPieceName(type, this.currentTheme)}</span>
              </button>
            `).join('')}
          </div>
          <button id="btn-cancel-promo" style="padding: 6px 14px; border-radius: 8px; border: 1px solid var(--bd-border); background: transparent; cursor: pointer; font-size: 12px;">
            Cancel
          </button>
        </div>
      </div>
    `;
  }

  private renderGameOverModal(): string {
    if (this.engine.result === 'in_progress') return '';
    const k = K[this.currentTheme];

    return `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn 0.3s ease;">
        <div style="background: var(--card); border: 3px solid var(--acc); border-radius: 20px; padding: 28px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 16px 40px var(--sh);">
          <div style="font-size: 42px; margin-bottom: 8px;">
            ${this.engine.winner ? '🏆' : '⚖️'}
          </div>
          <h2 style="font-family: var(--font-display); font-size: 26px; font-weight: 800; margin-bottom: 6px;">
            Game Over • Permainan Selesai
          </h2>
          <p style="font-size: 16px; font-weight: 700; color: var(--acc); margin-bottom: 12px;">
            ${this.engine.resultReason || 'Match concluded'}
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 20px;">
            <button id="btn-rematch-modal" style="padding: 12px; border-radius: 10px; background: var(--acc); color: var(--on); border: none; font-weight: 800; font-size: 15px; cursor: pointer;">
              🔄 Rematch • Main Lagi (${k.nw})
            </button>
            <button id="btn-menu-modal" style="padding: 10px; border-radius: 10px; background: transparent; border: 1px solid var(--bd-border); color: var(--ink); font-weight: 700; cursor: pointer;">
              ← Back to Menu • Kembali ke Menu
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderLevelingModal(): string {
    if (!this.showLevelingModal) return '';
    const currentPattern = progression.getSelectedPattern();
    const curLevel = progression.getLevel();
    const curXP = progression.getXP();
    const neededXP = progression.getXPForNextLevel();
    const tasks = progression.getActiveTasks();
    const selectedFile = progression.getSelectedFile();
    const fileLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    return `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 99999; animation: fadeIn 0.25s ease;">
        <div style="background: var(--card); border: 2px solid var(--acc); border-radius: 20px; padding: 24px; max-width: 580px; width: 92%; max-height: 90vh; overflow-y: auto; box-shadow: 0 16px 48px var(--sh);">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--bd-border); padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 26px;">⚡</span>
              <div>
                <h3 style="font-family: var(--font-display); font-size: 22px; font-weight: 800; line-height: 1.1;">
                  Misi Acak &amp; Bengkel Pion Khusus
                </h3>
                <span style="font-size: 12px; color: var(--mute);">Quests, Leveling &amp; Apex Extra Pion Patterns</span>
              </div>
            </div>
            <button id="btn-close-leveling-modal" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--mute); line-height: 1;">✕</button>
          </div>

          <!-- Level Status Bar Card -->
          <div style="background: rgba(0,0,0,0.03); border: 1px solid var(--bd-border); border-radius: 14px; padding: 14px; margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 22px;">⭐</span>
                <div>
                  <div style="font-size: 15px; font-weight: 800; color: var(--ink);">Tingkat ${curLevel}: ${progression.getLevelTitle(curLevel).id}</div>
                  <div style="font-size: 11px; color: var(--mute);">${progression.getLevelTitle(curLevel).en}</div>
                </div>
              </div>
              <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 800; color: var(--acc);">
                ${curXP} / ${neededXP} XP
              </div>
            </div>
            <div style="width: 100%; height: 8px; border-radius: 4px; background: rgba(0,0,0,0.08); overflow: hidden;">
              <div style="height: 100%; border-radius: 4px; background: linear-gradient(90deg, #f59e0b, #ef4444); width: ${Math.min(100, (curXP / neededXP) * 100)}%;"></div>
            </div>
          </div>

          <!-- Section 1: Active Quests -->
          <div style="margin-bottom: 22px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h4 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--acc);">
                📜 3 Misi Acak Aktif (Random Tasks)
              </h4>
              <button id="btn-reroll-quests" style="padding: 4px 10px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--bg); color: var(--ink); font-size: 11px; font-weight: 700; cursor: pointer;">
                🎲 Acak Ulang (Reroll)
              </button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${tasks.map(t => `
                <div style="display: flex; align-items: center; gap: 12px; background: var(--bg); border: 1px solid var(--bd-border); border-radius: 12px; padding: 10px 14px;">
                  <span style="font-size: 22px;">${t.icon}</span>
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 13px;">
                      <span>${t.title} <span style="font-size: 11px; color: var(--mute); font-weight: 500;">(${t.subtitle})</span></span>
                      <span style="color: ${t.completed ? '#22c55e' : 'var(--acc)'}; font-size: 12px;">${t.completed ? '✓ Selesai' : `${t.progress} / ${t.target}`}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--mute); margin-bottom: 6px;">${t.description}</div>
                    <div style="height: 5px; width: 100%; border-radius: 3px; background: rgba(0,0,0,0.08); overflow: hidden;">
                      <div style="height: 100%; background: ${t.completed ? '#22c55e' : 'var(--acc)'}; width: ${Math.min(100, (t.progress / t.target) * 100)}%;"></div>
                    </div>
                  </div>
                  <div style="font-weight: 800; font-size: 12px; color: #f59e0b; white-space: nowrap;">
                    +${t.xpReward} XP
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Section 2: Extra Pion Customization & Unlocked Patterns -->
          <div>
            <h4 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--acc); margin-bottom: 8px;">
              ♟️ Bengkel Pion Khusus (Apex Extra Pion Forge)
            </h4>
            <p style="font-size: 12px; color: var(--mute); margin-bottom: 12px;">
              Tentukan petak awal bidak Pion Khusus milikmu dan pilih Pola Gerak Unik berenergi tinggi yang terbuka sesuai tingkatanmu.
            </p>

            <!-- Starting File Chooser -->
            <div style="margin-bottom: 14px; background: rgba(0,0,0,0.02); border: 1px solid var(--bd-border); border-radius: 10px; padding: 10px;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--ink); margin-bottom: 6px;">
                Petak Awal Pion Khusus:
              </label>
              <div style="display: flex; gap: 4px;">
                ${fileLabels.map((f, idx) => `
                  <button class="pion-file-btn" data-file="${idx}" style="flex: 1; padding: 6px 2px; border-radius: 6px; border: 1px solid ${selectedFile === idx ? 'var(--acc)' : 'var(--bd-border)'}; background: ${selectedFile === idx ? 'var(--acc)' : 'var(--card)'}; color: ${selectedFile === idx ? 'var(--on)' : 'var(--ink)'}; font-weight: 700; font-size: 12px; cursor: pointer;">
                    Lajur ${f.toUpperCase()}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Pattern Gallery -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
              ${EXTRA_PION_PATTERNS.map(pat => {
                const isUnlocked = curLevel >= pat.minLevel;
                const isEquipped = currentPattern.id === pat.id;
                return `
                  <div style="border: 2px solid ${isEquipped ? pat.primaryColor : 'var(--bd-border)'}; background: ${isEquipped ? 'rgba(0,0,0,0.03)' : 'var(--bg)'}; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; opacity: ${isUnlocked ? '1' : '0.6'};">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 20px;">${pat.icon}</span>
                        <div>
                          <div style="font-weight: 800; font-size: 13px; color: ${pat.primaryColor};">${pat.name}</div>
                          <div style="font-size: 10px; color: var(--mute);">${pat.title}</div>
                        </div>
                      </div>
                      ${isUnlocked ? `
                        <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(34, 197, 94, 0.15); color: #22c55e;">
                          Terbuka
                        </span>
                      ` : `
                        <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: rgba(239, 68, 68, 0.15); color: #ef4444;">
                          🔒 Lvl ${pat.minLevel}
                        </span>
                      `}
                    </div>
                    <p style="font-size: 11px; color: var(--mute); line-height: 1.3;">
                      ${pat.description}
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div style="width: 28px; height: 28px;">
                        ${getExtraPionSVG('w', this.currentTheme, pat.id)}
                      </div>
                      <button class="pion-pattern-btn" data-pid="${pat.id}" ${!isUnlocked || isEquipped ? 'disabled' : ''} style="padding: 5px 12px; border-radius: 6px; border: 1px solid ${isEquipped ? pat.primaryColor : 'var(--bd-border)'}; background: ${isEquipped ? pat.primaryColor : 'var(--card)'}; color: ${isEquipped ? '#ffffff' : 'var(--ink)'}; font-size: 11px; font-weight: 700; cursor: ${isUnlocked && !isEquipped ? 'pointer' : 'default'};">
                        ${isEquipped ? '✓ Terpasang' : isUnlocked ? 'Gunakan Pola' : `Kunci (Lvl ${pat.minLevel})`}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

          </div>

          <div style="margin-top: 20px; text-align: center;">
            <button id="btn-close-leveling-bottom" style="padding: 10px 24px; border-radius: 10px; background: var(--acc); color: var(--on); border: none; font-weight: 800; font-size: 14px; cursor: pointer;">
              Selesai &amp; Mainkan
            </button>
          </div>

        </div>
      </div>
    `;
  }

  private renderLevelUpModal(): string {
    if (!this.activeLevelUpModal) return '';
    const lvl = this.activeLevelUpModal.level;
    const title = this.activeLevelUpModal.title;
    const unlockedPattern = EXTRA_PION_PATTERNS.find(p => p.minLevel === lvl);

    return `
      <div class="levelup-backdrop">
        <div class="levelup-content">
          <div style="font-size: 48px; margin-bottom: 8px;">🎉</div>
          <h2 style="font-family: var(--font-display); font-size: 28px; font-weight: 800; color: #f59e0b; margin-bottom: 4px;">
            LEVEL UP!
          </h2>
          <div style="font-size: 18px; font-weight: 800; color: var(--ink); margin-bottom: 4px;">
            Tingkat ${lvl}: ${title.id}
          </div>
          <div style="font-size: 13px; color: var(--mute); margin-bottom: 16px;">
            ${title.en}
          </div>

          ${unlockedPattern ? `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1.5px dashed #f59e0b; border-radius: 12px; padding: 12px; margin-bottom: 18px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #f59e0b; margin-bottom: 4px;">
                ✨ Pola Pion Khusus Baru Terbuka!
              </div>
              <div style="font-size: 15px; font-weight: 800; color: var(--ink);">
                ${unlockedPattern.icon} ${unlockedPattern.name}
              </div>
              <div style="font-size: 12px; color: var(--mute);">${unlockedPattern.description}</div>
            </div>
          ` : ''}

          <button id="btn-claim-levelup" style="width: 100%; padding: 12px; border-radius: 10px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: #ffffff; border: none; font-weight: 800; font-size: 15px; cursor: pointer; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
            Klaim Hadiah &amp; Lanjutkan ➔
          </button>
        </div>
      </div>
    `;
  }

  private renderExtraPionWay(legalMove: Move, pattern: ExtraPionPattern): string {
    const isAttack = Boolean(legalMove.captured || legalMove.flags === 'ep');
    if (isAttack) {
      if (pattern.id === 'primal_claw') {
        return `
          <div class="extra-pion-strike-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-strike-svg">
              <circle cx="22" cy="22" r="19" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-dasharray="6 3" class="lock-ring-spin"/>
              <circle cx="22" cy="22" r="12" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2 3"/>
              <line x1="8" y1="8" x2="36" y2="36" stroke="#ef4444" stroke-width="3.2" stroke-linecap="round"/>
              <line x1="36" y1="8" x2="8" y2="36" stroke="#ef4444" stroke-width="3.2" stroke-linecap="round"/>
              <line x1="12" y1="6" x2="32" y2="38" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="32" y1="6" x2="12" y2="38" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round"/>
              <polygon points="22,14 26,24 22,22 18,24" fill="#fbbf24"/>
              <circle cx="22" cy="22" r="3" fill="#ffffff"/>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'hyper_warp') {
        return `
          <div class="extra-pion-strike-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-strike-svg">
              <polygon points="22,3 41,22 22,41 3,22" fill="none" stroke="#06b6d4" stroke-width="1.8" stroke-dasharray="4 2" class="lock-ring-spin"/>
              <circle cx="22" cy="22" r="15" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="5 3"/>
              <line x1="5" y1="22" x2="39" y2="22" stroke="#ef4444" stroke-width="2.5"/>
              <line x1="22" y1="5" x2="22" y2="39" stroke="#ef4444" stroke-width="2.5"/>
              <circle cx="22" cy="22" r="4" fill="#06b6d4" stroke="#ffffff" stroke-width="1"/>
              <circle cx="22" cy="22" r="1.5" fill="#ffffff"/>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'sacred_lotus') {
        return `
          <div class="extra-pion-strike-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-strike-svg">
              <circle cx="22" cy="22" r="19" fill="none" stroke="#ec4899" stroke-width="2" stroke-dasharray="4 4" class="lock-ring-spin"/>
              <g transform="translate(22, 22)">
                ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg =>
                  `<line x1="0" y1="0" x2="0" y2="-17" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" transform="rotate(${deg})"/>`
                ).join('')}
                <circle cx="0" cy="0" r="5" fill="#ec4899" stroke="#ffffff" stroke-width="1.5"/>
                <circle cx="0" cy="0" r="2" fill="#ffffff"/>
              </g>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'titan_crown') {
        return `
          <div class="extra-pion-strike-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-strike-svg">
              <circle cx="22" cy="22" r="19" fill="none" stroke="#a855f7" stroke-width="2.2" stroke-dasharray="5 2" class="lock-ring-spin"/>
              <polygon points="22,4 28,16 40,22 28,28 22,40 16,28 4,22 16,16" fill="rgba(168, 85, 247, 0.25)" stroke="#facc15" stroke-width="2"/>
              <circle cx="22" cy="22" r="4.5" fill="#a855f7" stroke="#ffffff" stroke-width="1.5"/>
              <circle cx="22" cy="22" r="2" fill="#ffffff"/>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'zeus_thunder') {
        return `
          <div class="extra-pion-strike-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-strike-svg">
              <circle cx="22" cy="22" r="19" fill="none" stroke="#facc15" stroke-width="2.2" stroke-dasharray="4 2" class="lock-ring-spin"/>
              <circle cx="22" cy="22" r="14" fill="none" stroke="#00f2fe" stroke-width="1.6" stroke-dasharray="2 3"/>
              <polygon points="12,6 20,20 16,21 28,38 20,24 24,23" fill="#00f2fe" stroke="#facc15" stroke-width="1.2"/>
              <polygon points="32,6 24,20 28,21 16,38 24,24 20,23" fill="#facc15" stroke="#00f2fe" stroke-width="1.2"/>
              <circle cx="22" cy="22" r="4" fill="#ffffff" stroke="#facc15" stroke-width="1.5"/>
              <circle cx="22" cy="22" r="1.8" fill="#00f2fe"/>
            </svg>
          </div>
        `;
      } else {
        // Ember Vanguard Attack
        return `
          <div class="extra-pion-strike-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-strike-svg">
              <circle cx="22" cy="22" r="18" fill="none" stroke="#f97316" stroke-width="2.2" stroke-dasharray="5 3" class="lock-ring-spin"/>
              <polygon points="22,6 38,22 22,38 6,22" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2"/>
              <line x1="11" y1="11" x2="33" y2="33" stroke="#f97316" stroke-width="3.2" stroke-linecap="round"/>
              <line x1="33" y1="11" x2="11" y2="33" stroke="#f97316" stroke-width="3.2" stroke-linecap="round"/>
              <circle cx="22" cy="22" r="3.5" fill="#fbbf24"/>
              <circle cx="22" cy="22" r="1.5" fill="#ffffff"/>
            </svg>
          </div>
        `;
      }
    } else {
      // Advance Waypoints per pattern
      if (pattern.id === 'primal_claw') {
        return `
          <div class="extra-pion-advance-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-advance-svg">
              <circle cx="22" cy="22" r="17" fill="rgba(234, 179, 8, 0.15)" stroke="${pattern.primaryColor}" stroke-width="2" stroke-dasharray="4 3"/>
              <path d="M15 29 Q13 20 14 11" fill="none" stroke="${pattern.primaryColor}" stroke-width="2.6" stroke-linecap="round"/>
              <path d="M22 33 Q22 22 22 8" fill="none" stroke="#ef4444" stroke-width="3.2" stroke-linecap="round"/>
              <path d="M29 29 Q31 20 30 11" fill="none" stroke="${pattern.primaryColor}" stroke-width="2.6" stroke-linecap="round"/>
              <circle cx="22" cy="22" r="3.2" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
              <circle cx="22" cy="22" r="1.4" fill="#ffffff"/>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'hyper_warp') {
        return `
          <div class="extra-pion-advance-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-advance-svg">
              <ellipse cx="22" cy="22" rx="18" ry="7" fill="none" stroke="${pattern.primaryColor}" stroke-width="1.8" stroke-dasharray="5 3" class="cosmic-gyro-spin"/>
              <ellipse cx="22" cy="22" rx="7" ry="18" fill="none" stroke="#00f2fe" stroke-width="1.4" stroke-dasharray="3 3" class="cosmic-gyro-spin"/>
              <path d="M16 28 L22 20 L28 28" fill="none" stroke="${pattern.primaryColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 33 L22 27 L26 33" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="22" cy="13" r="3.2" fill="#00f2fe" stroke="#ffffff" stroke-width="1"/>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'sacred_lotus') {
        return `
          <div class="extra-pion-advance-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-advance-svg">
              <circle cx="22" cy="22" r="17" fill="rgba(236, 72, 153, 0.15)" stroke="${pattern.primaryColor}" stroke-width="1.8" stroke-dasharray="3 3"/>
              <g transform="translate(22, 22)">
                ${[0, 60, 120, 180, 240, 300].map(deg =>
                  `<ellipse cx="0" cy="-9" rx="3" ry="6" fill="${pattern.primaryColor}" opacity="0.8" transform="rotate(${deg})"/>`
                ).join('')}
                <circle cx="0" cy="0" r="4.2" fill="#fbbf24" stroke="#ffffff" stroke-width="1.2"/>
                <circle cx="0" cy="0" r="1.8" fill="#ffffff"/>
              </g>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'titan_crown') {
        return `
          <div class="extra-pion-advance-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-advance-svg">
              <polygon points="22,5 37,22 22,39 7,22" fill="rgba(168, 85, 247, 0.18)" stroke="${pattern.primaryColor}" stroke-width="2"/>
              <path d="M15 25 L22 17 L29 25" fill="none" stroke="#facc15" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
              <polygon points="17,14 19,9 22,12 25,9 27,14" fill="#facc15"/>
              <circle cx="22" cy="22" r="3.5" fill="${pattern.primaryColor}" stroke="#ffffff" stroke-width="1"/>
            </svg>
          </div>
        `;
      } else if (pattern.id === 'zeus_thunder') {
        return `
          <div class="extra-pion-advance-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-advance-svg">
              <circle cx="22" cy="22" r="17" fill="rgba(250, 204, 21, 0.18)" stroke="#facc15" stroke-width="2" stroke-dasharray="4 2"/>
              <path d="M14 26 L22 15 L30 26" fill="none" stroke="#facc15" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
              <polygon points="22,10 26,17 22,15 18,17" fill="#00f2fe" stroke="#facc15" stroke-width="1"/>
              <circle cx="22" cy="25" r="3" fill="#00f2fe" stroke="#ffffff" stroke-width="1"/>
            </svg>
          </div>
        `;
      } else {
        // Ember Vanguard Advance
        return `
          <div class="extra-pion-advance-matrix" style="--pion-color: ${pattern.primaryColor};">
            <svg viewBox="0 0 44 44" class="extra-pion-advance-svg">
              <circle cx="22" cy="22" r="17" fill="rgba(249, 115, 22, 0.15)" stroke="${pattern.primaryColor}" stroke-width="1.8" stroke-dasharray="4 2"/>
              <path d="M15 27 L22 18 L29 27" fill="none" stroke="${pattern.primaryColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M17 32 L22 26 L27 32" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="22" cy="12" r="3.5" fill="#fbbf24" stroke="#ffffff" stroke-width="1.2"/>
              <circle cx="22" cy="12" r="1.5" fill="#ffffff"/>
            </svg>
          </div>
        `;
      }
    }
  }

  private bindGameEvents(): void {
    // Square clicks
    document.querySelectorAll('.square').forEach(sqEl => {
      sqEl.addEventListener('click', (e) => {
        const sq = parseInt((e.currentTarget as HTMLElement).dataset.sq || '-1', 10);
        if (sq >= 0) this.handleSquareClick(sq);
      });
    });

    // Theme segmented control
    document.getElementById('sg-flower')?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('flower');
    });

    document.getElementById('sg-war')?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('war');
    });

    document.getElementById('sg-beast')?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('beast');
    });

    document.getElementById('sg-greek')?.addEventListener('click', () => {
      audio.play('ui');
      this.applyTheme('greek');
    });

    // Back to landing
    document.getElementById('btn-back-landing')?.addEventListener('click', () => {
      audio.play('ui');
      this.currentScreen = 'landing';
      this.render();
    });

    // Flip board
    document.getElementById('btn-flip')?.addEventListener('click', () => {
      this.isFlipped = !this.isFlipped;
      audio.play('ui');
      this.render();
    });

    // Undo move
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      if (this.currentMode === 'ai') {
        // Undo AI move and player move
        this.engine.undoMove();
        this.engine.undoMove();
        audio.play('ui');
        this.render();
      } else if (this.currentMode === 'p2p') {
        p2p.send({ type: 'takeback_request' });
        this.showToast('Takeback request sent to opponent...');
      } else {
        this.engine.undoMove();
        audio.play('ui');
        this.render();
      }
    });

    // Resign
    document.getElementById('btn-resign')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to resign? / Yakin ingin menyerah?')) {
        this.engine.resign(this.playerColor);
        if (this.currentMode === 'p2p') p2p.send({ type: 'resign' });
        this.stopTimer();
        audio.play('defeat');
        this.render();
      }
    });

    // Draw offer
    document.getElementById('btn-draw')?.addEventListener('click', () => {
      if (this.currentMode === 'ai') {
        this.showToast('The AI declined your draw offer.');
      } else if (this.currentMode === 'p2p') {
        p2p.send({ type: 'draw_offer' });
        this.showToast('Draw offer sent to opponent...');
      } else {
        if (confirm('Both players agree to a draw? / Kedua pemain setuju remis?')) {
          this.engine.claimDraw('Agreed Draw');
          this.stopTimer();
          audio.play('stalemate');
          this.render();
        }
      }
    });

    // Audio & Theme toggles
    document.getElementById('btn-toggle-music')?.addEventListener('click', () => {
      audio.initOnGesture();
      const on = audio.toggleMusic();
      this.showToast(on ? `🎵 Musik: ${audio.getCurrentTrack().name}` : '🔇 Musik Dimatikan (Music Off)');
      this.render();
    });

    document.getElementById('btn-track-menu')?.addEventListener('click', () => {
      audio.initOnGesture();
      this.showTrackPickerModal();
    });

    document.getElementById('btn-toggle-audio')?.addEventListener('click', () => {
      audio.toggleMute();
      this.render();
    });

    document.getElementById('btn-dark-toggle')?.addEventListener('click', () => {
      this.toggleDarkMode();
    });

    // Rain / particle effect ("Send petals" or "Send flares")
    document.getElementById('btn-rain-effect')?.addEventListener('click', () => {
      audio.play('ui');
      this.triggerRainParticles();
    });

    // Move step navigation
    document.querySelectorAll('.move-step').forEach(stepEl => {
      stepEl.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx || '-1', 10);
        this.currentViewIndex = idx;
        audio.play('select');
        this.render();
      });
    });

    document.getElementById('nav-first')?.addEventListener('click', () => {
      if (this.engine.history.length > 0) {
        this.currentViewIndex = 0;
        this.render();
      }
    });

    document.getElementById('nav-prev')?.addEventListener('click', () => {
      if (this.currentViewIndex === -1) {
        this.currentViewIndex = Math.max(0, this.engine.history.length - 2);
      } else {
        this.currentViewIndex = Math.max(0, this.currentViewIndex - 1);
      }
      this.render();
    });

    document.getElementById('nav-next')?.addEventListener('click', () => {
      if (this.currentViewIndex !== -1) {
        if (this.currentViewIndex >= this.engine.history.length - 1) {
          this.currentViewIndex = -1;
        } else {
          this.currentViewIndex++;
        }
        this.render();
      }
    });

    document.getElementById('nav-last')?.addEventListener('click', () => {
      this.currentViewIndex = -1;
      this.render();
    });

    // Export FEN / PGN
    document.getElementById('btn-export-fen')?.addEventListener('click', () => {
      const fen = this.engine.getFEN();
      navigator.clipboard.writeText(fen);
      this.showToast('FEN copied to clipboard!');
    });

    document.getElementById('btn-export-pgn')?.addEventListener('click', () => {
      const pgn = this.engine.exportPGN();
      navigator.clipboard.writeText(pgn);
      this.showToast('PGN copied to clipboard!');
    });

    document.getElementById('btn-import-fen')?.addEventListener('click', () => {
      const input = prompt('Paste FEN string or PGN:');
      if (input && input.trim()) {
        try {
          this.engine.reset(input.trim());
          this.showToast('Position loaded successfully!');
          this.render();
        } catch {
          alert('Invalid FEN format.');
        }
      }
    });

    // Promotion Choice
    document.querySelectorAll('.promo-choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).dataset.type as PieceType;
        if (this.pendingPromotionMove) {
          const move = this.engine.getLegalMoves(this.engine.state.turn).find(m =>
            m.from === this.pendingPromotionMove!.from &&
            m.to === this.pendingPromotionMove!.to &&
            m.promotion === type
          );
          if (move) {
            this.executeMove(move);
          }
        }
      });
    });

    document.getElementById('btn-cancel-promo')?.addEventListener('click', () => {
      this.pendingPromotionMove = null;
      this.render();
    });

    // Game Over Rematch
    document.getElementById('btn-rematch-modal')?.addEventListener('click', () => {
      if (this.currentMode === 'p2p') p2p.send({ type: 'rematch' });
      this.startNewGame();
    });

    document.getElementById('btn-menu-modal')?.addEventListener('click', () => {
      this.currentScreen = 'landing';
      this.render();
    });

    // P2P Emotes modal
    document.getElementById('btn-emotes')?.addEventListener('click', () => {
      this.showEmotesModal();
    });

    // P2P Room modals
    document.getElementById('btn-room-badge')?.addEventListener('click', () => {
      this.showRoomInfoModal();
    });

    document.getElementById('btn-room-info')?.addEventListener('click', () => {
      this.showRoomInfoModal();
    });

    document.getElementById('btn-p2p-info')?.addEventListener('click', () => {
      this.showRoomInfoModal();
    });

    // Settings modal
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Leveling & Quests Modal triggers
    document.getElementById('btn-open-leveling')?.addEventListener('click', () => {
      audio.play('ui');
      this.showLevelingModal = true;
      this.render();
    });

    document.getElementById('btn-open-quests-modal')?.addEventListener('click', () => {
      audio.play('ui');
      this.showLevelingModal = true;
      this.render();
    });

    // Leveling Modal Internal Controls
    document.getElementById('btn-close-leveling-modal')?.addEventListener('click', () => {
      this.showLevelingModal = false;
      this.render();
    });

    document.getElementById('btn-close-leveling-bottom')?.addEventListener('click', () => {
      this.showLevelingModal = false;
      this.render();
    });

    document.getElementById('btn-reroll-quests')?.addEventListener('click', () => {
      progression.rerollTasks();
      audio.play('ui');
      this.showToast('🎲 3 Misi acak diperbarui!');
      this.render();
    });

    document.querySelectorAll('.pion-file-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const file = parseInt((e.currentTarget as HTMLElement).dataset.file || '3', 10);
        progression.setSelectedFile(file);
        audio.play('ui');
        this.render();
      });
    });

    document.querySelectorAll('.pion-pattern-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const patId = (e.currentTarget as HTMLElement).dataset.pid;
        if (patId) {
          progression.setSelectedPattern(patId);
          audio.playExtraPionSelect();
          this.showToast(`Pola Pion Khusus dipilih: ${progression.getSelectedPattern().name}`);
          this.render();
        }
      });
    });

    // Level Up Modal Internal Claim Button
    document.getElementById('btn-claim-levelup')?.addEventListener('click', () => {
      this.activeLevelUpModal = null;
      this.render();
    });
  }

  private triggerRainParticles(): void {
    const isFlower = this.currentTheme === 'flower';
    const isBeast = this.currentTheme === 'beast';
    if (isBeast) {
      audio.play('capture'); // Savage roar
    }
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      const startX = Math.random() * window.innerWidth;
      const bg = isFlower ? '#f08cb0' : (isBeast ? (i % 2 === 0 ? '#f59e0b' : '#ef4444') : '#0fb5a8');
      const borderRadius = isFlower ? '50% 50% 50% 0' : (isBeast ? '4px' : '2px');
      p.style.cssText = `
        position: fixed;
        top: -30px;
        left: ${startX}px;
        width: ${isFlower ? '14px' : (isBeast ? '12px' : '10px')};
        height: ${isFlower ? '18px' : (isBeast ? '12px' : '10px')};
        background: ${bg};
        border-radius: ${borderRadius};
        opacity: 0.85;
        box-shadow: ${isBeast ? '0 0 10px #f59e0b' : 'none'};
        z-index: 99999;
        pointer-events: none;
        transform: rotate(${Math.random() * 360}deg);
        transition: transform 2.5s cubic-bezier(0.25, 1, 0.5, 1), top 2.5s linear, opacity 2.5s ease-out;
      `;
      document.body.appendChild(p);

      setTimeout(() => {
        p.style.top = `${window.innerHeight + 50}px`;
        p.style.transform = `translateX(${(Math.random() - 0.5) * 120}px) rotate(${Math.random() * 720}deg)`;
        p.style.opacity = '0';
      }, 20);

      setTimeout(() => p.remove(), 2600);
    }
  }

  private showEmotesModal(): void {
    const emotes = ['Good game! 🤝', 'Nice move! 👏', 'Oops! 😅', 'Thinking... ⏳', 'Resign? 🏳️', 'Check! ⚡'];
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 99999;
    `;
    modal.innerHTML = `
      <div style="background: var(--card); border: 2px solid var(--acc); border-radius: 14px; padding: 20px; max-width: 320px; width: 90%;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px;">Preset Emotes • Kirim Pesan</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px;">
          ${emotes.map(em => `
            <button class="emote-pick" data-em="${em}" style="padding: 10px; border-radius: 8px; border: 1px solid var(--bd-border); background: var(--card); font-weight: 600; font-size: 13px; cursor: pointer;">
              ${em}
            </button>
          `).join('')}
        </div>
        <button id="close-emotes" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--bd-border); background: transparent; cursor: pointer;">Close</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll('.emote-pick').forEach(b => {
      b.addEventListener('click', (e) => {
        const em = (e.currentTarget as HTMLElement).dataset.em;
        if (em) {
          p2p.send({ type: 'emote', emote: em });
          this.showToast(`You: ${em}`);
        }
        modal.remove();
      });
    });

    modal.querySelector('#close-emotes')?.addEventListener('click', () => modal.remove());
  }

  public showRoomInfoModal(): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 99999;
    `;
    const shareUrl = p2p.getShareUrl();
    modal.innerHTML = `
      <div style="background: var(--card); border: 2px solid var(--acc); border-radius: 16px; padding: 22px; max-width: 440px; width: 92%; box-shadow: 0 16px 36px var(--sh);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-family: var(--font-display); font-size: 20px; font-weight: 800; color: var(--ink); margin: 0;">
            🌐 Room Multiplayer
          </h3>
          <span style="font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: ${p2p.connected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; color: ${p2p.connected ? '#22c55e' : '#f59e0b'}; display: flex; align-items: center; gap: 6px;">
            <span class="radar-dot ${p2p.connected ? 'connected' : 'waiting'}"></span>
            ${p2p.connected ? 'Terhubung (Online)' : 'Menunggu Lawan'}
          </span>
        </div>

        <div style="background: rgba(0,0,0,0.03); border: 1px solid var(--bd-border); border-radius: 12px; padding: 14px; margin-bottom: 16px; text-align: center;">
          <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--mute); display: block; margin-bottom: 6px;">
            Kode Room (Room Code)
          </label>
          <div class="room-code-tag" style="font-size: 22px; margin-bottom: 12px;">
            ${p2p.roomCode || 'CLASH-XXXX'}
          </div>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button id="modal-copy-code" style="padding: 8px 14px; border-radius: 8px; background: var(--acc); color: var(--on); border: none; font-weight: 700; font-size: 13px; cursor: pointer;">
              📋 Salin Kode
            </button>
            <button id="modal-copy-link" style="padding: 8px 14px; border-radius: 8px; background: var(--bg); color: var(--ink); border: 1px solid var(--bd-border); font-weight: 700; font-size: 13px; cursor: pointer;">
              🔗 Salin Link Join
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--mute); margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Peran kamu:</span>
            <strong style="color: var(--ink);">${p2p.isHost ? 'Host (Pembuat Room)' : 'Guest (Tamu)'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Warna pion kamu:</span>
            <strong style="color: var(--ink);">${p2p.myColor === 'w' ? '⚪ Putih (White)' : '⚫ Hitam (Black)'}</strong>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="modal-leave-room" style="flex: 1; padding: 10px; border-radius: 8px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; font-weight: 700; cursor: pointer;">
            🚪 Keluar Room
          </button>
          <button id="modal-close-room" style="flex: 1; padding: 10px; border-radius: 8px; background: var(--acc); color: var(--on); border: none; font-weight: 700; cursor: pointer;">
            Tutup (Close)
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#modal-copy-code')?.addEventListener('click', () => {
      if (p2p.roomCode) {
        navigator.clipboard.writeText(p2p.roomCode);
        this.showToast('📋 Kode Room disalin!');
      }
    });

    modal.querySelector('#modal-copy-link')?.addEventListener('click', () => {
      if (shareUrl) {
        navigator.clipboard.writeText(shareUrl);
        this.showToast('🔗 Link bergabung disalin!');
      }
    });

    modal.querySelector('#modal-leave-room')?.addEventListener('click', () => {
      if (confirm('Yakin ingin keluar dari Room? Pertandingan akan dihentikan.')) {
        p2p.leaveRoom();
        modal.remove();
        this.currentScreen = 'landing';
        this.render();
      }
    });

    modal.querySelector('#modal-close-room')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  private showP2PModal(): void {
    this.showRoomInfoModal();
  }

  public triggerCaptureEffect(square: number, pieceType: PieceType, pieceColor: PieceColor): void {
    const squareEl = document.querySelector(`.square[data-sq="${square}"]`);
    if (!squareEl) return;

    if (this.currentTheme === 'flower') {
      const isTakingPawn = pieceType === 'p';

      if (isTakingPawn) {
        // ========================================================
        // BOTANICAL AMBUSH EFFECT (WHEN TAKING PION IN FLOWER MODE)
        // ========================================================
        // 1. Play Ambush Sound FX (Thorny rustle + trap snap + chime bloom)
        audio.play('ambush');

        // 2. Screen Emerald & Rose Floral Ambush Flash Vignette
        const ambushVignette = document.createElement('div');
        ambushVignette.className = 'flower-ambush-vignette';
        document.body.appendChild(ambushVignette);
        setTimeout(() => ambushVignette.remove(), 550);

        // 3. Carnivorous Plant Trap Jaws Clamping Shut on the Square
        const trapContainer = document.createElement('div');
        trapContainer.className = 'ambush-trap-container';
        trapContainer.innerHTML = `
          <svg viewBox="0 0 50 50" class="ambush-trap-svg">
            <!-- Upper Carnivorous Thorn Jaw -->
            <path d="M5 25 Q25 4 45 25 Q35 20 25 21 Q15 20 5 25 Z" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.8"/>
            <!-- Upper Sharp Thorn Fangs -->
            <polygon points="12,24 14,31 16,24" fill="#a5d6a7"/>
            <polygon points="20,22 22,33 24,22" fill="#a5d6a7"/>
            <polygon points="28,22 30,33 32,22" fill="#a5d6a7"/>
            <polygon points="36,24 38,31 40,24" fill="#a5d6a7"/>
            <!-- Lower Carnivorous Thorn Jaw -->
            <path d="M5 25 Q25 46 45 25 Q35 30 25 29 Q15 30 5 25 Z" fill="#1b5e20" stroke="#0d3810" stroke-width="1.8"/>
            <!-- Lower Sharp Thorn Fangs -->
            <polygon points="16,26 18,18 20,26" fill="#a5d6a7"/>
            <polygon points="24,27 26,16 28,27" fill="#a5d6a7"/>
            <polygon points="32,26 34,18 36,26" fill="#a5d6a7"/>
            <!-- Trap Energy Core Glow -->
            <circle cx="25" cy="25" r="4.5" fill="#ffd96b" opacity="0.8"/>
          </svg>
        `;
        squareEl.appendChild(trapContainer);
        setTimeout(() => trapContainer.remove(), 750);

        // 4. Entangling Whipping Thorny Vines
        for (let i = 0; i < 8; i++) {
          const vine = document.createElement('div');
          vine.className = 'ambush-vine';
          const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
          const dist = 36 + Math.random() * 32;
          vine.style.setProperty('--rot', `${(angle * 180) / Math.PI}deg`);
          vine.style.setProperty('--vx', `${Math.cos(angle) * dist}px`);
          vine.style.setProperty('--vy', `${Math.sin(angle) * dist}px`);
          vine.style.left = '50%';
          vine.style.top = '50%';
          vine.innerHTML = `
            <svg width="26" height="26" viewBox="0 0 30 30">
              <path d="M2 15 Q15 6 28 15 Q20 22 15 17 Q10 24 2 15 Z" fill="#388e3c" stroke="#1b5e20" stroke-width="1.2"/>
              <polygon points="12,12 16,6 18,14" fill="#81c784"/>
            </svg>
          `;
          squareEl.appendChild(vine);
          setTimeout(() => vine.remove(), 850);
        }

        // 5. Luminescent Pollen & Spore Explosion Cloud
        for (let i = 0; i < 10; i++) {
          const spore = document.createElement('div');
          spore.className = 'ambush-spore';
          const angle = Math.random() * Math.PI * 2;
          const dist = 30 + Math.random() * 45;
          spore.style.setProperty('--sx', `${Math.cos(angle) * dist}px`);
          spore.style.setProperty('--sy', `${Math.sin(angle) * dist}px`);
          const colors = ['#ffd96b', '#69f0ae', '#ff80ab', '#b9f6ca'];
          const col = colors[i % colors.length];
          spore.style.background = col;
          spore.style.setProperty('--spore-glow', col);
          spore.style.left = '50%';
          spore.style.top = '50%';
          squareEl.appendChild(spore);
          setTimeout(() => spore.remove(), 900);
        }

        // 6. Floating Ambush Banner Alert
        const banner = document.createElement('div');
        banner.className = 'ambush-banner';
        banner.textContent = '🌿 BOTANICAL AMBUSH! 🌸';
        squareEl.appendChild(banner);
        setTimeout(() => banner.remove(), 1300);
      }

      // Soft green life ring pulses once from square
      const ring = document.createElement('div');
      ring.className = 'life-ring';
      squareEl.appendChild(ring);
      setTimeout(() => ring.remove(), 1200);

      // 7 botanical petals detach and sway/drift downward staggered
      const isWhite = pieceColor === 'w';
      const petalFill = isWhite ? '#f6adc4' : '#a38ddf';
      const petalStroke = isWhite ? '#a93457' : '#3e2d7a';

      for (let i = 0; i < 7; i++) {
        const petal = document.createElement('div');
        petal.className = 'capture-petal-particle';
        const angle = (Math.PI * 2 * i) / 7;
        const dist = 32 + Math.random() * 45;
        petal.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        petal.style.setProperty('--dy', `${Math.abs(Math.sin(angle) * dist) + 35}px`);
        petal.style.left = '50%';
        petal.style.top = '50%';
        petal.style.animationDelay = `${i * 120}ms`;
        petal.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M12 2 C6 8 6 16 12 22 C18 16 18 8 12 2 Z" fill="${petalFill}" stroke="${petalStroke}" stroke-width="1.5" />
          </svg>
        `;
        squareEl.appendChild(petal);
        setTimeout(() => petal.remove(), 2100);
      }
    } else if (this.currentTheme === 'beast') {
      // Beast capture effect: Savage Claw Slash & Ember Sparks
      // 1. Savage screen vignette flash
      const vignette = document.createElement('div');
      vignette.className = 'beast-screen-vignette';
      document.body.appendChild(vignette);
      setTimeout(() => vignette.remove(), 360);

      // 2. Board micro-shake
      const boardEl = document.querySelector('.board-container');
      if (boardEl) {
        boardEl.classList.add('board-microshake');
        setTimeout(() => boardEl.classList.remove('board-microshake'), 220);
      }

      // 3. Attack Strike Mark on square (Crushing Punch for Gorilla, Razor Claw Strike for others)
      const clawContainer = document.createElement('div');
      clawContainer.className = 'beast-capture-claw';
      if (pieceType === 'r') {
        clawContainer.innerHTML = `
          <svg viewBox="0 0 50 50" class="beast-claw-strike-svg">
            <circle cx="25" cy="25" r="22" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="6 3"/>
            <circle cx="25" cy="25" r="14" fill="none" stroke="#f59e0b" stroke-width="1.8"/>
            <rect x="14" y="16" width="22" height="18" rx="5" fill="#78350f" stroke="#ef4444" stroke-width="2"/>
            <line x1="19" y1="16" x2="19" y2="26" stroke="#f59e0b" stroke-width="2"/>
            <line x1="25" y1="16" x2="25" y2="26" stroke="#f59e0b" stroke-width="2"/>
            <line x1="31" y1="16" x2="31" y2="26" stroke="#f59e0b" stroke-width="2"/>
          </svg>
        `;
      } else {
        clawContainer.innerHTML = `
          <svg viewBox="0 0 50 50" class="beast-claw-strike-svg">
            <line x1="6" y1="12" x2="38" y2="40" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="14" y1="6" x2="44" y2="34" stroke="#ef4444" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="4" y1="20" x2="32" y2="46" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
            <line x1="6" y1="12" x2="38" y2="40" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="14" y1="6" x2="44" y2="34" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="4" y1="20" x2="32" y2="46" stroke="#fef08a" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        `;
      }
      squareEl.appendChild(clawContainer);
      setTimeout(() => clawContainer.remove(), 700);

      // 4. 8 flying ember claw sparks
      for (let i = 0; i < 8; i++) {
        const spark = document.createElement('div');
        spark.className = 'beast-claw-spark';
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
        const dist = 35 + Math.random() * 35;
        spark.style.setProperty('--bx', `${Math.cos(angle) * dist}px`);
        spark.style.setProperty('--by', `${Math.sin(angle) * dist}px`);
        spark.style.left = '50%';
        spark.style.top = '50%';
        squareEl.appendChild(spark);
        setTimeout(() => spark.remove(), 650);
      }

      // 5. Floating Beast Combat Banner Alert
      const beastBanner = document.createElement('div');
      beastBanner.className = 'beast-combat-banner';
      if (pieceType === 'r') {
        beastBanner.textContent = '🦍 CRUSHING GORILLA PUNCH! 💥';
      } else if (pieceType === 'n') {
        beastBanner.textContent = '🐆 PANTHER CLAW POUNCE! ⚡';
      } else if (pieceType === 'b') {
        beastBanner.textContent = '🦅 FALCON TALON DIVE! 🌪️';
      } else if (pieceType === 'q') {
        beastBanner.textContent = '🐅 SAVAGE TIGRESS SHRED! 🩸';
      } else if (pieceType === 'k') {
        beastBanner.textContent = '🦁 APEX LION ROAR! 👑';
      } else {
        beastBanner.textContent = '🐺 DIRE WOLF PACK AMBUSH! 🐾';
      }
      squareEl.appendChild(beastBanner);
      setTimeout(() => beastBanner.remove(), 1200);
    } else {
      // 1. War explosion: bright shockwave ring
      const shockwave = document.createElement('div');
      shockwave.className = 'shockwave-ring';
      squareEl.appendChild(shockwave);
      setTimeout(() => shockwave.remove(), 1100);

      // 2. Board micro-shake
      const boardEl = document.querySelector('.board-container');
      if (boardEl) {
        boardEl.classList.add('board-microshake');
        setTimeout(() => boardEl.classList.remove('board-microshake'), 200);
      }

      // 3. Teal screen vignette flash
      const vignette = document.createElement('div');
      vignette.className = 'teal-vignette';
      document.body.appendChild(vignette);
      setTimeout(() => vignette.remove(), 260);

      // 4. 8 mechanical polygon shards flying outward with fast spin
      for (let i = 0; i < 8; i++) {
        const shard = document.createElement('div');
        shard.className = 'capture-war-shard';
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.35;
        const dist = 55 + Math.random() * 55;
        shard.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        shard.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
        shard.style.left = '50%';
        shard.style.top = '50%';
        const isCyan = i % 2 === 0;
        shard.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 20 20">
            <polygon points="10,2 18,18 2,16" fill="${isCyan ? '#19d3c5' : '#ffb020'}" stroke="#1b1c4e" stroke-width="1.5" />
          </svg>
        `;
        squareEl.appendChild(shard);
        setTimeout(() => shard.remove(), 1000);
      }
    }
  }

  public showTrackPickerModal(): void {
    const tracks = THEME_TRACKS[this.currentTheme];
    const current = audio.getCurrentTrack();
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 99999;
    `;
    modal.innerHTML = `
      <div style="background: var(--card); border: 2px solid var(--acc); border-radius: 16px; padding: 22px; max-width: 420px; width: 92%; box-shadow: 0 16px 36px var(--sh);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--ink);">
            🎵 Pilih Lagu Tema • Theme Music
          </h3>
          <button id="modal-toggle-bgm" style="padding: 5px 12px; border-radius: 6px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; background: ${audio.isMusicActive() ? 'var(--acc)' : 'var(--bd-border)'}; color: ${audio.isMusicActive() ? 'var(--on)' : 'var(--ink)'};">
            ${audio.isMusicActive() ? '✓ Nyala (ON)' : '✕ Mati (OFF)'}
          </button>
        </div>
        <p style="font-size: 12px; color: var(--mute); margin-bottom: 14px;">
          Lagu prosedural yang dibuat khusus untuk dunia <strong>${this.currentTheme === 'flower' ? 'Pion en Fleur' : (this.currentTheme === 'beast' ? 'Primal Beasts' : 'Kessler Armory')}</strong>:
        </p>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px;">
          ${tracks.map(t => {
            const isSelected = current.id === t.id;
            return `
              <button class="track-select-item" data-tid="${t.id}" style="padding: 12px; border-radius: 10px; border: 2px solid ${isSelected ? 'var(--acc)' : 'var(--bd-border)'}; background: ${isSelected ? 'rgba(207, 63, 119, 0.08)' : 'var(--card)'}; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all 0.15s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 800; font-size: 14px; color: ${isSelected ? 'var(--acc)' : 'var(--ink)'};">
                    ${isSelected ? '▶ ' : '  '}${t.name}
                  </span>
                  <span style="font-size: 11px; font-weight: 700; color: var(--mute);">
                    ${t.subname}
                  </span>
                </div>
                <div style="font-size: 11px; color: var(--mute);">
                  ${t.description}
                </div>
              </button>
            `;
          }).join('')}
        </div>

        <button id="close-track-modal" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--acc); color: var(--on); border: none; font-weight: 700; cursor: pointer;">
          Selesai (Done)
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#modal-toggle-bgm')?.addEventListener('click', () => {
      audio.toggleMusic();
      const btn = modal.querySelector('#modal-toggle-bgm') as HTMLButtonElement;
      if (btn) {
        btn.textContent = audio.isMusicActive() ? '✓ Nyala (ON)' : '✕ Mati (OFF)';
        btn.style.background = audio.isMusicActive() ? 'var(--acc)' : 'var(--bd-border)';
        btn.style.color = audio.isMusicActive() ? 'var(--on)' : 'var(--ink)';
      }
      this.render();
    });

    modal.querySelectorAll('.track-select-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tid = (e.currentTarget as HTMLElement).dataset.tid;
        if (tid) {
          audio.selectTrack(tid);
          audio.play('ui');
          this.showToast(`Lagu dipilih: ${audio.getCurrentTrack().name}`);
          modal.remove();
          this.render();
        }
      });
    });

    modal.querySelector('#close-track-modal')?.addEventListener('click', () => {
      modal.remove();
    });
  }

  private showSettingsModal(): void {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 99999;
    `;
    const tracks = THEME_TRACKS[this.currentTheme];
    const currentTrack = audio.getCurrentTrack();

    modal.innerHTML = `
      <div style="background: var(--card); border: 2px solid var(--acc); border-radius: 16px; padding: 22px; max-width: 400px; width: 90%; max-height: 90vh; overflow-y: auto;">
        <h3 style="font-family: var(--font-display); font-size: 20px; font-weight: 800; margin-bottom: 16px;">
          ⚙️ Settings • Pengaturan
        </h3>

        <!-- BGM / Theme Music Settings -->
        <div style="padding: 12px; background: rgba(0,0,0,0.03); border: 1px solid var(--bd-border); border-radius: 10px; margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 700; color: var(--acc); margin-bottom: 8px;">
            🎵 Background Music • Musik Tema
          </div>
          
          <label style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; margin-bottom: 10px; cursor: pointer;">
            <span>Nyalakan Musik (Music On)</span>
            <input type="checkbox" id="set-music-on" ${audio.getMusicEnabled() ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--acc);" />
          </label>

          <div style="margin-bottom: 6px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--mute); margin-bottom: 4px;">
              Pilihan Lagu (${this.currentTheme === 'flower' ? '🌸 Flower' : (this.currentTheme === 'beast' ? '🦁 Beast' : (this.currentTheme === 'greek' ? '⚡ Olympus' : '⚙️ War'))}):
            </label>
            <select id="set-track-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--bg); color: var(--ink); font-weight: 600; font-size: 13px;">
              ${tracks.map(t => `
                <option value="${t.id}" ${currentTrack.id === t.id ? 'selected' : ''}>
                  ${t.name} (${t.subname})
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
          <label style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600;">
            <span>Board Coordinates</span>
            <input type="checkbox" id="set-coords" ${this.showCoordinates ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--acc);" />
          </label>

          <label style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600;">
            <span>Move Hints (Dots & Rings)</span>
            <input type="checkbox" id="set-hints" ${this.showHints ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--acc);" />
          </label>

          <label style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600;">
            <span>Auto-Promote to Queen</span>
            <input type="checkbox" id="set-autopromo" ${this.autoPromoteQueen ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--acc);" />
          </label>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600;">
            <span>Master Volume</span>
            <button id="set-vol-cycle" style="padding: 4px 12px; border-radius: 6px; border: 1px solid var(--bd-border); background: var(--bg); color: var(--ink); font-weight: 700; cursor: pointer;">
              ${audio.getVolume().toUpperCase()}
            </button>
          </div>
        </div>

        <button id="close-settings" style="width: 100%; padding: 10px; border-radius: 8px; background: var(--acc); color: var(--on); border: none; font-weight: 700; cursor: pointer;">
          Save & Close
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#set-vol-cycle')?.addEventListener('click', () => {
      const v = audio.cycleVolume();
      const btn = modal.querySelector('#set-vol-cycle');
      if (btn) btn.textContent = v.toUpperCase();
    });

    modal.querySelector('#set-track-select')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      audio.selectTrack(val);
    });

    modal.querySelector('#close-settings')?.addEventListener('click', () => {
      const coords = modal.querySelector('#set-coords') as HTMLInputElement;
      const hints = modal.querySelector('#set-hints') as HTMLInputElement;
      const autoP = modal.querySelector('#set-autopromo') as HTMLInputElement;
      const musicOn = modal.querySelector('#set-music-on') as HTMLInputElement;

      if (coords) this.showCoordinates = coords.checked;
      if (hints) this.showHints = hints.checked;
      if (autoP) this.autoPromoteQueen = autoP.checked;
      if (musicOn) audio.setMusicEnabled(musicOn.checked);

      this.savePreferences();
      modal.remove();
      this.render();
    });
  }
}
