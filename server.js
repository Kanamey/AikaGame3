const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public")); // 静的ファイルを提供

const beans = []; // 豆データの配列
const players = {}; // プレイヤーの位置情報

// 豆を初期化する関数
function initializeBeans() {
    for (let i = 0; i < 5; i++) {
        beans.push({
            id: i,
            left: 200 + Math.random() * 100, // 初期X座標（適当な範囲）
            top: 300 + Math.random() * 100,  // 初期Y座標（適当な範囲）
            touchedBy: [], // クリック中のプレイヤー
            isGlowing: false // 光っているかどうか
        });
    }
    console.log("Beans initialized:", beans);
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // 初期データ送信
    socket.emit("initializeBeans", beans);

    // プレイヤーのマウス位置を更新
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
    });

    // 豆がクリックされたとき
    socket.on("beanTouched", (beanId) => {
        const bean = beans.find(b => b.id === beanId);
        if (bean && !bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id);
        }

        // 2人のプレイヤーが触れている場合、中点を計算
        if (bean.touchedBy.length === 2) {
            const player1 = players[bean.touchedBy[0]];
            const player2 = players[bean.touchedBy[1]];

            if (player1 && player2) {
                // 中点計算
                bean.left = (player1.x + player2.x) / 2;
                bean.top = (player1.y + player2.y) / 2;
                bean.isGlowing = true;

                console.log(`Bean ${beanId} glowing at midpoint: (${bean.left}, ${bean.top})`);
            }
        }

        io.emit("updateBeans", beans); // クライアントに更新通知
    });

    // 豆から手が離れたとき
    socket.on("beanReleased", (beanId) => {
        const bean = beans.find(b => b.id === beanId);
        if (bean) {
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);

            // 光る状態を解除
            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }
        }

        io.emit("updateBeans", beans); // クライアントに更新通知
    });

    // 切断時の処理
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];

        // 切断したプレイヤーが触っていた豆を解除
        beans.forEach(bean => {
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }
        });

        io.emit("updateBeans", beans);
    });
});

// 豆の初期化とサーバー起動
initializeBeans();

// ポート設定を追加（Render 環境対応）
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
