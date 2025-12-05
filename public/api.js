// ============================================
// INTEGRAÇÃO COM API ANOTAAI
// ============================================

const API_CONFIG = {
    baseURL: 'https://api-parceiros.anota.ai/partnerauth/ping',
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJpZHBhcnRuZXIiOiI2N2MwNGFmYjU5NWY2MzAwMTI4ODUwNDUiLCJpZHBhZ2UiOiI2ODAwZmRmMTNhNDg3YjAwMTlhNjA3MWMifQ.sKKgw5BCoPffEZI4YA0Pp1D-oJF7w8zaAklQHTQtUFQ',
    headers: {
        'Authorization': 'eyJhbGciOiJIUzI1NiJ9.eyJpZHBhcnRuZXIiOiI2N2MwNGFmYjU5NWY2MzAwMTI4ODUwNDUiLCJpZHBhZ2UiOiI2ODAwZmRmMTNhNDg3YjAwMTlhNjA3MWMifQ.sKKgw5BCoPffEZI4YA0Pp1D-oJF7w8zaAklQHTQtUFQ',
        'Content-Type': 'application/json'
    }
};

// Mapeamento de status da API para Kanban
const STATUS_MAP = {
    '-2': 'agendados',    // Agendado aceito
    '0': 'analise',       // Em análise
    '1': 'em-preparo',    // Em produção
    '2': 'pronto',        // Pronto
    '3': 'finalizado',    // Finalizado (não exibir)
    '4': 'cancelado',     // Cancelado (não exibir)
    '5': 'negado',        // Negado (não exibir)
    '6': 'cancelamento'   // Solicitação de cancelamento (não exibir)
};

// ========================================
// FUNÇÕES DA API
// ========================================

// Listar todos os pedidos do dia
async function listarPedidosDoDia() {
    try {
        console.log('📡 Buscando pedidos do dia...');
        
        const response = await fetch(`${API_CONFIG.baseURL}/list`, {
            method: 'GET',
            headers: API_CONFIG.headers
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ${data.info.count} pedidos encontrados`);
            return data.info.docs;
        } else {
            console.error('❌ Erro ao buscar pedidos:', data);
            return [];
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return [];
    }
}

// Consultar informações detalhadas de um pedido
async function consultarPedido(orderId) {
    try {
        
        const response = await fetch(`https://api-parceiros.anota.ai/partnerauth/ping/get/${orderId}`, {
            method: 'GET',
            headers: API_CONFIG.headers
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.info;
        } else {
            console.error('❌ Erro ao consultar pedido:', data);
            return null;
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return null;
    }
}

// Enriquecer pedido com informações completas se necessário
async function enriquecerPedidoComDadosCompletos(pedido) {
    // Se já tem shortReference e customer.name, retorna como está
    if (pedido.shortReference && pedido.customer?.name) {
        return pedido;
    }
    
    // Caso contrário, busca informações completas
    const pedidoCompleto = await consultarPedido(pedido._id || pedido.id);
    
    if (pedidoCompleto) {
        // Mescla os dados, priorizando os dados completos
        return {
            ...pedido,
            shortReference: pedidoCompleto.shortReference || pedido.shortReference,
            customer: {
                ...pedido.customer,
                name: pedidoCompleto.customer?.name || pedido.customer?.name || 'Cliente'
            }
        };
    }
    
    // Se não conseguir buscar, retorna o pedido original
    return pedido;
}

// Aceitar um pedido (da Análise)
async function aceitarPedido(orderId) {
    try {
        console.log(`✅ Aceitando pedido ${orderId}...`);
        
        const response = await fetch(`https://api-parceiros.anota.ai/partnerauth/order/accept/${orderId}`, {
            method: 'POST',
            headers: API_CONFIG.headers
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Pedido ${orderId} aceito com sucesso!`);
            return { success: true, data };
        } else {
            console.error('❌ Erro ao aceitar pedido:', data);
            return { success: false, error: data };
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return { success: false, error: error.message };
    }
}

// Marcar pedido como pronto (de Em Preparo para Pronto)
async function marcarPedidoComoPronto(orderId) {
    try {
        console.log(`✅ Marcando pedido ${orderId} como pronto...`);
        
        const response = await fetch(`https://api-parceiros.anota.ai/partnerauth/order/ready/${orderId}`, {
            method: 'POST',
            headers: API_CONFIG.headers
        });
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Pedido ${orderId} marcado como pronto com sucesso!`);
            return { success: true, data };
        } else {
            console.error('❌ Erro ao marcar pedido como pronto:', data);
            return { success: false, error: data };
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return { success: false, error: error.message };
    }
}

// ========================================
// FUNÇÕES DE PROCESSAMENTO
// ========================================

// Mapear status da API para Kanban
function mapearStatusParaKanban(checkCode) {
    return STATUS_MAP[checkCode.toString()] || 'analise';
}

// Criar card HTML a partir dos dados da API (versão síncrona - usa dados já enriquecidos)
function criarCardDoPedido(pedido) {
    const status = mapearStatusParaKanban(pedido.check);
    const isAgendado = pedido.check === -2;
    // Usar shortReference se disponível, senão usar últimos 4 dígitos do _id
    const numero = pedido.shortReference || (pedido._id ? pedido._id.slice(-4) : 'N/A');
    // Usar customer.name se disponível, senão 'Cliente'
    const nomeCliente = pedido.customer?.name || 'Cliente';
    
    // Determinar qual formato de card criar
    let cardHTML = '';
    
    if (status === 'agendados') {
        // Card de pedido agendado (com horário de agendamento)
        // Usar schedule_order.date ou preparationStartDateTime se disponível, senão createdAt
        const dataAgendamento = pedido.schedule_order?.date || 
                                pedido.preparationStartDateTime || 
                                pedido.createdAt;
        const horario = new Date(dataAgendamento).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        cardHTML = `
            <div class="bg-white border border-blue-200 rounded-lg p-2 hover:shadow-md transition cursor-move" 
                 data-pedido-card 
                 data-pedido-id="${pedido._id}" 
                 data-agendado-original="true">
                <div class="flex items-start justify-between mb-2">
                    <button class="text-gray-400 hover:text-gray-600 transition pointer-events-auto">
                        <i class="fas fa-print text-xs"></i>
                    </button>
                    <span class="text-xs font-bold text-blue-600">${horario}</span>
                </div>
                <div class="text-center">
                    <div class="text-xl font-bold text-gray-800 mb-0.5">${numero}</div>
                    <div class="text-xs text-gray-600 mb-2">${nomeCliente}</div>
                    <button class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" 
                            data-card-badge 
                            title="Avançar para a próxima etapa">
                        Iniciar
                    </button>
                </div>
            </div>
        `;
    } else if (status === 'analise') {
        cardHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition cursor-move" 
                 data-pedido-card 
                 data-pedido-id="${pedido._id}">
                <div class="flex items-start justify-between mb-1">
                    <button class="text-gray-400 hover:text-gray-600 transition pointer-events-auto">
                        <i class="fas fa-print text-xs"></i>
                    </button>
                    <div class="w-4 h-4 flex items-center justify-center" data-card-icon>
                        <i class="fas fa-clock text-yellow-500 text-xs"></i>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-xl font-bold text-gray-800 mb-0.5">${numero}</div>
                    <div class="text-xs text-gray-600 mb-1">${nomeCliente}</div>
                    <button class="bg-yellow-400 hover:bg-yellow-500 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" 
                            data-card-badge 
                            title="Avançar para a próxima etapa">
                        Aceitar Pedido
                    </button>
                </div>
            </div>
        `;
    } else if (status === 'em-preparo') {
        cardHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition cursor-move" 
                 data-pedido-card 
                 data-pedido-id="${pedido._id}">
                <div class="flex items-start justify-between mb-2">
                    <button class="text-gray-400 hover:text-gray-600 transition pointer-events-auto">
                        <i class="fas fa-print text-xs"></i>
                    </button>
                    <div class="w-4 h-4 flex items-center justify-center" data-card-icon>
                        <i class="fas fa-spinner fa-spin text-orange-400 text-xs"></i>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-gray-800 mb-0.5">${numero}</div>
                    <div class="text-xs text-gray-600 mb-2">${nomeCliente}</div>
                    <button class="bg-orange-400 hover:bg-orange-500 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" 
                            data-card-badge 
                            title="Avançar para a próxima etapa">
                        5min
                    </button>
                </div>
            </div>
        `;
    } else if (status === 'pronto') {
        cardHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition cursor-move" 
                 data-pedido-card 
                 data-pedido-id="${pedido._id}">
                <div class="flex items-start justify-between mb-2">
                    <button class="text-gray-400 hover:text-gray-600 transition pointer-events-auto">
                        <i class="fas fa-print text-xs"></i>
                    </button>
                    <div class="w-4 h-4 flex items-center justify-center" data-card-icon>
                        <i class="fas fa-check-circle text-green-500 text-xs"></i>
                    </div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-gray-800 mb-0.5">${numero}</div>
                    <div class="text-xs text-gray-600 mb-2">${nomeCliente}</div>
                    <button class="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" 
                            data-card-badge 
                            title="Avançar para a próxima etapa">
                        Pronto
                    </button>
                </div>
            </div>
        `;
    }
    
    return cardHTML;
}

// Carregar e exibir pedidos no painel
async function carregarPedidosNoPainel() {
    const pedidos = await listarPedidosDoDia();
    
    if (pedidos.length === 0) {
        console.log('⚠️ Nenhum pedido encontrado hoje');
        return;
    }
    
    // Agrupar pedidos por status
    const pedidosPorStatus = {
        'analise': [],
        'agendados': [],
        'em-preparo': [],
        'pronto': []
    };
    
    pedidos.forEach(pedido => {
        const status = mapearStatusParaKanban(pedido.check);
        
        // Ignorar pedidos finalizados, cancelados, etc
        if (['finalizado', 'cancelado', 'negado', 'cancelamento'].includes(status)) {
            return;
        }
        
        if (pedidosPorStatus[status]) {
            pedidosPorStatus[status].push(pedido);
        }
    });
    
    // Limpar Kanbans atuais
    limparTodosKanbans();
    
    // Adicionar pedidos em cada Kanban (enriquecendo com dados completos)
    for (const [status, listaPedidos] of Object.entries(pedidosPorStatus)) {
        const kanban = document.querySelector(`[data-kanban="${status}"]`);
        
        if (kanban) {
            // Tratamento especial para pedidos agendados (organizar por intervalos)
            if (status === 'agendados') {
                // Processar pedidos agendados e organizar por intervalo
                const promises = listaPedidos.map(async (pedido) => {
                    // Enriquecer pedido com dados completos se necessário
                    const pedidoEnriquecido = await enriquecerPedidoComDadosCompletos(pedido);
                    
                    // Determinar horário de agendamento
                    const dataAgendamento = pedidoEnriquecido.schedule_order?.date || 
                                            pedidoEnriquecido.preparationStartDateTime || 
                                            pedidoEnriquecido.createdAt;
                    const horaAgendamento = new Date(dataAgendamento).getHours();
                    const minutoAgendamento = new Date(dataAgendamento).getMinutes();
                    const horaMinuto = horaAgendamento * 60 + minutoAgendamento; // Total em minutos
                    
                    // Determinar intervalo (11:00-11:30, 11:30-12:00, etc)
                    let intervalo = '';
                    if (horaMinuto >= 11 * 60 && horaMinuto < 11 * 60 + 30) {
                        intervalo = '11:00 - 11:30';
                    } else if (horaMinuto >= 11 * 60 + 30 && horaMinuto < 12 * 60) {
                        intervalo = '11:30 - 12:00';
                    } else if (horaMinuto >= 12 * 60 && horaMinuto < 12 * 60 + 30) {
                        intervalo = '12:00 - 12:30';
                    } else if (horaMinuto >= 12 * 60 + 30 && horaMinuto < 13 * 60) {
                        intervalo = '12:30 - 13:00';
                    } else if (horaMinuto >= 13 * 60 && horaMinuto < 13 * 60 + 30) {
                        intervalo = '13:00 - 13:30';
                    } else if (horaMinuto >= 13 * 60 + 30 && horaMinuto < 14 * 60) {
                        intervalo = '13:30 - 14:00';
                    } else {
                        // Se não estiver em nenhum intervalo, usar o primeiro disponível
                        intervalo = '11:00 - 11:30';
                    }
                    
                    // Encontrar o grid do intervalo
                    const intervalos = kanban.querySelectorAll('.space-y-2');
                    let gridEncontrado = null;
                    
                    intervalos.forEach(intervaloDiv => {
                        const textoIntervalo = intervaloDiv.querySelector('.text-blue-900')?.textContent.trim();
                        if (textoIntervalo === intervalo) {
                            gridEncontrado = intervaloDiv.querySelector('[data-kanban-grid]');
                        }
                    });
                    
                    // Se não encontrou, usar o primeiro grid disponível
                    if (!gridEncontrado) {
                        gridEncontrado = kanban.querySelector('[data-kanban-grid]');
                    }
                    
                    if (gridEncontrado) {
                        const cardHTML = criarCardDoPedido(pedidoEnriquecido);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = cardHTML;
                        const card = tempDiv.firstElementChild;
                        
                        gridEncontrado.appendChild(card);
                        
                        // Configurar drag and drop no card
                        if (window.configurarDragCard) {
                            window.configurarDragCard(card);
                        }
                        
                        // Atualizar contador do intervalo
                        const intervaloDiv = gridEncontrado.closest('.space-y-2');
                        if (intervaloDiv) {
                            const contadorIntervalo = intervaloDiv.querySelector('.bg-blue-300');
                            if (contadorIntervalo) {
                                const total = gridEncontrado.querySelectorAll('[data-pedido-card]').length;
                                contadorIntervalo.textContent = total;
                            }
                        }
                    }
                });
                
                await Promise.all(promises);
            } else {
                // Para outros status, usar grid único
                const grid = kanban.querySelector('[data-kanban-grid]');
                
                if (grid) {
                    // Processar pedidos em paralelo
                    const promises = listaPedidos.map(async (pedido) => {
                        // Enriquecer pedido com dados completos se necessário
                        const pedidoEnriquecido = await enriquecerPedidoComDadosCompletos(pedido);
                        
                        const cardHTML = criarCardDoPedido(pedidoEnriquecido);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = cardHTML;
                        const card = tempDiv.firstElementChild;
                        
                        grid.appendChild(card);
                        
                        // Configurar drag and drop no card
                        if (window.configurarDragCard) {
                            window.configurarDragCard(card);
                        }
                    });
                    
                    // Aguardar todos os pedidos serem processados
                    await Promise.all(promises);
                }
            }
            
            // Atualizar contador geral do kanban
            if (window.atualizarContadores) {
                window.atualizarContadores(kanban);
            }
        }
    }
    
    console.log('✅ Pedidos carregados no painel');
}

// Limpar todos os cards dos Kanbans
function limparTodosKanbans() {
    const kanbans = ['analise', 'agendados', 'em-preparo', 'pronto'];
    
    kanbans.forEach(status => {
        const kanban = document.querySelector(`[data-kanban="${status}"]`);
        if (kanban) {
            // Para "agendados" temos múltiplos grids, manter estrutura de intervalos
            if (status === 'agendados') {
                const grids = kanban.querySelectorAll('[data-kanban-grid]');
                grids.forEach(grid => {
                    grid.innerHTML = '';
                });
            } else {
                const grid = kanban.querySelector('[data-kanban-grid]');
                if (grid) {
                    grid.innerHTML = '';
                }
            }
        }
    });
}

// Atualizar pedidos automaticamente a cada X segundos
function iniciarAtualizacaoAutomatica(intervalSegundos = 30) {
    console.log(`🔄 Atualização automática ativada (a cada ${intervalSegundos}s)`);
    
    // Primeira carga
    carregarPedidosNoPainel();
    
    // Atualizar periodicamente
    setInterval(() => {
        console.log('🔄 Atualizando pedidos...');
        carregarPedidosNoPainel();
    }, intervalSegundos * 1000);
}

// Exportar funções para serem usadas globalmente
window.listarPedidosDoDia = listarPedidosDoDia;
window.consultarPedido = consultarPedido;
window.enriquecerPedidoComDadosCompletos = enriquecerPedidoComDadosCompletos;
window.aceitarPedido = aceitarPedido;
window.marcarPedidoComoPronto = marcarPedidoComoPronto;
window.carregarPedidosNoPainel = carregarPedidosNoPainel;
window.iniciarAtualizacaoAutomatica = iniciarAtualizacaoAutomatica;
window.criarCardDoPedido = criarCardDoPedido;

console.log('✅ API AnotaAI configurada');
console.log('✅ Webhook listener pronto');
