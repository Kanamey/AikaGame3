const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// `public` フォルダ内の静的ファイルを提供
app.use(express.static("public"));

// 豆の初期位置をサーバーで管理
let beans = [];
for (let i = 0; i < 5; i++) {
    beans.push({
        id: i,
        x: Math.random() * 500,
        y: Math.random() * 500,
        touchedBy: [],
    });
}

// ソケット通信の設定
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // 初期豆のデータを送信
    socket.emit("initializeBeans", beans);
    console.log("Beans initialized:", beans); // デバッグ用ログ

    // 豆の移動をサーバーで処理
    socket.on("moveBean", ({ id, x1, y1, x2, y2 }) => {
        const bean = beans.find((b) => b.id === id);
        if (bean) {
            // 中点を計算して豆の位置を更新
            bean.x = (x1 + x2) / 2;
            bean.y = (y1 + y2) / 2;

            // 全クライアントに通知
            io.emit("updateBeanPosition", { id, x: bean.x, y: bean.y });
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// サーバーをポート3000で起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
