const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// `public` フォルダを静的ファイルとして提供
app.use(express.static("public"));

// サーバーで管理する豆の初期位置
let beans = [];
for (let i = 0; i < 5; i++) {
    beans.push({
        id: i,
        x: Math.random() * 500,
        y: Math.random() * 500,
        touchedBy: []
    });
}

// ソケット通信の設定
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // 初期豆の情報をクライアントに送信
    socket.emit("initializeBeans", beans);

    // 豆が移動された場合の処理
    socket.on("moveBean", ({ id, newX, newY }) => {
        const bean = beans.find(b => b.id === id);
        if (bean) {
            bean.x = newX;
            bean.y = newY;
            io.emit("updateBeanPosition", { id, newX, newY }); // 全クライアントに通知
        }
    });

    // 中点の計算リクエストを処理
    socket.on("updateMidpoint", ({ id, x1, y1, x2, y2 }) => {
        const bean = beans.find(b => b.id === id);
        if (bean) {
            bean.x = (x1 + x2) / 2;
            bean.y = (y1 + y2) / 2;
            io.emit("updateBeanPosition", { id, newX: bean.x, newY: bean.y }); // 全クライアントに通知
        }
    });

    // クライアントが切断したとき
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// サーバーをポート3000で起動
server.listen(3000, () => {
    console.log("Server running on port 3000");
});
