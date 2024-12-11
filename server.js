const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// 豆の初期位置データ
let beans = [];
for (let i = 0; i < 5; i++) {
    beans.push({
        id: i,
        x: Math.random() * 500,
        y: Math.random() * 500,
        touchedBy: [],
    });
}

// クライアントとの通信
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // 初期豆の位置を送信
    socket.emit("initializeBeans", beans);

    // クライアントからの豆移動リクエスト
    socket.on("moveBean", ({ id, x1, y1, x2, y2 }) => {
        const bean = beans.find((b) => b.id === id);
        if (bean) {
            // サーバーで中点を計算
            bean.x = (x1 + x2) / 2;
            bean.y = (y1 + y2) / 2;

            // 更新された豆の位置を全クライアントに通知
            io.emit("updateBeanPosition", { id, x: bean.x, y: bean.y });
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// サーバー起動
server.listen(3000, () => {
    console.log("Server running on port 3000");
});
