const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

const beans = [];
const players = {};

// 豆の初期化
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
}

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    players[socket.id] = { x: 0, y: 0 };

    socket.emit("initializeBeans", beans);

    socket.on("updateMousePosition", (position) => {
        players[socket.id] = position;
    });

    socket.on("beanTouched", (beanId) => {
        const bean = beans.find((b) => b.id === beanId);
        if (bean && !bean.touchedBy.includes(socket.id)) {
            bean.touchedBy.push(socket.id);
        }

        if (bean.touchedBy.length === 2) {
            const p1 = players[bean.touchedBy[0]];
            const p2 = players[bean.touchedBy[1]];

            if (p1 && p2) {
                bean.left = (p1.x + p2.x) / 2;
                bean.top = (p1.y + p2.y) / 2;
                bean.isGlowing = true;
            }
        }
        io.emit("updateBeans", beans);
    });

    socket.on("beanReleased", (beanId) => {
        const bean = beans.find((b) => b.id === beanId);
        if (bean) {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        }
        io.emit("updateBeans", beans);
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        beans.forEach((bean) => {
            bean.touchedBy = bean.touchedBy.filter((id) => id !== socket.id);
            if (bean.touchedBy.length < 2) bean.isGlowing = false;
        });
        io.emit("updateBeans", beans);
    });
});

initializeBeans();
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
