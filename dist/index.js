"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = __importDefault(require("node:http"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
const server = node_http_1.default.createServer(app);
const origin = process.env.CORS_ORIGIN || "*";
const io = new socket_io_1.Server(server, {
    cors: { origin, methods: ["GET", "POST"] },
});
const rooms = {};
function normalizeIsSpectator(value) {
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string")
        return value.toLowerCase() === "true";
    return false;
}
io.on("connection", (socket) => {
    console.log(`🔌 Novo cliente conectado: ${socket.id}`);
    socket.on("create_room", ({ playerName, roomType, isSpectator }, callback) => {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const spectator = normalizeIsSpectator(isSpectator);
        rooms[roomId] = {
            type: roomType,
            adminId: socket.id,
            showVotes: false,
            players: [{ id: socket.id, name: playerName, vote: null, isSpectator: spectator }],
        };
        socket.join(roomId);
        if (callback)
            callback({ success: true, roomId });
    });
    socket.on("join_room", ({ playerName, roomId, isSpectator }, callback) => {
        const room = rooms[roomId];
        if (room) {
            const spectator = normalizeIsSpectator(isSpectator);
            const existingPlayerIndex = room.players.findIndex((p) => p.id === socket.id);
            socket.join(roomId);
            if (existingPlayerIndex !== -1) {
                room.players[existingPlayerIndex].name = playerName;
            }
            else {
                room.players.push({
                    id: socket.id,
                    name: playerName,
                    vote: null,
                    isSpectator: spectator,
                });
            }
            io.to(roomId).emit("room_updated", room);
            if (callback)
                callback({ success: true, roomId, roomType: room.type, isSpectator: spectator });
        }
        else {
            if (callback)
                callback({ error: "Sala não encontrada" });
        }
    });
    socket.on("vote", ({ roomId, vote }) => {
        const room = rooms[roomId];
        if (room && !room.showVotes) {
            const player = room.players.find((p) => p.id === socket.id);
            if (player && !player.isSpectator) {
                player.vote = vote;
                io.to(roomId).emit("room_updated", room);
            }
        }
    });
    socket.on("reveal_cards", ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.adminId === socket.id) {
            room.showVotes = true;
            io.to(roomId).emit("room_updated", room);
        }
    });
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
    socket.on("send_reaction", ({ roomId, targetPlayerId, emoji }) => {
        io.to(roomId).emit("receive_reaction", { targetPlayerId, emoji });
    });
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
