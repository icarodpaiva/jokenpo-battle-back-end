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

const players: {
  id: string
  name: string
}[] = []

io.on("connection", socket => {
  const { id } = socket

  // push player
  socket.on("name", (name: string) => {
    players.push({ id, name })
    io.emit("players", players)
  })

  // remove player
  socket.on("disconnect", () => {
    players.splice(
      players.findIndex(player => player.id === id),
      1
    )
    io.emit("players", players)
  })
})

app.use("/", (_, res) => {
  res.send('{"title": "jokenpo battle"}')
})

httpServer.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`)
})
