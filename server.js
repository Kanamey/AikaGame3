const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public")); // publicフォルダ内の静的ファイルを提供

const beans = []; // 豆データを格納する配列
const players = {}; // 各プレイヤーの位置情報

// 豆を初期化する関数
function initializeBeans() {
    for (let i = 0; i < 5; i++) {
        beans.push({
            id: i,
            left: 200 + Math.random() * 100,
            top: 300 + Math.random() * 100,
            touchedBy: [],
            isGlowing: false
        });
    }
    console.log("Beans initialized successfully:", beans); // デバッグ: 初期化された豆の内容を表示
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0 };

    socket.emit("initializeBeans", beans);

    // マウス位置の更新
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
    });

    // 豆がクリックされた時
    socket.on("beanTouched", (beanId) => {
        console.log(`Received beanTouched event for beanId: ${beanId}`);

        // 厳格なバリデーション: beanIdが不正な場合にエラーを防ぐ
        const bean = beans.find((b) => b.id === beanId);
        if (!bean) {
            console.error(`Error: Bean with id ${beanId} does not exist.`);
            return; // 処理を中断
        }

        // クリックしたプレイヤーIDを追加
        if (!bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id);
        }

        // 2人がクリックしている場合、中点を計算
        if (bean.touchedBy.length === 2) {
            const p1 = players[bean.touchedBy[0]];
            const p2 = players[bean.touchedBy[1]];

            if (p1 && p2) {
                bean.left = (p1.x + p2.x) / 2;
                bean.top = (p1.y + p2.y) / 2;
                bean.isGlowing = true;

                console.log(`Bean ${beanId} midpoint: (${bean.left}, ${bean.top})`);
            }
        }

        io.emit("updateBeans", beans);
    });

    // 豆が離された時
    socket.on("beanReleased", (beanId) => {
        console.log(`Received beanReleased event for beanId: ${beanId}`);

        const bean = beans.find((b) => b.id === beanId);
        if (!bean) {
            console.error(`Error: Bean with id ${beanId} does not exist.`);
            return;
        }

        bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
        if (bean.touchedBy.length < 2) {
            bean.isGlowing = false;
        }

        io.emit("updateBeans", beans);
    });

    // プレイヤーが切断した時
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];

        beans.forEach((bean) => {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });

        io.emit("updateBeans", beans);
    });
});

// 豆の初期化とサーバー起動
initializeBeans();

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
