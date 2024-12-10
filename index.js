const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

// 初期豆の設定
let beans = [];
for (let i = 0; i < 5; i++) {
    beans.push({
        left: Math.random() * 500,
        top: Math.random() * 500,
        touchedBy: [] // プレイヤーIDを格納する配列
    });
}

io.on("connection", (socket) => {
    console.log("A user connected");

    // 初期状態の豆の位置情報を送信
    socket.emit("initializeBeans", beans);

    // 豆が触られた時の処理
    socket.on("beanTouched", (index) => {
        if (!beans[index].touchedBy.includes(socket.id)) {
            beans[index].touchedBy.push(socket.id);
        }

        // 二人が同時に触っている場合に豆を光らせる
        if (beans[index].touchedBy.length === 2) {
            io.emit("beanGlow", index);
        }
    });

    // 豆が離された時の処理
    socket.on("beanReleased", (index) => {
        beans[index].touchedBy = beans[index].touchedBy.filter(id => id !== socket.id);

        // 二人のタッチが解除された場合
        if (beans[index].touchedBy.length < 2) {
            io.emit("beanStopGlow", index);

            // 光が停止した豆を消滅させる
            io.emit("beanDisappear", index);
            beans.splice(index, 1); // サーバー側のリストから豆を削除
        }
    });

    // 二人が同時に触れている間、豆をカーソルの中点に移動
    socket.on("updateCursorMidpoint", (data) => {
        beans[data.index].left = data.x;
        beans[data.index].top = data.y;
        io.emit("updateCursorMidpoint", data); // 全クライアントに中点情報を送信
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
        beans.forEach(bean => {
            if (bean) {
                bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
