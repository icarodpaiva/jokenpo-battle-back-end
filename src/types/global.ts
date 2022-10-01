export interface Player {
  id: string
  name: string
  winner?: boolean
}

export interface BattlePlayers {
  player1: Player
  player2?: Player
}

export interface BattleMoves {
  player1: string
  player2: string
}

export interface BattleSituation {
  winner?: Player
  looser?: Player
  draw?: boolean
}
