import express from "express";
import path, { join } from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const io = new Server(server);
// ✅ Middleware para processar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ✅ Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "../public/index.html"));
});
// ✅ ENDPOINT WEBHOOK - Recebe pedidos do AnotaAI
app.post("/webhook", (req, res) => {
    try {
        console.log("📦 WEBHOOK RECEBIDO DO ANOTAAI:");
        console.log("📋 Headers:", req.headers);
        console.log("📦 Body:", JSON.stringify(req.body, null, 2));
        const pedido = req.body;
        // Validar se recebeu dados
        if (!pedido || Object.keys(pedido).length === 0) {
            console.warn("⚠️ Webhook recebido sem dados no body");
            return res.status(400).json({
                success: false,
                message: "Body vazio"
            });
        }
        // Emitir pedido via Socket.io para todos os clientes conectados
        console.log("📡 Emitindo pedido via Socket.io...");
        io.emit("novo-pedido", pedido);
        console.log("✅ Pedido emitido via Socket.io");
        console.log(`👥 Clientes conectados: ${io.sockets.sockets.size}`);
        // Responder ao AnotaAI
        res.status(200).json({
            success: true,
            message: "Pedido recebido com sucesso"
        });
    }
    catch (error) {
        console.error("❌ Erro ao processar webhook:", error);
        console.error("Stack:", error instanceof Error ? error.stack : 'N/A');
        res.status(500).json({
            success: false,
            message: "Erro ao processar pedido",
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
io.on("connection", (socket) => {
    console.log("✅ Cliente conectado via Socket.io");
    socket.on("disconnect", () => {
        console.log("❌ Cliente desconectado");
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Webhook disponível em: http://localhost:${PORT}/webhook`);
});
