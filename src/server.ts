import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import {
  Player,
  BattleSituation,
  BattleMoves,
  BattlePlayers
} from "./types/global"

const PORT = process.env.PORT || 3000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

let players: Player[] = []
const emptyPlayer = { id: "", name: "" }

let battle_players: BattlePlayers = { player1: emptyPlayer }
let battle_moves: BattleMoves = { player1: "", player2: "" }

let tournment_brackets: Player[][] = []
// fill in brackets on the next round
const fillInBrackets = (playerWinner?: Player) => {
  for (let i = 0; i < tournment_brackets[round + 1]?.length; i++) {
    if (!tournment_brackets[round + 1][i].id && !!playerWinner) {
      tournment_brackets[round + 1][i] = { ...playerWinner, winner: undefined }
      return
    }
  }
}

let round = 0
let bracketPosition = 0
const nextRound = () => {
  round++
  bracketPosition = 0
}

const updatePlayersList = () => io.emit("players", players)
const updateTournmentBrackets = () =>
  io.emit("tournment_brackets", tournment_brackets)

const restartAll = () => {
  io.disconnectSockets()
  players = []
  battle_players = { player1: emptyPlayer }
  battle_moves = { player1: "", player2: "" }
  tournment_brackets = []
  round = 0
  bracketPosition = 0
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
    }

    // // prevent errors with odd quantity players
    if (players.length % 2 !== 0 && players.length > 1) {
      tournment_brackets.push([emptyPlayer])
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

    updateTournmentBrackets()
  })

  // next battle
  socket.on("next_battle", () => {
    battle_players.player1 = tournment_brackets[round][bracketPosition]
    battle_players.player2 = tournment_brackets[round][bracketPosition + 1]

    // validation for odd rounds
    if (!battle_players.player2?.id) {
      tournment_brackets[round][bracketPosition].winner = true
      fillInBrackets(battle_players.player1)

      if (tournment_brackets[round + 1]) {
        nextRound()
      }
      // end game
      else {
        tournment_brackets[round][bracketPosition].winner = true
        io.emit("champion", battle_players.player1)
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
      let battle_situation: BattleSituation = {}
      const { player1, player2 } = battle_moves

      const player1Wins =
        (player1 === "rock" && player2 === "scissors") ||
        (player1 === "paper" && player2 === "rock") ||
        (player1 === "scissors" && player2 === "paper")

      if (player1Wins) {
        battle_situation.winner = battle_players.player1
        battle_situation.looser = battle_players.player2

        tournment_brackets[round][bracketPosition].winner = true
        tournment_brackets[round][bracketPosition + 1].winner = false
      }

      const player2Wins =
        (player2 === "rock" && player1 === "scissors") ||
        (player2 === "paper" && player1 === "rock") ||
        (player2 === "scissors" && player1 === "paper")

      if (player2Wins) {
        battle_situation.winner = battle_players.player2
        battle_situation.looser = battle_players.player1

        tournment_brackets[round][bracketPosition].winner = false
        tournment_brackets[round][bracketPosition + 1].winner = true
      }

      fillInBrackets(battle_situation.winner)

      if (player1 === player2) {
        battle_situation.draw = true
      } else {
        bracketPosition = bracketPosition + 2
      }

      // change round when all players have winner value
      if (
        tournment_brackets[round].every(({ winner }) => winner !== undefined)
      ) {
        nextRound()
      }

      updateTournmentBrackets()
      io.emit("battle_details", { battle_moves, battle_situation })
      battle_moves = { player1: "", player2: "" }
      battle_situation = {}
    }
  })
})

app.use("/", (_, res) => {
  res.send('{"title": "jokenpo battle"}')
})

httpServer.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`)
})
