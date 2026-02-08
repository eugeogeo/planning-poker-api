import http from "node:http";
import express from "express";
import { Server } from "socket.io";
import { Player, Room } from "./@types/generics";

const app = express();
const server = http.createServer(app);
const origin = process.env.CORS_ORIGIN || "*";

const io = new Server(server, {
  cors: { origin, methods: ["GET", "POST"] },
});

const rooms: Record<string, Room> = {};

io.on("connection", (socket) => {
  console.log(`🔌 Novo cliente conectado: ${socket.id}`);

  // Criar Sala
  socket.on("create_room", ({ playerName, roomType }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();

    rooms[roomId] = {
      type: roomType,
      adminId: socket.id,
      showVotes: false,
      players: [{ id: socket.id, name: playerName, vote: null }],
    };

    socket.join(roomId);

    if (callback) {
      callback({ success: true, roomId });
    }
  });

  // Entrar na Sala
  socket.on("join_room", ({ playerName, roomId }, callback) => {
    const room = rooms[roomId];

    if (room) {
      // Verifica se o jogador já existe para evitar duplicados
      const existingPlayerIndex = room.players.findIndex((p) => p.id === socket.id);

      if (existingPlayerIndex !== -1) {
        room.players[existingPlayerIndex].name = playerName;
        socket.join(roomId);
      } else {
        room.players.push({ id: socket.id, name: playerName, vote: null });
        socket.join(roomId);
      }

      io.to(roomId).emit("room_updated", room);

      if (callback) {
        callback({ success: true, roomId, roomType: room.type });
      }
    } else {
      if (callback) {
        callback({ error: "Sala não encontrada" });
      }
    }
  });

  // Votar
  socket.on("vote", ({ roomId, vote }) => {
    const room = rooms[roomId];
    if (room && !room.showVotes) {
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        player.vote = vote;
        io.to(roomId).emit("room_updated", room);
      }
    }
  });

  // --- NOVAS FUNCIONALIDADES DE ADMIN ---

  // Revelar Cartas
  socket.on("reveal_cards", ({ roomId }) => {
    const room = rooms[roomId];

    if (room && room.adminId === socket.id) {
      room.showVotes = true;
      io.to(roomId).emit("room_updated", room);
    }
  });

  // Nova Rodada (Limpar votos)
  socket.on("start_new_round", ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.adminId === socket.id) {
      room.showVotes = false;
      room.players.forEach((p) => {
        p.vote = null;
      });
      io.to(roomId).emit("room_updated", room);
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

server.listen(3001, () => console.log("🚀 Servidor em http://localhost:3001"));
