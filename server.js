// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let startTime = null;
let pieceStartTimes = {};
let gameCompleted = false;

// 各ピースの初期状態 (例: 36ピースのデータを準備)
let pieces = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    isInCorrectPosition: false // 初期状態としてすべてfalse
}));

// 全ピースが正しい位置にあるか確認する関数
function allPiecesInPlace() {
    return pieces.every(piece => piece.isInCorrectPosition);
}

// 接続処理
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    socket.on('startGame', () => {
        if (!startTime) startTime = Date.now();
        io.emit('startGame');
    });

    socket.on('selectPiece', ({ pieceId, playerId }) => {
        io.emit('pieceSelected', { pieceId, playerId });
    });

    socket.on('movePiece', ({ pieceId, x, y }) => {
        io.emit('updatePiece', { pieceId, x, y });
    });

    socket.on('placePiece', ({ pieceId }) => {
        if (!pieceStartTimes[pieceId]) pieceStartTimes[pieceId] = Date.now();
        const timeHeld = Date.now() - pieceStartTimes[pieceId];
        
        // ピースが正しい位置に配置されたと仮定してマークする
        const piece = pieces.find(p => p.id === pieceId);
        if (piece) piece.isInCorrectPosition = true;

        // CSVファイルにデータ出力
        fs.appendFileSync('game_times.csv', `Piece ${pieceId},${timeHeld}\n`);
        
        // 完成確認
        checkGameCompletion();
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
    });
});

// ゲームが終了したかどうかを確認する関数
function checkGameCompletion() {
    if (allPiecesInPlace()) {
        gameCompleted = true;
        const totalTime = Date.now() - startTime;
        fs.appendFileSync('game_times.csv', `Total Time,${totalTime}\n`);
        io.emit('gameComplete', { totalTime });
    }
}

server.listen(4000, () => {
    console.log('Server is running on port 4000');
});
