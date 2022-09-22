export interface Players {
  id: string
  name: string
}

export interface TourmentBrackets {
  id?: string
  name?: string
  winner?: boolean | null
}

export interface PlayersMoves {
  isPlayer1: boolean
  isPlayer2: boolean
  move: string
}

export interface BattleMoves {
  player1?: string
  player2?: string
}

export interface BattleEndSituation {
  winnerId: string
  looserId: string
}
