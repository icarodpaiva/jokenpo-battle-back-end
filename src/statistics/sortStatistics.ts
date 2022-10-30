import type { Player, Statistics } from "../types/global"

export const sortStatistics = (statistics: Statistics[], champion: Player) => {
  const statisticsSorted = statistics.sort((a, b) =>
    a.matches < b.matches ? 1 : b.matches < a.matches ? -1 : 0
  )

  const championIndex = statistics.findIndex(
    player => player.id === champion.id
  )

  const championStatistics = statisticsSorted.splice(championIndex, 1)[0]

  statisticsSorted.unshift(championStatistics)

  return statisticsSorted
}
