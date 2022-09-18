import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"

const PORT = process.env.PORT || 3000

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  }
})

//  players
const players: {
  id: string
  name: string
}[] = []

const updatePlayersList = () => io.emit("players", players)

// socket events
io.on("connection", socket => {
  const { id } = socket

  // push player
  socket.on("name", (name: string) => {
    players.push({ id, name })

    // tournment
    const tournment_brackets =
      players.length % 2 === 0 || players.length <= 1 ? [] : [[]]

    let playersInBracket = players.length
    while (playersInBracket >= 1) {
      tournment_brackets.push([])
      playersInBracket = playersInBracket / 2
    }

    // first row
    for (let i = 0; i < players.length; i++) {
      tournment_brackets[0].push(players[i])
    }

    console.log("players total", players.length)
    console.log("playersInBracket", playersInBracket)
    console.log("tournment_brackets", tournment_brackets)

    updatePlayersList()
  })

  // remove player
  socket.on("disconnect", () => {
    players.splice(
      players.findIndex(player => player.id === id),
      1
    )
    updatePlayersList()
  })

  // tournment brackets
  // io.emit("tournment_brackets", tournment_brackets)
})

app.use("/", (_, res) => {
  res.send('{"title": "jokenpo battle"}')
})

httpServer.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`)
})
