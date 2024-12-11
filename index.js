document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  let beans = []; // サーバーからの豆情報を保存

  // 初期豆の描画
  socket.on("initializeBeans", (serverBeans) => {
      beans = serverBeans;
      renderBeans(beans);
  });

  // サーバーから更新された豆の位置を受信
  socket.on("updateBeanPosition", ({ id, x, y }) => {
      const bean = document.querySelector(`.bean[data-id="${id}"]`);
      if (bean) {
          bean.style.left = `${x}px`;
          bean.style.top = `${y}px`;
      }
  });

  // 豆の描画
  function renderBeans(beans) {
      const container = document.getElementById("game-container");
      container.innerHTML = ""; // 画面をクリア
      beans.forEach((bean) => {
          const beanDiv = document.createElement("div");
          beanDiv.classList.add("bean");
          beanDiv.dataset.id = bean.id;
          beanDiv.style.left = `${bean.x}px`;
          beanDiv.style.top = `${bean.y}px`;

          // ドラッグして移動する処理
          beanDiv.addEventListener("mousedown", (event) => {
              const startX = event.clientX;
              const startY = event.clientY;

              const moveListener = (e) => {
                  const x2 = e.clientX;
                  const y2 = e.clientY;
                  socket.emit("moveBean", {
                      id: bean.id,
                      x1: startX,
                      y1: startY,
                      x2,
                      y2,
                  });
              };

              const upListener = () => {
                  document.removeEventListener("mousemove", moveListener);
                  document.removeEventListener("mouseup", upListener);
              };

              document.addEventListener("mousemove", moveListener);
              document.addEventListener("mouseup", upListener);
          });

          container.appendChild(beanDiv);
      });
  }
});
