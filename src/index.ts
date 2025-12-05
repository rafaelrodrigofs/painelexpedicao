import express from "express";
import path, { dirname, join } from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const dbconfig = {
  host: "31.97.255.115",
  port: 3307,
  user: "root",
  password: "#Rodrigo0196",
  database: "marmitariafarias",
  connectTimeout: 10000, // 10 segundos de timeout
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Criar pool de conexões (mais eficiente que criar conexão a cada requisição)
const pool = mysql.createPool(dbconfig);

// Função para testar a conexão com o banco
async function testDatabaseConnection() {
  try {
    console.log("🔌 Testando conexão com o banco de dados...");
    console.log(`📍 Host: ${dbconfig.host}:${dbconfig.port}`);
    console.log(`📊 Database: ${dbconfig.database}`);
    
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Conexão com o banco de dados estabelecida com sucesso!");
    return true;
  } catch (error) {
    console.error("❌ ERRO ao conectar com o banco de dados:");
    console.error(`   Código: ${(error as any).code || 'N/A'}`);
    console.error(`   Mensagem: ${error instanceof Error ? error.message : String(error)}`);
    console.error("\n💡 Verifique:");
    console.error("   1. Se o servidor MySQL está rodando");
    console.error("   2. Se o IP e porta estão corretos");
    console.error("   3. Se o firewall permite conexões na porta 3307");
    console.error("   4. Se as credenciais estão corretas");
    return false;
  }
}

async function savePedidoToDatabase(pedido: any) {
  try {
    console.log(`💾 Tentando salvar pedido ${pedido.shortReference} no banco...`);
    const [result] = await pool.execute(
      "INSERT INTO o01_order (shortReference_order) VALUES (?)",
      [pedido.shortReference]
    );
    console.log(`✅ Pedido ${pedido.shortReference} salvo com sucesso!`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any).code || 'N/A';
    console.error(`❌ Erro ao salvar pedido ${pedido.shortReference}:`);
    console.error(`   Código: ${errorCode}`);
    console.error(`   Mensagem: ${errorMessage}`);
    throw error; // Relança o erro para ser tratado no webhook
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server);

// ✅ Middleware para processar JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "../public/index.html"));
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
        message: "Body vazio",
      });
    }

    // Salvar pedido no banco de dados
    console.log("💾 Salvando pedido no banco de dados...");
    try {
      const result = await savePedidoToDatabase(pedido);
      console.log("✅ Pedido salvo no banco de dados com sucesso");
    } catch (dbError: any) {
      const errorCode = dbError?.code || 'N/A';
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      
      console.error("❌ Erro ao salvar pedido no banco de dados:");
      console.error(`   Código: ${errorCode}`);
      console.error(`   Mensagem: ${errorMessage}`);
      
      if (errorCode === 'ETIMEDOUT') {
        console.error("⚠️  Timeout na conexão - verifique se o servidor MySQL está acessível");
      } else if (errorCode === 'ECONNREFUSED') {
        console.error("⚠️  Conexão recusada - verifique IP, porta e se o MySQL está rodando");
      } else if (errorCode === 'ER_ACCESS_DENIED_ERROR') {
        console.error("⚠️  Acesso negado - verifique usuário e senha");
      }
      
      // Continua o processamento mesmo se houver erro no banco
      // O pedido ainda será emitido via Socket.io
    }

    // Emitir pedido via Socket.io para todos os clientes conectados
    console.log("📡 Emitindo pedido via Socket.io...");
    io.emit("novo-pedido", pedido);
    console.log("✅ Pedido emitido via Socket.io");
    console.log(`👥 Clientes conectados: ${io.sockets.sockets.size}`);

    // Responder ao AnotaAI (apenas uma vez, no final)
    res.status(200).json({
      success: true,
      message: "Pedido recebido com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "N/A");
    res.status(500).json({
      success: false,
      message: "Erro ao processar pedido",
      error: error instanceof Error ? error.message : String(error),
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

// Iniciar servidor e testar conexão com banco
server.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Webhook disponível em: http://localhost:${PORT}/webhook`);
  console.log("");
  
  // Testar conexão com banco de dados na inicialização
  await testDatabaseConnection();
});
