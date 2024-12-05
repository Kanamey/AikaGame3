// 二人別々に豆を二人で移動できる
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("A user connected");

    // 初期状態の豆の位置情報を送信
    socket.emit("initializeBeans", beans);

    // 豆の移動情報を他のクライアントにブロードキャスト
    socket.on("beanMoved", (data) => {
        socket.broadcast.emit("beanMoved", data);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// 初期豆の位置情報をサーバー側で管理
let beans = [];
for (let i = 0; i < 5; i++) {
    beans.push({
        left: Math.random() * 500, // 初期位置をランダムに設定
        top: Math.random() * 500,
    });
}

