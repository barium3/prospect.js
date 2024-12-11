const express = require("express");
const chokidar = require("chokidar");
const WebSocket = require("ws");
const path = require("path");
const cors = require("cors");

const app = express();

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// 启用 CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

// 提供静态文件服务
const staticPath = path.join(__dirname, "..");
console.log("Static files path:", staticPath);

// 添加多个静态文件目录
app.use("/js", express.static(path.join(staticPath, "js")));
app.use("/", express.static(staticPath));

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("WebSocket server is running");
});

// WebSocket 错误处理
wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});

// 监听 tools 目录变化
const toolsPath = path.join(__dirname, "../js/tools");
console.log("Watching directory:", toolsPath);

const watcher = chokidar.watch(toolsPath, {
  ignored: /(^|[\/\\])\../, // 忽略隐藏文件
  persistent: true,
});

// 文件监听错误处理
watcher.on("error", (error) => {
  console.error("File watcher error:", error);
});

// WebSocket 连接处理
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("error", (error) => {
    console.error("WebSocket connection error:", error);
  });

  // 发送当前工具列表
  const tools = [];
  watcher.on("ready", () => {
    try {
      const toolsDir = path.join(__dirname, "../js/tools");
      console.log("Tools directory:", toolsDir);
      console.log("Watched paths:", Object.keys(watcher.getWatched()));

      if (watcher.getWatched()[toolsDir]) {
        watcher.getWatched()[toolsDir].forEach((file) => {
          if (file.endsWith(".js")) {
            tools.push(file.replace(".js", ""));
          }
        });
      }
      console.log("Available tools:", tools);
      ws.send(JSON.stringify({ type: "init", tools }));
    } catch (error) {
      console.error("Error sending tool list:", error);
    }
  });
});

// 文件变化处理
watcher.on("all", (event, filePath) => {
  const fileName = path.basename(filePath);
  if (fileName.endsWith(".js")) {
    console.log(`File ${event}: ${fileName}`);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "change",
            event,
            tool: fileName.replace(".js", ""),
          })
        );
      }
    });
  }
});

// 添加路由处理
app.get("/", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

app.get("/test", (req, res) => {
  res.send("Server is running");
});

// 处理 404 错误
app.use((req, res, next) => {
  console.log("404 Not Found:", req.url);
  res.status(404).send("404 Not Found");
});

// 启动服务器
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket server running at ws://localhost:8080`);
});
