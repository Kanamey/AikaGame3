const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 豆のデータ
let beans = [];
const beanRadius = 15; // 豆の半径
const leftBowlCenter = { x: 200, y: 300 }; // 左のお皿の中心
const leftBowlRadius = 75; // 左のお皿の半径

// プレイヤーの位置情報
let playerPositions = {};

// 初期化処理
function initializeBeans() {
    beans = [];
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * leftBowlRadius;
        const x = leftBowlCenter.x + Math.cos(angle) * distance;
        const y = leftBowlCenter.y + Math.sin(angle) * distance;
        beans.push({
            id: i,
            x,
            y,
            isGlowing: false,
            touchedBy: [],
        });
    }
    console.log("Beans initialized:", beans);
}

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
        console.log(`Player ${socket.id} position updated:`, position);
    });

    // 豆が触られたとき
    socket.on("touchBean", (beanId) => {
        console.log(`Bean ${beanId} touched by ${socket.id}`);
        const bean = beans.find((b) => b.id === beanId);
        if (bean) {
            if (!bean.touchedBy.includes(socket.id)) {
                bean.touchedBy.push(socket.id);
            }

            // 中点計算と更新
            if (bean.touchedBy.length === 2) {
                const [player1, player2] = bean.touchedBy.map((id) => playerPositions[id]);
                bean.x = (player1.x + player2.x) / 2;
                bean.y = (player1.y + player2.y) / 2;
                bean.isGlowing = true;
                console.log(`Bean ${beanId} glowing at midpoint:`, { x: bean.x, y: bean.y });
            }
            io.emit("updateBeans", beans);
        }
    });

    // 豆から手を離したとき
    socket.on("releaseBean", (beanId) => {
        console.log(`Bean ${beanId} released by ${socket.id}`);
        const bean = beans.find((b) => b.id === beanId);
        if (bean) {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);

            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }
            io.emit("updateBeans", beans);
        }
    });

    // 切断時の処理
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete playerPositions[socket.id];

        beans.forEach((bean) => {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }
        });

        io.emit("updateBeans", beans);
    });
});

// 初期化
initializeBeans();

// サーバーの起動
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
