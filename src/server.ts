import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import { Players, TourmentBrackets } from "./types/global"

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
    // prevent errors with odd quantity players
    if (players.length % 2 !== 0 && players.length > 1) {
      tournment_brackets.push([])
    }

    // create empty objects with correct quantity for each phase tournment
    let playersInBracket = players.length
    while (playersInBracket >= 1) {
      tournment_brackets.push(
        Array.from(Array(Math.ceil(playersInBracket / 2)), () => ({}))
      )
      playersInBracket = playersInBracket / 2
    }

    // fill in brackets on the phase 0
    for (let i = 0; i < players.length; i++) {
      tournment_brackets[phase][i] = { ...players[i], winner: null }
    }

    updateTournmentBrackets()
  })

  // tournment phases
  // change phase when the phase is over
  // if (
  //   tournment_brackets[phase].every(item => item.winner !== null) &&
  //   tournment_brackets[phase + 1]
  // ) {
  //   phase++
  // }

  // console.log("tournment_brackets", tournment_brackets)
  // console.log("phase", phase)

  // console.log("players total", players.length)
  // console.log("playersInBracket", playersInBracket)
  // console.log("tournment_brackets", tournment_brackets)
})

app.use("/", (_, res) => {
  res.send('{"title": "jokenpo battle"}')
})

httpServer.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`)
})
