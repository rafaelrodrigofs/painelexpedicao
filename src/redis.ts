import { Redis } from 'ioredis';

// Configuração do Redis
// As variáveis de ambiente serão fornecidas pela plataforma (Railway, Render, etc)
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✅ Redis conectado com sucesso');
  console.log(`📍 Redis Host: ${process.env.REDIS_HOST || 'localhost'}`);
  console.log(`📍 Redis Port: ${process.env.REDIS_PORT || '6379'}`);
});

redis.on('error', (error: Error) => {
  console.error('❌ Erro no Redis:', error);
  console.error('❌ Mensagem:', error.message);
  console.error('❌ Stack:', error.stack);
});

redis.on('ready', () => {
  console.log('✅ Redis pronto para uso');
});

// Testar conexão ao iniciar
redis.ping().then(() => {
  console.log('✅ Redis PING: OK');
}).catch((error) => {
  console.error('❌ Redis PING falhou:', error);
});

// Funções auxiliares para gerenciar pedidos no Redis

// Salvar um pedido no Redis
export async function salvarPedido(pedido: any) {
  try {
    console.log('💾 Iniciando salvamento no Redis...');
    console.log('💾 Pedido recebido:', JSON.stringify(pedido, null, 2));
    
    const pedidoId = pedido._id || pedido.id;
    if (!pedidoId) {
      throw new Error('Pedido sem ID');
    }
    
    console.log(`💾 Pedido ID: ${pedidoId}`);
    
    // Verificar se Redis está conectado
    const status = redis.status;
    console.log(`💾 Status do Redis: ${status}`);
    
    if (status !== 'ready' && status !== 'connect') {
      console.warn(`⚠️ Redis não está pronto. Status: ${status}`);
    }
    
    // Salvar pedido completo
    console.log(`💾 Salvando pedido:${pedidoId}...`);
    const resultadoSet = await redis.set(`pedido:${pedidoId}`, JSON.stringify(pedido));
    console.log(`💾 Resultado SET: ${resultadoSet}`);
    
    // Adicionar à lista de pedidos do dia (usando data como chave)
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`💾 Data de hoje: ${hoje}`);
    const resultadoSadd1 = await redis.sadd(`pedidos:${hoje}`, pedidoId);
    console.log(`💾 Resultado SADD (dia): ${resultadoSadd1}`);
    
    // Adicionar ao índice por status
    const statusPedido = pedido.check?.toString() || '0';
    console.log(`💾 Status do pedido: ${statusPedido}`);
    const resultadoSadd2 = await redis.sadd(`pedidos:status:${statusPedido}`, pedidoId);
    console.log(`💾 Resultado SADD (status): ${resultadoSadd2}`);
    
    console.log(`✅ Pedido ${pedidoId} salvo no Redis com sucesso!`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar pedido no Redis:', error);
    console.error('❌ Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('❌ Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A');
    return false;
  }
}

// Buscar um pedido específico
export async function buscarPedido(pedidoId: string) {
  try {
    const pedidoJson = await redis.get(`pedido:${pedidoId}`);
    if (pedidoJson) {
      return JSON.parse(pedidoJson);
    }
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar pedido no Redis:', error);
    return null;
  }
}

// Buscar todos os pedidos do dia
export async function buscarPedidosDoDia() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const pedidoIds = await redis.smembers(`pedidos:${hoje}`);
    
    const pedidos = [];
    for (const id of pedidoIds) {
      const pedido = await buscarPedido(id);
      if (pedido) {
        pedidos.push(pedido);
      }
    }
    
    return pedidos;
  } catch (error) {
    console.error('❌ Erro ao buscar pedidos do dia no Redis:', error);
    return [];
  }
}

// Atualizar status de um pedido
export async function atualizarStatusPedido(pedidoId: string, novoStatus: number) {
  try {
    const pedido = await buscarPedido(pedidoId);
    if (pedido) {
      const statusAntigo = pedido.check?.toString() || '0';
      
      // Atualizar pedido
      pedido.check = novoStatus;
      await redis.set(`pedido:${pedidoId}`, JSON.stringify(pedido));
      
      // Remover do índice antigo e adicionar ao novo
      await redis.srem(`pedidos:status:${statusAntigo}`, pedidoId);
      await redis.sadd(`pedidos:status:${novoStatus}`, pedidoId);
      
      console.log(`🔄 Status do pedido ${pedidoId} atualizado para ${novoStatus}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erro ao atualizar status do pedido:', error);
    return false;
  }
}

// Remover pedido (quando finalizado/cancelado)
export async function removerPedido(pedidoId: string) {
  try {
    const pedido = await buscarPedido(pedidoId);
    if (pedido) {
      const status = pedido.check?.toString() || '0';
      const hoje = new Date().toISOString().split('T')[0];
      
      // Remover dos índices
      await redis.srem(`pedidos:${hoje}`, pedidoId);
      await redis.srem(`pedidos:status:${status}`, pedidoId);
      
      // Remover pedido
      await redis.del(`pedido:${pedidoId}`);
      
      console.log(`🗑️ Pedido ${pedidoId} removido do Redis`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erro ao remover pedido:', error);
    return false;
  }
}

export default redis;
