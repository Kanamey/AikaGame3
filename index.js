const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ゲーム状態を管理する変数
let gameState = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // クライアントからデータを受信
  socket.on("playerAction", (data) => {
    // サーバーで状態を更新
    gameState = { ...gameState, [socket.id]: data };
    // 他のクライアントに状態を送信
    socket.broadcast.emit("updateGameState", gameState);
  });

  // 切断時の処理
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    delete gameState[socket.id];
  });
});

// サーバーを起動
server.listen(3000, () => {
  console.log("Server running on port 3000");
});
