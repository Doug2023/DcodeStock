// Corrige vírgulas em campos numéricos para evitar erro nos cálculos
document.addEventListener('input', (e) => {
  if (e.target.matches('input[type="number"]')) {
    e.target.value = e.target.value.replace(',', '.');
  }
});

// Mostra mês atual
const mesAtualEl = document.getElementById('mesAtual');
const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const dataAtual = new Date();
mesAtualEl.textContent = meses[dataAtual.getMonth()] + ' de ' + dataAtual.getFullYear();

const tabelaBody = document.querySelector('#estoqueTable tbody');
const entradaTotalEl = document.getElementById('entradaTotal');
const saidaTotalEl = document.getElementById('saidaTotal');
const saldoTotalEl = document.getElementById('saldoTotal');
const valorFinalEl = document.getElementById('valorFinal');

const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
const ctxBarras = document.getElementById('graficoBarras').getContext('2d');

const chartPizza = new Chart(ctxPizza, {
  type: 'pie',
  data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
  options: { plugins: { legend: { position: 'bottom' } } }
});

const chartBarras = new Chart(ctxBarras, {
  type: 'bar',
  data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
  options: {
    scales: { y: { beginAtZero: true } },
    plugins: { legend: { display: false } }
  }
});

const coresMap = {};
function gerarCorAleatoria() {
  const r = Math.floor((Math.random() * 127) + 127);
  const g = Math.floor((Math.random() * 127) + 127);
  const b = Math.floor((Math.random() * 127) + 127);
  return `rgb(${r},${g},${b})`;
}
function getCorParaItem(nome) {
  if (!coresMap[nome]) {
    coresMap[nome] = gerarCorAleatoria();
  }
  return coresMap[nome];
}

function adicionarLinhaEstoque() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="text" class="item" placeholder="Nome do item" autocomplete="off" /></td>
    <td><input type="number" class="entrada" value="0" min="0" step="any" /></td>
    <td><input type="number" class="saida" value="0" min="0" step="any" /></td>
    <td><input type="number" class="valor" value="0" step="0.01" min="0" /></td>
  `;
  tabelaBody.appendChild(row);

  const inputs = row.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      atualizarResumo();
      atualizarGraficos();
      gerenciarLinhas();
    });
  });
}

// Controla as linhas: mantém pelo menos 1 linha vazia no final, remove extras
function gerenciarLinhas() {
  const linhas = Array.from(tabelaBody.querySelectorAll('tr'));

  // Identifica linhas vazias (todos campos vazios ou zero)
  const linhasVazias = linhas.filter(row => {
    const item = row.querySelector('.item').value.trim();
    const entrada = parseFloat(row.querySelector('.entrada').value) || 0;
    const saida = parseFloat(row.querySelector('.saida').value) || 0;
    const valor = parseFloat(row.querySelector('.valor').value) || 0;
    return item === '' && entrada === 0 && saida === 0 && valor === 0;
  });

  const ultima = linhas[linhas.length - 1];
  const ultimaItem = ultima.querySelector('.item').value.trim();
  const ultimaEntrada = parseFloat(ultima.querySelector('.entrada').value) || 0;
  const ultimaSaida = parseFloat(ultima.querySelector('.saida').value) || 0;
  const ultimaValor = parseFloat(ultima.querySelector('.valor').value) || 0;

  // Se a última linha NÃO está vazia, cria uma nova linha vazia
  if (!(ultimaItem === '' && ultimaEntrada === 0 && ultimaSaida === 0 && ultimaValor === 0)) {
    adicionarLinhaEstoque();
  }

  // Se tem mais de 1 linha vazia, remove as extras, deixando só 1
  if (linhasVazias.length > 1) {
    for (let i = 0; i < linhasVazias.length - 1; i++) {
      tabelaBody.removeChild(linhasVazias[i]);
    }
  }
}

function atualizarResumo() {
  let entrada = 0, saida = 0, saldo = 0, totalValor = 0;

  tabelaBody.querySelectorAll('tr').forEach(row => {
    const ent = parseFloat(row.querySelector('.entrada').value) || 0;
    const sai = parseFloat(row.querySelector('.saida').value) || 0;
    const val = parseFloat(row.querySelector('.valor').value) || 0;

    entrada += ent;
    saida += sai;
    saldo += (ent - sai);
    totalValor += val;
  });

  entradaTotalEl.textContent = entrada;
  saidaTotalEl.textContent = saida;
  saldoTotalEl.textContent = saldo;
  valorFinalEl.textContent = totalValor.toFixed(2);
}

function atualizarGraficos() {
  const labels = [];
  const dadosEntrada = [];
  const dadosValor = [];
  const cores = [];

  tabelaBody.querySelectorAll('tr').forEach(row => {
    const nome = row.querySelector('.item').value.trim();
    const entrada = parseFloat(row.querySelector('.entrada').value) || 0;
    const valor = parseFloat(row.querySelector('.valor').value) || 0;

    if (nome && entrada > 0) {
      labels.push(nome);
      dadosEntrada.push(entrada);
      dadosValor.push(valor);
      cores.push(getCorParaItem(nome));
    }
  });

  chartPizza.data.labels = labels;
  chartPizza.data.datasets[0].data = dadosEntrada;
  chartPizza.data.datasets[0].backgroundColor = cores;
  chartPizza.update();

  chartBarras.data.labels = labels;
  chartBarras.data.datasets[0].data = dadosValor;
  chartBarras.data.datasets[0].backgroundColor = cores;
  chartBarras.update();
}

// Inicializa com uma linha vazia para começar
adicionarLinhaEstoque();

