import express from "express";
import path, { dirname, join } from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const io = new Server(server);

// ✅ Configuração do banco de dados
const DB_CONFIG = {
  host: "31.97.255.115",
  port: 3307,
  user: "root",
  password: "rodrigo0196",
  database: "marmitariafarias",
};

// ✅ Função helper para criar conexão com o banco
async function criarConexao() {
  return await mysql.createConnection(DB_CONFIG);
}

// ✅ Função para salvar pedido no banco de dados
async function salvarPedidoNoBanco(pedido: any) {
  let connection;
  try {
    connection = await criarConexao();

    // Extrair dados do pedido (mapeamento flexível para diferentes formatos do AnotaAI)
    const externalId = pedido._id || pedido.id || pedido.external_id_order || null;
    const shortReference = pedido.shortReference || pedido.short_reference || null;
    const check = pedido.check !== undefined ? pedido.check : 0; // Default: 0 (Em análise)
    
    // Valores monetários
    const subtotal = pedido.subtotal || pedido.subtotal_order || 0;
    const deliveryFee = pedido.deliveryFee || pedido.delivery_fee || pedido.deliveryFee_order || 0;
    const total = pedido.total || pedido.total_order || 0;
    
    // IDs de relacionamento
    const fkIdClient = pedido.customer?.id || pedido.client?.id || pedido.fk_id_client || null;
    const fkIdAddress = pedido.address?.id || pedido.addressId || pedido.fk_id_address || null;
    const fkIdEmpresa = pedido.empresa?.id || pedido.fk_id_empresa || null;
    
    // Data e hora
    let dateOrder = null;
    let timeOrder = null;
    
    if (pedido.date) {
      dateOrder = pedido.date;
    } else if (pedido.createdAt) {
      const date = new Date(pedido.createdAt);
      dateOrder = date.toISOString().split('T')[0];
      timeOrder = date.toTimeString().split(' ')[0];
    } else if (pedido.date_order) {
      dateOrder = pedido.date_order;
    }
    
    if (pedido.time) {
      timeOrder = pedido.time;
    } else if (pedido.time_order) {
      timeOrder = pedido.time_order;
    }
    
    // Se não tiver data, usar data atual
    if (!dateOrder) {
      const now = new Date();
      dateOrder = now.toISOString().split('T')[0];
      timeOrder = now.toTimeString().split(' ')[0];
    }
    
    const createdAt = new Date().toISOString().split('T')[0];
    const updatedAt = createdAt;

    // Verificar se o pedido já existe (pelo external_id_order)
    let pedidoExistente = null;
    if (externalId) {
      const [rows] = await connection.execute(
        "SELECT id_order FROM o01_order WHERE external_id_order = ?",
        [externalId]
      );
      pedidoExistente = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    }

    let resultado;
    
    if (pedidoExistente) {
      // Atualizar pedido existente
      const [result] = await connection.execute(
        `UPDATE o01_order SET
          shortReference_order = ?,
          date_order = ?,
          time_order = ?,
          subtotal_order = ?,
          delivery_fee = ?,
          total_order = ?,
          fk_id_client = ?,
          fk_id_address = ?,
          fk_id_empresa = ?,
          check_order = ?,
          updatedAt = ?
        WHERE external_id_order = ?`,
        [
          shortReference,
          dateOrder,
          timeOrder,
          subtotal,
          deliveryFee,
          total,
          fkIdClient,
          fkIdAddress,
          fkIdEmpresa,
          check,
          updatedAt,
          externalId,
        ]
      );
      
      resultado = result;
      console.log("✅ Pedido atualizado no banco de dados:", externalId);
    } else {
      // Inserir novo pedido
      const [result] = await connection.execute(
        `INSERT INTO o01_order (
          shortReference_order,
          date_order,
          time_order,
          subtotal_order,
          delivery_fee,
          total_order,
          fk_id_client,
          fk_id_address,
          fk_id_empresa,
          check_order,
          external_id_order,
          createdAt,
          updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shortReference,
          dateOrder,
          timeOrder,
          subtotal,
          deliveryFee,
          total,
          fkIdClient,
          fkIdAddress,
          fkIdEmpresa,
          check,
          externalId,
          createdAt,
          updatedAt,
        ]
      );
      
      resultado = result;
      console.log("✅ Pedido inserido no banco de dados:", externalId);
    }

    await connection.end();
    return resultado;
  } catch (error) {
    console.error("❌ Erro ao salvar pedido no banco:", error);
    if (connection) {
      await connection.end().catch(() => {});
    }
    throw error;
  }
}

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
    try {
      console.log("💾 Salvando pedido no banco de dados...");
      await salvarPedidoNoBanco(pedido);
      console.log("✅ Pedido salvo no banco de dados com sucesso");
    } catch (dbError) {
      console.error("❌ Erro ao salvar no banco de dados:", dbError);
      // Continuar mesmo se houver erro no banco (não bloquear o webhook)
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

app.post("/database_teste", async (req, res) => {
  let connection;
  try {
    // Configuração da conexão com o banco de dados
    connection = await criarConexao();

    // Testar a conexão executando uma query simples
    const [rows] = await connection.execute(
      "SELECT 1 as teste, NOW() as data_hora, DATABASE() as banco_atual"
    );

    await connection.end();

    res.status(200).json({
      success: true,
      message: "Conexão com o banco de dados estabelecida com sucesso!",
      dados: rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro ao conectar com o banco de dados:", error);

    if (connection) {
      await connection.end().catch(() => {});
    }

    res.status(500).json({
      success: false,
      message: "Erro ao conectar com o banco de dados",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
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
