import express from "express";
import path, { join } from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { testConnection, salvarPedidoTeste } from "./database.js";
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
// ✅ ENDPOINT DE TESTE DE CONEXÃO COM BANCO
app.get("/test-db", async (req, res) => {
    try {
        const connected = await testConnection();
        if (connected) {
            res.status(200).json({
                success: true,
                message: "Conexão com banco de dados OK",
                database: "marmitariafarias",
                host: "31.97.255.115"
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: "Falha ao conectar com banco de dados"
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Erro ao testar conexão",
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
// ✅ ENDPOINT DE TESTE - Para testar o webhook manualmente
app.post("/webhook/test", (req, res) => {
    try {
        const pedidoTeste = {
            _id: "TEST_" + Date.now(),
            shortReference: 9999,
            check: 0,
            customer: {
                name: "Cliente Teste"
            },
            createdAt: new Date().toISOString()
        };
        console.log("🧪 TESTE: Emitindo pedido de teste via Socket.io");
        io.emit("novo-pedido", pedidoTeste);
        res.status(200).json({
            success: true,
            message: "Pedido de teste emitido",
            pedido: pedidoTeste
        });
    }
    catch (error) {
        console.error("❌ Erro no teste:", error);
        res.status(500).json({
            success: false,
            message: "Erro ao testar webhook"
        });
    }
});
// ✅ ENDPOINT WEBHOOK - Recebe pedidos do AnotaAI
app.post("/webhook", async (req, res) => {
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
        // Salvar pedido no banco de dados (tabela de teste)
        console.log("💾 Tentando salvar pedido no banco de dados...");
        const resultadoSalvamento = await salvarPedidoTeste(pedido);
        if (resultadoSalvamento.success) {
            console.log("✅ Pedido salvo no banco de dados! ID:", resultadoSalvamento.insertId);
        }
        else if (resultadoSalvamento.duplicate) {
            console.log("⚠️ Pedido já existe no banco (duplicata)");
        }
        else {
            console.error("❌ Falha ao salvar pedido no banco:", resultadoSalvamento.error);
            // Continua mesmo se falhar ao salvar, para não bloquear o webhook
        }
        // Emitir pedido via Socket.io para todos os clientes conectados
        console.log("📡 Emitindo pedido via Socket.io...");
        io.emit("novo-pedido", pedido);
        console.log("✅ Pedido emitido via Socket.io");
        console.log(`👥 Clientes conectados: ${io.sockets.sockets.size}`);
        // Responder ao AnotaAI
        res.status(200).json({
            success: true,
            message: "Pedido recebido com sucesso",
            saved: resultadoSalvamento.success,
            insertId: resultadoSalvamento.insertId || null
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
// Testar conexão com banco de dados ao iniciar (não bloqueia o servidor)
testConnection().then(success => {
    if (success) {
        console.log('✅ Banco de dados pronto para receber pedidos');
    }
    else {
        console.warn('');
        console.warn('⚠️ ATENÇÃO: Não foi possível conectar ao banco de dados');
        console.warn('⚠️ O servidor continuará rodando normalmente');
        console.warn('⚠️ Webhook e Socket.io funcionarão, mas pedidos NÃO serão salvos no banco');
        console.warn('');
        console.warn('💡 Para resolver o problema de acesso ao MySQL:');
        console.warn('   1. Verifique se o MySQL permite conexões remotas');
        console.warn('   2. Execute no MySQL:');
        console.warn('      GRANT ALL PRIVILEGES ON *.* TO \'root\'@\'%\' IDENTIFIED BY \'marmitariafarias\';');
        console.warn('      FLUSH PRIVILEGES;');
        console.warn('   3. Verifique o firewall na porta 3306');
        console.warn('');
    }
}).catch(err => {
    console.error('❌ Erro ao testar conexão:', err);
});
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Webhook disponível em: http://localhost:${PORT}/webhook`);
    console.log(`🧪 Teste de webhook: http://localhost:${PORT}/webhook/test`);
});
