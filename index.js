const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

let beans = [];
for (let i = 0; i < 5; i++) {
    beans.push({
        left: Math.random() * 500,
        top: Math.random() * 500,
        touchedBy: []  // プレイヤーIDを格納する配列
    });
}

io.on("connection", (socket) => {
    console.log("A user connected");

    // 初期状態の豆の位置情報を送信
    socket.emit("initializeBeans", beans);

    // 豆の移動情報を他のクライアントにブロードキャスト
    socket.on("beanMoved", (data) => {
        beans[data.index].left = data.left;
        beans[data.index].top = data.top;
        socket.broadcast.emit("beanMoved", data);
    });

    // 豆が触られた時の処理
    socket.on("beanTouched", (index) => {
        if (!beans[index].touchedBy.includes(socket.id)) {
            beans[index].touchedBy.push(socket.id);
        }

        if (beans[index].touchedBy.length === 2) {
            io.emit("beanColorChange", { index: index, color: "red" });
        }
    });

    // 豆が放された時の処理
    socket.on("beanReleased", (index) => {
        beans[index].touchedBy = beans[index].touchedBy.filter(id => id !== socket.id);

        if (beans[index].touchedBy.length < 2) {
            io.emit("beanColorChange", { index: index, color: "brown" });
        }
    });

    // 豆が削除されたことを他のクライアントに通知
    socket.on("beanRemoved", (index) => {
        beans[index] = null; // 豆を削除としてマーク
        socket.broadcast.emit("beanRemoved", index);
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
