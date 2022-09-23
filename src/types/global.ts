export interface Player {
  id: string
  name: string
}

export interface TourmentBrackets {
  id?: string
  name?: string
  winner?: boolean | null
}

export interface BattlePlayers {
  player1?: TourmentBrackets
  player2?: TourmentBrackets
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

export interface BattleSituation {
  winner?: TourmentBrackets
  looser?: TourmentBrackets
}
