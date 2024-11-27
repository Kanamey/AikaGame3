// 二人同時に同じピースをクリックすると、右上に赤丸表示
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
  left: Math.floor(Math.random() * 450),
  top: Math.floor(Math.random() * 450),
  snapped: false
}));

let currentlyClicked = {}; // 各ピースのクリック状態を保持

// サーバーの起動
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Initial puzzle positions:', puzzlePositions);
});

// ソケット接続の処理
io.on('connection', (socket) => {
  console.log('A user connected');

  // 初期パズル位置情報を送信
  socket.emit('initialize puzzle', puzzlePositions);

  // ゲームスタートイベント
  socket.on('start game', (data) => {
    console.log(`Game started by: ${data.participantNumber}${data.participantLetter}`);
    if (data.participantLetter === 'watch') {
      socket.emit('watch only');
    } else {
      socket.emit('game started for participant'); // ゲームを開始するクライアントにのみ通知
    }

    // ゲームログファイルの作成
    socket.gameLogFile = `game_log_${data.participantNumber}_${data.participantLetter}.csv`;
    fs.writeFileSync(socket.gameLogFile, 'Event,Duration (ms)\n', (err) => {
      if (err) throw err;
    });
  });

  // ピースがクリックされたときのイベント
  socket.on('piece clicked', (data) => {
    if (!currentlyClicked[data.index]) {
      currentlyClicked[data.index] = [];
    }
    currentlyClicked[data.index].push(socket.id);

    if (currentlyClicked[data.index].length === 2) {
      io.emit('both clicked');
    }else{
      io.emit('not both clicked');
    }
  });

  // ピースが離されたときのイベント
  socket.on('piece released', (data) => {
    console.log("release呼ばれたよ！")
    if (currentlyClicked[data.index]) {
      console.log("removeの前")
      console.log(currentlyClicked[data.index])
      currentlyClicked[data.index] = currentlyClicked[data.index].filter(id => id !== socket.id);
      console.log("removeの後")
      console.log(currentlyClicked[data.index])
      if (currentlyClicked[data.index].length < 2) {
        io.emit('not both clicked');
        return;
      }
    }
  });

  // ピースの移動イベント
  socket.on('piece move', (data) => {
    if (puzzlePositions[data.index].snapped) {
      // すでにスナップされたピースは正しい位置に戻す
      socket.emit('piece snap', {
        index: data.index,
        left: puzzlePositions[data.index].left,
        top: puzzlePositions[data.index].top
      });
      return;
    }
    puzzlePositions[data.index] = { left: data.left, top: data.top, snapped: false };
    socket.broadcast.emit('piece move', data);
  });

  // ピースが正しい位置にスナップされた場合のイベント
  socket.on('piece snap', (data) => {
    // サーバー側でピースの位置を確定
    const correctX = (data.index % 4) * 150;
    const correctY = Math.floor(data.index / 4) * 150;
    puzzlePositions[data.index] = { left: correctX, top: correctY, snapped: true };

    // 全てのクライアントにピースのスナップを通知
    io.emit('piece snap', { index: data.index, left: correctX, top: correctY });
    console.log(`Piece ${data.index} snapped to correct position at (${correctX}, ${correctY})`);

    // ロックするのは正解したピースのみ
    io.emit('lock piece', { index: data.index });
  });

  // インタラクションのログ記録
  socket.on('log interaction', (data) => {
    const logEntry = `Piece ${data.index},${data.duration}\n`;
    fs.appendFile(socket.gameLogFile, logEntry, (err) => {
      if (err) throw err;
    });
  });

  // ゲームが終了した際のログ記録
  socket.on('game finished', (data) => {
    const logEntry = `Game Finished,${data.duration}\nTotal Move Time,${data.totalMoveTime}\n`;
    fs.appendFile(socket.gameLogFile, logEntry, (err) => {
      if (err) throw err;
      console.log('Game finished data saved.');
    });
  });

  // ユーザーが切断された場合の処理
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    // クリック状態の管理から切断したユーザーを削除
    for (let index in currentlyClicked) {
      currentlyClicked[index] = currentlyClicked[index].filter(id => id !== socket.id);
      if (currentlyClicked[index].length < 2) {
        io.emit('not both clicked');
      }
    }
  });
});
