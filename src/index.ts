import express from "express";
import path, { dirname, join } from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { salvarPedido, buscarPedidosDoDia, atualizarStatusPedido } from "./redis.js";

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

// ✅ ENDPOINT DE TESTE - Para testar o webhook manualmente (salva no Redis)
app.post("/webhook/test", async (req, res) => {
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
    
    console.log("🧪 TESTE: Salvando pedido de teste no Redis...");
    const salvou = await salvarPedido(pedidoTeste);
    
    if (salvou) {
      console.log("✅ TESTE: Pedido salvo no Redis com sucesso!");
    } else {
      console.error("❌ TESTE: Falha ao salvar pedido no Redis");
    }
    
    console.log("🧪 TESTE: Emitindo pedido de teste via Socket.io");
    io.emit("novo-pedido", pedidoTeste);
    
    res.status(200).json({ 
      success: true, 
      message: "Pedido de teste processado",
      salvouNoRedis: salvou,
      pedido: pedidoTeste
    });
  } catch (error) {
    console.error("❌ Erro no teste:", error);
    res.status(500).json({ 
      success: false, 
      message: "Erro ao testar webhook",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// ✅ ENDPOINT PARA TESTAR REDIS DIRETAMENTE
app.get("/api/test-redis", async (req, res) => {
  try {
    console.log("🧪 TESTE REDIS: Testando conexão...");
    
    // Testar conexão básica
    const redis = (await import('./redis.js')).default;
    await redis.ping();
    
    // Tentar salvar um teste
    const pedidoTeste = {
      _id: "TEST_REDIS_" + Date.now(),
      shortReference: 8888,
      check: 0,
      customer: { name: "Teste Redis" },
      createdAt: new Date().toISOString()
    };
    
    const salvou = await salvarPedido(pedidoTeste);
    const pedidos = await buscarPedidosDoDia();
    
    res.status(200).json({
      success: true,
      redisConectado: true,
      salvouTeste: salvou,
      totalPedidos: pedidos.length,
      mensagem: "Redis está funcionando!"
    });
  } catch (error) {
    console.error("❌ Erro ao testar Redis:", error);
    res.status(500).json({
      success: false,
      redisConectado: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// ✅ ENDPOINT PARA BUSCAR PEDIDOS DO REDIS
app.get("/api/pedidos", async (req, res) => {
  try {
    const pedidos = await buscarPedidosDoDia();
    res.status(200).json({
      success: true,
      count: pedidos.length,
      pedidos: pedidos
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pedidos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar pedidos"
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
    
    // Salvar pedido no Redis
    console.log("💾 Salvando pedido no Redis...");
    await salvarPedido(pedido);
    
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
    
  } catch (error) {
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
  console.log(`📡 API de pedidos: http://localhost:${PORT}/api/pedidos`);
  console.log(`💾 Redis configurado (host: ${process.env.REDIS_HOST || 'localhost'})`);
});
