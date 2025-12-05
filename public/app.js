// ============================================
// PAINEL DE EXPEDIÇÃO - Drag and Drop
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ========================================
    // FUNÇÕES PRINCIPAIS
    // ========================================
    
    // Função para configurar drag em um card
    function configurarDragCard(card) {
        card.draggable = true;
        
        // Remover listeners antigos se existirem
        const novoCard = card.cloneNode(true);
        card.parentNode.replaceChild(novoCard, card);
        
        // Evento quando começa a arrastar
        novoCard.addEventListener('dragstart', function(e) {
            this.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
            e.dataTransfer.setData('cardId', this.dataset.pedidoId);
        });
        
        // Evento quando termina de arrastar
        novoCard.addEventListener('dragend', function(e) {
            this.classList.remove('opacity-50');
        });
        
        // Adicionar evento de impressão
        const btnImprimir = novoCard.querySelector('.fa-print')?.closest('button');
        if (btnImprimir) {
            btnImprimir.addEventListener('click', function(e) {
                e.stopPropagation();
                const pedidoId = novoCard.querySelector('.font-bold:not(.text-xs)').textContent.trim();
                console.log(`🖨️ Imprimir pedido #${pedidoId}`);
                alert(`🖨️ Imprimindo pedido #${pedidoId}...`);
            });
            
            btnImprimir.addEventListener('mousedown', function(e) {
                e.stopPropagation();
            });
        }
        
        // Adicionar evento no badge para avançar etapa
        const badge = novoCard.querySelector('[data-card-badge]');
        if (badge) {
            badge.addEventListener('click', function(e) {
                e.stopPropagation();
                avancarParaProximaEtapa(novoCard);
            });
            
            badge.addEventListener('mousedown', function(e) {
                e.stopPropagation();
            });
        }
    }
    
    // Função para atualizar o status visual do card
    function atualizarCardStatus(card, status) {
        const numero = card.querySelector('.font-bold:not(.text-xs)').textContent.trim();
        const nome = card.querySelector('.text-gray-600').textContent.trim();
        const pedidoId = card.dataset.pedidoId;
        const agendadoOriginal = card.dataset.agendadoOriginal;
        
        let novoHTML = '';
        
        switch(status) {
            case 'agendados':
                novoHTML = `
                    <div class="flex items-start justify-between mb-2">
                        <button class="text-gray-400 hover:text-gray-600 transition pointer-events-auto">
                            <i class="fas fa-print text-xs"></i>
                        </button>
                        <span class="text-xs font-bold text-blue-600">12:00</span>
                    </div>
                    <div class="text-center">
                        <div class="text-xl font-bold text-gray-800 mb-0.5">${numero}</div>
                        <div class="text-xs text-gray-600 mb-2">${nome}</div>
                        <button class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" data-card-badge title="Avançar para a próxima etapa">
                            Iniciar
                        </button>
                    </div>
                `;
                card.className = 'bg-white border border-blue-200 rounded-lg p-2 hover:shadow-md transition cursor-move';
                break;
                
            case 'analise':
                novoHTML = `
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
                        <div class="text-xs text-gray-600 mb-1">${nome}</div>
                        <button class="bg-yellow-400 hover:bg-yellow-500 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" data-card-badge title="Avançar para a próxima etapa">
                            Aceitar Pedido
                        </button>
                    </div>
                `;
                card.className = 'bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition cursor-move';
                break;
                
            case 'em-preparo':
                novoHTML = `
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
                        <div class="text-xs text-gray-600 mb-2">${nome}</div>
                        <button class="bg-orange-400 hover:bg-orange-500 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" data-card-badge title="Avançar para a próxima etapa">
                            5min
                        </button>
                    </div>
                `;
                card.className = 'bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition cursor-move';
                break;
                
            case 'pronto':
                novoHTML = `
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
                        <div class="text-xs text-gray-600 mb-2">${nome}</div>
                        <button class="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded-full transition cursor-pointer w-full" data-card-badge title="Avançar para a próxima etapa">
                            Pronto
                        </button>
                    </div>
                `;
                card.className = 'bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition cursor-move';
                break;
        }
        
        card.innerHTML = novoHTML;
        card.style.marginBottom = '';
        card.dataset.pedidoId = pedidoId;
        if (agendadoOriginal) {
            card.dataset.agendadoOriginal = agendadoOriginal;
        }
        card.dataset.pedidoCard = '';
    }
    
    // Função para atualizar contador de pedidos
    function atualizarContadores(kanban) {
        if (!kanban) return;
        
        const dropZone = kanban.querySelector('[data-kanban-drop]');
        const contador = kanban.querySelector('[data-contador]');
        
        if (!dropZone || !contador) return;
        
        const totalPedidos = dropZone.querySelectorAll('[data-pedido-card]').length;
        contador.textContent = totalPedidos;
    }
    
    // Função para avançar pedido para próxima etapa
    function avancarParaProximaEtapa(card) {
        const kanbanAtual = card.closest('[data-kanban]');
        const statusAtual = kanbanAtual.dataset.kanban;
        const numero = card.querySelector('.font-bold:not(.text-xs)').textContent.trim();
        
        let proximoStatus = '';
        
        switch(statusAtual) {
            case 'analise':
                proximoStatus = 'em-preparo';
                break;
            case 'agendados':
                proximoStatus = 'em-preparo';
                break;
            case 'em-preparo':
                proximoStatus = 'pronto';
                break;
            case 'pronto':
                console.log(`✅ Pedido #${numero} já está na última etapa!`);
                alert(`✅ Pedido #${numero} já está pronto para entrega!`);
                return;
        }
        
        const proximoKanban = document.querySelector(`[data-kanban="${proximoStatus}"]`);
        
        if (proximoKanban) {
            card.remove();
            atualizarCardStatus(card, proximoStatus);
            
            const destinoGrid = proximoKanban.querySelector('[data-kanban-drop] [data-kanban-grid]');
            if (destinoGrid) {
                destinoGrid.appendChild(card);
            }
            
            configurarDragCard(card);
            atualizarContadores(kanbanAtual);
            atualizarContadores(proximoKanban);
            
            console.log(`➡️ Pedido #${numero} avançou de ${statusAtual} para ${proximoStatus}`);
        }
    }
    
    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    
    // Tornar todos os cards arrastáveis
    const cards = document.querySelectorAll('[data-pedido-card]');
    cards.forEach(card => {
        configurarDragCard(card);
    });
    
    // Configurar zonas de drop
    const dropZones = document.querySelectorAll('[data-kanban-drop]');
    
    dropZones.forEach(zone => {
        
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            
            const cardAtual = document.querySelector('.opacity-50');
            if (cardAtual) {
                const origemKanban = cardAtual.closest('[data-kanban]');
                const destinoKanban = this.closest('[data-kanban]');
                const statusOrigem = origemKanban?.dataset.kanban;
                const statusDestino = destinoKanban?.dataset.kanban;
                const foiAgendado = cardAtual.dataset.agendadoOriginal === 'true';
                
                const movimentoInvalido = 
                    (statusOrigem === 'analise' && statusDestino === 'agendados') ||
                    (statusOrigem !== 'analise' && statusDestino === 'analise') ||
                    (!foiAgendado && statusDestino === 'agendados');
                
                if (movimentoInvalido) {
                    e.dataTransfer.dropEffect = 'none';
                    this.classList.add('bg-red-50', 'border-2', 'border-dashed', 'border-red-300');
                } else {
                    e.dataTransfer.dropEffect = 'move';
                    this.classList.add('bg-blue-50', 'border-2', 'border-dashed', 'border-blue-300');
                }
            }
        });
        
        zone.addEventListener('dragleave', function(e) {
            this.classList.remove('bg-blue-50', 'border-2', 'border-dashed', 'border-blue-300');
            this.classList.remove('bg-red-50', 'border-2', 'border-dashed', 'border-red-300');
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('bg-blue-50', 'border-2', 'border-dashed', 'border-blue-300');
            this.classList.remove('bg-red-50', 'border-2', 'border-dashed', 'border-red-300');
            
            const cardId = e.dataTransfer.getData('cardId');
            const draggedCard = document.querySelector(`[data-pedido-id="${cardId}"]`);
            
            if (draggedCard) {
                const origemKanban = draggedCard.closest('[data-kanban]');
                const destinoKanban = this.closest('[data-kanban]');
                const statusOrigem = origemKanban.dataset.kanban;
                const statusDestino = destinoKanban.dataset.kanban;
                
                // REGRAS DE VALIDAÇÃO
                if (statusOrigem === 'analise' && statusDestino === 'agendados') {
                    alert('❌ Pedidos da Análise não podem ir para Pedidos Agendados!');
                    return;
                }
                
                if (statusOrigem !== 'analise' && statusDestino === 'analise') {
                    alert('❌ Pedidos já aceitos não podem voltar para Análise!');
                    return;
                }
                
                const foiAgendado = draggedCard.dataset.agendadoOriginal === 'true';
                if (!foiAgendado && statusDestino === 'agendados') {
                    alert('❌ Apenas pedidos que foram agendados originalmente podem voltar para esta coluna!');
                    return;
                }
                
                // MOVIMENTAÇÃO PERMITIDA
                draggedCard.remove();
                atualizarCardStatus(draggedCard, statusDestino);
                
                const destinoGrid = this.querySelector('[data-kanban-grid]');
                if (destinoGrid) {
                    destinoGrid.appendChild(draggedCard);
                }
                
                configurarDragCard(draggedCard);
                atualizarContadores(origemKanban);
                atualizarContadores(destinoKanban);
                
                console.log(`✅ Pedido ${cardId} movido de ${statusOrigem} para ${statusDestino}`);
            }
        });
    });
    
    console.log('✅ Sistema de drag and drop iniciado');
    console.log('✅ Regras de validação ativas');
    console.log('🖨️ Ícones de impressão configurados');
    
    // Exportar funções para uso global (API)
    window.configurarDragCard = configurarDragCard;
    window.atualizarContadores = atualizarContadores;
    window.avancarParaProximaEtapa = avancarParaProximaEtapa;
    
    // ========================================
    // SOCKET.IO - WEBHOOK LISTENER
    // ========================================
    
    // Conectar ao servidor Socket.io
    const socket = io();
    
    socket.on('connect', () => {
        console.log('✅ Conectado ao servidor via Socket.io');
        console.log('🚀 Sistema pronto para receber pedidos via webhook');
        console.log('📍 Webhook URL: http://localhost:3000/webhook');
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Desconectado do servidor');
    });
    
    // Escutar novos pedidos do webhook
    socket.on('novo-pedido', (pedido) => {
        console.log('🔔 NOVO PEDIDO RECEBIDO VIA WEBHOOK:', pedido);
        
        // Mapear status do pedido
        const statusMap = {
            '-2': 'agendados',
            '0': 'analise',
            '1': 'em-preparo',
            '2': 'pronto',
            '3': 'finalizado',
            '4': 'cancelado',
            '5': 'negado',
            '6': 'cancelamento'
        };
        
        const status = statusMap[pedido.check?.toString()] || 'analise';
        
        // Ignorar pedidos finalizados/cancelados
        if (['finalizado', 'cancelado', 'negado', 'cancelamento'].includes(status)) {
            console.log('⚠️ Pedido ignorado (status:', status, ')');
            return;
        }
        
        // Criar card do pedido (função do api.js)
        if (typeof window.criarCardDoPedido === 'function') {
            const cardHTML = window.criarCardDoPedido(pedido);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cardHTML;
            const card = tempDiv.firstElementChild;
            
            // Adicionar no Kanban correto
            const kanban = document.querySelector(`[data-kanban="${status}"]`);
            if (kanban) {
                const grid = kanban.querySelector('[data-kanban-grid]');
                if (grid) {
                    grid.appendChild(card);
                    
                    // Configurar drag and drop
                    configurarDragCard(card);
                    
                    // Atualizar contador
                    atualizarContadores(kanban);
                    
                    console.log(`✅ Pedido #${pedido.shortReference || pedido._id} adicionado em "${status}"`);
                    
                    // Tocar som de notificação (opcional)
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
                        audio.volume = 0.3;
                        audio.play().catch(e => console.log('🔇 Som bloqueado pelo navegador'));
                    } catch (e) {
                        console.log('🔇 Não foi possível tocar o som');
                    }
                }
            }
        } else {
            console.error('❌ Função criarCardDoPedido não encontrada');
        }
    });
    
    console.log('');
    console.log('💡 Comandos disponíveis:');
    console.log('   - carregarPedidosNoPainel() - Carregar todos os pedidos do dia');
    console.log('   - iniciarAtualizacaoAutomatica(30) - Atualizar a cada 30s');
    
});
