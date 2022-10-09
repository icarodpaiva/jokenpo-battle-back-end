type PlayersInBattle = "player1" | "player2"

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

export interface BattleSituationPlayers {
  winner: PlayersInBattle
  looser: PlayersInBattle
}

export interface BattleSituation {
  winner?: Player
  looser?: Player
  draw?: boolean
}

export interface DisconnectedInBattle {
  disconnected: PlayersInBattle
  notDisconnected: PlayersInBattle
}
