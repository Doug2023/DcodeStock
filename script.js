document.addEventListener('DOMContentLoaded', () => {
  const mesAtualEl = document.getElementById('mesAtual');
  if (!mesAtualEl) {
    console.error('Elemento mesAtual não encontrado!');
    return; // evita erro fatal
  }

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                 "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const hoje = new Date();
  mesAtualEl.textContent = `${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

  const abasContainer = document.getElementById('abasContainer');
  const entradaTotalEl = document.getElementById('entradaTotal');
  const saidaTotalEl = document.getElementById('saidaTotal');
  const saldoTotalEl = document.getElementById('saldoTotal');
  const valorFinalEl = document.getElementById('valorFinal');

  if (!abasContainer || !entradaTotalEl || !saidaTotalEl || !saldoTotalEl || !valorFinalEl) {
    console.error('Algum elemento principal não foi encontrado no DOM');
    return;
  }

  const ctxPizza = document.getElementById('graficoPizza')?.getContext('2d');
  const ctxBarras = document.getElementById('graficoBarras')?.getContext('2d');
  const ctxSaidas = document.getElementById('graficoSaidas')?.getContext('2d');

  if (!ctxPizza || !ctxBarras || !ctxSaidas) {
    console.error('Algum contexto de gráfico não foi encontrado');
    return;
  }

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

  const coresMap = {};
  function gerarCor(nome) {
    if (!coresMap[nome]) {
      const r = Math.floor(Math.random() * 156 + 100);
      const g = Math.floor(Math.random() * 156 + 100);
      const b = Math.floor(Math.random() * 156 + 100);
      coresMap[nome] = `rgb(${r},${g},${b})`;
    }
    return coresMap[nome];
  }

  function criarAba() {
    const aba = document.createElement('section');
    const tabela = document.createElement('table');
    tabela.className = 'estoque-table';
    tabela.innerHTML = `
      <thead>
        <tr>
          <th>Item</th>
          <th>Entrada</th>
          <th>Saída</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    aba.appendChild(tabela);

    abasContainer.innerHTML = '';
    abasContainer.appendChild(aba);

    function adicionarLinha() {
      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td><input type="text" class="item" placeholder="Ex: Arroz" /></td>
        <td><input type="number" class="entrada" value="" step="any" min="0" /></td>
        <td><input type="number" class="saida" value="" step="any" min="0" /></td>
        <td><input type="number" class="valor" value="" step="0.01" min="0" placeholder="R$ 0,00" /></td>
      `;
      tabela.querySelector('tbody').appendChild(linha);

      const inputs = linha.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          atualizarResumo();
          atualizarGraficos();
          verificarLinhaFinal();
          removerLinhasVazias();
        });
      });
    }

    function verificarLinhaFinal() {
      const linhas = [...tabela.querySelectorAll('tbody tr')];
      const ultima = linhas[linhas.length - 1];
      const inputs = ultima.querySelectorAll('input');
      const preenchida = [...inputs].some(inp => inp.value.trim() !== '');

      if (preenchida) {
        adicionarLinha();
      }
    }

    function removerLinhasVazias() {
      const linhas = [...tabela.querySelectorAll('tbody tr')];
      const total = linhas.length;

      linhas.forEach((linha, i) => {
        const inputs = linha.querySelectorAll('input');
        const vazia = [...inputs].every(inp => inp.value.trim() === '');

        if (vazia && i < total - 1) {
          linha.remove();
        }
      });
    }

    function atualizarResumo() {
      let entrada = 0, saida = 0, saldo = 0, valor = 0;
      [...tabela.querySelectorAll('tbody tr')].forEach(linha => {
        const ent = parseFloat(linha.querySelector('.entrada').value) || 0;
        const sai = parseFloat(linha.querySelector('.saida').value) || 0;
        const val = parseFloat(linha.querySelector('.valor').value) || 0;
        entrada += ent;
        saida += sai;
        saldo += (ent - sai);
        valor += val;
      });
      entradaTotalEl.textContent = entrada.toFixed(2);
      saidaTotalEl.textContent = saida.toFixed(2);
      saldoTotalEl.textContent = saldo.toFixed(2);
      valorFinalEl.textContent = valor.toFixed(2);
    }

    function atualizarGraficos() {
      const labels = [], entradas = [], valores = [], cores = [];
      const dataSaida = {};
      const corSaidaPorItem = {};

      [...tabela.querySelectorAll('tbody tr')].forEach(linha => {
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
            if (!dataSaida[nome]) dataSaida[nome] = 0;
            dataSaida[nome] += sai;
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

    adicionarLinha();
  }

  criarAba();
});

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js') // caminho relativo para evitar problemas no Vercel
    .then(() => console.log('SW registrado com sucesso'))
    .catch(err => console.log('Erro ao registrar o SW:', err));
}
