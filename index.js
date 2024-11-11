// index.js
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// ポート設定
const PORT = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static('public'));

// クライアントへのルーティング
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ソケット接続の処理
io.on('connection', (socket) => {
  console.log('A user connected');

  // マウスの動きを他のクライアントに送信
  socket.on('mouse move', (data) => {
    socket.broadcast.emit('mouse move', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// サーバーの起動
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
