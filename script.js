document.addEventListener('DOMContentLoaded', () => {
  const mesAtualEl = document.getElementById('mesAtual');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const prevYearBtn = document.getElementById('prevYear');
  const nextYearBtn = document.getElementById('nextYear');
  const addEstoqueButton = document.getElementById('addEstoqueButton');
  const tabsContainer = document.getElementById('tabsContainer'); // Agora este é o container dos botões das abas
  const tabelaBody = document.querySelector('#currentEstoqueTable tbody'); // Alterado para o ID da tabela
  const nomeEstoqueInput = document.querySelector('.nome-estoque-container input'); // Input para nome do estoque

  const entradaTotalEl = document.getElementById('entradaTotal');
  const saidaTotalEl = document.getElementById('saidaTotal');
  const saldoTotalEl = document.getElementById('saldoTotal');
  const valorFinalEl = document.getElementById('valorFinal');

  const listaOperacoes = document.getElementById('listaOperacoes');
  const btnLimparHistorico = document.getElementById('btnLimparHistorico');
  const btnGerarGraficoAnual = document.getElementById('btnGerarGraficoAnual');
  const anualGraphModal = document.getElementById('anualGraphModal');
  const closeAnualGraphModal = anualGraphModal.querySelector('.close-button');
  const anualGraphYearSpan = document.getElementById('anualGraphYear');
  const ctxAnual = document.getElementById('graficoAnual').getContext('2d');

  let currentYearMonth = new Date();
  currentYearMonth.setDate(1); // Garante que a data esteja sempre no primeiro dia do mês para evitar problemas com meses de tamanhos diferentes

  // --- Funções de Navegação de Data ---
  function updateMesAtualDisplay() {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    mesAtualEl.textContent = `${meses[currentYearMonth.getMonth()]} de ${currentYearMonth.getFullYear()}`;
  }

  function changeMonth(delta) {
    currentYearMonth.setMonth(currentYearMonth.getMonth() + delta);
    updateMesAtualDisplay();
    loadActiveEstoqueData(); // Recarrega os dados do estoque ativo para o novo mês/ano
  }

  function changeYear(delta) {
    currentYearMonth.setFullYear(currentYearMonth.getFullYear() + delta);
    updateMesAtualDisplay();
    loadActiveEstoqueData(); // Recarrega os dados do estoque ativo para o novo mês/ano
  }

  prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  nextMonthBtn.addEventListener('click', () => changeMonth(1));
  prevYearBtn.addEventListener('click', () => changeYear(-1));
  nextYearBtn.addEventListener('click', () => changeYear(1));

  // --- Gerenciamento de Estoques (Abas) ---
  // `estoques` armazena {id: {name: 'Nome do Estoque'}}
  let estoques = JSON.parse(localStorage.getItem('estoques') || '{}');
  // `currentEstoqueId` é o ID base do estoque (ex: 'estoque-12345')
  let currentEstoqueId = localStorage.getItem('activeEstoqueId') || null;

  // Função para obter o ID completo do estoque para o mês/ano atual (ex: 'estoque-12345-2025-06')
  function getFullEstoqueId(idBase) {
    const year = currentYearMonth.getFullYear();
    const month = (currentYearMonth.getMonth() + 1).toString().padStart(2, '0');
    return `${idBase}-${year}-${month}`;
  }

  // Salva os dados de uma tabela específica (para um estoque e mês/ano específicos)
  function saveEstoqueData(fullEstoqueId, data) {
    const allEstoqueData = JSON.parse(localStorage.getItem('allEstoqueData') || '{}');
    allEstoqueData[fullEstoqueId] = data;
    localStorage.setItem('allEstoqueData', JSON.stringify(allEstoqueData));
  }

  // Carrega os dados de uma tabela específica
  function loadEstoqueData(fullEstoqueId) {
    const allEstoqueData = JSON.parse(localStorage.getItem('allEstoqueData') || '{}');
    return allEstoqueData[fullEstoqueId] || [];
  }

  // Cria um novo estoque e uma nova aba
  function createNewEstoqueTab(name) {
    const tabId = `estoque-${Date.now()}`; // ID único para o estoque
    estoques[tabId] = { name: name };
    localStorage.setItem('estoques', JSON.stringify(estoques));
    renderTabs();
    activateEstoque(tabId);
    nomeEstoqueInput.value = name; // Atualiza o input com o nome do novo estoque
  }

  // Renderiza todas as abas de estoque
  function renderTabs() {
    tabsContainer.innerHTML = ''; // Limpa as abas existentes
    const sortedEstoqueIds = Object.keys(estoques).sort((a, b) => {
        // Coloca 'Estoque Padrão' primeiro, depois ordena por nome
        if (estoques[a].name === "Estoque Padrão") return -1;
        if (estoques[b].name === "Estoque Padrão") return 1;
        return estoques[a].name.localeCompare(estoques[b].name);
    });

    sortedEstoqueIds.forEach(id => {
      const tabButton = document.createElement('button');
      tabButton.classList.add('tab-button');
      tabButton.dataset.estoqueId = id;
      tabButton.textContent = estoques[id].name;

      const closeButton = document.createElement('button');
      closeButton.classList.add('tab-close');
      closeButton.innerHTML = '&times;';
      closeButton.onclick = (e) => {
        e.stopPropagation(); // Evita que o clique na cruz ative a aba
        if (confirm(`Tem certeza que deseja excluir o estoque "${estoques[id].name}" e todos os seus dados?`)) {
          deleteEstoque(id);
        }
      };
      tabButton.appendChild(closeButton);
      tabButton.onclick = () => activateEstoque(id);
      tabsContainer.appendChild(tabButton);

      if (currentEstoqueId === id) {
        tabButton.classList.add('active');
      }
    });
    tabsContainer.appendChild(addEstoqueButton); // Adiciona o botão de novo estoque por último
  }

  // Ativa um estoque específico
  function activateEstoque(id) {
    // Salva os dados do estoque atualmente ativo antes de trocar
    saveActiveEstoqueData();

    currentEstoqueId = id;
    localStorage.setItem('activeEstoqueId', id); // Salva o ID ativo
    nomeEstoqueInput.value = estoques[id].name; // Atualiza o nome do estoque no input

    // Atualiza a classe 'active' nas abas
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.estoqueId === id) {
        btn.classList.add('active');
      }
    });

    loadActiveEstoqueData(); // Carrega os dados do novo estoque ativo
  }

  // Deleta um estoque e todos os seus dados históricos
  function deleteEstoque(idToDelete) {
    // Remove todos os dados históricos associados a este estoque ID
    const allEstoqueData = JSON.parse(localStorage.getItem('allEstoqueData') || '{}');
    for (const key in allEstoqueData) {
        if (key.startsWith(`${idToDelete}-`)) { // Ex: estoque-123-2025-06
            delete allEstoqueData[key];
        }
    }
    localStorage.setItem('allEstoqueData', JSON.stringify(allEstoqueData));

    // Remove o estoque da lista de estoques
    delete estoques[idToDelete];
    localStorage.setItem('estoques', JSON.stringify(estoques));

    // Se o estoque deletado era o ativo, ativar o primeiro disponível ou criar um novo padrão
    if (currentEstoqueId === idToDelete) {
        const remainingEstoqueIds = Object.keys(estoques);
        if (remainingEstoqueIds.length > 0) {
            activateEstoque(remainingEstoqueIds[0]);
        } else {
            createNewEstoqueTab('Estoque Padrão');
        }
    } else {
        renderTabs(); // Apenas renderiza as abas novamente
    }
  }

  addEstoqueButton.addEventListener('click', () => {
    let newName = prompt('Digite o nome do novo estoque:');
    if (newName && newName.trim() !== '') {
      newName = newName.trim();
      const exists = Object.values(estoques).some(e => e.name.toLowerCase() === newName.toLowerCase());
      if (exists) {
        alert('Já existe um estoque com esse nome. Por favor, escolha outro.');
      } else {
        createNewEstoqueTab(newName);
      }
    }
  });

  // Salvar nome do estoque ao editar o input
  nomeEstoqueInput.addEventListener('change', () => {
    const newName = nomeEstoqueInput.value.trim();
    if (newName && estoques[currentEstoqueId] && newName !== estoques[currentEstoqueId].name) {
        const exists = Object.entries(estoques).some(([id, e]) => id !== currentEstoqueId && e.name.toLowerCase() === newName.toLowerCase());
        if (exists) {
            alert('Já existe outro estoque com esse nome. Por favor, escolha outro.');
            nomeEstoqueInput.value = estoques[currentEstoqueId].name; // Volta ao nome anterior
        } else {
            estoques[currentEstoqueId].name = newName;
            localStorage.setItem('estoques', JSON.stringify(estoques));
            renderTabs(); // Renderiza as abas novamente para atualizar o nome
        }
    }
  });

  // --- Funções de Tabela e Dados (Modificadas para suportar múltiplos estoques/datas) ---

  // Salva os dados da tabela *ativa* para o mês/ano atual
  function saveActiveEstoqueData() {
    if (!currentEstoqueId) return; // Não salva se não houver estoque ativo
    const fullId = getFullEstoqueId(currentEstoqueId);
    const linhas = [...tabelaBody.querySelectorAll('tr')].map(linha => ({
      item: linha.querySelector('.item').value,
      entrada: linha.querySelector('.entrada').value,
      saida: linha.querySelector('.saida').value,
      valor: linha.querySelector('.valor').value
    }));
    saveEstoqueData(fullId, linhas);
  }

  // Carrega os dados da tabela *ativa* para o mês/ano atual
  function loadActiveEstoqueData() {
    if (!currentEstoqueId) return; // Não carrega se não houver estoque ativo
    const fullId = getFullEstoqueId(currentEstoqueId);
    const dadosTabela = loadEstoqueData(fullId);
    tabelaBody.innerHTML = ''; // Limpa a tabela

    dadosTabela.forEach(data => {
      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td><input type="text" class="item" value="${data.item}" autocomplete="off"/></td>
        <td><input type="number" class="entrada" min="0" step="any" value="${data.entrada}" autocomplete="off"/></td>
        <td><input type="number" class="saida" min="0" step="any" value="${data.saida}" autocomplete="off"/></td>
        <td><input type="number" class="valor" min="0" step="0.01" value="${data.valor}" autocomplete="off"/></td>
      `;
      tabelaBody.appendChild(linha);
      adicionarEventosLinha(linha);
    });

    // Garante que haja pelo menos uma linha vazia se não houver dados ou se a última estiver preenchida
    if (dadosTabela.length === 0 || ([...tabelaBody.querySelectorAll('tr')].every(linha => [...linha.querySelectorAll('input')].every(inp => inp.value.trim() === '' || parseFloat(inp.value) === 0)))) {
        adicionarLinha(); // Adiciona uma linha vazia se tudo estiver vazio
    } else {
        verificarLinhaFinal(); // Adiciona linha extra se a última estiver preenchida
    }


    atualizarResumo();
    atualizarGraficos();
  }

  function adicionarLinha() {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td><input type="text" class="item" autocomplete="off" /></td>
      <td><input type="number" class="entrada" min="0" step="any" value="" autocomplete="off"/></td>
      <td><input type="number" class="saida" min="0" step="any" value="" autocomplete="off"/></td>
      <td><input type="number" class="valor" min="0" step="0.01" value="" autocomplete="off"/></td>
    `;
    tabelaBody.appendChild(linha);
    adicionarEventosLinha(linha);
  }

  function adicionarEventosLinha(linha) {
    const inputs = linha.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        atualizarResumo();
        atualizarGraficos();
        saveActiveEstoqueData(); // Salva os dados após cada input
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

  function verificarLinhaFinal() {
    const linhas = [...tabelaBody.querySelectorAll('tr')];
    if (linhas.length === 0) { // Se não há linhas, adiciona uma
        adicionarLinha();
        return;
    }
    const ultima = linhas[linhas.length - 1];
    if (ultima && [...ultima.querySelectorAll('input')].some(inp => inp.value.trim() !== '' && inp.value !== '0')) {
      adicionarLinha();
    }
  }

  function removerLinhasVazias() {
    const linhas = [...tabelaBody.querySelectorAll('tr')];
    if (linhas.length <= 1) return; // Não remove se só houver uma linha

    for (let i = 0; i < linhas.length - 1; i++) { // Itera até a penúltima linha
        const linha = linhas[i];
        const inputs = linha.querySelectorAll('input');
        const vazia = [...inputs].every(input => input.value.trim() === '' || parseFloat(input.value) === 0);
        if (vazia) {
            linha.remove();
        }
    }
  }


  function atualizarResumo() {
    let entrada = 0, saida = 0, saldo = 0, valor = 0;
    const linhas = [...tabelaBody.querySelectorAll('tr')];
    linhas.forEach(linha => {
      const ent = parseFloat(linha.querySelector('.entrada').value) || 0;
      const sai = parseFloat(linha.querySelector('.saida').value) || 0;
      const val = parseFloat(linha.querySelector('.valor').value) || 0;
      entrada += ent;
      saida += sai;
      saldo += (ent - sai);
      valor += val;
    });
    entradaTotalEl.textContent = entrada;
    saidaTotalEl.textContent = saida;
    saldoTotalEl.textContent = saldo;
    valorFinalEl.textContent = valor.toFixed(2);
  }

  // --- Gráficos (mantidos como antes, mas agora para o estoque ativo/mês ativo) ---
  const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
  const ctxBarras = document.getElementById('graficoBarras').getContext('2d');
  const ctxSaidas = document.getElementById('graficoSaidas').getContext('2d');

  const chartPizza = new Chart(ctxPizza, {
    type: 'pie',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: { plugins: { legend: { position: 'bottom', labels: { color: '#fff' } },
                             tooltip: { titleColor: '#fff', bodyColor: '#fff', backgroundColor: 'rgba(0,0,0,0.8)' }
                         }, maintainAspectRatio: false, responsive: true }
  });

  const chartBarras = new Chart(ctxBarras, {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: { scales: { y: { beginAtZero: true, grid: { color: '#444' }, ticks: { color: '#fff' } },
                             x: { grid: { color: '#444' }, ticks: { color: '#fff' } }
                         }, plugins: { legend: { display: false },
                             tooltip: { titleColor: '#fff', bodyColor: '#fff', backgroundColor: 'rgba(0,0,0,0.8)' }
                         }, maintainAspectRatio: false, responsive: true }
  });

  const chartSaidas = new Chart(ctxSaidas, {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: { indexAxis: 'y', scales: { x: { beginAtZero: true, grid: { color: '#444' }, ticks: { color: '#fff' } },
                                     y: { grid: { color: '#444' }, ticks: { color: '#fff' } }
                                 }, plugins: { legend: { display: false },
                             tooltip: { titleColor: '#fff', bodyColor: '#fff', backgroundColor: 'rgba(0,0,0,0.8)' }
                         }, maintainAspectRatio: false, responsive: true }
  });

  // Cores (agora global e persistente)
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

  function atualizarGraficos() {
    const labels = [], entradas = [], valores = [], cores = [];
    const dataSaida = {}, corSaidaPorItem = {};
    const linhas = [...tabelaBody.querySelectorAll('tr')];

    linhas.forEach(linha => {
      const nome = linha.querySelector('.item').value.trim();
      const ent = parseFloat(linha.querySelector('.entrada').value) || 0;
      const sai = parseFloat(linha.querySelector('.saida').value) || 0;
      const val = parseFloat(linha.querySelector('.valor').value) || 0;

      if (nome) {
        const cor = gerarCor(nome);
        if (ent > 0) {
          labels.push(nome);
          entradas.push(ent);
          valores.push(val);
          cores.push(cor);
        }
        if (sai > 0) {
          dataSaida[nome] = (dataSaida[nome] || 0) + sai;
          corSaidaPorItem[nome] = cor;
        }
      }
    });

    chartPizza.data.labels = labels;
    chartPizza.data.datasets[0].data = entradas;
    chartPizza.data.datasets[0].backgroundColor = cores;
    chartPizza.update();

    chartBarras.data.labels = labels;
    chartBarras.data.datasets[0].data = valores;
    chartBarras.data.datasets[0].backgroundColor = cores;
    chartBarras.update();

    const saidaLabels = Object.keys(dataSaida);
    chartSaidas.data.labels = saidaLabels;
    chartSaidas.data.datasets[0].data = saidaLabels.map(l => dataSaida[l]);
    chartSaidas.data.datasets[0].backgroundColor = saidaLabels.map(l => corSaidaPorItem[l]);
    chartSaidas.update();
  }

  // --- Histórico de Operações ---
  function registrarOperacao(tipo, item, quantidade) {
    const data = new Date();
    const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()}`;
    const texto = `[${dataFormatada}] ${tipo.toUpperCase()}: ${item} - ${quantidade}`;
    const li = document.createElement('li');
    li.textContent = texto;
    listaOperacoes.prepend(li); // Adiciona no início

    const historico = JSON.parse(localStorage.getItem('historicoOperacoes') || '[]');
    historico.unshift(texto); // Adiciona no início do array
    localStorage.setItem('historicoOperacoes', JSON.stringify(historico));
  }

  function restaurarHistorico() {
    const historico = JSON.parse(localStorage.getItem('historicoOperacoes') || '[]');
    listaOperacoes.innerHTML = '';
    historico.forEach(txt => {
      const li = document.createElement('li');
      li.textContent = txt;
      listaOperacoes.appendChild(li); // Adiciona no final para ordem cronológica de visualização
    });
  }

  btnLimparHistorico.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja apagar todo o histórico de operações?')) {
      localStorage.removeItem('historicoOperacoes');
      listaOperacoes.innerHTML = '';
    }
  });

  // --- Gráfico Anual ---
  let chartAnual = null; // Para armazenar a instância do Chart.js do gráfico anual

  btnGerarGraficoAnual.addEventListener('click', () => {
      showAnualGraphModal();
  });

  closeAnualGraphModal.addEventListener('click', () => {
      anualGraphModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
      if (event.target == anualGraphModal) {
          anualGraphModal.style.display = 'none';
      }
  });

  function showAnualGraphModal() {
      anualGraphModal.style.display = 'flex'; // Usar flex para centralizar
      const yearToShow = currentYearMonth.getFullYear(); // Pega o ano atual do seletor de mês/ano
      anualGraphYearSpan.textContent = yearToShow;
      generateAnualGraph(yearToShow);
  }

  function generateAnualGraph(year) {
      const allEstoqueData = JSON.parse(localStorage.getItem('allEstoqueData') || '{}');
      const yearlyData = {}; // {item: {entrada: total, saida: total}}
      const allItems = new Set();

      // Iterar sobre todos os dados salvos para o ano específico
      for (const key in allEstoqueData) {
          // Verifica se a chave corresponde ao formato "estoqueId-YYYY-MM" e ao ano desejado
          const parts = key.split('-');
          // Certifique-se de que a chave tem o formato correto e o ano corresponde
          if (parts.length === 3 && parts[1] == year) {
              const dataForMonth = allEstoqueData[key];
              dataForMonth.forEach(row => {
                  const item = row.item.trim();
                  if (item) {
                      const entrada = parseFloat(row.entrada) || 0;
                      const saida = parseFloat(row.saida) || 0;

                      if (!yearlyData[item]) {
                          yearlyData[item] = { entrada: 0, saida: 0 };
                      }
                      yearlyData[item].entrada += entrada;
                      yearlyData[item].saida += saida;
                      allItems.add(item);
                  }
              });
          }
      }

      const labels = Array.from(allItems).sort();
      const entradasAnual = labels.map(item => yearlyData[item] ? yearlyData[item].entrada : 0);
      const saidasAnual = labels.map(item => yearlyData[item] ? yearlyData[item].saida : 0);
      const backgroundColors = labels.map(item => gerarCor(item));

      if (chartAnual) {
          chartAnual.destroy(); // Destrói a instância anterior para evitar sobreposição
      }

      chartAnual = new Chart(ctxAnual, {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [
                  {
                      label: 'Entradas',
                      data: entradasAnual,
                      backgroundColor: backgroundColors.map(color => color.replace('rgb', 'rgba').replace(')', ', 0.7)')), // Ligeiramente transparente
                      borderColor: backgroundColors,
                      borderWidth: 1
                  },
                  {
                      label: 'Saídas',
                      data: saidasAnual,
                      backgroundColor: backgroundColors.map(color => color.replace('rgb', 'rgba').replace(')', ', 0.4)')), // Mais transparente
                      borderColor: backgroundColors,
                      borderWidth: 1
                  }
              ]
          },
          options: {
              scales: {
                  y: {
                      beginAtZero: true,
                      stacked: false, // Pode ser true se quiser barras empilhadas
                      grid: { color: '#444' },
                      ticks: { color: '#fff' }
                  },
                  x: {
                      grid: { color: '#444' },
                      ticks: { color: '#fff' }
                  }
              },
              plugins: {
                  legend: {
                      position: 'top',
                      labels: { color: '#fff' }
                  },
                  tooltip: {
                      titleColor: '#fff',
                      bodyColor: '#fff',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                  }
              },
              maintainAspectRatio: false,
              responsive: true
          }
      });
  }


  // --- Inicialização da Aplicação ---
  function initializeApp() {
    updateMesAtualDisplay();
    // Se não há estoques salvos, cria um "Estoque Padrão"
    if (Object.keys(estoques).length === 0) {
      createNewEstoqueTab('Estoque Padrão');
    } else {
      // Se há estoques, tenta ativar o último ativo ou o primeiro da lista
      const savedActiveId = localStorage.getItem('activeEstoqueId');
      if (savedActiveId && estoques[savedActiveId]) {
          currentEstoqueId = savedActiveId;
      } else {
          currentEstoqueId = Object.keys(estoques)[0];
          localStorage.setItem('activeEstoqueId', currentEstoqueId); // Garante que um ID ativo esteja salvo
      }
      nomeEstoqueInput.value = estoques[currentEstoqueId].name; // Define o nome do estoque no input
      renderTabs();
      loadActiveEstoqueData();
    }
    restaurarHistorico(); // Carrega o histórico de operações

    // Inicializa SortableJS para drag and drop nas linhas da tabela
    new Sortable(tabelaBody, {
      animation: 150,
      ghostClass: 'arrastando',
      onEnd: () => {
        saveActiveEstoqueData(); // Salva a tabela após reordenar
      }
    });
  }

  initializeApp(); // Chama a função de inicialização ao carregar a página

  // Service Worker (se aplicável)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('Service Worker registrado com sucesso!'))
      .catch(err => console.error('Erro ao registrar Service Worker:', err));
  }
  
});