import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import { sortStatistics } from "./statistics/sortStatistics"
import {
  Player,
  BattleSituation,
  BattleMoves,
  BattlePlayers,
  DisconnectedInBattle,
  BattleSituationPlayers,
  Statistics,
  PushStatistics
} from "./types/global"

const PORT = process.env.PORT || 3000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

let round = 0
let playerPositions = {
  player1: 0,
  player2: 1
}

// change round when all players have winner value
const validateRoundFinished = () => {
  if (tournment_brackets[round].every(({ winner }) => winner !== undefined)) {
    round++
  }
}

let players: Player[] = []
const emptyPlayer = { id: "", name: "" }

let battle_players: BattlePlayers = {
  player1: emptyPlayer,
  player2: emptyPlayer
}
let battle_moves: BattleMoves = { player1: "", player2: "" }
let battle_situation: BattleSituation = {}

// change situations and brackets on the same round
const fillBattleSituation = ({
  winner: { player: wPlayer, move: wMove },
  looser: { player: lPlayer, move: lMove }
}: BattleSituationPlayers) => {
  battle_situation.winner = { ...battle_players[wPlayer], move: wMove }
  battle_situation.looser = { ...battle_players[lPlayer], move: lMove }

  tournment_brackets[round][playerPositions[wPlayer]].winner = true
  tournment_brackets[round][playerPositions[lPlayer]].winner = false

  // send winner statistics
  sendStatistics({
    id: battle_situation.winner?.id,
    name: battle_situation.winner?.name,
    situation: "win"
  })
  // send looser statistics
  sendStatistics({
    id: battle_situation.looser?.id,
    name: battle_situation.looser?.name,
    situation: "loose"
  })
}

// prevent disconnected players and define player positions
const changePlayersPositions = () => {
  let positions: number[] = []
  for (let i = 0; i < tournment_brackets?.[round]?.length; i++) {
    if (tournment_brackets[round][i].winner === undefined) {
      positions.push(i)
    }
  }

  playerPositions.player1 = positions[0] ?? -1
  playerPositions.player2 = positions[1] ?? -1
}

let tournment_brackets: Player[][] = []
// fill in brackets on the next round
const fillInBrackets = (playerWinner?: Player) => {
  if (!playerWinner || !tournment_brackets?.[round + 1]) {
    return
  }

  const emptyPositions = tournment_brackets[round + 1]
    .map(({ id }, index) => (id ? null : index))
    .filter(position => position !== null) as number[]

  const randomPosition =
    emptyPositions[Math.floor(Math.random() * emptyPositions.length)]

  // set the winner in random bracket on next round
  tournment_brackets[round + 1][randomPosition] = {
    ...playerWinner,
    winner: undefined
  }
}

const updatePlayersList = () => io.emit("players", players)
const updateTournmentBrackets = () =>
  io.emit("tournment_brackets", tournment_brackets)
const updateBattleDetails = () =>
  io.emit("battle_details", { battle_moves, battle_situation })

const WO = ({ disconnected, notDisconnected }: DisconnectedInBattle) => {
  battle_situation.winner = battle_players[notDisconnected]
  battle_situation.looser = battle_players[disconnected]

  const winnerPosition = playerPositions[notDisconnected]

  if (
    tournment_brackets[round]?.[winnerPosition] &&
    tournment_brackets[round]?.[winnerPosition].winner !== false
  ) {
    tournment_brackets[round][winnerPosition].winner = true
    fillInBrackets(battle_situation.winner)

    // send winner statistics
    sendStatistics({
      id: battle_situation.winner?.id,
      name: battle_situation.winner?.name,
      situation: "win"
    })
    // send looser statistics
    sendStatistics({
      id: battle_situation.looser?.id,
      name: battle_situation.looser?.name,
      situation: "loose"
    })

    updateBattleDetails()
    battle_moves = { player1: "", player2: "" }
    battle_situation = {}

    validateRoundFinished()
  }
}

let statistics: Statistics[] = []
const sendStatistics = ({ id, name, situation }: PushStatistics) => {
  if (!id || !name) {
    return
  }

  const indexPlayer = statistics.findIndex(player => player.id === id)

  const initialStatistic = {
    id,
    name,
    matches: 1,
    win: 0,
    loose: 0,
    draw: 0
  }

  // set a new player statistic
  if (indexPlayer === -1) {
    const newStatistc = { ...initialStatistic }
    newStatistc[situation]++
    statistics.push(newStatistc)
  }
  // edit a setted player statistic
  else {
    statistics[indexPlayer].matches++
    statistics[indexPlayer][situation]++
  }
}

const restartAll = () => {
  io.disconnectSockets()
  players = []
  battle_players = { player1: emptyPlayer, player2: emptyPlayer }
  battle_moves = { player1: "", player2: "" }
  tournment_brackets = []
  round = 0
  playerPositions = {
    player1: 0,
    player2: 1
  }
  statistics = []
}

// socket events
io.on("connection", socket => {
  const { id } = socket

  // player connect
  socket.on("player_connect", (name: string) => {
    players.push({ id, name })
    updatePlayersList()
  })

  // player disconnect
  socket.on("disconnect", () => {
    players = players.filter(player => player.id !== id)
    updatePlayersList()

    // change winner atribbute when disconnected
    const changeWinnerProp = (roundToSearch: number) => {
      const index = tournment_brackets?.[roundToSearch]?.findIndex(
        player => player.id === id
      )

      if (index > -1) {
        tournment_brackets[roundToSearch][index].winner = false
        tournment_brackets[roundToSearch][index].disconnected = true
      }
    }
    changeWinnerProp(round)
    changeWinnerProp(round + 1)

    // remove player if disconnect during the battle
    const player1Disconnected = battle_players.player1.id === id
    const player2Disconnected = battle_players.player2?.id === id

    if (player2Disconnected) {
      WO({ disconnected: "player2", notDisconnected: "player1" })
    }

    if (player1Disconnected) {
      WO({ disconnected: "player1", notDisconnected: "player2" })
    }

    updateTournmentBrackets()

    if (players.length <= 0) {
      restartAll()
    }
  })

  // tournment start
  socket.on("tournment_start", () => {
    // create empty objects with correct quantity for each round tournment
    for (let i = players.length; i >= 1; i = i / 2) {
      tournment_brackets.push(
        Array.from(Array(Math.ceil(i)), () => emptyPlayer)
      )

      // prevent errors with odd quantity players
      if (i > 1 && i / 2 < 1 && players.length > 1) {
        tournment_brackets.push([emptyPlayer])
      }
    }

    // fill in brackets on the round 0
    for (let i = 0; i < players.length; i++) {
      tournment_brackets[round][i] = players[i]
    }

    // randomize players in brackets
    tournment_brackets[0] = tournment_brackets[0]
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)

    io.emit("tournment_start")
    updateTournmentBrackets()
  })

  // next battle
  socket.on("next_battle", () => {
    changePlayersPositions()

    battle_players.player1 = tournment_brackets[round][playerPositions.player1]
    battle_players.player2 = tournment_brackets[round][playerPositions.player2]

    // validation for odd rounds
    if (!battle_players.player2?.id) {
      tournment_brackets[round][playerPositions.player1].winner = true
      fillInBrackets(battle_players.player1)

      // end game validation
      if (tournment_brackets[round + 1]) {
        round++
      } else {
        tournment_brackets[round][0].winner = true

        const champion = battle_players.player1
        io.emit("champion", champion)
        io.emit("statistics", sortStatistics(statistics, champion))

        updateTournmentBrackets()
        restartAll()
      }
    }

    io.emit("battle_players", battle_players)
    updateTournmentBrackets()
  })

  // players moves
  socket.on("player_move", move => {
    if (id === battle_players.player1.id) {
      battle_moves.player1 = move
    }

    if (id === battle_players.player2?.id) {
      battle_moves.player2 = move
    }

    if (
      battle_players.player2?.id &&
      battle_moves.player1 &&
      battle_moves.player2
    ) {
      const { player1, player2 } = battle_moves

      const player1Wins =
        (player1 === "rock" && player2 === "scissors") ||
        (player1 === "paper" && player2 === "rock") ||
        (player1 === "scissors" && player2 === "paper")

      if (player1Wins) {
        fillBattleSituation({
          winner: { player: "player1", move: player1 },
          looser: { player: "player2", move: player2 }
        })
      }

      const player2Wins =
        (player2 === "rock" && player1 === "scissors") ||
        (player2 === "paper" && player1 === "rock") ||
        (player2 === "scissors" && player1 === "paper")

      if (player2Wins) {
        fillBattleSituation({
          winner: { player: "player2", move: player2 },
          looser: { player: "player1", move: player1 }
        })
      }

      fillInBrackets(battle_situation.winner)

      if (player1 === player2) {
        battle_situation.draw = { draw: true, move }

        // send draw statistics
        sendStatistics({
          id: battle_players.player1.id,
          name: battle_players.player1.name,
          situation: "draw"
        })
        // send draw statistics
        sendStatistics({
          id: battle_players.player2.id,
          name: battle_players.player2.name,
          situation: "draw"
        })
      }

      updateTournmentBrackets()
      updateBattleDetails()
      battle_moves = { player1: "", player2: "" }
      battle_situation = {}

      validateRoundFinished()
    }
  })
})

app.use("/", (_, res) => {
  res.send('{"title": "jokenpo battle"}')
})

httpServer.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`)
})
