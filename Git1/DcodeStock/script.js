document.addEventListener('DOMContentLoaded', () => {
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
    const listaOperacoes = document.getElementById('listaOperacoes');
    const btnLimparHistorico = document.getElementById('btnLimparHistorico');

    // --- Month Navigation ---
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    let displayedDate = new Date(); // This will now control which month's data is loaded

    function updateMonthDisplay() {
        mesAtualEl.textContent = `${meses[displayedDate.getMonth()]} de ${displayedDate.getFullYear()}`;
        // CRITICAL CHANGE: When the displayed month changes, reload the current stock's data
        // This ensures the table and charts reflect the selected month.
        loadStock(currentStockIndex);
    }

    btnMesAnterior.addEventListener('click', () => {
        displayedDate.setMonth(displayedDate.getMonth() - 1);
        updateMonthDisplay();
    });

    btnProximoMes.addEventListener('click', () => {
        displayedDate.setMonth(displayedDate.getMonth() + 1);
        updateMonthDisplay();
    });

    updateMonthDisplay(); // Initial month display

    // --- Chart Setup ---
    const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
    const ctxBarras = document.getElementById('graficoBarras').getContext('2d');
    const ctxSaidas = document.getElementById('graficoSaidas').getContext('2d');

    const chartPizza = new Chart(ctxPizza, {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { plugins: { legend: { position: 'bottom' } } }
    });

    const chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { scales: { y: { beginAtZero: true } } }
    });

    const chartSaidas = new Chart(ctxSaidas, {
        type: 'bar',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
        options: { indexAxis: 'y', scales: { x: { beginAtZero: true } } }
    });

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
    let allStocksData = [];
    try {
        const storedData = JSON.parse(localStorage.getItem('allStocksData'));
        if (Array.isArray(storedData)) {
            allStocksData = storedData;
        }
    } catch (e) {
        console.error("Erro ao parsear allStocksData do localStorage. Inicializando como array vazio.", e);
    }

    // Ensure allStocksData has MAX_STOCKS valid stock objects
    for (let i = 0; i < MAX_STOCKS; i++) {
        if (!allStocksData[i] || typeof allStocksData[i] !== 'object' || allStocksData[i] === null) {
            allStocksData[i] = {
                customName: `Estoque ${i + 1}`,
                // CHANGED: Use monthlyData to store data per month
                monthlyData: {}, 
                history: []
            };
        } else {
            // Ensure existing stocks have all required properties
            if (!allStocksData[i].customName) allStocksData[i].customName = `Estoque ${i + 1}`;
            // CHANGED: Initialize monthlyData if it doesn't exist
            if (!allStocksData[i].monthlyData) allStocksData[i].monthlyData = {}; 
            if (!allStocksData[i].history) allStocksData[i].history = [];
        }
    }
    // Truncate if somehow more than MAX_STOCKS
    if (allStocksData.length > MAX_STOCKS) {
        allStocksData = allStocksData.slice(0, MAX_STOCKS);
    }
    
    let currentStockIndex = parseInt(localStorage.getItem('currentStockIndex') || '0');
    // Ensure the initial currentStockIndex is valid
    if (currentStockIndex < 0 || currentStockIndex >= MAX_STOCKS) {
        currentStockIndex = 0;
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

    // Attaches event listeners to inputs within a table row
    function adicionarEventosLinha(linha) {
        const inputs = linha.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                atualizarResumo();
                atualizarGraficos();
                salvarTabela();
                // Call cleanup functions after input to maintain table structure
                verificarLinhaFinal();
                removerLinhasVazias();
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
        // Iterate from the second to last line upwards
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

    // Updates chart data based on table content
    function atualizarGraficos() {
        const labels = [], entradas = [], valores = [], cores = [];
        const dataSaida = {}, corSaidaPorItem = {};
        const linhas = tabelaBody.querySelectorAll('tr');

        linhas.forEach(linha => {
            const nome = linha.querySelector('.item').value.trim();
            const ent = parseFloat(linha.querySelector('.entrada').value) || 0;
            const sai = parseFloat(linha.querySelector('.saida').value) || 0;
            const val = parseFloat(linha.querySelector('.valor').value) || 0;

            if (nome) {
                const cor = gerarCor(nome);
                // For pie and bar chart (Entrada and Valor)
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
                // For horizontal bar chart (Saída)
                if (sai > 0) {
                    dataSaida[nome] = (dataSaida[nome] || 0) + sai;
                    corSaidaPorItem[nome] = cor;
                }
            }
        });

        // Update Pie Chart
        chartPizza.data.labels = labels;
        chartPizza.data.datasets[0].data = entradas;
        chartPizza.data.datasets[0].backgroundColor = cores;
        chartPizza.update();

        // Update Bar Chart (Valores)
        chartBarras.data.labels = labels;
        chartBarras.data.datasets[0].data = valores;
        chartBarras.data.datasets[0].backgroundColor = cores;
        chartBarras.update();

        // Update Saídas Chart
        const saidaLabels = Object.keys(dataSaida);
        chartSaidas.data.labels = saidaLabels;
        chartSaidas.data.datasets[0].data = saidaLabels.map(l => dataSaida[l]);
        chartSaidas.data.datasets[0].backgroundColor = saidaLabels.map(l => corSaidaPorItem[l]);
        chartSaidas.update();
    }

    // Saves current table and stock name data to allStocksData array and localStorage
    function salvarTabela() {
        // Filter out empty rows when saving
        const linhasVisiveis = [...tabelaBody.querySelectorAll('tr')].filter(row => !isRowEmpty(row));
        const dadosParaSalvar = linhasVisiveis.map(linha => ({
            item: linha.querySelector('.item').value,
            entrada: linha.querySelector('.entrada').value,
            saida: linha.querySelector('.saida').value,
            valor: linha.querySelector('.valor').value
        }));
        
        // NEW: Create a unique key for the current month and year
        const monthKey = `${displayedDate.getMonth()}_${displayedDate.getFullYear()}`;

        allStocksData[currentStockIndex].customName = nomeEstoqueInput.value.trim() || `Estoque ${currentStockIndex + 1}`;
        // CHANGED: Store table data under the specific month key
        allStocksData[currentStockIndex].monthlyData[monthKey] = dadosParaSalvar; 
        
        localStorage.setItem('allStocksData', JSON.stringify(allStocksData));
        localStorage.setItem('currentStockIndex', currentStockIndex);
    }

    // Registers an operation in the history list
    function registrarOperacao(tipo, item, quantidade) {
        const data = new Date();
        const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
        // NEW: Add the displayed month/year to the history entry for clarity
        const displayedMonthYear = `${meses[displayedDate.getMonth()]} ${displayedDate.getFullYear()}`;
        const texto = `[${dataFormatada} - ${displayedMonthYear}] ${tipo.toUpperCase()}: ${item} - ${quantidade}`;
        
        // Add to the beginning of the history array
        allStocksData[currentStockIndex].history.unshift(texto); 
        localStorage.setItem('allStocksData', JSON.stringify(allStocksData));
        
        // Update displayed list (most recent first)
        const li = document.createElement('li');
        li.textContent = texto;
        listaOperacoes.prepend(li);
    }

    // Loads a specific stock by its index
    function loadStock(indexToLoad) {
        // Save current stock data before switching, but only if it's not the initial load
        // This ensures data for the previously viewed month/stock is saved.
        if (currentStockIndex !== null && allStocksData[currentStockIndex]) {
            salvarTabela(); 
        }

        currentStockIndex = (indexToLoad + MAX_STOCKS) % MAX_STOCKS; // Ensure index wraps correctly (0-9)
        localStorage.setItem('currentStockIndex', currentStockIndex);

        const stockData = allStocksData[currentStockIndex];
        // NEW: Get data for the current displayed month, or an empty array if none exists
        const monthKey = `${displayedDate.getMonth()}_${displayedDate.getFullYear()}`;
        const dadosTabela = (stockData.monthlyData && stockData.monthlyData[monthKey]) ? stockData.monthlyData[monthKey] : [];

        const historicoOperacoes = stockData.history || []; // History remains global per stock
        const customName = stockData.customName || `Estoque ${currentStockIndex + 1}`;

        nomeEstoqueInput.value = customName;
        
        tabelaBody.innerHTML = ''; // Clear existing rows

        // Populate table with saved data for the CURRENT MONTH
        dadosTabela.forEach(data => {
            adicionarLinha(data);
        });
        adicionarLinha(); // Always ensure there's at least one empty row for new input

        listaOperacoes.innerHTML = '';
        // Display history in reverse chronological order (most recent first)
        historicoOperacoes.forEach(txt => {
            const li = document.createElement('li');
            li.textContent = txt;
            listaOperacoes.appendChild(li); 
        });

        atualizarResumo();
        atualizarGraficos();
    }

    // --- Initial Setup and Event Listeners ---

    // Initial load of the current stock when the page loads
    // This will now correctly load the data for the initially displayed month.
    loadStock(currentStockIndex); 

    // Event Listener for stock name input (on blur/change)
    nomeEstoqueInput.addEventListener('change', () => {
        salvarTabela(); // Save when stock name is changed
    });

    // '+' button to navigate to next stock (0-9)
    btnNovoEstoque.addEventListener('click', () => {
        loadStock(currentStockIndex + 1);
    });

    // '-' button to navigate to previous stock (0-9)
    btnVoltarEstoque.addEventListener('click', () => {
        loadStock(currentStockIndex - 1);
    });

    // Make table rows sortable
    new Sortable(tabelaBody, {
        animation: 150,
        ghostClass: 'arrastando',
        onEnd: () => {
            salvarTabela();
            atualizarResumo();
            atualizarGraficos();
            verificarLinhaFinal(); // Ensure empty row is still at the bottom after sorting
            removerLinhasVazias(); // Clean up if any rows became empty after drag
        }
    });

    // Button to clear history for current stock
    btnLimparHistorico.addEventListener('click', () => {
        const stockName = allStocksData[currentStockIndex].customName || `Estoque ${currentStockIndex + 1}`;
        if (confirm(`Tem certeza que deseja apagar todo o histórico de operações para o estoque "${stockName}"? Esta ação é irreversível.`)) {
            allStocksData[currentStockIndex].history = [];
            localStorage.setItem('allStocksData', JSON.stringify(allStocksData));
            listaOperacoes.innerHTML = '';
            alert('Histórico de operações apagado com sucesso!');
        }
    });

    // Service Worker Registration for PWA capabilities
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => console.log('Service Worker registrado com sucesso!'))
            .catch(err => console.error('Erro ao registrar Service Worker:', err));
    }
});