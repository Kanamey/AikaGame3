const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = process.env.PORT || 3000;

let players = {}; // プレイヤーのドラッグ情報を保存
let ropePosition = 0; // 綱の中点位置
const ROPE_SPEED = 0.5; // 綱の移動速度

// 静的ファイルを提供
app.use(express.static('public'));

// 定期的に綱の位置を計算してクライアントに送信（30msごと）
setInterval(() => {
    const dragValues = Object.values(players);
    if (dragValues.length === 2) {
        // 2人のドラッグ量の差分を計算
        const dragDiff = (dragValues[0]?.dragX || 0) - (dragValues[1]?.dragX || 0);

        // 綱の位置を更新
        ropePosition += dragDiff * ROPE_SPEED;

        // 綱の移動範囲を制限
        ropePosition = Math.max(-150, Math.min(150, ropePosition));
    }

    // 全クライアントに綱の位置を送信
    io.emit('update', ropePosition);
}, 30);

// ソケット通信の設定
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 新しいプレイヤーの初期化
    players[socket.id] = { dragX: 0 };

    // クライアントからドラッグ情報を受信
    socket.on('drag', (dragX) => {
        players[socket.id].dragX = dragX;
    });

    // プレイヤーが切断された場合
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        delete players[socket.id];
    });
});

// サーバを起動
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});