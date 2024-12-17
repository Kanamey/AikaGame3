const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public")); // publicフォルダ内の静的ファイルを提供

const beans = []; // 豆データを格納する配列
const players = {}; // 各プレイヤーのマウス位置情報を格納

// 豆を初期化する関数
function initializeBeans() {
    for (let i = 0; i < 5; i++) {
        beans.push({
            id: i,
            left: 200 + Math.random() * 100, // 初期X座標
            top: 300 + Math.random() * 100,  // 初期Y座標
            touchedBy: [], // クリックしているプレイヤーID
            isGlowing: false // 光っているかどうか
        });
    }
    console.log("Beans initialized:", beans);
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0 }; // プレイヤー初期座標

    // 初期豆データを送信
    socket.emit("initializeBeans", beans);

    // マウス位置の更新
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
        console.log(`Player ${socket.id} position:`, position);
    });

    // 豆がクリックされた場合
    socket.on("beanTouched", (beanId) => {
        console.log(`Bean touched event received for beanId: ${beanId}`);
        const bean = beans.find(b => b.id === beanId); // IDが一致する豆を取得

        if (!bean) {
            console.error(`Error: Bean with id ${beanId} not found`);
            return; // 存在しない場合は処理を中断
        }

        if (!bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id);
        }

        console.log(`Bean ${beanId} touched by: ${bean.touchedBy}`);

        // 2人のプレイヤーが触れている場合、中点計算
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

        io.emit("updateBeans", beans); // クライアントに更新データを送信
    });

    // 豆が離された場合
    socket.on("beanReleased", (beanId) => {
        console.log(`Bean released event for beanId: ${beanId}`);
        const bean = beans.find(b => b.id === beanId);

        if (!bean) {
            console.error(`Error: Bean with id ${beanId} not found`);
            return;
        }

        bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
        if (bean.touchedBy.length < 2) {
            bean.isGlowing = false;
        }

        console.log(`Bean ${beanId} released, touchedBy: ${bean.touchedBy}`);
        io.emit("updateBeans", beans);
    });

    // プレイヤーが切断した場合
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];

        // 切断したプレイヤーが触れていた豆を解除
        beans.forEach(bean => {
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });

        io.emit("updateBeans", beans);
    });
});

// 豆の初期化とサーバー起動
initializeBeans();

const PORT = process.env.PORT || 10000; // Renderの動的ポート対応
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
