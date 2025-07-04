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

                if (nome) {
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
                const saidaLabels = Object.keys(dataSaida);
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

            const monthYearKey = getMonthYearKey(dateToSave);
            const currentName = nomeEstoqueInput.value.trim().substring(0, 50) || `Estoque ${index + 1}`;

            allStocksMeta[index].namesByMonth[monthYearKey] = currentName;
            localStorage.setItem('allStocksMeta', JSON.stringify(allStocksMeta));

            // Combinar histórico das duas listas
            const historiaEntradas = [...listaEntradas.children].map(li => li.textContent);
            const historiaSaidas = [...listaSaidas.children].map(li => li.textContent);
            const history = [...historiaEntradas, ...historiaSaidas];

            const stockDataForMonth = {
                tableData: dadosParaSalvar,
                history: history,
                lastSaved: new Date().toISOString()
            };

            localStorage.setItem(getStorageKey(index, dateToSave), JSON.stringify(stockDataForMonth));
            localStorage.setItem('currentStockIndex', currentStockIndex);
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            alert('Erro ao salvar dados. Verifique o console para mais detalhes.');
        }
    }

    // Registers an operation in the history list and saves it
    function registrarOperacao(tipo, item, quantidade) {
        const data = new Date();
        const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
        const displayedMonthYear = `${meses[displayedDate.getMonth()]} ${displayedDate.getFullYear()}`;
        // Novo formato: [DATA - MÊS] ITEM: NOME - ENTRADA/SAÍDA: QTD
        const texto = `[${dataFormatada} - ${displayedMonthYear}] ITEM: ${item} - ${tipo.toUpperCase()}: ${quantidade}`;

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
        let stockDataForMonth = {};
        try {
            stockDataForMonth = JSON.parse(localStorage.getItem(storageKey)) || { tableData: [], history: [] };
        } catch (e) {
            console.error("Erro ao carregar dados do mês para a chave:", storageKey, e);
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
            
            // Determinar se é entrada ou saída baseado no texto
            if (txt.includes('ENTRADA:')) {
                listaEntradas.appendChild(li);
            } else if (txt.includes('SAÍDA:')) {
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
    const shareInstagram = document.getElementById('shareInstagram');
    const shareFacebook = document.getElementById('shareFacebook');
    const shareEmail = document.getElementById('shareEmail');

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

    // Função para compartilhar estoque atual
    function compartilharEstoqueAtual(tipo) {
        const texto = gerarTextoCompartilhamento();
        let url = '';
        
        switch(tipo) {
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                break;
            case 'instagram':
                // Instagram não permite compartilhamento direto de texto
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(texto).then(() => {
                        alert('📋 Texto copiado! Cole no Instagram manualmente.');
                    }).catch(() => {
                        prompt('📋 Copie este texto para o Instagram:', texto);
                    });
                } else {
                    prompt('📋 Copie este texto para o Instagram:', texto);
                }
                return;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=&quote=${encodeURIComponent(texto)}`;
                break;
            case 'email':
                const subject = `Estoque ${nomeEstoqueInput.value.trim() || `${currentStockIndex + 1}`} - ${mesAtualEl.textContent}`;
                url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(texto)}`;
                break;
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

    if (shareInstagram) {
        shareInstagram.addEventListener('click', () => {
            console.log('📸 Compartilhando no Instagram');
            compartilharEstoqueAtual('instagram');
        });
    }

    if (shareFacebook) {
        shareFacebook.addEventListener('click', () => {
            console.log('👥 Compartilhando no Facebook');
            compartilharEstoqueAtual('facebook');
        });
    }

    if (shareEmail) {
        shareEmail.addEventListener('click', () => {
            console.log('📧 Compartilhando por email');
            compartilharEstoqueAtual('email');
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
});