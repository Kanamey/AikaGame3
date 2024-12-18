const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const beans = []; // 豆データ
const players = {}; // 各プレイヤーの位置情報

// 豆を初期化する関数
function initializeBeans() {
    for (let i = 0; i < 5; i++) {
        beans.push({
            id: i,
            left: 200 + Math.random() * 100,
            top: 300 + Math.random() * 100,
            touchedBy: [],
            isGlowing: false
        });
    }
    console.log("Beans initialized:", beans);
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0 };

    socket.emit("initializeBeans", beans);

    // プレイヤーのマウス位置を受信
    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
        console.log(`Updated position for ${socket.id}:`, position); // デバッグ用ログ
    });

    // 豆がクリックされた時
    socket.on("beanTouched", (beanId) => {
        const bean = beans.find(b => b.id === beanId);
        if (!bean) return;
    
        if (!bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id);
        }
    
        if (bean.touchedBy.length === 2) {
            const p1 = players[bean.touchedBy[0]];
            const p2 = players[bean.touchedBy[1]];
    
            if (p1 && p2) {
                bean.left = (p1.x + p2.x) / 2;
                bean.top = (p1.y + p2.y) / 2;
                bean.isGlowing = true;
                console.log(`Calculated midpoint for bean ${bean.id}:`, { left: bean.left, top: bean.top }); // デバッグ用ログ
                
                io.emit("beanMoved", { id: bean.id, left: bean.left, top: bean.top });
                io.emit("beanGlow", bean.id);
            }
        }
    
        io.emit("updateBeans", beans);
    });
    
    socket.on("beanReleased", (beanId) => {
        const bean = beans.find(b => b.id === beanId);
        if (!bean) return;
    
        bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
        if (bean.touchedBy.length < 2) {
            bean.isGlowing = false;
            io.emit("beanStopGlow", bean.id);
        }
    
        io.emit("updateBeans", beans);
    });
    

    // プレイヤー切断時
    socket.on("disconnect", () => {
        delete players[socket.id];
        beans.forEach(bean => {
            bean.touchedBy = bean.touchedBy.filter(id => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });
        io.emit("updateBeans", beans);
    });
});

initializeBeans();

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
