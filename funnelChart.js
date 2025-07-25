// Funil/Pyramid Chart usando Chart.js
// Este script assume que você já tem Chart.js incluído no seu projeto.
// Adicione um <canvas id="funnelChart"></canvas> no local desejado do HTML.

document.addEventListener('DOMContentLoaded', function () {
    // Exemplo de dados (substitua pelos dados reais do seu resumo)
    const data = {
        labels: ['Entradas', 'Saídas', 'Saldo'],
        datasets: [{
            label: 'Resumo',
            data: [120, 80, 40], // Substitua pelos valores reais
            backgroundColor: [
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 206, 86, 0.7)'
            ],
            borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(255, 206, 86, 1)'
            ],
            borderWidth: 1
        }]
    };

    const ctx = document.getElementById('funnelChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Resumo dos Itens (Funil Pirâmide)'
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            },
            elements: {
                bar: {
                    borderRadius: 20,
                    borderSkipped: false
                }
            }
        }
    });
});
