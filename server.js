const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public")); // publicフォルダ内の静的ファイル（index.html）を提供

const beans = []; // 豆データを格納する配列
const players = {}; // 各プレイヤーの位置情報を格納するオブジェクト

// 豆を初期化する関数
function initializeBeans() {
    for (let i = 0; i < 5; i++) {
        beans.push({
            id: i, // 豆のID
            left: 200 + Math.random() * 100, // 初期X座標（ランダム配置）
            top: 300 + Math.random() * 100,  // 初期Y座標（ランダム配置）
            touchedBy: [], // クリック中のプレイヤーIDを格納
            isGlowing: false // 豆が光っているかどうか
        });
    }
    console.log("Beans initialized:", beans);
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0 }; // 接続したプレイヤーの初期座標

    // 初期豆データをクライアントに送信
    socket.emit("initializeBeans", beans);

    // クライアントからマウスの位置が送信されたとき
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position; // プレイヤーのマウス位置を保存
        console.log(`Player ${socket.id} position:`, position);
    });

    // クライアントが豆をクリックしたとき
    socket.on("beanTouched", (beanId) => {
        const bean = beans.find((b) => b.id === beanId); // クリックされた豆を検索
        if (bean && !bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id); // クリックしたプレイヤーを記録
        }

        console.log(`Bean ${beanId} touched by: ${bean.touchedBy}`);

        // 2人のプレイヤーが同時にクリックしている場合、中点を計算
        if (bean.touchedBy.length === 2) {
            const p1 = players[bean.touchedBy[0]]; // プレイヤー1の位置
            const p2 = players[bean.touchedBy[1]]; // プレイヤー2の位置

            if (p1 && p2) {
                // 中点を計算し、豆の座標を更新
                bean.left = (p1.x + p2.x) / 2;
                bean.top = (p1.y + p2.y) / 2;
                bean.isGlowing = true; // 豆を光らせる

                console.log(`Bean ${beanId} midpoint: (${bean.left}, ${bean.top})`);
            }
        }

        // 更新された豆のデータを全クライアントに送信
        io.emit("updateBeans", beans);
    });

    // クライアントが豆を離したとき
    socket.on("beanReleased", (beanId) => {
        const bean = beans.find((b) => b.id === beanId);
        if (bean) {
            // 離したプレイヤーを記録から削除
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);

            // 2人未満になったら豆を光らせない
            if (bean.touchedBy.length < 2) {
                bean.isGlowing = false;
            }
            console.log(`Bean ${beanId} released, touchedBy: ${bean.touchedBy}`);
        }

        // 更新された豆のデータを全クライアントに送信
        io.emit("updateBeans", beans);
    });

    // プレイヤーが切断したとき
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id]; // プレイヤー情報を削除

        // 切断したプレイヤーが触っていた豆を解除
        beans.forEach((bean) => {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });

        // 更新された豆のデータを全クライアントに送信
        io.emit("updateBeans", beans);
    });
});

// 豆の初期化とサーバー起動
initializeBeans();
const PORT = process.env.PORT || 3000; // ポート番号の設定（Render環境対応）
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
