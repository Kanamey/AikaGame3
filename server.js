const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const beans = []; // 豆データを格納する配列
const players = {}; // 各プレイヤーの位置情報

// 豆を初期化する関数
function initializeBeans() {
    for (let i = 0; i < 5; i++) {
        beans.push({
            id: i,
            left: 200 + Math.random() * 100, // 初期X座標
            top: 300 + Math.random() * 100,  // 初期Y座標
            touchedBy: [], // クリックしたプレイヤーID
            isGlowing: false // 光っているかどうか
        });
    }
    console.log("Beans initialized:", beans);
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0 };

    socket.emit("initializeBeans", beans);

    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
    });

    socket.on("beanTouched", (beanId) => {
        // デバッグ: 受け取ったbeanIdの確認
        console.log(`Received beanTouched for beanId: ${beanId}`);

        // 豆が存在するか確認する
        const bean = beans.find((b) => b.id === beanId);
        if (!bean) {
            console.error(`Error: Bean with id ${beanId} does not exist.`);
            return; // エラー処理で中断
        }

        if (!bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id);
        }

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

    socket.on("beanReleased", (beanId) => {
        console.log(`Bean released for beanId: ${beanId}`);

        const bean = beans.find((b) => b.id === beanId);
        if (!bean) {
            console.error(`Error: Bean with id ${beanId} does not exist.`);
            return; // エラー処理で中断
        }

        bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
        if (bean.touchedBy.length < 2) {
            bean.isGlowing = false;
        }

        io.emit("updateBeans", beans);
    });

    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];

        beans.forEach(bean => {
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });

        io.emit("updateBeans", beans);
    });
});

// 豆の初期化とサーバー起動
initializeBeans();

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
