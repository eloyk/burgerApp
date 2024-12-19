document.addEventListener('DOMContentLoaded', function() {
    // Variables para los gráficos
    let salesChart;
    let categoryChart;
    let peakHoursChart;

    // Cargar datos iniciales
    loadDailyStats();
    loadWeeklyStats();

    // Actualizar cada 5 minutos
    setInterval(loadDailyStats, 300000);
    setInterval(loadWeeklyStats, 300000);

    // Event listener para el botón de regenerar
    document.querySelector('button[onclick="regenerateStats()"]').addEventListener('click', regenerateStats);
});

async function loadDailyStats() {
    try {
        const response = await fetch('/api/stats/daily');
        const data = await response.json();
        console.log('Datos diarios recibidos:', data);

        // Actualizar métricas
        document.getElementById('totalSales').textContent = `$${formatNumber(data.total_sales)}`;
        document.getElementById('orderCount').textContent = data.order_count;
        document.getElementById('avgOrderValue').textContent = `$${formatNumber(data.avg_order_value)}`;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

        // Actualizar gráficos
        updateSalesChart(data.peak_hours);
        updatePopularProducts(data.popular_items);
        updateCategorySales(data.category_sales);
        updatePeakHours(data.peak_hours);

    } catch (error) {
        console.error('Error cargando estadísticas diarias:', error);
        showNotification('Error al cargar estadísticas diarias', 'error');
    }
}

async function loadWeeklyStats() {
    try {
        const response = await fetch('/api/stats/weekly');
        const data = await response.json();
        // Aquí puedes agregar lógica para mostrar estadísticas semanales
    } catch (error) {
        console.error('Error cargando estadísticas semanales:', error);
    }
}

function updateSalesChart(peakHours) {
    console.log('Peak hours data:', peakHours);
    const hours = Array.from({length: 24}, (_, i) => i);
    const salesData = hours.map(hour => peakHours[hour] || 0);
    console.log('Processed sales by hour:', salesData);

    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (window.salesChart) {
        window.salesChart.destroy();
    }

    window.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Ventas por Hora',
                data: salesData,
                borderColor: '#0d6efd',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function updatePopularProducts(popularItems) {
    console.log('Popular items data:', popularItems);
    const items = Object.entries(popularItems).map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        total: data.total
    })).sort((a, b) => b.count - a.count);
    console.log('Sorted items:', items);

    const container = document.getElementById('popularProducts');
    if (items.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No hay datos disponibles</p>';
        return;
    }

    container.innerHTML = `
        <div class="list-group">
            ${items.map(item => `
                <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1">${item.name}</h6>
                        <small>${item.count} vendidos</small>
                    </div>
                    <p class="mb-1">Total: $${formatNumber(item.total)}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function updateCategorySales(categorySales) {
    const ctx = document.getElementById('categorySalesChart').getContext('2d');
    const categories = Object.keys(categorySales);
    const sales = Object.values(categorySales);

    if (window.categoryChart) {
        window.categoryChart.destroy();
    }

    window.categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories.map(formatCategoryName),
            datasets: [{
                data: sales,
                backgroundColor: [
                    '#0d6efd',
                    '#6610f2',
                    '#6f42c1',
                    '#d63384',
                    '#dc3545'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updatePeakHours(peakHours) {
    const ctx = document.getElementById('peakHoursChart').getContext('2d');
    const hours = Object.keys(peakHours);
    const orders = Object.values(peakHours);

    if (window.peakHoursChart) {
        window.peakHoursChart.destroy();
    }

    window.peakHoursChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Pedidos por Hora',
                data: orders,
                backgroundColor: '#0d6efd'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

async function regenerateStats() {
    try {
        const response = await fetch('/api/stats/regenerate', {
            method: 'POST'
        });
        const data = await response.json();
        console.log('Estadísticas regeneradas:', data);
        
        // Recargar datos
        loadDailyStats();
        loadWeeklyStats();
        
        showNotification('Estadísticas regeneradas exitosamente', 'success');
    } catch (error) {
        console.error('Error regenerando estadísticas:', error);
        showNotification('Error al regenerar estadísticas', 'error');
    }
}

function formatNumber(number) {
    return number.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function formatCategoryName(category) {
    const categories = {
        'burgers': 'Hamburguesas',
        'sides': 'Acompañamientos',
        'drinks': 'Bebidas',
        'desserts': 'Postres'
    };
    return categories[category] || category;
}

function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '1050';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}
