export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  square: number; // 0..63
  moved: boolean;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface Move {
  from: number;
  to: number;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType | null;
  promotion?: PieceType | null;
  flags: 'normal' | 'capture' | 'castle' | 'ep' | 'promotion';
  san?: string;
}

export interface PositionState {
  board: (Piece | null)[];
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: number | null; // square index of en passant target
  halfmove: number;
  fullmove: number;
}

export type GameResult = 
  | 'in_progress'
  | 'checkmate'
  | 'stalemate'
  | 'threefold'
  | 'fifty_moves'
  | 'insufficient_material'
  | 'resignation'
  | 'timeout'
  | 'agreed_draw';

export type GameMode = 'ai' | 'pass_and_play' | 'p2p';

export type AILevel = 1 | 2 | 3 | 4 | 5;

export type ThemeType = 'flower' | 'war' | 'beast' | 'greek';

export interface TimeControl {
  id: string;
  name: string;
  minutes: number;
  increment: number;
}
