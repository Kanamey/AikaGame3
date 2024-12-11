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
        touchedBy: []
    });
}

io.on("connection", (socket) => {
    console.log("A user connected");

    // クライアントに初期豆を送信
    socket.emit("initializeBeans", beans);

    // 豆が触られたときの処理
    socket.on("beanTouched", (index) => {
        if (!beans[index].touchedBy.includes(socket.id)) {
            beans[index].touchedBy.push(socket.id);
        }

        if (beans[index].touchedBy.length === 2) {
            io.emit("beanGlow", index); // 豆を光らせる
        }
    });

    // 豆が離されたときの処理
    socket.on("beanReleased", (index) => {
        beans[index].touchedBy = beans[index].touchedBy.filter(id => id !== socket.id);

        if (beans[index].touchedBy.length < 2) {
            io.emit("beanStopGlow", index); // 豆の光を止める
        }
    });

    // カーソルの中点を更新
    socket.on("updateCursorMidpoint", (data) => {
        beans[data.index].left = data.x;
        beans[data.index].top = data.y;
        io.emit("updateCursorMidpoint", data); // クライアントに中点情報を送信
    });

    // 切断時の処理
    socket.on("disconnect", () => {
        beans.forEach(bean => {
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
