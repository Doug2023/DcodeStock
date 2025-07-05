document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');

    // --- DOM Elements ---
    const mesAtualEl = document.getElementById('mesAtual');
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnProximoMes = document.getElementById('btnProximoMes');
    const nomeEstoqueInput = document.getElementById('nomeEstoqueInput');
    const btnNovoEstoque = document.getElementById('btnNovoEstoque');
    const btnVoltarEstoque = document.getElementById('btnVoltarEstoque');
    const entradaTotalEl = document.getElementById('entradaTotal');
    const saidaTotalEl = document.getElementById('saidaTotal');
    const saldoTotalEl = document.getElementById('saldoTotal');
    const valorFinalEl = document.getElementById('valorFinal');
    const tabelaBody = document.querySelector('table.estoque-table tbody');
    const listaEntradas = document.getElementById('listaEntradas');
    const listaSaidas = document.getElementById('listaSaidas');
    const btnLimparHistorico = document.getElementById('btnLimparHistorico');
    const themeToggle = document.getElementById('themeToggle');
    
    // Novos elementos para resumo e notificações
    const listaResumoItens = document.getElementById('listaResumoItens');
    const btnNotify = document.getElementById('btnNotify');
    const notifyBadge = document.getElementById('notifyBadge');

    // Debug - verificar se os elementos foram encontrados
    console.log('Elementos DOM encontrados:', {
        mesAtualEl: !!mesAtualEl,
        btnMesAnterior: !!btnMesAnterior,
        btnProximoMes: !!btnProximoMes,
        nomeEstoqueInput: !!nomeEstoqueInput,
        btnNovoEstoque: !!btnNovoEstoque,
        btnVoltarEstoque: !!btnVoltarEstoque,
        themeToggle: !!themeToggle,
        tabelaBody: !!tabelaBody
    });

    // Verificar se elementos críticos existem
    if (!btnNovoEstoque) console.error('Elemento btnNovoEstoque não encontrado!');
    if (!btnVoltarEstoque) console.error('Elemento btnVoltarEstoque não encontrado!');
    if (!themeToggle) console.error('Elemento themeToggle não encontrado!');
    if (!nomeEstoqueInput) console.error('Elemento nomeEstoqueInput não encontrado!');

    // --- Month Navigation ---
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    let displayedDate = new Date();

    function updateMonthDisplay() {
        mesAtualEl.textContent = `${meses[displayedDate.getMonth()]} de ${displayedDate.getFullYear()}`;
    }

    btnMesAnterior?.addEventListener('click', () => {
        console.log('Clique mês anterior');
        const dateBeforeChange = new Date(displayedDate);
        displayedDate.setMonth(displayedDate.getMonth() - 1);
        updateMonthDisplay();
        loadStock(currentStockIndex, dateBeforeChange);
    });

    btnProximoMes?.addEventListener('click', () => {
        console.log('Clique próximo mês');
        const dateBeforeChange = new Date(displayedDate);
        displayedDate.setMonth(displayedDate.getMonth() + 1);
        updateMonthDisplay();
        loadStock(currentStockIndex, dateBeforeChange);
    });

    // --- Chart Setup with Error Handling ---
    let chartPizza, chartBarras, chartSaidas;
    
    try {
        const ctxPizza = document.getElementById('graficoPizza')?.getContext('2d');
        const ctxBarras = document.getElementById('graficoBarras')?.getContext('2d');
        const ctxSaidas = document.getElementById('graficoSaidas')?.getContext('2d');

        if (ctxPizza && ctxBarras && ctxSaidas) {
            chartPizza = new Chart(ctxPizza, {
                type: 'pie',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: { 
                    responsive: true,
                    plugins: { 
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.parsed;
                                }
                            }
                        }
                    }
                }
            });

            chartBarras = new Chart(ctxBarras, {
                type: 'bar',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: { 
                    responsive: true,
                    scales: { y: { beginAtZero: true } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': R$ ' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });

            chartSaidas = new Chart(ctxSaidas, {
                type: 'bar',
                data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
                options: { 
                    responsive: true,
                    indexAxis: 'y', 
                    scales: { x: { beginAtZero: true } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.parsed.x;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            console.warn('Alguns elementos canvas para gráficos não foram encontrados');
        }
    } catch (error) {
        console.error('Erro ao inicializar gráficos:', error);
    }

    // --- Input Validation Functions ---
    function validarInput(input, tipo) {
        const valor = input.value.trim();
        let isValid = true;
        let mensagem = '';

        switch (tipo) {
            case 'item':
                if (valor.length > 50) {
                    isValid = false;
                    mensagem = 'Nome do item deve ter no máximo 50 caracteres';
                }
                break;
            case 'numero':
                const num = parseFloat(valor);
                if (valor !== '' && (isNaN(num) || num < 0)) {
                    isValid = false;
                    mensagem = 'Digite apenas números positivos';
                }
                if (num > 999999) {
                    isValid = false;
                    mensagem = 'Valor muito alto (máximo: 999.999)';
                }
                break;
            case 'valor':
                const val = parseFloat(valor);
                if (valor !== '' && (isNaN(val) || val < 0)) {
                    isValid = false;
                    mensagem = 'Digite apenas valores positivos';
                }
                if (val > 999999.99) {
                    isValid = false;
                    mensagem = 'Valor muito alto (máximo: R$ 999.999,99)';
                }
                break;
        }

        // Adicionar/remover classe de erro
        input.classList.toggle('input-erro', !isValid);
        
        // Mostrar tooltip de erro
        if (!isValid) {
            input.title = mensagem;
            console.warn(`Erro de validação: ${mensagem}`);
        } else {
            input.title = '';
        }

        return isValid;
    }

    // Função para sanitizar dados antes de salvar
    function sanitizarDados(dados) {
        return {
            item: dados.item ? dados.item.substring(0, 50).trim() : '',
            entrada: Math.max(0, Math.min(999999, parseFloat(dados.entrada) || 0)),
            saida: Math.max(0, Math.min(999999, parseFloat(dados.saida) || 0)),
            valor: Math.max(0, Math.min(999999.99, parseFloat(dados.valor) || 0))
        };
    }

    // --- Resumo em Tempo Real dos Itens ---
    function atualizarResumoItens() {
        if (!listaResumoItens) return;
        
        const itensResumo = {};
        const linhas = tabelaBody.querySelectorAll('tr');
        
        linhas.forEach(linha => {
            const nome = linha.querySelector('.item')?.value?.trim();
            const entrada = parseFloat(linha.querySelector('.entrada')?.value) || 0;
            const saida = parseFloat(linha.querySelector('.saida')?.value) || 0;
            
            // Filtrar nomes inválidos
            if (nome && nome !== 'undefined' && nome !== 'null' && nome.length > 0 && (entrada > 0 || saida > 0)) {
                if (!itensResumo[nome]) {
                    itensResumo[nome] = { entrada: 0, saida: 0 };
                }
                itensResumo[nome].entrada += entrada;
                itensResumo[nome].saida += saida;
            }
        });
        
        // Limpar lista anterior
        listaResumoItens.innerHTML = '';
        
        const itensArray = Object.keys(itensResumo);
        
        if (itensArray.length === 0) {
            listaResumoItens.innerHTML = '<p class="resumo-vazio">Nenhum item inserido ainda</p>';
        } else {
            itensArray.forEach(nome => {
                const item = itensResumo[nome];
                const saldo = item.entrada - item.saida;
                
                const divItem = document.createElement('div');
                divItem.className = 'resumo-item';
                
                let saldoClass = 'zero';
                if (saldo > 0) saldoClass = 'positivo';
                else if (saldo < 0) saldoClass = 'negativo';
                
                divItem.innerHTML = `
                    <div class="resumo-item-nome">${nome}</div>
                    <div class="resumo-item-valores">
                        <span class="resumo-entrada">+${item.entrada}</span>
                        <span class="resumo-saida">-${item.saida}</span>
                        <span class="resumo-saldo ${saldoClass}">${saldo}</span>
                    </div>
                `;
                
                listaResumoItens.appendChild(divItem);
            });
        }
        
        // Verificar notificações de reposição
        verificarNotificacoes(itensArray, itensResumo);
    }
    
    // --- Sistema de Notificações ---
    let notificacaoAtiva = false;
    let notificacaoJaDismissed = false;
    let produtosParaRepor = [];
    
    function verificarNotificacoes(itensArray, itensResumo) {
        if (!btnNotify || !notifyBadge) return;
        
        // Verificar produtos que precisam ser repostos (saldo <= 0 ou muito baixo)
        produtosParaRepor = [];
        let produtosCriticos = []; // Saldo <= 0
        if (itensResumo) {
            Object.keys(itensResumo).forEach(nome => {
                const saldo = itensResumo[nome].entrada - itensResumo[nome].saida;
                if (saldo <= 2) { // Considera necessidade de reposição quando saldo <= 2
                    const produto = {
                        nome: nome,
                        saldo: saldo,
                        entrada: itensResumo[nome].entrada,
                        saida: itensResumo[nome].saida
                    };
                    produtosParaRepor.push(produto);
                    
                    if (saldo <= 0) {
                        produtosCriticos.push(produto);
                    }
                }
            });
        }
        
        const quantidadeItens = itensArray.length;
        const temProdutosParaRepor = produtosParaRepor.length > 0;
        
        // Ativar notificação se tiver 3+ produtos OU produtos para repor
        if ((quantidadeItens >= 3 || temProdutosParaRepor) && !notificacaoAtiva && !notificacaoJaDismissed) {
            notificacaoAtiva = true;
            
            // Badge mostra quantidade de produtos para repor, ou "!" se só tiver 3+ produtos
            if (temProdutosParaRepor) {
                notifyBadge.textContent = produtosParaRepor.length.toString();
                
                // Aplicar classe especial para produtos críticos
                if (produtosCriticos.length > 0) {
                    notifyBadge.classList.add('critico');
                    btnNotify.title = `🚨 ${produtosCriticos.length} produto(s) crítico(s) + ${produtosParaRepor.length - produtosCriticos.length} para repor:\n${produtosParaRepor.map(p => `• ${p.nome} (saldo: ${p.saldo})`).join('\n')}`;
                } else {
                    notifyBadge.classList.remove('critico');
                    btnNotify.title = `⚠️ ${produtosParaRepor.length} produto(s) precisam ser repostos:\n${produtosParaRepor.map(p => `• ${p.nome} (saldo: ${p.saldo})`).join('\n')}`;
                }
            } else {
                notifyBadge.classList.remove('critico');
                notifyBadge.textContent = '!';
                btnNotify.title = `📊 ${quantidadeItens} produtos cadastrados no estoque`;
            }
            
            notifyBadge.style.display = 'flex';
            btnNotify.style.animation = 'pulse 2s infinite';
            
            console.log('Notificação ativada:', {
                quantidadeItens,
                produtosParaRepor: produtosParaRepor.map(p => `${p.nome} (${p.saldo})`),
                produtosCriticos: produtosCriticos.map(p => `${p.nome} (${p.saldo})`)
            });
        } else if (quantidadeItens < 3 && !temProdutosParaRepor) {
            // Reset quando menos de 3 itens E sem produtos para repor
            notificacaoJaDismissed = false;
        }
    }
    
    function limparNotificacao() {
        if (!btnNotify || !notifyBadge) return;
        
        notificacaoAtiva = false;
        notificacaoJaDismissed = true;
        notifyBadge.style.display = 'none';
        notifyBadge.textContent = '0';
        notifyBadge.classList.remove('critico'); // Remove classe especial
        btnNotify.style.animation = 'none';
        btnNotify.title = 'Notificações';
        
        // Mostrar resumo dos produtos que precisavam ser repostos
        if (produtosParaRepor.length > 0) {
            const resumo = produtosParaRepor.map(p => {
                const status = p.saldo <= 0 ? '🚨 CRÍTICO' : '⚠️ BAIXO';
                return `• ${p.nome}: ${p.entrada} entradas, ${p.saida} saídas = ${p.saldo} em estoque (${status})`;
            }).join('\n');
            console.log('Produtos que precisam ser repostos:\n' + resumo);
        }
        
        console.log('Notificação dispensada pelo usuário');
    }
    
    // Event listener para limpar notificação ao clicar
    if (btnNotify) {
        btnNotify.addEventListener('click', () => {
            // Mostrar detalhes antes de limpar
            if (produtosParaRepor.length > 0) {
                const criticos = produtosParaRepor.filter(p => p.saldo <= 0);
                const baixos = produtosParaRepor.filter(p => p.saldo > 0 && p.saldo <= 2);
                
                let mensagem = '📦 RELATÓRIO DE ESTOQUE\n\n';
                
                if (criticos.length > 0) {
                    mensagem += '🚨 PRODUTOS CRÍTICOS (sem estoque):\n';
                    mensagem += criticos.map(p => `• ${p.nome}: ${p.saldo} unidades`).join('\n');
                    mensagem += '\n\n';
                }
                
                if (baixos.length > 0) {
                    mensagem += '⚠️ PRODUTOS COM ESTOQUE BAIXO:\n';
                    mensagem += baixos.map(p => `• ${p.nome}: ${p.saldo} unidades`).join('\n');
                    mensagem += '\n\n';
                }
                
                mensagem += '💡 Considere reabastecer estes produtos.';
                
                alert(mensagem);
            }
            
            limparNotificacao();
        });
    }

    // --- Color Generation & Storage ---
    const coresMap = JSON.parse(localStorage.getItem('coresMap') || '{}');
    function gerarCor(nome) {
        if (!coresMap[nome]) {
            const r = Math.floor(Math.random() * 156 + 100);
            const g = Math.floor(Math.random() * 156 + 100);
            const b = Math.floor(Math.random() * 156 + 100);
            coresMap[nome] = `rgb(${r},${g},${b})`;
            localStorage.setItem('coresMap', JSON.stringify(coresMap));
        }
        return coresMap[nome];
    }

    // --- Stock Management Variables ---
    const MAX_STOCKS = 10;
    let allStocksMeta = [];
    try {
        const storedMeta = JSON.parse(localStorage.getItem('allStocksMeta'));
        if (Array.isArray(storedMeta)) {
            allStocksMeta = storedMeta;
        }
    } catch (e) {
        console.error("Erro ao parsear allStocksMeta do localStorage. Inicializando como array vazio.", e);
    }
    for (let i = 0; i < MAX_STOCKS; i++) {
        if (!allStocksMeta[i] || typeof allStocksMeta[i] !== 'object' || allStocksMeta[i] === null) {
            allStocksMeta[i] = { namesByMonth: {} };
        } else {
            if (!allStocksMeta[i].namesByMonth) {
                allStocksMeta[i].namesByMonth = {};
            }
        }
    }
    if (allStocksMeta.length > MAX_STOCKS) {
        allStocksMeta = allStocksMeta.slice(0, MAX_STOCKS);
    }

    let currentStockIndex = parseInt(localStorage.getItem('currentStockIndex') || '0');
    if (currentStockIndex < 0 || currentStockIndex >= MAX_STOCKS) {
        currentStockIndex = 0;
    }

    // --- Função para obter a chave do localStorage para o estoque e mês específicos ---
    function getStorageKey(index, date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `estoque_${year}-${month}_${index}`;
    }

    // --- Helper para obter a chave do nome do mês/ano ---
    function getMonthYearKey(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    // --- Table & Data Manipulation Functions ---

    // Helper to check if a row is completely empty
    function isRowEmpty(row) {
        const inputs = row.querySelectorAll('input');
        return [...inputs].every(input =>
            input.value.trim() === '' ||
            (input.type === 'number' && (isNaN(parseFloat(input.value)) || parseFloat(input.value) === 0))
        );
    }

    // Adds a new empty row to the table
    function adicionarLinha(data = {}) {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td><input type="text" class="item" value="${data.item || ''}" autocomplete="off" /></td>
            <td><input type="number" class="entrada" min="0" step="any" value="${data.entrada || ''}" autocomplete="off"/></td>
            <td><input type="number" class="saida" min="0" step="any" value="${data.saida || ''}" autocomplete="off"/></td>
            <td><input type="number" class="valor" min="0" step="0.01" value="${data.valor || ''}" autocomplete="off"/></td>
        `;
        tabelaBody.appendChild(linha);
        adicionarEventosLinha(linha);
    }

    // Attaches event listeners to inputs within a table row with validation
    function adicionarEventosLinha(linha) {
        const inputs = linha.querySelectorAll('input');
        inputs.forEach(input => {
            // Validação em tempo real
            input.addEventListener('input', () => {
                let tipo = 'numero';
                if (input.classList.contains('item')) tipo = 'item';
                else if (input.classList.contains('valor')) tipo = 'valor';
                
                validarInput(input, tipo);
                
                atualizarResumo();
                atualizarGraficos();
                salvarDadosDoMesAtual(currentStockIndex, displayedDate);
                verificarLinhaFinal();
                removerLinhasVazias();
            });

            // Sanitização ao perder foco
            input.addEventListener('blur', () => {
                if (input.type === 'number') {
                    const valor = parseFloat(input.value);
                    if (!isNaN(valor)) {
                        if (input.classList.contains('valor')) {
                            input.value = Math.min(999999.99, Math.max(0, valor)).toFixed(2);
                        } else {
                            input.value = Math.min(999999, Math.max(0, valor)).toString();
                        }
                    }
                }
            });
        });

        linha.querySelector('.entrada').addEventListener('change', () => {
            const item = linha.querySelector('.item').value.trim();
            const valor = parseFloat(linha.querySelector('.entrada').value) || 0;
            if (item && valor > 0) registrarOperacao('entrada', item, valor);
        });
        linha.querySelector('.saida').addEventListener('change', () => {
            const item = linha.querySelector('.item').value.trim();
            const valor = parseFloat(linha.querySelector('.saida').value) || 0;
            if (item && valor > 0) registrarOperacao('saida', item, valor);
        });
    }

    // Ensures there's always an empty line at the end for user input
    function verificarLinhaFinal() {
        const linhas = tabelaBody.querySelectorAll('tr');
        if (linhas.length === 0 || !isRowEmpty(linhas[linhas.length - 1])) {
            adicionarLinha();
        }
    }

    // Removes empty rows, but keeps the last one for input
    function removerLinhasVazias() {
        const linhas = tabelaBody.querySelectorAll('tr');
        for (let i = linhas.length - 2; i >= 0; i--) {
            if (isRowEmpty(linhas[i])) {
                linhas[i].remove();
            }
        }
    }

    // Calculates and updates summary totals
    function atualizarResumo() {
        let entrada = 0, saida = 0, saldo = 0, valorTotal = 0;
        const linhas = tabelaBody.querySelectorAll('tr');
        linhas.forEach(linha => {
            const ent = parseFloat(linha.querySelector('.entrada').value) || 0;
            const sai = parseFloat(linha.querySelector('.saida').value) || 0;
            const val = parseFloat(linha.querySelector('.valor').value) || 0;
            entrada += ent;
            saida += sai;
            saldo += (ent - sai);
            valorTotal += val;
        });
        entradaTotalEl.textContent = entrada;
        saidaTotalEl.textContent = saida;
        saldoTotalEl.textContent = saldo;
        valorFinalEl.textContent = valorTotal.toFixed(2);
        
        // Atualizar resumo dos itens
        atualizarResumoItens();
    }

    // Updates chart data based on table content with error handling
    function atualizarGraficos() {
        try {
            const labels = [], entradas = [], valores = [], cores = [];
            const dataSaida = {}, corSaidaPorItem = {};
            const linhas = tabelaBody.querySelectorAll('tr');

            linhas.forEach(linha => {
                const nome = linha.querySelector('.item')?.value?.trim();
                const ent = parseFloat(linha.querySelector('.entrada')?.value) || 0;
                const sai = parseFloat(linha.querySelector('.saida')?.value) || 0;
                const val = parseFloat(linha.querySelector('.valor')?.value) || 0;

                // Filtrar nomes inválidos (vazio, undefined, null)
                if (nome && nome !== 'undefined' && nome !== 'null' && nome.length > 0) {
                    const cor = gerarCor(nome);
                    if (ent > 0) {
                        const existingIndex = labels.indexOf(nome);
                        if (existingIndex > -1) {
                            entradas[existingIndex] += ent;
                            valores[existingIndex] += val;
                        } else {
                            labels.push(nome);
                            entradas.push(ent);
                            valores.push(val);
                            cores.push(cor);
                        }
                    }
                    if (sai > 0) {
                        dataSaida[nome] = (dataSaida[nome] || 0) + sai;
                        corSaidaPorItem[nome] = cor;
                    }
                }
            });

            // Update Pie Chart with safety check
            if (chartPizza && chartPizza.data) {
                chartPizza.data.labels = labels;
                chartPizza.data.datasets[0].data = entradas;
                chartPizza.data.datasets[0].backgroundColor = cores;
                chartPizza.update('none'); // 'none' para performance
            }

            // Update Bar Chart (Valores) with safety check
            if (chartBarras && chartBarras.data) {
                chartBarras.data.labels = labels;
                chartBarras.data.datasets[0].data = valores;
                chartBarras.data.datasets[0].backgroundColor = cores;
                chartBarras.update('none');
            }

            // Update Saídas Chart with safety check
            if (chartSaidas && chartSaidas.data) {
                const saidaLabels = Object.keys(dataSaida).filter(l => l && l !== 'undefined' && l !== 'null' && l.trim().length > 0);
                chartSaidas.data.labels = saidaLabels;
                chartSaidas.data.datasets[0].data = saidaLabels.map(l => dataSaida[l]);
                chartSaidas.data.datasets[0].backgroundColor = saidaLabels.map(l => corSaidaPorItem[l]);
                chartSaidas.update('none');
            }
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
        }
    }

    // Saves current table and stock name data to localStorage for the specific month with data sanitization
    function salvarDadosDoMesAtual(index, dateToSave) {
        try {
            console.log('💾 Salvando dados para índice:', index, 'data:', dateToSave);
            
            const linhasVisiveis = [...tabelaBody.querySelectorAll('tr')].filter(row => !isRowEmpty(row));
            const dadosParaSalvar = linhasVisiveis.map(linha => {
                const dadosBrutos = {
                    item: linha.querySelector('.item')?.value || '',
                    entrada: linha.querySelector('.entrada')?.value || '',
                    saida: linha.querySelector('.saida')?.value || '',
                    valor: linha.querySelector('.valor')?.value || ''
                };
                return sanitizarDados(dadosBrutos);
            });

            console.log('📊 Dados para salvar:', dadosParaSalvar);

            const monthYearKey = getMonthYearKey(dateToSave);
            const currentName = nomeEstoqueInput.value.trim().substring(0, 50) || `Estoque ${index + 1}`;

            allStocksMeta[index].namesByMonth[monthYearKey] = currentName;
            localStorage.setItem('allStocksMeta', JSON.stringify(allStocksMeta));

            // Combinar histórico das duas listas
            const historiaEntradas = [...listaEntradas.children].map(li => li.textContent);
            const historiaSaidas = [...listaSaidas.children].map(li => li.textContent);
            const history = [...historiaEntradas, ...historiaSaidas];

            console.log('📝 Histórico para salvar:', history);

            const stockDataForMonth = {
                tableData: dadosParaSalvar,
                history: history,
                lastSaved: new Date().toISOString()
            };

            const storageKey = getStorageKey(index, dateToSave);
            console.log('🔑 Chave de armazenamento:', storageKey);
            
            localStorage.setItem(storageKey, JSON.stringify(stockDataForMonth));
            localStorage.setItem('currentStockIndex', currentStockIndex);
            
            console.log('✅ Dados salvos com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
            alert('Erro ao salvar dados. Verifique o console para mais detalhes.');
        }
    }

    // Registers an operation in the history list and saves it
    function registrarOperacao(tipo, item, quantidade) {
        const data = new Date();
        // Formato compacto: DD/MM/AA
        const dia = data.getDate().toString().padStart(2, '0');
        const mes = (data.getMonth() + 1).toString().padStart(2, '0');
        const ano = data.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
        const dataFormatada = `${dia}/${mes}/${ano}`;
        
        // Formato compacto: 05/07/25 entrada/arroz:10
        const texto = `${dataFormatada} ${tipo}/${item}:${quantidade}`;

        const li = document.createElement('li');
        li.textContent = texto;
        
        // Adicionar na lista correta
        if (tipo === 'entrada') {
            listaEntradas.prepend(li);
        } else {
            listaSaidas.prepend(li);
        }

        salvarDadosDoMesAtual(currentStockIndex, displayedDate);
    }

    // Loads a specific stock by its index and the current displayed month
    function loadStock(indexToLoad, previousDateForSave = null) {
        console.log('🔄 LoadStock chamado com:', { indexToLoad, previousDateForSave, currentStockIndex });
        
        // Salvar dados do estoque atual antes de trocar
        if (currentStockIndex !== null && currentStockIndex >= 0 && currentStockIndex < MAX_STOCKS && allStocksMeta[currentStockIndex]) {
            const dateToSave = previousDateForSave || displayedDate;
            salvarDadosDoMesAtual(currentStockIndex, dateToSave);
        }

        // Garantir que o índice está dentro do range válido
        if (indexToLoad < 0) {
            indexToLoad = MAX_STOCKS - 1;
        } else if (indexToLoad >= MAX_STOCKS) {
            indexToLoad = 0;
        }

        currentStockIndex = indexToLoad;
        console.log('📊 Novo currentStockIndex:', currentStockIndex);
        localStorage.setItem('currentStockIndex', currentStockIndex);

        const monthYearKey = getMonthYearKey(displayedDate);
        const defaultName = `Estoque ${currentStockIndex + 1}`;
        const savedName = allStocksMeta[currentStockIndex].namesByMonth[monthYearKey] || defaultName;
        
        // Atualizar o nome do estoque com indicador visual
        nomeEstoqueInput.value = savedName;
        nomeEstoqueInput.placeholder = `Estoque ${currentStockIndex + 1} de ${MAX_STOCKS}`;
        
        console.log(`📝 Carregando estoque ${currentStockIndex + 1}/${MAX_STOCKS}: ${savedName}`);

        const storageKey = getStorageKey(currentStockIndex, displayedDate);
        console.log('🔑 Tentando carregar com chave:', storageKey);
        
        let stockDataForMonth = {};
        try {
            const dadosSalvos = localStorage.getItem(storageKey);
            console.log('📦 Dados brutos do localStorage:', dadosSalvos);
            
            stockDataForMonth = JSON.parse(dadosSalvos) || { tableData: [], history: [] };
            console.log('📊 Dados parseados:', stockDataForMonth);
        } catch (e) {
            console.error("❌ Erro ao carregar dados do mês para a chave:", storageKey, e);
            stockDataForMonth = { tableData: [], history: [] };
        }

        tabelaBody.innerHTML = '';

        (stockDataForMonth.tableData || []).forEach(data => {
            adicionarLinha(data);
        });
        adicionarLinha();

        // Limpar ambas as listas de histórico
        listaEntradas.innerHTML = '';
        listaSaidas.innerHTML = '';
        
        // Carregar histórico (separar entradas e saídas)
        (stockDataForMonth.history || []).forEach(txt => {
            const li = document.createElement('li');
            li.textContent = txt;
            
            // Determinar se é entrada ou saída baseado no novo formato
            if (txt.includes('entrada/')) {
                listaEntradas.appendChild(li);
            } else if (txt.includes('saida/')) {
                listaSaidas.appendChild(li);
            } else if (txt.includes('ENTRADA:')) {
                // Compatibilidade com formato antigo
                listaEntradas.appendChild(li);
            } else if (txt.includes('SAÍDA:')) {
                // Compatibilidade com formato antigo
                listaSaidas.appendChild(li);
            }
        });

        updateMonthDisplay();
        atualizarResumo();
        atualizarGraficos();

        // Mostrar feedback visual da navegação
        mostrarFeedbackNavegacao(currentStockIndex);

        // Esta é a linha mais importante para evitar o "pulo"
        nomeEstoqueInput.blur();
    }

    // --- Initial Setup and Event Listeners ---

    // Initial load of the current stock when the page loads
    loadStock(currentStockIndex);

    // Garantir que o resumo seja exibido inicialmente
    setTimeout(() => {
        atualizarResumoItens();
    }, 500);

    // Event Listener for stock name input (on blur/change)
    if (nomeEstoqueInput) {
        nomeEstoqueInput.addEventListener('change', () => {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
        });
        console.log('Event listener nome estoque adicionado');
    } else {
        console.warn('Input nome estoque não encontrado - ID: nomeEstoqueInput');
    }

    // '+' button to navigate to next stock (0-9)
    if (btnNovoEstoque) {
        console.log('Adicionando event listener ao botão +...');
        btnNovoEstoque.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clique no botão + detectado!', e);
            console.log('CurrentStockIndex antes:', currentStockIndex);
            
            // Navegação sequencial simples
            const nextIndex = currentStockIndex + 1;
            const finalIndex = nextIndex >= MAX_STOCKS ? 0 : nextIndex;
            
            console.log('Navegando para índice:', finalIndex);
            loadStock(finalIndex);
        });
        console.log('✅ Event listener + adicionado com sucesso');
    } else {
        console.error('❌ Botão + não encontrado - ID: btnNovoEstoque');
    }

    // '-' button to navigate to previous stock (0-9)
    if (btnVoltarEstoque) {
        console.log('Adicionando event listener ao botão -...');
        btnVoltarEstoque.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clique no botão - detectado!', e);
            console.log('CurrentStockIndex antes:', currentStockIndex);
            
            // Navegação sequencial simples
            const prevIndex = currentStockIndex - 1;
            const finalIndex = prevIndex < 0 ? MAX_STOCKS - 1 : prevIndex;
            
            console.log('Navegando para índice:', finalIndex);
            loadStock(finalIndex);
        });
        console.log('✅ Event listener - adicionado com sucesso');
    } else {
        console.error('❌ Botão - não encontrado - ID: btnVoltarEstoque');
    }

    // Button to clear history for current stock (for the current month)
    if (btnLimparHistorico) {
        btnLimparHistorico.addEventListener('click', () => {
            const stockName = allStocksMeta[currentStockIndex].namesByMonth[getMonthYearKey(displayedDate)] || `Estoque ${currentStockIndex + 1}`;
            if (confirm(`Tem certeza que deseja apagar todo o histórico de operações para o estoque "${stockName}" no mês de ${meses[displayedDate.getMonth()]} ${displayedDate.getFullYear()}? Esta ação é irreversível.`)) {
                // Limpar ambas as listas
                listaEntradas.innerHTML = '';
                listaSaidas.innerHTML = '';
                salvarDadosDoMesAtual(currentStockIndex, displayedDate);
                alert('Histórico de operações apagado com sucesso!');
            }
        });
        console.log('Event listener limpar histórico adicionado');
    } else {
        console.warn('Botão limpar histórico não encontrado - ID: btnLimparHistorico');
    }

    // --- Theme Management ---
    function setTheme(theme) {
        console.log('Aplicando tema:', theme);
        
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
            themeToggle.title = theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro';
        }
        
        console.log('Tema aplicado:', document.documentElement.getAttribute('data-theme'));
    }

    // Aplicar tema inicial
    const currentTheme = localStorage.getItem('theme') || 'dark';
    console.log('Tema inicial:', currentTheme);
    setTheme(currentTheme);

    // Event listener para alternância de tema
    if (themeToggle) {
        console.log('Adicionando event listener ao botão de tema...');
        themeToggle.addEventListener('click', (e) => {
            console.log('Clique no botão de tema detectado!', e);
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            console.log('Mudando de', currentTheme, 'para', newTheme);
            setTheme(newTheme);
        });
        console.log('Event listener do tema adicionado com sucesso');
    } else {
        console.error('❌ Botão de tema não encontrado - ID: themeToggle');
    }

    // Make table rows sortable
    new Sortable(tabelaBody, {
        animation: 150,
        ghostClass: 'arrastando',
        onEnd: () => {
            salvarDadosDoMesAtual(currentStockIndex, displayedDate);
            atualizarResumo();
            atualizarGraficos();
            verificarLinhaFinal();
            removerLinhasVazias();
        }
    });

    // Service Worker Registration for PWA capabilities
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker registrado com sucesso!'))
            .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }

    // Save current stock data when the page is closed or reloaded
    window.addEventListener('beforeunload', () => {
        salvarDadosDoMesAtual(currentStockIndex, displayedDate);
    });

    // --- Sharing Functionality ---
    const btnShare = document.getElementById('btnShare');
    const shareMenu = document.getElementById('shareMenu');
    const shareWhatsapp = document.getElementById('shareWhatsapp');
    const shareEmail = document.getElementById('shareEmail');
    const sharePdf = document.getElementById('sharePdf');

    let shareMenuOpen = false;

    // Função para gerar texto do estoque atual para compartilhamento
    function gerarTextoCompartilhamento() {
        const monthYearKey = getMonthYearKey(displayedDate);
        const nomeEstoque = nomeEstoqueInput.value.trim() || (allStocksMeta[currentStockIndex]?.namesByMonth?.[monthYearKey] || `Estoque ${currentStockIndex + 1}`);
        let texto = `📊 Estoque: ${nomeEstoque}\n📅 Mês: ${mesAtualEl.textContent}\n\n📦 Itens:\n`;
        
        const linhas = tabelaBody.querySelectorAll('tr');
        let hasItems = false;
        
        linhas.forEach(linha => {
            const item = linha.querySelector('.item').value.trim();
            const entrada = linha.querySelector('.entrada').value || '0';
            const saida = linha.querySelector('.saida').value || '0';
            const valor = linha.querySelector('.valor').value || '0.00';
            
            if (item) {
                hasItems = true;
                texto += `• ${item} | 📈 Entrada: ${entrada} | 📉 Saída: ${saida} | 💰 Valor: R$ ${valor}\n`;
            }
        });
        
        if (!hasItems) {
            texto += 'Nenhum item cadastrado ainda.\n';
        }
        
        texto += `\n📊 RESUMO:\n`;
        texto += `📈 Entradas: ${entradaTotalEl.textContent}\n`;
        texto += `📉 Saídas: ${saidaTotalEl.textContent}\n`;
        texto += `⚖️ Saldo: ${saldoTotalEl.textContent}\n`;
        texto += `💰 Valor Total: R$ ${valorFinalEl.textContent}\n`;
        
        // Histórico
        const entradas = Array.from(listaEntradas.children).map(li => li.textContent.trim()).filter(Boolean);
        const saidas = Array.from(listaSaidas.children).map(li => li.textContent.trim()).filter(Boolean);
        
        if (entradas.length || saidas.length) {
            texto += '\n📋 Histórico de Operações:\n';
            if (entradas.length) texto += `\n📈 Entradas:\n${entradas.slice(0, 5).join('\n')}\n`;
            if (saidas.length) texto += `\n📉 Saídas:\n${saidas.slice(0, 5).join('\n')}\n`;
        }
        
        return texto;
    }

    // Função para gerar PDF
    function gerarPDF(texto) {
        try {
            // Criar uma nova janela para impressão
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Estoque ${nomeEstoqueInput.value.trim() || `${currentStockIndex + 1}`} - ${mesAtualEl.textContent}</title>
                        <style>
                            body { 
                                font-family: Arial, sans-serif; 
                                padding: 20px; 
                                color: #000; 
                                background: #fff; 
                                line-height: 1.6;
                            }
                            h1, h2, h3 { color: #333; margin-bottom: 10px; }
                            pre { 
                                white-space: pre-wrap; 
                                font-family: Arial, sans-serif; 
                                font-size: 14px;
                                margin: 10px 0;
                            }
                            @media print { 
                                body { margin: 0; padding: 15px; }
                                h1 { font-size: 18px; }
                                pre { font-size: 12px; }
                            }
                        </style>
                    </head>
                    <body>
                        <h1>📊 Relatório de Estoque</h1>
                        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                        <pre>${texto.replace(/\n/g, '<br>')}</pre>
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 1000);
                            }
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            } else {
                throw new Error('Popup bloqueado');
            }
        } catch (error) {
            // Fallback: copiar para clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(texto).then(() => {
                    alert('📋 Dados copiados! Cole em um documento para gerar PDF.');
                }).catch(() => {
                    prompt('📋 Copie estes dados para gerar PDF:', texto);
                });
            } else {
                prompt('📋 Copie estes dados para gerar PDF:', texto);
            }
        }
    }

    // Função para compartilhar estoque atual
    function compartilharEstoqueAtual(tipo) {
        const texto = gerarTextoCompartilhamento();
        let url = '';
        
        switch(tipo) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                break;
            case 'email':
                const subject = `Estoque ${nomeEstoqueInput.value.trim() || `${currentStockIndex + 1}`} - ${mesAtualEl.textContent}`;
                url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(texto)}`;
                break;
            case 'pdf':
                gerarPDF(texto);
                shareMenu.style.display = 'none';
                shareMenuOpen = false;
                return;
        }
        
        if (url) {
            window.open(url, '_blank');
        }
        
        // Fechar menu após compartilhar
        shareMenu.style.display = 'none';
        shareMenuOpen = false;
    }

    // Event listeners para compartilhamento
    if (btnShare && shareMenu) {
        btnShare.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('🔗 Clique no botão compartilhar detectado');
            shareMenu.style.display = shareMenuOpen ? 'none' : 'flex';
            shareMenuOpen = !shareMenuOpen;
        });

        // Fechar menu ao clicar fora
        document.addEventListener('click', function(e) {
            if (shareMenuOpen && !shareMenu.contains(e.target) && e.target !== btnShare) {
                shareMenu.style.display = 'none';
                shareMenuOpen = false;
            }
        });

        // Prevenir fechamento ao clicar dentro do menu
        shareMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        console.log('✅ Event listeners de compartilhamento adicionados');
    } else {
        console.warn('⚠️ Elementos de compartilhamento não encontrados');
    }

    // Event listeners para os botões de compartilhamento
    if (shareWhatsapp) {
        shareWhatsapp.addEventListener('click', () => {
            console.log('📱 Compartilhando no WhatsApp');
            compartilharEstoqueAtual('whatsapp');
        });
    }

    if (shareEmail) {
        shareEmail.addEventListener('click', () => {
            console.log('📧 Compartilhando por email');
            compartilharEstoqueAtual('email');
        });
    }

    if (sharePdf) {
        sharePdf.addEventListener('click', () => {
            console.log('📄 Gerando PDF');
            compartilharEstoqueAtual('pdf');
        });
    }



    // Função para mostrar feedback visual de navegação
    function mostrarFeedbackNavegacao(stockIndex) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2000;
            border: 2px solid #ffd700;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;
        feedback.textContent = `📊 Estoque ${stockIndex + 1} de ${MAX_STOCKS}`;
        
        document.body.appendChild(feedback);
        
        // Remover após 2 segundos
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }
    
    // --- SISTEMA DE PAGAMENTO/ASSINATURA ---
    
    // Credenciais master para acesso premium
    const CREDENCIAIS_MASTER = {
        login: 'Daphiny',
        senha: '2019',
        email: 'admin@dcodestock.com' // Email para recuperação
    };
    
    // Verificar se usuário está logado
    function verificarLogin() {
        const login = JSON.parse(localStorage.getItem('loginPremium') || 'null');
        if (!login) return false;
        
        const agora = new Date();
        const expiracao = new Date(login.expiracao);
        
        return agora < expiracao && login.ativo;
    }
    
    // Verificar status da assinatura (agora inclui login)
    function verificarAssinatura() {
        // Primeiro verifica se está logado
        if (verificarLogin()) {
            return true;
        }
        
        // Senão, verifica assinatura paga
        const assinatura = JSON.parse(localStorage.getItem('assinaturaPremium') || 'null');
        if (!assinatura) return false;
        
        const agora = new Date();
        const vencimento = new Date(assinatura.vencimento);
        
        return agora < vencimento;
    }
    
    // Verificar se a navegação requer premium
    function verificarNavegacaoPremium(acao) {
        if (verificarAssinatura()) {
            return true; // Usuário tem premium (pago ou logado), pode navegar
        }
        
        // Primeira vez é gratuita (estoque 1, mês atual)
        if (currentStockIndex === 0 && ehMesAtual(displayedDate)) {
            return true;
        }
        
        // Qualquer outra navegação requer premium
        mostrarOpcoesAcesso(acao);
        return false;
    }
    
    function ehMesAtual(data) {
        const hoje = new Date();
        return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();
    }
    
    // Mostrar opções de acesso (login ou pagamento)
    function mostrarOpcoesAcesso(acao) {
        // Criar modal de escolha
        const modalEscolha = document.createElement('div');
        modalEscolha.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.8); z-index: 310; display: flex;
            align-items: center; justify-content: center;
        `;
        
        modalEscolha.innerHTML = `
            <div style="background:var(--bg-color-dark);color:var(--text-color);padding:30px;border-radius:12px;max-width:400px;width:90%;border:2px solid var(--border-color);text-align:center;">
                <h2 style="margin:0 0 20px 0;">🚀 Acesso Premium Necessário</h2>
                <p style="margin-bottom:25px;color:var(--secondary-text-color);">
                    Para navegar entre estoques e meses, você precisa de acesso premium.
                </p>
                
                <div style="display:flex;flex-direction:column;gap:15px;">
                    <button id="opcaoLogin" style="padding:15px;background:#4CAF50;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:bold;cursor:pointer;">
                        🔐 Fazer Login Premium
                    </button>
                    <button id="opcaoComprar" style="padding:15px;background:#2196F3;color:#fff;border:none;border-radius:8px;font-size:1rem;font-weight:bold;cursor:pointer;">
                        💳 Comprar Assinatura
                    </button>
                    <button id="opcaoCancelar" style="padding:10px;background:transparent;color:var(--text-color);border:2px solid var(--border-color);border-radius:6px;cursor:pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalEscolha);
        
        // Event listeners
        modalEscolha.querySelector('#opcaoLogin').onclick = () => {
            document.body.removeChild(modalEscolha);
            mostrarModalLogin();
        };
        
        modalEscolha.querySelector('#opcaoComprar').onclick = () => {
            document.body.removeChild(modalEscolha);
            mostrarModalPagamento(acao);
        };
        
        modalEscolha.querySelector('#opcaoCancelar').onclick = () => {
            document.body.removeChild(modalEscolha);
        };
    }
    
    // Elements do modal de pagamento
    const modalPagamento = document.getElementById('modalPagamento');
    const fecharModalPagamento = document.getElementById('fecharModalPagamento');
    const planoMensal = document.getElementById('planoMensal');
    const planoAnual = document.getElementById('planoAnual');
    const cancelarPagamento = document.getElementById('cancelarPagamento');
    const confirmarPagamento = document.getElementById('confirmarPagamento');
    const detalhesPagamento = document.getElementById('detalhesPagamento');
    
    let planoSelecionado = null;
    let metodoSelecionado = null;
    
    function mostrarModalPagamento(acao) {
        modalPagamento.style.display = 'flex';
        
        // Reset seleções
        planoSelecionado = null;
        metodoSelecionado = null;
        confirmarPagamento.disabled = true;
        detalhesPagamento.style.display = 'none';
        
        // Remove classes de seleção
        document.querySelectorAll('.plano-opcao').forEach(el => el.classList.remove('selecionado'));
        document.querySelectorAll('.metodo-pagamento').forEach(el => el.classList.remove('selecionado'));
    }
    
    function fecharModal() {
        modalPagamento.style.display = 'none';
    }
    
    // Event listeners para planos
    planoMensal.addEventListener('click', () => {
        planoSelecionado = { tipo: 'mensal', valor: 19.90, meses: 1 };
        document.querySelectorAll('.plano-opcao').forEach(el => el.classList.remove('selecionado'));
        planoMensal.classList.add('selecionado');
        verificarBotaoConfirmar();
    });
    
    planoAnual.addEventListener('click', () => {
        planoSelecionado = { tipo: 'anual', valor: 199.90, meses: 12 };
        document.querySelectorAll('.plano-opcao').forEach(el => el.classList.remove('selecionado'));
        planoAnual.classList.add('selecionado');
        verificarBotaoConfirmar();
    });
    
    // Event listeners para métodos de pagamento
    document.querySelectorAll('.metodo-pagamento').forEach(btn => {
        btn.addEventListener('click', (e) => {
            metodoSelecionado = e.currentTarget.dataset.metodo;
            document.querySelectorAll('.metodo-pagamento').forEach(el => el.classList.remove('selecionado'));
            e.currentTarget.classList.add('selecionado');
            mostrarDetalhesPagamento();
            verificarBotaoConfirmar();
        });
    });
    
    function verificarBotaoConfirmar() {
        confirmarPagamento.disabled = !(planoSelecionado && metodoSelecionado);
    }
    
    function mostrarDetalhesPagamento() {
        if (!planoSelecionado || !metodoSelecionado) return;
        
        const valor = planoSelecionado.valor;
        let conteudo = '';
        
        switch (metodoSelecionado) {
            case 'pix':
                conteudo = `
                    <h4>💳 Pagamento via PIX</h4>
                    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
                    <p><strong>Chave PIX:</strong> <span class="destaque">06386505930</span></p>
                    <div class="qr-code-placeholder">QR CODE PIX</div>
                    <p style="font-size:0.9rem;color:var(--secondary-text-color);">
                        🔸 Copie a chave PIX ou escaneie o QR Code<br>
                        🔸 Faça o pagamento no seu banco<br>
                        🔸 O acesso será liberado automaticamente
                    </p>
                `;
                break;
                
            case 'credito':
            case 'debito':
                const tipo = metodoSelecionado === 'credito' ? 'Crédito' : 'Débito';
                conteudo = `
                    <h4>💳 Pagamento no ${tipo}</h4>
                    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
                    <p style="color:var(--secondary-text-color);">
                        🔸 Você será redirecionado para o checkout seguro<br>
                        🔸 Aceitamos todas as bandeiras<br>
                        🔸 Pagamento processado na hora
                    </p>
                `;
                break;
                
            case 'transferencia':
                conteudo = `
                    <h4>🏦 Transferência Bancária</h4>
                    <p><strong>Valor:</strong> R$ ${valor.toFixed(2)}</p>
                    <p><strong>Banco:</strong> Itaú</p>
                    <p><strong>Agência:</strong> <span class="destaque">5667</span></p>
                    <p><strong>Conta:</strong> <span class="destaque">01885-6</span></p>
                    <p style="font-size:0.9rem;color:var(--secondary-text-color);">
                        🔸 Faça a transferência usando os dados acima<br>
                        🔸 Envie o comprovante via WhatsApp<br>
                        🔸 Liberação em até 2h úteis
                    </p>
                `;
                break;
        }
        
        detalhesPagamento.innerHTML = conteudo;
        detalhesPagamento.style.display = 'block';
    }
    
    // Event listeners do modal
    fecharModalPagamento.addEventListener('click', fecharModal);
    cancelarPagamento.addEventListener('click', fecharModal);
    
    confirmarPagamento.addEventListener('click', () => {
        processarPagamento();
    });
    
    function processarPagamento() {
        if (!planoSelecionado || !metodoSelecionado) return;
        
        // Simular processamento (em produção, integraria com gateway de pagamento)
        const loading = document.createElement('div');
        loading.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:2rem;margin-bottom:10px;">⏳</div>
                <p>Processando pagamento...</p>
            </div>
        `;
        detalhesPagamento.innerHTML = loading.innerHTML;
        
        setTimeout(() => {
            // Ativar assinatura
            ativarAssinatura(planoSelecionado);
            
            // Mostrar sucesso
            detalhesPagamento.innerHTML = `
                <div style="text-align:center;padding:20px;color:#4CAF50;">
                    <div style="font-size:3rem;margin-bottom:10px;">✅</div>
                    <h4>Pagamento Confirmado!</h4>
                    <p>Sua assinatura ${planoSelecionado.tipo} foi ativada com sucesso!</p>
                    <p style="font-size:0.9rem;color:var(--secondary-text-color);">
                        Agora você pode navegar entre todos os estoques e meses.
                    </p>
                </div>
            `;
            
            confirmarPagamento.textContent = 'Continuar';
            confirmarPagamento.onclick = () => {
                fecharModal();
                // Executar a ação que o usuário tentou fazer
                window.location.reload(); // Recarregar para aplicar mudanças
            };
        }, 2000);
    }
    
    function gerarCredenciaisPersonalizadas() {
        // Gerar login único baseado em timestamp
        const timestamp = Date.now().toString();
        const sufixo = timestamp.slice(-6); // Últimos 6 dígitos
        const login = `user${sufixo}`;
        
        // Gerar senha aleatória de 8 caracteres
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let senha = '';
        for (let i = 0; i < 8; i++) {
            senha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return { login, senha };
    }

    function salvarCredenciaisPersonalizadas(credenciais, plano) {
        // Recuperar lista de usuários existentes
        const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
        
        const agora = new Date();
        const vencimento = new Date(agora);
        vencimento.setMonth(vencimento.getMonth() + plano.meses);
        
        const novoUsuario = {
            login: credenciais.login,
            senha: credenciais.senha,
            plano: plano.tipo,
            valor: plano.valor,
            ativacao: agora.toISOString(),
            vencimento: vencimento.toISOString(),
            ativo: true,
            tipo: 'cliente'
        };
        
        usuarios.push(novoUsuario);
        localStorage.setItem('usuariosPremium', JSON.stringify(usuarios));
        
        return novoUsuario;
    }

    function ativarAssinatura(plano) {
        // Gerar credenciais personalizadas para o novo usuário
        const credenciais = gerarCredenciaisPersonalizadas();
        const usuario = salvarCredenciaisPersonalizadas(credenciais, plano);
        
        // Ativar automaticamente o login do novo usuário
        ativarLoginPremium(credenciais.login, usuario);
        
        // Mostrar credenciais para o usuário
        mostrarCredenciaisNovas(credenciais, plano);
        
        // Atualizar interface
        atualizarStatusPremium();
    }

    function mostrarCredenciaisNovas(credenciais, plano) {
        // Criar modal para exibir as credenciais
        const modalCredenciais = document.createElement('div');
        modalCredenciais.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 1000; font-family: Arial, sans-serif;
        `;
        
        modalCredenciais.innerHTML = `
            <div style="background: #fff; padding: 30px; border-radius: 12px; text-align: center; max-width: 450px; width: 90%; box-shadow: 0 8px 25px rgba(0,0,0,0.3);">
                <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #2196F3; margin: 0 0 15px 0;">Assinatura Ativada!</h2>
                <p style="color: #666; margin-bottom: 25px;">Suas credenciais de acesso foram geradas automaticamente:</p>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #333;">👤 Login:</strong>
                        <div style="font-family: monospace; font-size: 18px; color: #2196F3; font-weight: bold; margin-top: 5px; background: #e3f2fd; padding: 8px; border-radius: 4px;">${credenciais.login}</div>
                    </div>
                    <div>
                        <strong style="color: #333;">🔑 Senha:</strong>
                        <div style="font-family: monospace; font-size: 18px; color: #2196F3; font-weight: bold; margin-top: 5px; background: #e3f2fd; padding: 8px; border-radius: 4px;">${credenciais.senha}</div>
                    </div>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>⚠️ IMPORTANTE:</strong> Anote essas credenciais em local seguro! 
                        Você pode recuperá-las pelo email se esquecer.
                    </p>
                </div>
                
                <div style="margin: 20px 0; color: #666; font-size: 14px;">
                    <p><strong>Plano:</strong> ${plano.tipo}</p>
                    <p><strong>Válido até:</strong> ${new Date(Date.now() + plano.meses * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}</p>
                </div>
                
                <button onclick="this.parentElement.parentElement.remove(); window.location.reload();" 
                        style="background: #4CAF50; color: white; padding: 12px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold;">
                    Continuar ✓
                </button>
            </div>
        `;
        
        document.body.appendChild(modalCredenciais);
        
        // Log para desenvolvimento
        console.log('🎉 Nova assinatura ativada!');
        console.log('📝 Credenciais geradas:', credenciais);
        console.log('📋 Plano:', plano);
    }
    
    function atualizarStatusPremium() {
        const temLogin = verificarLogin();
        const temAssinatura = verificarAssinatura();
        const temPremium = temLogin || temAssinatura;
        
        if (temPremium) {
            // Adicionar badge premium ao nome do estoque
            if (nomeEstoqueInput && !nomeEstoqueInput.parentNode.querySelector('.premium-badge')) {
                const badge = document.createElement('span');
                badge.className = 'premium-badge';
                
                const loginData = JSON.parse(localStorage.getItem('loginPremium'));
                if (loginData && loginData.tipo === 'master') {
                    badge.textContent = '👑 MASTER';
                } else {
                    badge.textContent = '⭐ PREMIUM';
                }
                
                nomeEstoqueInput.parentNode.appendChild(badge);
            }
            
            // Mostrar status do usuário se logado
            if (temLogin && userStatus && nomeUsuario) {
                const loginData = JSON.parse(localStorage.getItem('loginPremium'));
                userStatus.classList.add('logado');
                logoutBtn.classList.add('logado');
                
                if (loginData.tipo === 'master') {
                    nomeUsuario.textContent = `👑 ${loginData.usuario}`;
                } else {
                    // Mostrar informações do cliente
                    const vencimento = new Date(loginData.expiracao);
                    const diasRestantes = Math.ceil((vencimento - new Date()) / (1000 * 60 * 60 * 24));
                    
                    if (diasRestantes > 0) {
                        nomeUsuario.textContent = `⭐ ${loginData.usuario} (${diasRestantes}d)`;
                        nomeUsuario.title = `Plano ${loginData.plano} válido até ${vencimento.toLocaleDateString('pt-BR')}`;
                    } else {
                        nomeUsuario.textContent = `⏰ ${loginData.usuario} (Expirado)`;
                        nomeUsuario.title = 'Assinatura expirada';
                    }
                }
            }
        } else {
            // Remover badge se não tem premium
            const badge = nomeEstoqueInput?.parentNode.querySelector('.premium-badge');
            if (badge) badge.remove();
            
            // Esconder status do usuário
            userStatus?.classList.remove('logado');
            logoutBtn?.classList.remove('logado');
        }
    }
    
    // Interceptar navegações que requerem premium
    const originalBtnMesAnteriorClick = btnMesAnterior?.onclick;
    const originalBtnProximoMesClick = btnProximoMes?.onclick;
    
    btnMesAnterior?.addEventListener('click', (e) => {
        if (!verificarNavegacaoPremium('mes-anterior')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    btnProximoMes?.addEventListener('click', (e) => {
        if (!verificarNavegacaoPremium('proximo-mes')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    btnNovoEstoque?.addEventListener('click', (e) => {
        if (!verificarNavegacaoPremium('novo-estoque')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    btnVoltarEstoque?.addEventListener('click', (e) => {
        if (!verificarNavegacaoPremium('voltar-estoque')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    });
    
    // Inicializar status premium
    atualizarStatusPremium();
    
    console.log('Sistema de pagamento inicializado');
});


// --- SISTEMA DE LOGIN ---

const modalLogin = document.getElementById('modalLogin');
const fecharModalLogin = document.getElementById('fecharModalLogin');
const loginForm = document.getElementById('loginForm');
const recuperacaoForm = document.getElementById('recuperacaoForm');
const sucessoRecuperacao = document.getElementById('sucessoRecuperacao');
const loginUsuario = document.getElementById('loginUsuario');
const loginSenha = document.getElementById('loginSenha');
const btnLogin = document.getElementById('btnLogin');
const btnEsqueciSenha = document.getElementById('btnEsqueciSenha');
const emailRecuperacao = document.getElementById('emailRecuperacao');
const btnRecuperar = document.getElementById('btnRecuperar');
const voltarLogin = document.getElementById('voltarLogin');
const fecharSucesso = document.getElementById('fecharSucesso');
const userStatus = document.getElementById('userStatus');
const nomeUsuario = document.getElementById('nomeUsuario');
const logoutBtn = document.getElementById('logoutBtn');

function mostrarModalLogin() {
    modalLogin.style.display = 'flex';
    loginForm.style.display = 'block';
    recuperacaoForm.style.display = 'none';
    sucessoRecuperacao.style.display = 'none';
    
    // Limpar campos
    loginUsuario.value = '';
    loginSenha.value = '';
    emailRecuperacao.value = '';
    
    // Remover classes de erro
    loginUsuario.classList.remove('login-error');
    loginSenha.classList.remove('login-error');
}

function fecharModalLoginFn() {
    modalLogin.style.display = 'none';
}

function realizarLogin() {
    const login = loginUsuario.value.trim();
    const senha = loginSenha.value.trim();
    
    // Remover classes de erro
    loginUsuario.classList.remove('login-error');
    loginSenha.classList.remove('login-error');
    
    if (!login || !senha) {
        if (!login) loginUsuario.classList.add('login-error');
        if (!senha) loginSenha.classList.add('login-error');
        mostrarMensagem('Por favor, preencha todos os campos.', 'erro');
        return;
    }
    
    // Verificar credenciais master
    if (login === CREDENCIAIS_MASTER.login && senha === CREDENCIAIS_MASTER.senha) {
        // Login master bem-sucedido
        ativarLoginPremium(login, { tipo: 'master', usuario: login });
        fecharModalLoginFn();
        mostrarMensagem('Login master realizado com sucesso! Acesso premium ativado.', 'sucesso');
        window.location.reload();
        return;
    }
    
    // Verificar credenciais de clientes
    const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
    const usuarioEncontrado = usuarios.find(user => 
        user.login === login && user.senha === senha && user.ativo
    );
    
    if (usuarioEncontrado) {
        // Verificar se a assinatura ainda está válida
        const agora = new Date();
        const vencimento = new Date(usuarioEncontrado.vencimento);
        
        if (agora <= vencimento) {
            // Login de cliente válido
            ativarLoginPremium(login, usuarioEncontrado);
            fecharModalLoginFn();
            mostrarMensagem(`Bem-vindo de volta! Acesso premium ativado até ${vencimento.toLocaleDateString('pt-BR')}.`, 'sucesso');
            window.location.reload();
        } else {
            // Assinatura expirada
            mostrarMensagem('Sua assinatura expirou. Renove para continuar usando os recursos premium.', 'erro');
            loginUsuario.classList.add('login-error');
            loginSenha.classList.add('login-error');
        }
    } else {
        // Login inválido
        loginUsuario.classList.add('login-error');
        loginSenha.classList.add('login-error');
        mostrarMensagem('Login ou senha incorretos. Tente novamente.', 'erro');
    }
}

function ativarLoginPremium(login, dadosUsuario) {
    const agora = new Date();
    let expiracao, tipo;
    
    if (dadosUsuario.tipo === 'master') {
        // Master tem acesso perpétuo
        expiracao = new Date(agora);
        expiracao.setFullYear(expiracao.getFullYear() + 10); // 10 anos
        tipo = 'master';
    } else {
        // Cliente usa a expiração da assinatura
        expiracao = new Date(dadosUsuario.vencimento);
        tipo = 'cliente';
    }
    
    const loginData = {
        usuario: login,
        ativacao: agora.toISOString(),
        expiracao: expiracao.toISOString(),
        ativo: true,
        tipo: tipo,
        plano: dadosUsuario.plano || 'master'
    };
    
    localStorage.setItem('loginPremium', JSON.stringify(loginData));
    atualizarStatusPremium();
}

function mostrarRecuperacao() {
    loginForm.style.display = 'none';
    recuperacaoForm.style.display = 'block';
    sucessoRecuperacao.style.display = 'none';
}

function voltarParaLogin() {
    loginForm.style.display = 'block';
    recuperacaoForm.style.display = 'none';
    sucessoRecuperacao.style.display = 'none';
}

function recuperarSenha() {
    const email = emailRecuperacao.value.trim();
    
    if (!email) {
        emailRecuperacao.classList.add('login-error');
        mostrarMensagem('Por favor, digite seu email.', 'erro');
        return;
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        emailRecuperacao.classList.add('login-error');
        mostrarMensagem('Por favor, digite um email válido.', 'erro');
        return;
    }
    
    // Remover classe de erro
    emailRecuperacao.classList.remove('login-error');
    
    // Recuperar todas as credenciais disponíveis
    const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
    const credenciaisDisponiveis = [];
    
    // Adicionar credenciais master
    credenciaisDisponiveis.push({
        login: CREDENCIAIS_MASTER.login,
        senha: CREDENCIAIS_MASTER.senha,
        tipo: 'Acesso Master',
        plano: 'Completo',
        vencimento: 'Permanente'
    });
    
    // Adicionar credenciais de clientes ativos
    usuarios.forEach(user => {
        if (user.ativo) {
            const vencimento = new Date(user.vencimento);
            const agora = new Date();
            const status = agora <= vencimento ? 'Ativo' : 'Expirado';
            
            credenciaisDisponiveis.push({
                login: user.login,
                senha: user.senha,
                tipo: `Cliente ${user.plano}`,
                plano: user.plano,
                vencimento: vencimento.toLocaleDateString('pt-BR'),
                status: status
            });
        }
    });
    
    // Simular envio de email
    recuperacaoForm.style.display = 'none';
    sucessoRecuperacao.style.display = 'block';
    
    // Montar email com todas as credenciais
    let corpoEmail = `
        Olá,
        
        Você solicitou a recuperação de suas credenciais de acesso premium do DcodeStock.
        
        Aqui estão todas as credenciais de acesso disponíveis:
        
    `;
    
    credenciaisDisponiveis.forEach((cred, index) => {
        corpoEmail += `
        ═══════════════════════════════════════════════
        ${index + 1}. ${cred.tipo}
        ═══════════════════════════════════════════════
        👤 Login: ${cred.login}
        🔑 Senha: ${cred.senha}
        📋 Plano: ${cred.plano}
        📅 Válido até: ${cred.vencimento}
        ${cred.status ? `📊 Status: ${cred.status}` : ''}
        
        `;
    });
    
    corpoEmail += `
        ═══════════════════════════════════════════════
        
        INSTRUÇÕES DE USO:
        • Use qualquer uma das credenciais acima para fazer login
        • Credenciais expiradas precisam ser renovadas
        • O acesso Master é permanente e possui todos os recursos
        • Guarde essas informações em local seguro
        
        Se você adquiriu recentemente uma assinatura e não vê suas 
        credenciais na lista, entre em contato conosco.
        
        Atenciosamente,
        Equipe DcodeStock
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Este email foi enviado automaticamente para: ${email}
        Total de credenciais encontradas: ${credenciaisDisponiveis.length}
        Data: ${new Date().toLocaleString('pt-BR')}
    `;
    
    console.log('📧 Email de recuperação enviado para:', email);
    console.log('📋 Credenciais encontradas:', credenciaisDisponiveis.length);
    console.log('📄 Conteúdo completo do email:', corpoEmail);
    
    // Mostrar resumo no console para desenvolvimento
    console.table(credenciaisDisponiveis);
    
    // Em produção, aqui seria feita a chamada para API de email
    // sendEmail(email, 'Recuperação de Credenciais - DcodeStock', corpoEmail);
}

function realizarLogout() {
    localStorage.removeItem('loginPremium');
    atualizarStatusPremium();
    mostrarMensagem('Logout realizado com sucesso.', 'sucesso');
    window.location.reload();
}

function mostrarMensagem(texto, tipo) {
    const mensagem = document.createElement('div');
    mensagem.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 400;
        padding: 15px 20px; border-radius: 8px; font-weight: bold;
        max-width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    if (tipo === 'sucesso') {
        mensagem.style.background = '#4CAF50';
        mensagem.style.color = '#fff';
    } else {
        mensagem.style.background = '#f44336';
        mensagem.style.color = '#fff';
    }
    
    mensagem.textContent = texto;
    document.body.appendChild(mensagem);
    
    setTimeout(() => {
        if (mensagem.parentNode) {
            mensagem.parentNode.removeChild(mensagem);
        }
    }, 4000);
}

// Event listeners do modal de login
fecharModalLogin?.addEventListener('click', fecharModalLoginFn);
btnLogin?.addEventListener('click', realizarLogin);
btnEsqueciSenha?.addEventListener('click', mostrarRecuperacao);
voltarLogin?.addEventListener('click', voltarParaLogin);
btnRecuperar?.addEventListener('click', recuperarSenha);
fecharSucesso?.addEventListener('click', fecharModalLoginFn);
logoutBtn?.addEventListener('click', realizarLogout);

// Enter key nos campos de login
loginUsuario?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') realizarLogin();
});

loginSenha?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') realizarLogin();
});

emailRecuperacao?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') recuperarSenha();
});

// Funções de gerenciamento (úteis para desenvolvimento)
function listarTodosUsuarios() {
        console.log('═══════════════════════════════════════════════');
        console.log('📋 LISTA COMPLETA DE USUÁRIOS - DCODESTOCK');
        console.log('═══════════════════════════════════════════════');
        
        // Usuário Master
        console.log('👑 USUÁRIO MASTER:');
        console.log(`   Login: ${CREDENCIAIS_MASTER.login}`);
        console.log(`   Senha: ${CREDENCIAIS_MASTER.senha}`);
        console.log(`   Tipo: Acesso Master Permanente`);
        console.log('');
        
        // Usuários Clientes
        const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
        
        if (usuarios.length > 0) {
            console.log('⭐ USUÁRIOS CLIENTES:');
            usuarios.forEach((user, index) => {
                const vencimento = new Date(user.vencimento);
                const agora = new Date();
                const diasRestantes = Math.ceil((vencimento - agora) / (1000 * 60 * 60 * 24));
                const status = diasRestantes > 0 ? `Ativo (${diasRestantes} dias)` : 'Expirado';
                
                console.log(`   ${index + 1}. ${user.login}`);
                console.log(`      Senha: ${user.senha}`);
                console.log(`      Plano: ${user.plano}`);
                console.log(`      Valor: R$ ${user.valor}`);
                console.log(`      Criado: ${new Date(user.ativacao).toLocaleDateString('pt-BR')}`);
                console.log(`      Válido até: ${vencimento.toLocaleDateString('pt-BR')}`);
                console.log(`      Status: ${status}`);
                console.log('');
            });
            
            console.log(`Total de clientes: ${usuarios.length}`);
            const ativos = usuarios.filter(u => new Date(u.vencimento) > new Date()).length;
            console.log(`Clientes ativos: ${ativos}`);
            console.log(`Clientes expirados: ${usuarios.length - ativos}`);
        } else {
            console.log('⭐ Nenhum cliente cadastrado ainda.');
        }
        
        console.log('═══════════════════════════════════════════════');
        return { master: CREDENCIAIS_MASTER, clientes: usuarios };
    }

    function limparTodosUsuarios() {
        if (confirm('⚠️ ATENÇÃO: Isso removerá TODOS os usuários clientes (exceto master). Continuar?')) {
            localStorage.removeItem('usuariosPremium');
            localStorage.removeItem('loginPremium');
            console.log('🗑️ Todos os usuários clientes foram removidos.');
            console.log('👑 Usuário master preservado:', CREDENCIAIS_MASTER);
            atualizarStatusPremium();
        }
    }

    function estatisticasUsuarios() {
        const usuarios = JSON.parse(localStorage.getItem('usuariosPremium') || '[]');
        const agora = new Date();
        
        const stats = {
            total: usuarios.length,
            ativos: 0,
            expirados: 0,
            receitaTotal: 0,
            planos: {}
        };
        
        usuarios.forEach(user => {
            const vencimento = new Date(user.vencimento);
            
            if (vencimento > agora) {
                stats.ativos++;
            } else {
                stats.expirados++;
            }
            
            stats.receitaTotal += parseFloat(user.valor);
            
            if (!stats.planos[user.plano]) {
                stats.planos[user.plano] = 0;
            }
            stats.planos[user.plano]++;
        });
        
        console.log('📊 ESTATÍSTICAS DE USUÁRIOS:');
        console.table(stats);
        
        return stats;
    }

    // Disponibilizar funções globalmente para uso no console
    window.dcodeManagement = {
        listarUsuarios: listarTodosUsuarios,
        limparUsuarios: limparTodosUsuarios,
        estatisticas: estatisticasUsuarios
    };