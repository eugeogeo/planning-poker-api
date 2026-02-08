import express from "express";
import http from "node:http";
import { Server } from "socket.io";

// Configuração do Servidor
const app = express();
const server = http.createServer(app);
const origin = process.env.CORS_ORIGIN || "*";

const io = new Server(server, {
  cors: {
    origin: origin,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Usuário conectado:", socket.id);

  // Criar Sala
  socket.on("create_room", () => {});

  // Entrar na Sala
  socket.on("join_room", () => {});

  // Desconexão
  socket.on("disconnect", () => {
    console.log("Usuário desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`CORS liberado para: ${origin}`);
});
