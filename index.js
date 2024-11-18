// ; 同じピースに触れると青くなるコード
// 必要なモジュールのインポート
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

// ポート設定
const PORT = process.env.PORT || 10000;

// 静的ファイルの提供
app.use(express.static('public'));

// 初期パズル位置情報を保持
const puzzlePositions = Array.from({ length: 16 }, () => ({
  left: Math.floor(Math.random() * 450), // 450px以内に収まるように設定
  top: Math.floor(Math.random() * 450)
}));

// 各ユーザーのカーソル位置情報とクリック状態を保持
let cursors = {};
let clickStates = {}; // ピースごとにクリックしているユーザーを追跡

// サーバーの起動
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ソケット接続の処理
io.on('connection', (socket) => {
  console.log('A user connected');

  // 接続時に初期位置情報を送信
  socket.emit('initialize puzzle', puzzlePositions);

  // スタートボタンを押されたときの処理
  socket.on('start game', (data) => {
    io.emit('game started');
  });

  // カーソル位置の更新
  socket.on('mouse move', (data) => {
    cursors[socket.id] = data;
    io.emit('mouse move', { id: socket.id, position: data });
  });

  // ピースのドラッグ開始
  socket.on('start drag', (data) => {
    if (!clickStates[data.index]) {
      clickStates[data.index] = new Set();
    }
    clickStates[data.index].add(socket.id);

    // 2人が同じピースをクリックしているか確認
    if (clickStates[data.index].size >= 2) {
      io.emit('allow move', data.index);
    }
  });

  // ピースのドラッグ終了
  socket.on('end drag', (data) => {
    if (clickStates[data.index]) {
      clickStates[data.index].delete(socket.id);
      if (clickStates[data.index].size < 2) {
        io.emit('stop move', data.index);
      }
    }
  });

  // ピースの移動イベント
  socket.on('piece move', (data) => {
    puzzlePositions[data.index] = { left: data.left, top: data.top }; // サーバーの位置情報を更新
    io.emit('piece move', data); // 全クライアントに更新情報を送信
  });

  // ユーザーが切断されたときの処理
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete cursors[socket.id];

    // すべてのクリック状態から切断されたユーザーを削除
    Object.keys(clickStates).forEach((index) => {
      if (clickStates[index].has(socket.id)) {
        clickStates[index].delete(socket.id);
        if (clickStates[index].size < 2) {
          io.emit('stop move', parseInt(index));
        }
      }
    });
  });
});
