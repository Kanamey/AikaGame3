const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// ポート設定
const PORT = process.env.PORT || 10000;

// 静的ファイルの提供
app.use(express.static('public'));

// 初期パズル位置情報を保持
const puzzlePositions = Array.from({ length: 16 }, () => ({
  left: Math.floor(Math.random() * 600), // 600px以内に収まるように設定
  top: Math.floor(Math.random() * 600)
}));

// 各ユーザーのカーソル位置情報とクリック状態を保持
let cursors = {};
let clickStates = {};

// サーバーの起動
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ソケット接続の処理
io.on('connection', (socket) => {
  console.log('A user connected');

  // 接続時に初期位置情報を送信
  socket.emit('initialize puzzle', puzzlePositions);

  // ピースのドラッグ開始
  socket.on('start drag', (data) => {
    if (!clickStates[data.index]) {
      clickStates[data.index] = new Set();
    }
    clickStates[data.index].add(socket.id);

    console.log(`Piece ${data.index} is being dragged by: ${[...clickStates[data.index]].join(', ')}`);

    // 1人以上がクリックしている場合に移動を許可
    if (clickStates[data.index].size >= 1) {
      console.log(`Piece ${data.index} move allowed`);
      io.emit('allow move', data.index);
    }
  });

  // ピースのドラッグ終了
  socket.on('end drag', (data) => {
    if (clickStates[data.index]) {
      clickStates[data.index].delete(socket.id);
      console.log(`Piece ${data.index} is no longer dragged by: ${socket.id}`);

      // どちらかがクリックをやめた場合にピースの移動を停止
      if (clickStates[data.index].size < 1) {
        console.log(`Piece ${data.index} move stopped`);
        io.emit('stop move', data.index);
      }
    }
  });

  // ピースの移動イベント
  socket.on('piece move', (data) => {
    puzzlePositions[data.index] = { left: data.left, top: data.top }; // サーバーの位置情報を更新
    console.log(`Piece ${data.index} moved to: left=${data.left}, top=${data.top}`);
    io.emit('piece move', data); // 全クライアントに更新情報を送信
  });

  // カーソル位置の更新
  socket.on('mouse move', (data) => {
    cursors[socket.id] = data;
    io.emit('mouse move', { id: socket.id, position: data });
  });

  // ユーザーが切断されたときの処理
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete cursors[socket.id];

    Object.keys(clickStates).forEach((index) => {
      if (clickStates[index].has(socket.id)) {
        clickStates[index].delete(socket.id);
        if (clickStates[index].size < 1) {
          console.log(`Piece ${index} move stopped due to disconnection`);
          io.emit('stop move', parseInt(index));
        }
      }
    });
  });
});
