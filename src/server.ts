import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import {
  Players,
  TourmentBrackets,
  PlayersMoves,
  BattleEndSituation,
  BattleMoves
} from "./types/global"

const PORT = process.env.PORT || 3000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

const players: Players[] = []
const tournment_brackets: TourmentBrackets[][] = []
let phase = 0
let bracketPosition = 0
const battle_moves: BattleMoves = {}

const updatePlayersList = () => io.emit("players", players)
const updateTournmentBrackets = () =>
  io.emit("tournment_brackets", tournment_brackets)

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
    players.splice(
      players.findIndex(player => player.id === id),
      1
    )
    updatePlayersList()
  })

  // tournment start
  socket.on("tournment_start", () => {
    // create empty objects with correct quantity for each phase tournment
    for (let i = players.length; i >= 1; i = i / 2) {
      tournment_brackets.push(Array.from(Array(Math.ceil(i)), () => ({})))
    }

    // // prevent errors with odd quantity players
    if (players.length % 2 !== 0 && players.length > 1) {
      tournment_brackets.push([{}])
    }

    // fill in brackets on the phase 0
    for (let i = 0; i < players.length; i++) {
      tournment_brackets[phase][i] = { ...players[i], winner: null }
    }

    // randomize players in brackets
    tournment_brackets[0] = tournment_brackets[0]
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value)

    updateTournmentBrackets()
  })

  // battle begin
  socket.on("battle_begin", () => {
    const battle_players = {
      player1: tournment_brackets[phase][bracketPosition],
      player2: tournment_brackets[phase][bracketPosition + 1]
    }

    io.emit("battle_players", battle_players)
  })

  // players moves
  socket.on("player_move", ({ isPlayer1, isPlayer2, move }: PlayersMoves) => {
    if (isPlayer1) {
      battle_moves.player1 = move
    }

    if (isPlayer2) {
      battle_moves.player2 = move
    }

    if (battle_moves.player1 && battle_moves.player2) {
      io.emit("battle_moves", battle_moves)
    }
  })

  // battle end
  socket.on("battle_end", (situation?: BattleEndSituation) => {
    // draw game
    if (!situation) {
      return
    }

    // change the winner propertie
    tournment_brackets[phase] = tournment_brackets[phase].map(player => {
      if (player.id === situation.winnerId) {
        return { ...player, winner: true }
      }
      if (player.id === situation.looserId) {
        return { ...player, winner: false }
      }

      return player
    })

    bracketPosition = bracketPosition + 2

    // change phase when all players have winner value
    if (
      tournment_brackets[phase].every(({ winner }) => winner !== null) &&
      tournment_brackets[phase + 1]
    ) {
      phase++
    }

    updateTournmentBrackets()
  })
})

app.use("/", (_, res) => {
  res.send('{"title": "jokenpo battle"}')
})

httpServer.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`)
})
