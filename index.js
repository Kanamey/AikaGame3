document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  let beans = []; // サーバーからの豆情報を保存

  // 初期豆の描画
  socket.on("initializeBeans", (serverBeans) => {
      beans = serverBeans;
      renderBeans(beans);
  });

  // 豆の位置更新を受信して画面を更新
  socket.on("updateBeanPosition", ({ id, newX, newY }) => {
      const bean = document.querySelector(`.bean[data-id="${id}"]`);
      if (bean) {
          bean.style.left = `${newX}px`;
          bean.style.top = `${newY}px`;
      }
  });

  // 豆の描画
  function renderBeans(beans) {
      const container = document.getElementById("game-container");
      container.innerHTML = ""; // 画面をクリア
      beans.forEach(bean => {
          const beanDiv = document.createElement("div");
          beanDiv.classList.add("bean");
          beanDiv.dataset.id = bean.id;
          beanDiv.style.left = `${bean.x}px`;
          beanDiv.style.top = `${bean.y}px`;

          // 豆をクリックしたときにサーバーに移動リクエストを送信
          beanDiv.addEventListener("mousedown", () => {
              const newX = Math.random() * 500; // 新しい位置（例）
              const newY = Math.random() * 500;
              socket.emit("moveBean", { id: bean.id, newX, newY });
          });

          container.appendChild(beanDiv);
      });
  }
});
