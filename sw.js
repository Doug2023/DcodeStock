
document.addEventListener('DOMContentLoaded', function () {
    const mesAtualEl = document.getElementById('mesAtual');
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const hoje = new Date();
    mesAtualEl.textContent = `Mês Atual: ${meses[hoje.getMonth()]}`;

    const tabelaBody = document.querySelector('#estoqueTable tbody');
    const totalValorEl = document.getElementById('totalValor');

    const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
    const ctxBarra = document.getElementById('graficoBarra').getContext('2d');

    let chartPizza = new Chart(ctxPizza, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    let chartBarra = new Chart(ctxBarra, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Valores (R$)',
                data: [],
                backgroundColor: '#007bff'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false
        }
    });

    function atualizarGraficos() {
        const rows = tabelaBody.querySelectorAll('tr');
        const labels = [];
        const data = [];
        const colors = [];

        rows.forEach(row => {
            const item = row.querySelector('.item').value;
            const valor = parseFloat(row.querySelector('.valor').value) || 0;

            if (item && valor > 0) {
                labels.push(item);
                data.push(valor);
                colors.push('#' + Math.floor(Math.random() * 16777215).toString(16));
            }
        });

        chartPizza.data.labels = labels;
        chartPizza.data.datasets[0].data = data;
        chartPizza.data.datasets[0].backgroundColor = colors;
        chartPizza.update();

        chartBarra.data.labels = labels;
        chartBarra.data.datasets[0].data = data;
        chartBarra.update();
    }

    function atualizarTotal() {
        let total = 0;
        tabelaBody.querySelectorAll('.valor').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        totalValorEl.textContent = total.toFixed(2);
    }

    function adicionarLinha() {
        const row = document.createElement('tr');

        const tdItem = document.createElement('td');
        const inputItem = document.createElement('input');
        inputItem.type = 'text';
        inputItem.className = 'item';
        tdItem.appendChild(inputItem);

        const tdValor = document.createElement('td');
        const inputValor = document.createElement('input');
        inputValor.type = 'number';
        inputValor.className = 'valor';
        inputValor.step = '0.01';
        inputValor.value = '0';
        tdValor.appendChild(inputValor);

        row.appendChild(tdItem);
        row.appendChild(tdValor);
        tabelaBody.appendChild(row);

        inputItem.addEventListener('input', () => atualizarGraficos());
        inputValor.addEventListener('input', () => {
            atualizarGraficos();
            atualizarTotal();

            const allRows = tabelaBody.querySelectorAll('tr');
            const isLastRow = row === allRows[allRows.length - 1];
            if (isLastRow && (inputItem.value.trim() !== '' || parseFloat(inputValor.value) > 0)) {
                adicionarLinha();
            }
        });
    }

    document.getElementById('adicionarLinha').addEventListener('click', adicionarLinha);

    for (let i = 0; i < 5; i++) adicionarLinha();
});
