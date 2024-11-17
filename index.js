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

// 各ユーザーのカーソル位置情報を保持
let cursors = {};

// サーバーの起動
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Initial puzzle positions:', puzzlePositions);
});

// ソケット接続の処理
io.on('connection', (socket) => {
  console.log('A user connected');

  // 接続時に初期位置情報を送信
  socket.emit('initialize puzzle', puzzlePositions);

  let participantNumber = null;
  let participantLetter = null;

  // スタートボタンを押されたときの処理
  socket.on('start game', (data) => {
    participantNumber = data.participantNumber;
    participantLetter = data.participantLetter;

    io.emit('game started');

    // ゲームのログファイル名を作成
    socket.gameLogFile = `game_log_${participantNumber}_${participantLetter}.csv`;
    socket.interactionLogFile = `interaction_log_${participantNumber}_${participantLetter}.csv`;

    // ゲームログとインタラクションログの初期設定（ヘッダー）
    const gameLogHeader = 'Event,Duration (ms)\n';
    const interactionLogHeader = 'Piece,Interaction Duration (ms)\n';

    // ファイルにヘッダーを書き込む
    fs.writeFileSync(path.join(__dirname, socket.gameLogFile), gameLogHeader);
    fs.writeFileSync(path.join(__dirname, socket.interactionLogFile), interactionLogHeader);
  });

  // ピースの移動イベント
  socket.on('piece move', (data) => {
    puzzlePositions[data.index] = { left: data.left, top: data.top }; // サーバーの位置情報を更新
    io.emit('piece move', data); // 全クライアントに更新情報を送信
  });

  // ピースのスナップイベント
  socket.on('piece snap', (data) => {
    puzzlePositions[data.index] = { left: data.left, top: data.top }; // サーバーの位置情報を更新
    io.emit('piece snap', data);
  });

  // インタラクション時間のログ保存
  socket.on('log interaction', (data) => {
    console.log(`Interaction received for piece ${data.index} with duration ${data.duration} ms`);

    const logEntry = `Piece ${data.index},${data.duration}\n`;
    fs.appendFile(path.join(__dirname, socket.interactionLogFile), logEntry, (err) => {
      if (err) throw err;
      console.log('Interaction data saved.');
    });
  });

  // カーソル位置の更新
  socket.on('mouse move', (data) => {
    cursors[socket.id] = data;
    io.emit('mouse move', { id: socket.id, position: data });
  });

  // ゲーム終了の処理
  socket.on('game finished', (data) => {
    console.log(`Game finished with duration: ${data.duration} ms, Total Move Time: ${data.totalMoveTime} ms, Total Click Time: ${data.totalClickTime} ms`);

    const logEntry = `Game Finished,${data.duration}\nTotal Move Time,${data.totalMoveTime}\nTotal Click Time,${data.totalClickTime}\n`;
    fs.appendFile(path.join(__dirname, socket.gameLogFile), logEntry, (err) => {
      if (err) throw err;
      console.log('Game finished data saved.');
    });
  });

  // ユーザーが切断されたときの処理
  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete cursors[socket.id]; // カーソル情報の削除
    io.emit('user disconnected', { id: socket.id });
  });
});
