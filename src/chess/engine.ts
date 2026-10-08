import { Piece, PieceColor, PieceType, Move, PositionState, CastlingRights, GameResult } from './types';

export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function squareToCoords(sq: number): { file: number; rank: number } {
  return { file: sq % 8, rank: Math.floor(sq / 8) };
}

export function coordsToSquare(file: number, rank: number): number {
  return rank * 8 + file;
}

export function squareToAlgebraic(sq: number): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + (sq % 8));
  const rank = 8 - Math.floor(sq / 8);
  return `${file}${rank}`;
}

export function algebraicToSquare(alg: string): number {
  if (alg.length < 2) return -1;
  const file = alg.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(alg[1], 10);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return -1;
  return rank * 8 + file;
}

export class ChessEngine {
  public state: PositionState;
  public history: { move: Move; state: PositionState; fen: string }[] = [];
  public positionCounts: Map<string, number> = new Map();
  public result: GameResult = 'in_progress';
  public winner: PieceColor | null = null;
  public resultReason: string = '';

  constructor(fen: string = INITIAL_FEN) {
    this.state = this.parseFEN(fen);
    this.recordPosition();
  }

  public clone(): ChessEngine {
    const copy = new ChessEngine(this.getFEN());
    copy.result = this.result;
    copy.winner = this.winner;
    copy.resultReason = this.resultReason;
    copy.positionCounts = new Map(this.positionCounts);
    return copy;
  }

  public reset(fen: string = INITIAL_FEN): void {
    this.state = this.parseFEN(fen);
    this.history = [];
    this.positionCounts.clear();
    this.result = 'in_progress';
    this.winner = null;
    this.resultReason = '';
    this.recordPosition();
  }

  public parseFEN(fen: string): PositionState {
    const parts = fen.trim().split(/\s+/);
    const piecePart = parts[0] || '8/8/8/8/8/8/8/8';
    const turnPart = parts[1] || 'w';
    const castlingPart = parts[2] || '-';
    const epPart = parts[3] || '-';
    const halfmovePart = parts[4] || '0';
    const fullmovePart = parts[5] || '1';

    const board: (Piece | null)[] = new Array(64).fill(null);
    const rows = piecePart.split('/');
    for (let r = 0; r < 8; r++) {
      const row = rows[r] || '8';
      let c = 0;
      for (const char of row) {
        if (char >= '1' && char <= '8') {
          c += parseInt(char, 10);
        } else {
          const isWhite = char === char.toUpperCase();
          const type = char.toLowerCase() as PieceType;
          const color: PieceColor = isWhite ? 'w' : 'b';
          const sq = r * 8 + c;
          let moved = true;
          // Heuristic initial position moved status
          if ((color === 'w' && r === 7 && (type === 'r' || type === 'k')) ||
              (color === 'b' && r === 0 && (type === 'r' || type === 'k'))) {
            moved = false;
          }
          board[sq] = { type, color, square: sq, moved };
          c++;
        }
      }
    }

    const castling: CastlingRights = {
      wK: castlingPart.includes('K'),
      wQ: castlingPart.includes('Q'),
      bK: castlingPart.includes('k'),
      bQ: castlingPart.includes('q')
    };

    let enPassant: number | null = null;
    if (epPart !== '-') {
      enPassant = algebraicToSquare(epPart);
    }

    return {
      board,
      turn: turnPart === 'b' ? 'b' : 'w',
      castling,
      enPassant,
      halfmove: parseInt(halfmovePart, 10) || 0,
      fullmove: parseInt(fullmovePart, 10) || 1
    };
  }

  public getFEN(state: PositionState = this.state): string {
    const rows: string[] = [];
    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const p = state.board[r * 8 + c];
        if (!p) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          const char = p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
          rowStr += char;
        }
      }
      if (emptyCount > 0) rowStr += emptyCount;
      rows.push(rowStr);
    }

    let castlingStr = '';
    if (state.castling.wK) castlingStr += 'K';
    if (state.castling.wQ) castlingStr += 'Q';
    if (state.castling.bK) castlingStr += 'k';
    if (state.castling.bQ) castlingStr += 'q';
    if (!castlingStr) castlingStr = '-';

    const epStr = state.enPassant !== null ? squareToAlgebraic(state.enPassant) : '-';

    return `${rows.join('/')} ${state.turn} ${castlingStr} ${epStr} ${state.halfmove} ${state.fullmove}`;
  }

  public getPositionKey(state: PositionState = this.state): string {
    // Position key for threefold repetition (piece positions, turn, castling, en passant)
    const rows: string[] = [];
    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const p = state.board[r * 8 + c];
        if (!p) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          rowStr += p.color === 'w' ? p.type.toUpperCase() : p.type.toLowerCase();
        }
      }
      if (emptyCount > 0) rowStr += emptyCount;
      rows.push(rowStr);
    }
    let castlingStr = '';
    if (state.castling.wK) castlingStr += 'K';
    if (state.castling.wQ) castlingStr += 'Q';
    if (state.castling.bK) castlingStr += 'k';
    if (state.castling.bQ) castlingStr += 'q';
    const epStr = state.enPassant !== null ? squareToAlgebraic(state.enPassant) : '-';
    return `${rows.join('/')} ${state.turn} ${castlingStr} ${epStr}`;
  }

  private recordPosition(): void {
    const key = this.getPositionKey();
    const count = (this.positionCounts.get(key) || 0) + 1;
    this.positionCounts.set(key, count);
  }

  public isSquareAttacked(sq: number, byColor: PieceColor, state: PositionState = this.state): boolean {
    const { file, rank } = squareToCoords(sq);

    // 1. Attacked by pawns
    const pawnRankDelta = byColor === 'w' ? 1 : -1; // White pawn attacks upwards (towards rank index 0)
    const pawnAttackerRank = rank + pawnRankDelta;
    if (pawnAttackerRank >= 0 && pawnAttackerRank < 8) {
      if (file > 0) {
        const p = state.board[coordsToSquare(file - 1, pawnAttackerRank)];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
      if (file < 7) {
        const p = state.board[coordsToSquare(file + 1, pawnAttackerRank)];
        if (p && p.color === byColor && p.type === 'p') return true;
      }
    }

    // 2. Attacked by knights
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [df, dr] of knightOffsets) {
      const f = file + df;
      const r = rank + dr;
      if (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = state.board[coordsToSquare(f, r)];
        if (p && p.color === byColor && p.type === 'n') return true;
      }
    }

    // 3. Attacked by sliding pieces (diagonals: bishop / queen)
    const diagDirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [df, dr] of diagDirs) {
      let f = file + df;
      let r = rank + dr;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = state.board[coordsToSquare(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        f += df;
        r += dr;
      }
    }

    // 4. Attacked by sliding pieces (orthogonal: rook / queen)
    const orthDirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [df, dr] of orthDirs) {
      let f = file + df;
      let r = rank + dr;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = state.board[coordsToSquare(f, r)];
        if (p) {
          if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        f += df;
        r += dr;
      }
    }

    // 5. Attacked by king
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        const f = file + df;
        const r = rank + dr;
        if (f >= 0 && f < 8 && r >= 0 && r < 8) {
          const p = state.board[coordsToSquare(f, r)];
          if (p && p.color === byColor && p.type === 'k') return true;
        }
      }
    }

    return false;
  }

  public findKing(color: PieceColor, state: PositionState = this.state): number {
    for (let i = 0; i < 64; i++) {
      const p = state.board[i];
      if (p && p.color === color && p.type === 'k') return i;
    }
    return -1;
  }

  public isInCheck(color: PieceColor, state: PositionState = this.state): boolean {
    const kingSq = this.findKing(color, state);
    if (kingSq === -1) return false;
    const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(kingSq, enemyColor, state);
  }

  public generatePseudoLegalMoves(color: PieceColor = this.state.turn, state: PositionState = this.state): Move[] {
    const moves: Move[] = [];
    const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';
    const isWhite = color === 'w';

    for (let sq = 0; sq < 64; sq++) {
      const piece = state.board[sq];
      if (!piece || piece.color !== color) continue;
      const { file, rank } = squareToCoords(sq);

      switch (piece.type) {
        case 'p': {
          const dir = isWhite ? -1 : 1; // White moves up (rank decreases)
          const startRank = isWhite ? 6 : 1;
          const promoRank = isWhite ? 0 : 7;

          // 1-step push
          const nextRank = rank + dir;
          const oneStepSq = coordsToSquare(file, nextRank);
          if (nextRank >= 0 && nextRank < 8 && !state.board[oneStepSq]) {
            if (nextRank === promoRank) {
              const promos: PieceType[] = ['q', 'r', 'b', 'n'];
              for (const prom of promos) {
                moves.push({ from: sq, to: oneStepSq, piece: 'p', color, promotion: prom, flags: 'promotion' });
              }
            } else {
              moves.push({ from: sq, to: oneStepSq, piece: 'p', color, flags: 'normal' });
            }

            // 2-step push from start rank
            if (rank === startRank) {
              const twoStepRank = rank + 2 * dir;
              const twoStepSq = coordsToSquare(file, twoStepRank);
              if (!state.board[twoStepSq]) {
                moves.push({ from: sq, to: twoStepSq, piece: 'p', color, flags: 'normal' });
              }
            }
          }

          // Diagonal captures & en passant
          for (const df of [-1, 1]) {
            const capFile = file + df;
            if (capFile >= 0 && capFile < 8) {
              const capSq = coordsToSquare(capFile, nextRank);
              const targetPiece = state.board[capSq];
              if (targetPiece && targetPiece.color === enemyColor) {
                if (nextRank === promoRank) {
                  const promos: PieceType[] = ['q', 'r', 'b', 'n'];
                  for (const prom of promos) {
                    moves.push({ from: sq, to: capSq, piece: 'p', color, captured: targetPiece.type, promotion: prom, flags: 'promotion' });
                  }
                } else {
                  moves.push({ from: sq, to: capSq, piece: 'p', color, captured: targetPiece.type, flags: 'capture' });
                }
              } else if (state.enPassant !== null && capSq === state.enPassant) {
                // En passant capture
                const victimSq = coordsToSquare(capFile, rank);
                const victimPiece = state.board[victimSq];
                if (victimPiece && victimPiece.color === enemyColor && victimPiece.type === 'p') {
                  moves.push({ from: sq, to: capSq, piece: 'p', color, captured: 'p', flags: 'ep' });
                }
              }
            }
          }
          break;
        }

        case 'n': {
          const knightDeltas = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
          ];
          for (const [df, dr] of knightDeltas) {
            const f = file + df;
            const r = rank + dr;
            if (f >= 0 && f < 8 && r >= 0 && r < 8) {
              const targetSq = coordsToSquare(f, r);
              const targetPiece = state.board[targetSq];
              if (!targetPiece) {
                moves.push({ from: sq, to: targetSq, piece: 'n', color, flags: 'normal' });
              } else if (targetPiece.color === enemyColor) {
                moves.push({ from: sq, to: targetSq, piece: 'n', color, captured: targetPiece.type, flags: 'capture' });
              }
            }
          }
          break;
        }

        case 'b':
        case 'r':
        case 'q': {
          const dirs: [number, number][] = [];
          if (piece.type === 'b' || piece.type === 'q') {
            dirs.push([-1, -1], [1, -1], [-1, 1], [1, 1]);
          }
          if (piece.type === 'r' || piece.type === 'q') {
            dirs.push([0, -1], [0, 1], [-1, 0], [1, 0]);
          }

          for (const [df, dr] of dirs) {
            let f = file + df;
            let r = rank + dr;
            while (f >= 0 && f < 8 && r >= 0 && r < 8) {
              const targetSq = coordsToSquare(f, r);
              const targetPiece = state.board[targetSq];
              if (!targetPiece) {
                moves.push({ from: sq, to: targetSq, piece: piece.type, color, flags: 'normal' });
              } else {
                if (targetPiece.color === enemyColor) {
                  moves.push({ from: sq, to: targetSq, piece: piece.type, color, captured: targetPiece.type, flags: 'capture' });
                }
                break;
              }
              f += df;
              r += dr;
            }
          }
          break;
        }

        case 'k': {
          // Standard king steps
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const f = file + df;
              const r = rank + dr;
              if (f >= 0 && f < 8 && r >= 0 && r < 8) {
                const targetSq = coordsToSquare(f, r);
                const targetPiece = state.board[targetSq];
                if (!targetPiece) {
                  moves.push({ from: sq, to: targetSq, piece: 'k', color, flags: 'normal' });
                } else if (targetPiece.color === enemyColor) {
                  moves.push({ from: sq, to: targetSq, piece: 'k', color, captured: targetPiece.type, flags: 'capture' });
                }
              }
            }
          }

          // Castling
          if (!this.isInCheck(color, state)) {
            const kingRank = isWhite ? 7 : 0;
            if (rank === kingRank && file === 4) {
              // Kingside (e1 to g1 or e8 to g8)
              const canCastleK = isWhite ? state.castling.wK : state.castling.bK;
              if (canCastleK) {
                const f1 = coordsToSquare(5, kingRank);
                const g1 = coordsToSquare(6, kingRank);
                const h1 = coordsToSquare(7, kingRank);
                const rook = state.board[h1];
                if (!state.board[f1] && !state.board[g1] && rook && rook.type === 'r' && rook.color === color) {
                  if (!this.isSquareAttacked(f1, enemyColor, state) && !this.isSquareAttacked(g1, enemyColor, state)) {
                    moves.push({ from: sq, to: g1, piece: 'k', color, flags: 'castle' });
                  }
                }
              }

              // Queenside (e1 to c1 or e8 to c8)
              const canCastleQ = isWhite ? state.castling.wQ : state.castling.bQ;
              if (canCastleQ) {
                const d1 = coordsToSquare(3, kingRank);
                const c1 = coordsToSquare(2, kingRank);
                const b1 = coordsToSquare(1, kingRank);
                const a1 = coordsToSquare(0, kingRank);
                const rook = state.board[a1];
                if (!state.board[d1] && !state.board[c1] && !state.board[b1] && rook && rook.type === 'r' && rook.color === color) {
                  if (!this.isSquareAttacked(d1, enemyColor, state) && !this.isSquareAttacked(c1, enemyColor, state)) {
                    moves.push({ from: sq, to: c1, piece: 'k', color, flags: 'castle' });
                  }
                }
              }
            }
          }
          break;
        }
      }
    }

    return moves;
  }

  public getLegalMoves(color: PieceColor = this.state.turn, state: PositionState = this.state): Move[] {
    const pseudo = this.generatePseudoLegalMoves(color, state);
    const legal: Move[] = [];

    for (const move of pseudo) {
      const nextState = this.simulateMove(move, state);
      if (!this.isInCheck(color, nextState)) {
        // Compute SAN for valid moves
        move.san = this.computeSAN(move, state);
        legal.push(move);
      }
    }

    return legal;
  }

  public simulateMove(move: Move, state: PositionState): PositionState {
    const newBoard = [...state.board];
    const movingPiece = state.board[move.from];
    if (!movingPiece) return state;

    let enPassant: number | null = null;
    const castling: CastlingRights = { ...state.castling };

    // Move main piece
    const movedPiece: Piece = {
      ...movingPiece,
      square: move.to,
      moved: true,
      type: move.promotion || movingPiece.type
    };
    newBoard[move.to] = movedPiece;
    newBoard[move.from] = null;

    // Handle en passant capture
    if (move.flags === 'ep') {
      const { file } = squareToCoords(move.to);
      const { rank: fromRank } = squareToCoords(move.from);
      const capSq = coordsToSquare(file, fromRank);
      newBoard[capSq] = null;
    }

    // Set new en passant target on 2-step pawn push
    if (movingPiece.type === 'p' && Math.abs(move.to - move.from) === 16) {
      enPassant = Math.floor((move.from + move.to) / 2);
    }

    // Handle castling rook movement
    if (move.flags === 'castle') {
      const rank = squareToCoords(move.to).rank;
      if (move.to === coordsToSquare(6, rank)) {
        // Kingside: rook moves from 7 to 5
        const rookFrom = coordsToSquare(7, rank);
        const rookTo = coordsToSquare(5, rank);
        const rook = newBoard[rookFrom];
        if (rook) {
          newBoard[rookTo] = { ...rook, square: rookTo, moved: true };
          newBoard[rookFrom] = null;
        }
      } else if (move.to === coordsToSquare(2, rank)) {
        // Queenside: rook moves from 0 to 3
        const rookFrom = coordsToSquare(0, rank);
        const rookTo = coordsToSquare(3, rank);
        const rook = newBoard[rookFrom];
        if (rook) {
          newBoard[rookTo] = { ...rook, square: rookTo, moved: true };
          newBoard[rookFrom] = null;
        }
      }
    }

    // Update castling rights if King moves
    if (movingPiece.type === 'k') {
      if (movingPiece.color === 'w') {
        castling.wK = false;
        castling.wQ = false;
      } else {
        castling.bK = false;
        castling.bQ = false;
      }
    }

    // Update castling rights if Rook moves or is captured
    if (move.from === 0 || move.to === 0) castling.bQ = false;
    if (move.from === 7 || move.to === 7) castling.bK = false;
    if (move.from === 56 || move.to === 56) castling.wQ = false;
    if (move.from === 63 || move.to === 63) castling.wK = false;

    const isCapture = !!move.captured || move.flags === 'ep';
    const isPawnMove = movingPiece.type === 'p';
    const halfmove = (isCapture || isPawnMove) ? 0 : state.halfmove + 1;
    const fullmove = state.turn === 'b' ? state.fullmove + 1 : state.fullmove;
    const nextTurn: PieceColor = state.turn === 'w' ? 'b' : 'w';

    return {
      board: newBoard,
      turn: nextTurn,
      castling,
      enPassant,
      halfmove,
      fullmove
    };
  }

  public makeMove(move: Move): boolean {
    if (this.result !== 'in_progress') return false;

    // Verify move is legal
    const legalMoves = this.getLegalMoves(this.state.turn);
    const valid = legalMoves.find(m => 
      m.from === move.from && 
      m.to === move.to && 
      (!m.promotion || m.promotion === move.promotion)
    );

    if (!valid) return false;

    // Ensure SAN and flags are accurate
    move.san = valid.san;
    move.flags = valid.flags;
    move.captured = valid.captured;

    const previousState = { ...this.state };
    const currentFen = this.getFEN();

    this.state = this.simulateMove(valid, this.state);
    this.history.push({ move: valid, state: previousState, fen: currentFen });
    this.recordPosition();

    // Check game termination conditions
    this.updateGameStatus();
    return true;
  }

  public undoMove(): boolean {
    if (this.history.length === 0) return false;
    const last = this.history.pop()!;
    // Remove position key record
    const key = this.getPositionKey();
    const count = this.positionCounts.get(key) || 1;
    if (count <= 1) {
      this.positionCounts.delete(key);
    } else {
      this.positionCounts.set(key, count - 1);
    }

    this.state = last.state;
    this.result = 'in_progress';
    this.winner = null;
    this.resultReason = '';
    return true;
  }

  public computeSAN(move: Move, state: PositionState): string {
    if (move.flags === 'castle') {
      const { file } = squareToCoords(move.to);
      return file === 6 ? 'O-O' : 'O-O-O';
    }

    let san = '';
    const piece = state.board[move.from];
    if (!piece) return '';

    if (piece.type === 'p') {
      if (move.captured || move.flags === 'ep') {
        const fromFile = String.fromCharCode('a'.charCodeAt(0) + (move.from % 8));
        san += `${fromFile}x${squareToAlgebraic(move.to)}`;
      } else {
        san += squareToAlgebraic(move.to);
      }
      if (move.promotion) {
        san += `=${move.promotion.toUpperCase()}`;
      }
    } else {
      san += piece.type.toUpperCase();

      // Disambiguation
      const pseudo = this.generatePseudoLegalMoves(piece.color, state);
      const candidates = pseudo.filter(m => 
        m.piece === piece.type && 
        m.to === move.to && 
        m.from !== move.from &&
        !this.isInCheck(piece.color, this.simulateMove(m, state))
      );

      if (candidates.length > 0) {
        const { file: fromF, rank: fromR } = squareToCoords(move.from);
        const sameFile = candidates.some(m => squareToCoords(m.from).file === fromF);
        const sameRank = candidates.some(m => squareToCoords(m.from).rank === fromR);

        if (!sameFile) {
          san += String.fromCharCode('a'.charCodeAt(0) + fromF);
        } else if (!sameRank) {
          san += `${8 - fromR}`;
        } else {
          san += `${String.fromCharCode('a'.charCodeAt(0) + fromF)}${8 - fromR}`;
        }
      }

      if (move.captured) {
        san += 'x';
      }
      san += squareToAlgebraic(move.to);
    }

    // Check / Checkmate suffix
    const nextState = this.simulateMove(move, state);
    const enemyColor: PieceColor = piece.color === 'w' ? 'b' : 'w';
    if (this.isInCheck(enemyColor, nextState)) {
      const nextLegal = this.getLegalMoves(enemyColor, nextState);
      san += nextLegal.length === 0 ? '#' : '+';
    }

    return san;
  }

  public hasInsufficientMaterial(): boolean {
    const pieces: Piece[] = [];
    for (const p of this.state.board) {
      if (p) pieces.push(p);
    }

    // K vs K
    if (pieces.length === 2) return true;

    // K+B vs K or K+N vs K
    if (pieces.length === 3) {
      return pieces.some(p => p.type === 'b' || p.type === 'n');
    }

    // K+B vs K+B same color squares
    if (pieces.length === 4) {
      const bishops = pieces.filter(p => p.type === 'b');
      if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
        const { file: f1, rank: r1 } = squareToCoords(bishops[0].square);
        const { file: f2, rank: r2 } = squareToCoords(bishops[1].square);
        const color1 = (f1 + r1) % 2;
        const color2 = (f2 + r2) % 2;
        return color1 === color2;
      }
    }

    return false;
  }

  public updateGameStatus(): void {
    const currentLegal = this.getLegalMoves(this.state.turn);
    const inCheck = this.isInCheck(this.state.turn);

    if (currentLegal.length === 0) {
      if (inCheck) {
        this.result = 'checkmate';
        this.winner = this.state.turn === 'w' ? 'b' : 'w';
        this.resultReason = `Checkmate — ${this.winner === 'w' ? 'White' : 'Black'} wins!`;
      } else {
        this.result = 'stalemate';
        this.winner = null;
        this.resultReason = 'Stalemate — Draw';
      }
      return;
    }

    // Threefold repetition
    const key = this.getPositionKey();
    if ((this.positionCounts.get(key) || 0) >= 3) {
      this.result = 'threefold';
      this.winner = null;
      this.resultReason = 'Draw by Threefold Repetition';
      return;
    }

    // Fifty-move rule
    if (this.state.halfmove >= 100) {
      this.result = 'fifty_moves';
      this.winner = null;
      this.resultReason = 'Draw by Fifty-Move Rule';
      return;
    }

    // Insufficient material
    if (this.hasInsufficientMaterial()) {
      this.result = 'insufficient_material';
      this.winner = null;
      this.resultReason = 'Draw by Insufficient Material';
      return;
    }

    this.result = 'in_progress';
  }

  public resign(color: PieceColor): void {
    this.result = 'resignation';
    this.winner = color === 'w' ? 'b' : 'w';
    this.resultReason = `${color === 'w' ? 'White' : 'Black'} resigned.`;
  }

  public timeout(color: PieceColor): void {
    const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';
    // If enemy has insufficient material to mate, it's a draw
    if (this.hasInsufficientMaterial()) {
      this.result = 'agreed_draw';
      this.winner = null;
      this.resultReason = 'Time out vs Insufficient Material — Draw';
    } else {
      this.result = 'timeout';
      this.winner = enemyColor;
      this.resultReason = `${color === 'w' ? 'White' : 'Black'} ran out of time.`;
    }
  }

  public claimDraw(reason: string = 'Agreed Draw'): void {
    this.result = 'agreed_draw';
    this.winner = null;
    this.resultReason = reason;
  }

  public exportPGN(whiteName = 'Player 1', blackName = 'Player 2'): string {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    let resultStr = '*';
    if (this.result === 'checkmate' || this.result === 'resignation' || this.result === 'timeout') {
      resultStr = this.winner === 'w' ? '1-0' : '0-1';
    } else if (this.result !== 'in_progress') {
      resultStr = '1/2-1/2';
    }

    let pgn = `[Event "Chess Concepts Arena"]\n`;
    pgn += `[Site "Chess Concepts Arena Web"]\n`;
    pgn += `[Date "${dateStr}"]\n`;
    pgn += `[Round "1"]\n`;
    pgn += `[White "${whiteName}"]\n`;
    pgn += `[Black "${blackName}"]\n`;
    pgn += `[Result "${resultStr}"]\n\n`;

    let moveText = '';
    for (let i = 0; i < this.history.length; i++) {
      const h = this.history[i];
      if (i % 2 === 0) {
        moveText += `${Math.floor(i / 2) + 1}. `;
      }
      moveText += `${h.move.san || 'move'} `;
    }
    moveText += resultStr;
    return pgn + moveText.trim();
  }
}
