export interface Players {
  id: string
  name: string
}

export interface TourmentBrackets {
  id?: string
  name?: string
  winner?: boolean | null
}

export interface BattleEndSituation {
  winnerId: string
  looserId: string
}
