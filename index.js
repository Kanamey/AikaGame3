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
        io.emit("beanMoved", data); // 全てのクライアントにブロードキャスト
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

    // 豆が削除されたことを他のクライアントに通知し、新しい豆を追加
    socket.on("beanRemoved", (index) => {
        beans[index] = null; // 一旦削除
        io.emit("beanRemoved", index); // 全てのクライアントに削除情報をブロードキャスト

        // 新しい豆を一定時間後に生成する
        setTimeout(() => {
            const newBean = {
                left: Math.random() * 100,  // 左のお皿内のランダム位置に配置
                top: Math.random() * 100,
                touchedBy: []
            };
            beans[index] = newBean; // 消えた豆の位置に新しい豆を追加
            io.emit("addNewBean", { index: index, left: newBean.left, top: newBean.top }); // 新しい豆の追加情報を全てのクライアントに送信
        }, 1000); // アニメーション終了後に新しい豆を生成
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
