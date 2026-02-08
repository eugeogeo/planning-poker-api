import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { Room, Player } from "./@types/generics";

const app = express();
const server = http.createServer(app);
const origin = process.env.CORS_ORIGIN || "*";

const io = new Server(server, {
  cors: { origin, methods: ["GET", "POST"] },
});

const rooms: Record<string, Room> = {};

io.on("connection", (socket) => {
  // Criar Sala
  socket.on("create_room", ({ playerName, roomType }) => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    rooms[roomId] = {
      type: roomType,
      players: [{ id: socket.id, name: playerName, vote: null }],
    };
    socket.join(roomId);
    socket.emit("room_created", { roomId });
  });

  // Entrar na Sala
  socket.on("join_room", ({ playerName, roomId }) => {
    const room = rooms[roomId];

    if (room) {
      room.players.push({ id: socket.id, name: playerName, vote: null });

      socket.join(roomId);

      socket.emit("room_joined", { roomId, roomType: room.type });

      // Avisa a todos  para atualizar a lista
      io.to(roomId).emit("room_updated", room);
    } else {
      socket.emit("error", "Sala não encontrada");
    }
  });

  // Evento de Voto
  socket.on("vote", ({ roomId, vote }) => {
    const room = rooms[roomId];
    if (room) {
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.vote = vote;
        io.to(roomId).emit("room_updated", room);
      }
    }
  });

  // Desconexão
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const index = rooms[roomId].players.findIndex((p) => p.id === socket.id);
      if (index !== -1) {
        rooms[roomId].players.splice(index, 1);
        io.to(roomId).emit("room_updated", rooms[roomId]);
      }
    }
  });
});

server.listen(3001, () => console.log("Servidor em http://localhost:3001"));
