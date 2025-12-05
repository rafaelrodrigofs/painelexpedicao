import express from "express";
import path, { dirname, join } from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server);

// // ✅ Servir arquivos estáticos
// app.use(express.static(path.join(__dirname, '../public')));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "../public/index.html"));
});

io.on("connection", (socket) => {
  console.log("User Conectado");
});

server.listen(3000, () => {
  console.log("Servidor rodando na porta 8080");
});
