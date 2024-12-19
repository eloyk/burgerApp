// Variables para almacenar las instancias de los gráficos
let dailySalesChart;
let topProductsChart;

// Función para inicializar los gráficos
async function initializeCharts() {
    try {
        // Regenerar estadísticas primero
        await regenerateStats();
        
        // Obtener datos diarios
        const dailyResponse = await fetch('/api/stats/daily');
        if (!dailyResponse.ok) {
            throw new Error(`HTTP error! status: ${dailyResponse.status}`);
        }
        const dailyData = await dailyResponse.json();
        
        // Obtener datos semanales
        const weeklyResponse = await fetch('/api/stats/weekly');
        if (!weeklyResponse.ok) {
            throw new Error(`HTTP error! status: ${weeklyResponse.status}`);
        }
        const weeklyData = await weeklyResponse.json();

        console.log('Datos diarios recibidos:', dailyData);
        
        // Verificar si hay datos antes de configurar los gráficos
        if (!dailyData || typeof dailyData !== 'object') {
            throw new Error('No se recibieron datos válidos del servidor');
        }

        // Configurar gráficos
        setupDailySalesChart(dailyData);
        setupTopProductsChart(dailyData);
        
        // Actualizar estadísticas generales
        updateGeneralStats(dailyData);
        
        console.log('Datos de horas pico:', dailyData.peak_hours);
        console.log('Datos de productos populares:', dailyData.popular_items);
    } catch (error) {
        console.error('Error initializing charts:', error);
        showError('Error al cargar las estadísticas: ' + error.message);
    }
}

// Función para regenerar estadísticas
async function regenerateStats() {
    try {
        const response = await fetch('/api/stats/regenerate', {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Estadísticas regeneradas:', result);
    } catch (error) {
        console.error('Error regenerating stats:', error);
        showError('Error al regenerar estadísticas: ' + error.message);
    }
}

function setupDailySalesChart(data) {
    const ctx = document.getElementById('dailySalesChart').getContext('2d');
    
    // Destruir gráfico existente si hay uno
    if (dailySalesChart) {
        dailySalesChart.destroy();
    }
    
    // Preparar datos para el gráfico por horas
    const hours = Array.from({length: 24}, (_, i) => i);
    let peakHours = {};
    
    try {
        // Intentar parsear peak_hours si es string
        if (typeof data.peak_hours === 'string') {
            peakHours = JSON.parse(data.peak_hours);
        } else if (data.peak_hours && typeof data.peak_hours === 'object') {
            peakHours = data.peak_hours;
        }
    } catch (error) {
        console.error('Error parsing peak hours:', error);
        peakHours = {};
    }
    
    console.log('Peak hours data:', peakHours);
    
    const salesByHour = hours.map(hour => {
        const hourStr = hour.toString();
        return parseInt(peakHours[hourStr] || 0);
    });
    
    console.log('Processed sales by hour:', salesByHour);

    dailySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map(hour => `${hour}:00`),
            datasets: [{
                label: 'Ventas por Hora',
                data: salesByHour,
                borderColor: '#D12031',
                backgroundColor: 'rgba(209, 32, 49, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Ventas por Hora del Día'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Ventas: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

function setupTopProductsChart(data) {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    
    // Destruir gráfico existente si hay uno
    if (topProductsChart) {
        topProductsChart.destroy();
    }
    
    let popularItems = {};
    
    try {
        // Intentar parsear popular_items si es string
        if (typeof data.popular_items === 'string') {
            popularItems = JSON.parse(data.popular_items);
        } else if (data.popular_items && typeof data.popular_items === 'object') {
            popularItems = data.popular_items;
        }
    } catch (error) {
        console.error('Error parsing popular items:', error);
        popularItems = {};
    }
    
    console.log('Popular items data:', popularItems);
    
    // Convertir el objeto en array y ordenar
    const sortedItems = Object.entries(popularItems)
        .map(([id, item]) => ({
            id,
            name: item.name || 'Producto sin nombre',
            count: parseInt(item.count) || 0,
            total: parseFloat(item.total) || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    
    console.log('Sorted items:', sortedItems);
    
    const productNames = sortedItems.map(item => item.name);
    const productCounts = sortedItems.map(item => item.count);
    
    console.log('Product names:', productNames);
    console.log('Product counts:', productCounts);

    topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: productNames,
            datasets: [{
                label: 'Cantidad Vendida',
                data: productCounts,
                backgroundColor: [
                    '#D12031',
                    '#FFC72C',
                    '#ED7801',
                    '#28A745',
                    '#17A2B8'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Productos Más Vendidos'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const item = sortedItems[context.dataIndex];
                            return [
                                `Cantidad: ${item.count}`,
                                `Total: ${formatCurrency(item.total)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

function updateGeneralStats(data) {
    const stats = {
        'total-sales': formatCurrency(data.total_sales),
        'order-count': data.order_count,
        'avg-order': formatCurrency(data.avg_order_value)
    };

    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP'
    }).format(amount || 0);
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.querySelector('.container').prepend(alertDiv);
}

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    // Actualizar cada 5 minutos
    setInterval(initializeCharts, 300000);
});
