import { ChessEngine } from './engine';
import { Move, PieceColor, PieceType } from './types';

// Standard piece values (centipawns)
const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece-Square Tables (White perspective, flipped for Black)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_TABLE = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

function getPSTValue(type: PieceType, color: PieceColor, sq: number): number {
  const index = color === 'w' ? sq : (7 - Math.floor(sq / 8)) * 8 + (sq % 8);
  switch (type) {
    case 'p': return PAWN_TABLE[index] || 0;
    case 'n': return KNIGHT_TABLE[index] || 0;
    case 'b': return BISHOP_TABLE[index] || 0;
    case 'r': return ROOK_TABLE[index] || 0;
    case 'q': return QUEEN_TABLE[index] || 0;
    case 'k': return KING_MIDDLE_TABLE[index] || 0;
  }
}

export function evaluatePosition(engine: ChessEngine, level: number): number {
  if (engine.result === 'checkmate') {
    return engine.winner === 'w' ? 100000 : -100000;
  }
  if (engine.result === 'stalemate' || engine.result === 'threefold' || engine.result === 'fifty_moves' || engine.result === 'insufficient_material') {
    return 0;
  }

  let material = 0;
  let positional = 0;

  for (let sq = 0; sq < 64; sq++) {
    const p = engine.state.board[sq];
    if (!p) continue;
    const val = PIECE_VALUES[p.type];
    const pst = level >= 3 ? getPSTValue(p.type, p.color, sq) : 0;
    const sign = p.color === 'w' ? 1 : -1;

    material += sign * val;
    positional += sign * pst;
  }

  // Level 4 & 5: Mobility + King Safety
  let mobility = 0;
  if (level >= 4) {
    const wMoves = engine.getLegalMoves('w', engine.state).length;
    const bMoves = engine.getLegalMoves('b', engine.state).length;
    mobility = (wMoves - bMoves) * 5;
  }

  return material + positional + mobility;
}

export interface ThinkResult {
  move: Move;
  depth: number;
  eval: number;
}

export async function think(engine: ChessEngine, level: number): Promise<ThinkResult | null> {
  const color = engine.state.turn;
  const legalMoves = engine.getLegalMoves(color);
  if (legalMoves.length === 0) return null;

  // Level 1: Pawn Sprout (1-ply random legal + capture/check preference)
  if (level === 1) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 200));
    const captures = legalMoves.filter(m => m.captured || m.flags === 'ep');
    if (captures.length > 0 && Math.random() < 0.7) {
      const chosen = captures[Math.floor(Math.random() * captures.length)];
      return { move: chosen, depth: 1, eval: 0 };
    }
    const chosen = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return { move: chosen, depth: 1, eval: 0 };
  }

  // Sort moves for better alpha-beta pruning (captures first)
  const orderMoves = (moves: Move[]) => {
    return moves.sort((a, b) => {
      const scoreA = (a.captured ? PIECE_VALUES[a.captured] : 0) + (a.promotion ? 800 : 0);
      const scoreB = (b.captured ? PIECE_VALUES[b.captured] : 0) + (b.promotion ? 800 : 0);
      return scoreB - scoreA;
    });
  };

  const targetDepth = level === 2 ? 2 : level === 3 ? 3 : level === 4 ? 4 : 5;
  const startTime = performance.now();
  const timeLimit = level === 5 ? 1000 : 800; // 1s cap for Queen's Endgame

  let bestMove = legalMoves[0];
  let bestEval = color === 'w' ? -Infinity : Infinity;

  // Quiescence search for Level 5
  function quiescence(eng: ChessEngine, alpha: number, beta: number, maxDepth = 2): number {
    const standPat = evaluatePosition(eng, level);
    const turn = eng.state.turn;

    if (maxDepth <= 0) return standPat;

    if (turn === 'w') {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;
    }

    const captures = orderMoves(eng.getLegalMoves(turn).filter(m => m.captured || m.flags === 'ep'));
    for (const move of captures) {
      eng.makeMove(move);
      const score = quiescence(eng, alpha, beta, maxDepth - 1);
      eng.undoMove();

      if (turn === 'w') {
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      } else {
        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
    }

    return turn === 'w' ? alpha : beta;
  }

  // Minimax with Alpha-Beta
  function search(eng: ChessEngine, depth: number, alpha: number, beta: number): number {
    if (depth <= 0 || eng.result !== 'in_progress') {
      if (level === 5 && eng.result === 'in_progress') {
        return quiescence(eng, alpha, beta);
      }
      return evaluatePosition(eng, level);
    }

    const turn = eng.state.turn;
    const moves = orderMoves(eng.getLegalMoves(turn));
    if (moves.length === 0) {
      return evaluatePosition(eng, level);
    }

    if (turn === 'w') {
      let maxScore = -Infinity;
      for (const move of moves) {
        eng.makeMove(move);
        const score = search(eng, depth - 1, alpha, beta);
        eng.undoMove();

        maxScore = Math.max(maxScore, score);
        if (level >= 3) {
          alpha = Math.max(alpha, score);
          if (beta <= alpha) break; // Beta cut-off
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        eng.makeMove(move);
        const score = search(eng, depth - 1, alpha, beta);
        eng.undoMove();

        minScore = Math.min(minScore, score);
        if (level >= 3) {
          beta = Math.min(beta, score);
          if (beta <= alpha) break; // Alpha cut-off
        }
      }
      return minScore;
    }
  }

  // Iterative deepening for Level 5, or direct search for 2..4
  const startDepth = level === 5 ? 1 : targetDepth;
  const maxD = targetDepth;

  for (let d = startDepth; d <= maxD; d++) {
    let currentBestMove = legalMoves[0];
    let currentBestEval = color === 'w' ? -Infinity : Infinity;
    const sortedMoves = orderMoves([...legalMoves]);

    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of sortedMoves) {
      // Yield to UI event loop every few steps
      if (performance.now() - startTime > timeLimit && d > 1) {
        break;
      }

      engine.makeMove(move);
      const score = search(engine, d - 1, alpha, beta);
      engine.undoMove();

      if (color === 'w') {
        if (score > currentBestEval) {
          currentBestEval = score;
          currentBestMove = move;
        }
        alpha = Math.max(alpha, score);
      } else {
        if (score < currentBestEval) {
          currentBestEval = score;
          currentBestMove = move;
        }
        beta = Math.min(beta, score);
      }
    }

    bestMove = currentBestMove;
    bestEval = currentBestEval;

    if (performance.now() - startTime > timeLimit) break;
  }

  // Yield tiny delay so UI can show thinking indicator smoothly
  await new Promise(r => setTimeout(r, 120));

  return {
    move: bestMove,
    depth: targetDepth,
    eval: bestEval
  };
}
