const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const beans = [
    { id: 0, left: 123, top: 235, isGlowing: false, touchedBy: [] },
    { id: 1, left: 165, top: 310, isGlowing: false, touchedBy: [] },
    { id: 2, left: 187, top: 265, isGlowing: false, touchedBy: [] },
    { id: 3, left: 290, top: 315, isGlowing: false, touchedBy: [] },
    { id: 4, left: 245, top: 400, isGlowing: false, touchedBy: [] },
    { id: 5, left: 328, top: 305, isGlowing: false, touchedBy: [] },
    { id: 6, left: 375, top: 450, isGlowing: false, touchedBy: [] },
    { id: 7, left: 400, top: 480, isGlowing: false, touchedBy: [] },
    { id: 8, left: 350, top: 225, isGlowing: false, touchedBy: [] },
    { id: 9, left: 150, top: 340, isGlowing: false, touchedBy: [] }
]; // 豆データ
const players = {}; // 各プレイヤーの位置情報

// // 豆を初期化する関数
// function initializeBeans() {
//     for (let i = 0; i < 5; i++) {
//         beans.push({
//             id: i,
//             left: 200 + Math.random() * 100,
//             top: 300 + Math.random() * 100,
//             touchedBy: [],
//             isGlowing: false
//         });
//     }
//     console.log("Beans initialized:", beans);
// }


// 定期的に豆の位置を更新してクライアントに送信
setInterval(() => {
    beans.forEach(bean => {
        if (bean.touchedBy.length === 2) {
            const p1 = players[bean.touchedBy[0]];
            const p2 = players[bean.touchedBy[1]];

            if (p1 && p2) {
                bean.left = (p1.x + p2.x) / 2;
                bean.top = (p1.y + p2.y) / 2;

                // クライアントに新しい座標を送信
                io.emit("beanMoved", { id: bean.id, left: bean.left, top: bean.top });
                console.log(`Updated bean ${bean.id} to midpoint: { left: ${bean.left}, top: ${bean.top} }`);
            }
        }
    });
}, 30); // 30msごとに中点計算を実行




io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0 };

    // ゲーム開始イベント
    socket.on("startGame", () => {
        console.log("ゲーム開始リクエストを受信しました。");
        io.emit("gameStarted");
    });

    // スタートイベントを受け取る
    socket.on("startGame", () => {
        console.log("ゲーム開始リクエストを受信しました。");
        // 全てのクライアントにゲーム開始を通知
        io.emit("gameStarted");
    });

    // socket.emit("initializeBeans", beans);

    // プレイヤーのマウス位置を受信
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
        console.log(`Updated position for ${socket.id}:`, position); // デバッグ用ログ
    });

    // 豆がクリックされた時
    socket.on("beanTouched", (beanId) => {
        const bean = beans.find(b => b.id === beanId);
        if (!bean) return;
    
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
                console.log(`Calculated midpoint for bean ${bean.id}:`, { left: bean.left, top: bean.top }); // デバッグ用ログ

                io.emit("beanMoved", { id: bean.id, left: bean.left, top: bean.top });
                console.log(`Bean ${bean.id} moved to: { left: ${bean.left}, top: ${bean.top} }`); // デバッグ用
                io.emit("beanGlow", bean.id);
            }

            io.emit("playBeep", bean.id); // 二人が触っているときにビープ音再生指示を送信
            bean.isGlowing = true;
            io.emit("beanGlow", bean.id);

        }
    
        io.emit("updateBeans", beans);
    });
    
    socket.on("beanReleased", (beanId) => {
        const bean = beans.find(b => b.id === beanId);
        if (!bean) return;

        // プレイヤーIDを touchedBy から削除
        bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);

        // プレイヤーが 1 人以下の場合、光を止める
        if (bean.touchedBy.length < 2) {
            bean.isGlowing = false;
            io.emit("beanStopGlow", bean.id);
            console.log(`Bean ${beanId} stopped glowing`);
            io.emit("stopBeep", bean.id); // クリックが解除されたらビープ音停止指示を送信
            console.log(`Bean ${beanId} stopped sound`);
        }
    
        io.emit("updateBeans", beans); // 状態をクライアントに送信
    });
    

    // プレイヤー切断時
    socket.on("disconnect", () => {
        delete players[socket.id];
        beans.forEach(bean => {
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });
        io.emit("updateBeans", beans);
    });
});

// initializeBeans();

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
