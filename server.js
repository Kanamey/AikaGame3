const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 左側のお皿の中心座標
const leftBowlCenter = { x: 200, y: 300 }; // 適切な値を設定
const leftBowlRadius = 75; // 半径

// 豆の初期データ
let beans = [];
for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * leftBowlRadius;
    const x = leftBowlCenter.x + Math.cos(angle) * distance;
    const y = leftBowlCenter.y + Math.sin(angle) * distance;
    beans.push({
        id: i,
        x: x,
        y: y,
        isGlowing: false,
        touchedBy: [],
    });
}

// プレイヤーのマウス座標
let playerPositions = {};

// 静的ファイルを提供
app.use(express.static("public"));

// ソケット通信の設定
io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    playerPositions[socket.id] = { x: 0, y: 0 };

    // 初期豆データを送信
    socket.emit("initializeBeans", beans);

    // マウス位置の更新を受信
    socket.on("updateMousePosition", (position) => {
        playerPositions[socket.id] = position;
    });

    // 豆が触られたことを受信
    socket.on("touchBean", (beanId) => {
        const bean = beans.find((b) => b.id === beanId);
        if (bean) {
            if (!bean.touchedBy.includes(socket.id)) {
                bean.touchedBy.push(socket.id);
            }

            // 中点計算
            if (bean.touchedBy.length === 2) {
                const [player1, player2] = bean.touchedBy.map((id) => playerPositions[id]);
                bean.x = (player1.x + player2.x) / 2;
                bean.y = (player1.y + player2.y) / 2;
                bean.isGlowing = true;

                io.emit("updateBean", bean);
            }
        }
    });

    // 豆がクリックから離されたとき
    socket.on("releaseBean", (beanId) => {
        const bean = beans.find((b) => b.id === beanId);
        if (bean) {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);

            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }

            io.emit("updateBean", bean);
        }
    });

    // プレイヤーが切断したとき
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete playerPositions[socket.id];

        beans.forEach((bean) => {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }
        });

        io.emit("initializeBeans", beans);
    });
});

// サーバーを起動
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
