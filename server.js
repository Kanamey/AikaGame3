const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const beans = [
    { id: 0, left: 110, top: 110, isGlowing: false, touchedBy: [] },
    { id: 1, left: 140, top: 260, isGlowing: false, touchedBy: [] },
    { id: 2, left: 180, top: 300, isGlowing: false, touchedBy: [] },
    { id: 3, left: 120, top: 400, isGlowing: false, touchedBy: [] },
    { id: 4, left: 600, top: 250, isGlowing: false, touchedBy: [] },
    { id: 5, left: 230, top: 350, isGlowing: false, touchedBy: [] },
    { id: 6, left: 310, top: 270, isGlowing: false, touchedBy: [] },
    { id: 7, left: 300, top: 300, isGlowing: false, touchedBy: [] },
    { id: 8, left: 400, top: 450, isGlowing: false, touchedBy: [] },
    { id: 9, left: 330, top: 410, isGlowing: false, touchedBy: [] },
    { id: 10, left: 250, top: 220, isGlowing: false, touchedBy: [] },
    { id: 11, left: 150, top: 480, isGlowing: false, touchedBy: [] },
    { id: 12, left: 280, top: 430, isGlowing: false, touchedBy: [] },
    { id: 13, left: 200, top: 330, isGlowing: false, touchedBy: [] },
    { id: 14, left: 180, top: 470, isGlowing: false, touchedBy: [] },
    { id: 15, left: 130, top: 360, isGlowing: false, touchedBy: [] },
    { id: 16, left: 340, top: 350, isGlowing: false, touchedBy: [] },
    { id: 17, left: 300, top: 120, isGlowing: false, touchedBy: [] },
    { id: 18, left: 210, top: 290, isGlowing: false, touchedBy: [] },
    { id: 19, left: 170, top: 110, isGlowing: false, touchedBy: [] },
    { id: 20, left: 400, top: 430, isGlowing: false, touchedBy: [] },
    { id: 21, left: 260, top: 420, isGlowing: false, touchedBy: [] },
    { id: 22, left: 150, top: 100, isGlowing: false, touchedBy: [] },
    { id: 23, left: 310, top: 380, isGlowing: false, touchedBy: [] },
    { id: 24, left: 140, top: 240, isGlowing: false, touchedBy: [] },
    { id: 25, left: 250, top: 460, isGlowing: false, touchedBy: [] },
    { id: 26, left: 160, top: 480, isGlowing: false, touchedBy: [] },
    { id: 27, left: 170, top: 530, isGlowing: false, touchedBy: [] },
    { id: 28, left: 270, top: 370, isGlowing: false, touchedBy: [] },
    { id: 29, left: 200, top: 290, isGlowing: false, touchedBy: [] },
    { id: 30, left: 240, top: 550, isGlowing: false, touchedBy: [] },
    { id: 31, left: 390, top: 240, isGlowing: false, touchedBy: [] },
    { id: 32, left: 340, top: 580, isGlowing: false, touchedBy: [] },
    { id: 33, left: 260, top: 410, isGlowing: false, touchedBy: [] },
    { id: 34, left: 150, top: 280, isGlowing: false, touchedBy: [] },
    { id: 35, left: 180, top: 500, isGlowing: false, touchedBy: [] },
    { id: 36, left: 380, top: 300, isGlowing: false, touchedBy: [] },
    { id: 37, left: 210, top: 500, isGlowing: false, touchedBy: [] },
    { id: 38, left: 250, top: 420, isGlowing: false, touchedBy: [] },
    { id: 39, left: 170, top: 410, isGlowing: false, touchedBy: [] },
];

 // 豆データ
let initialBeans = JSON.parse(JSON.stringify(beans)); // 初期状態をコピー
const players = {}; // 各プレイヤーの位置情報
const beanTimers = {}; // 各豆の時間を計測するオブジェクト

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

let isGameRunning = false; // ゲームが実行中かどうかを管理
let countdown; // タイマーの状態を保持

// CSVデータ保持
let csvData = [["Bean ID", "Start Time", "End Time", "Duration (seconds)"]];

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);// ユーザーが接続した際のログ
    players[socket.id] = { x: 0, y: 0 };// プレイヤーの初期データをセット

    // スタートボタンが押されたらゲームを開始
    socket.on("startGame", () => {
        if (!isGameRunning) { // ゲームがまだ実行中でない場合のみ開始
            isGameRunning = true;
            let timeLeft = 5 * 60; // 5分（秒）

            countdown = setInterval(() => {
                timeLeft--;
                io.emit("updateTimer", timeLeft); // 全クライアントに残り時間を送信

                if (timeLeft <= 0) {
                    clearInterval(countdown);
                    isGameRunning = false;
                    io.emit("gameEnded"); // 全クライアントにタイムアップを通知
                }
            }, 1000); // 1秒ごとに実行
        }
    });

    // プレイヤーのマウス位置を受信
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
        console.log(`Updated position for ${socket.id}:`, position); // デバッグ用ログ
    });

    // 豆がクリックされた時
    socket.on("beanTouched", (beanId) => {
        const bean = beans.find(b => b.id === beanId);
        if (!bean) return;
    
        // プレイヤーを touchedBy 配列に追加
        if (!bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id);
        }
    
        // 2人のプレイヤーが同じ豆をクリックしたら
        if (bean.touchedBy.length === 2) {
            const p1 = players[bean.touchedBy[0]];
            const p2 = players[bean.touchedBy[1]];
            beanTimers[beanId] = Date.now(); // 開始時刻を記録
    
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
        const bean = beans.find(b => b.id === beanId);// 指定されたIDの豆を検索
        if (!bean) return;

        // 時間計測が開始されていた場合、経過時間を記録
        if (beanTimers[beanId]) {
            const endTime = Date.now(); // 終了時刻
            const startTime = beanTimers[beanId]; // 開始時刻
            const duration = (endTime - startTime) / 1000; // 秒単位に変換

            // CSVデータに記録
            csvData.push([beanId, new Date(startTime).toISOString(), new Date(endTime).toISOString(), duration.toFixed(2)]);
            delete beanTimers[beanId]; // 記録が終わったら削除
        }

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

    // CSVファイルのリクエスト処理
    socket.on("requestCSV", () => {
        const csvContent = csvData.map(row => row.join(",")).join("\n"); // CSV形式に変換
        fs.writeFileSync("game_data.csv", csvContent); // ファイルに保存
        socket.emit("csvReady", "/game_data.csv"); // クライアントに通知
    });

    // 豆のデータをクライアントに送信
    socket.on("requestBeanData", () => {
        socket.emit("sendBeanData", beans);
        console.log(`豆の状態をクライアント ${socket.id} に送信しました`);
    });

    socket.on("resetGame", () => { //resetBeandをreserGameに変更
        // initialBeans = JSON.parse(JSON.stringify(beans)); // 初期状態に戻す
        beans.splice(0, beans.length, ...JSON.parse(JSON.stringify(initialBeans)));// beansにinitialBeansを入れて初期状態に戻す
        io.emit("updateBeans", initialBeans); // 全クライアントに更新を通知
        // io.emit("updateBeans", beans);// クライアントに豆の初期位置を通知
        console.log("Beans have been reset to initial state");

        // beanTimersを初期化
        for (const beanId in beanTimers) {
            delete beanTimers[beanId];
        }

        csvData = [["Bean ID", "Start Time", "End Time", "Duration (seconds)"]];
        console.log("CSV data has been reset");

        // タイマーのリセット
        if (countdown) {
            clearInterval(countdown);
            countdown = null;
            isGameRunning = false;
        }
        io.emit("resetTimer"); // クライアントにタイマーのリセットを通知

    });


    // プレイヤー切断時
    socket.on("disconnect", () => {
        delete players[socket.id];
        beans.forEach(bean => {
            // touchedBy 配列から該当プレイヤーを削除
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });
        io.emit("updateBeans", beans);
    });
});

// CSVファイルをクライアントに提供するエンドポイント
app.get("/game_data.csv", (req, res) => {
    res.download("game_data.csv"); // ファイルをダウンロードとして提供
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
