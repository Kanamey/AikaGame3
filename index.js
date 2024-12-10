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

    // 他のプレイヤーが豆を移動したときの処理
    socket.on("beanMoved", (data) => {
        beans[data.index].left = data.left;
        beans[data.index].top = data.top;
        io.emit("beanMoved", data); // 全クライアントにブロードキャスト
    });

    // 豆が触られた時の処理
    socket.on("beanTouched", (index) => {
        if (!beans[index].touchedBy.includes(socket.id)) {
            beans[index].touchedBy.push(socket.id);
        }

        // 二人が同時に触った場合に豆を光らせる
        if (beans[index].touchedBy.length === 2) {
            io.emit("beanGlow", index);
        }
    });

    // 豆が離された時の処理
    socket.on("beanReleased", (index) => {
        beans[index].touchedBy = beans[index].touchedBy.filter(id => id !== socket.id);

        // 光を止める
        io.emit("beanStopGlow", index);
    });

    // 二人が同時に触っている間、豆を二人のカーソルの中点に移動させる
    socket.on("beanMoveToCenter", (data) => {
        const { index, position } = data;
        beans[index].left = position.x;
        beans[index].top = position.y;
        io.emit("beanMoveToCenter", data);
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
