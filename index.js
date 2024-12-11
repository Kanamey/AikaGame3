const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ゲーム状態を管理する変数
let gameState = {
  blocks: [
    { id: 1, x: 1, y: 1 }, // ブロックの初期位置
    { id: 2, x: 3, y: 2 },
  ],
  goals: [
    { x: 5, y: 5 }, // ゴール位置
    { x: 6, y: 5 },
  ],
};

// サーバーのイベント
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // 初期状態を送信
  socket.emit("initGameState", gameState);

  // クライアントからブロック移動の要求を受け取る
  socket.on("moveBlock", ({ blockId, direction }) => {
    const block = gameState.blocks.find((b) => b.id === blockId);

    if (block) {
      // 移動の計算
      if (direction === "up") block.y -= 1;
      if (direction === "down") block.y += 1;
      if (direction === "left") block.x -= 1;
      if (direction === "right") block.x += 1;

      // 全てのクライアントに状態を送信
      io.emit("updateGameState", gameState);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// サーバーを起動
server.listen(3000, () => {
  console.log("Server running on port 3000");
});
