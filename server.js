const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let players = {}; // 各プレイヤーのマウス座標を保存
let beans = []; // 豆のデータを管理

// 初期豆の設定
for (let i = 0; i < 5; i++) {
    beans.push({
        id: i,
        x: Math.random() * 500,
        y: Math.random() * 500,
        isGlowing: false, // 光っているかどうか
        touchedBy: [], // 現在触っているプレイヤーのID
    });
}

// 静的ファイルの提供
app.use(express.static("public"));

// ソケット通信の設定
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // プレイヤーを初期化
    players[socket.id] = { x: 0, y: 0 };

    // 初期豆データを送信
    socket.emit("initializeBeans", beans);

    // プレイヤーのマウス座標を更新
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
    });

    // 豆がクリックされたとき
    socket.on("touchBean", (beanId) => {
        const bean = beans.find((b) => b.id === beanId);
        if (bean) {
            if (!bean.touchedBy.includes(socket.id)) {
                bean.touchedBy.push(socket.id);
            }

            if (bean.touchedBy.length === 2) {
                bean.isGlowing = true;

                // 二人の中点を計算
                const [player1, player2] = bean.touchedBy.map((id) => players[id]);
                bean.x = (player1.x + player2.x) / 2;
                bean.y = (player1.y + player2.y) / 2;

                io.emit("updateBean", bean);
            }
        }
    });

    // 豆がクリックから離れたとき
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

    // 切断時の処理
    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
        delete players[socket.id];

        beans.forEach((bean) => {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }
        });
    });
});

// サーバーの起動
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
