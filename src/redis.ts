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
});

redis.on('error', (error: Error) => {
  console.error('❌ Erro no Redis:', error);
});

redis.on('ready', () => {
  console.log('✅ Redis pronto para uso');
});

// Funções auxiliares para gerenciar pedidos no Redis

// Salvar um pedido no Redis
export async function salvarPedido(pedido: any) {
  try {
    const pedidoId = pedido._id || pedido.id;
    if (!pedidoId) {
      throw new Error('Pedido sem ID');
    }
    
    // Salvar pedido completo
    await redis.set(`pedido:${pedidoId}`, JSON.stringify(pedido));
    
    // Adicionar à lista de pedidos do dia (usando data como chave)
    const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await redis.sadd(`pedidos:${hoje}`, pedidoId);
    
    // Adicionar ao índice por status
    const status = pedido.check?.toString() || '0';
    await redis.sadd(`pedidos:status:${status}`, pedidoId);
    
    console.log(`💾 Pedido ${pedidoId} salvo no Redis`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar pedido no Redis:', error);
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
