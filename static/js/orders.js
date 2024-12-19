// Variable para almacenar los pedidos
let orders = [];

// Conectar con WebSocket para actualizaciones en tiempo real
const socket = io();

// Escuchar actualizaciones de pedidos
socket.on('order_update', function(data) {
    console.log('Order update received:', data);
    updateOrders();
});

socket.on('order_status_changed', function(data) {
    console.log('Order status changed:', data);
    updateOrders();
});

// Función para cargar los pedidos
async function updateOrders() {
    try {
        const response = await fetch('/api/orders');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        orders = await response.json();
        displayOrders();
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

// Función para mostrar los pedidos
function displayOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!orders.length) {
        ordersList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="bi bi-info-circle me-2"></i>
                    No tienes pedidos realizados aún
                </div>
            </div>`;
        return;
    }

    ordersList.innerHTML = orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(order => `
            <div class="col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Pedido #${order.id}</h5>
                        <span class="badge ${getStatusBadgeClass(order.status)}">
                            ${getStatusText(order.status)}
                        </span>
                    </div>
                    <div class="card-body">
                        <p class="mb-2">
                            <i class="bi bi-clock me-2"></i>
                            ${new Date(order.createdAt).toLocaleString()}
                        </p>
                        <h6 class="mb-3">Items:</h6>
                        <ul class="list-unstyled">
                            ${order.items.map(item => `
                                <li class="mb-2">
                                    <div class="d-flex justify-content-between">
                                        <span>${item.quantity}x ${item.productName}</span>
                                        ${item.customizations && Object.keys(item.customizations).length > 0 ? `
                                            <small class="text-muted">
                                                ${Object.entries(item.customizations)
                                                    .map(([key, value]) => `${key}: ${value}`)
                                                    .join(', ')}
                                            </small>
                                        ` : ''}
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ${order.status === 'completed' && !order.feedback ? `
                        <div class="card-footer">
                            <button class="btn btn-outline-primary w-100" onclick="showFeedbackModal(${order.id})">
                                <i class="bi bi-star me-2"></i>Dejar Reseña
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
}

// Función para obtener la clase del badge según el estado
function getStatusBadgeClass(status) {
    const statusClasses = {
        'pending': 'bg-warning',
        'preparing': 'bg-primary',
        'ready': 'bg-success',
        'completed': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
}

// Función para obtener el texto del estado
function getStatusText(status) {
    const statusTexts = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'completed': 'Completado'
    };
    return statusTexts[status] || status;
}

// Cargar pedidos al iniciar la página
document.addEventListener('DOMContentLoaded', function() {
    updateOrders();
    // Actualizar cada 30 segundos
    setInterval(updateOrders, 30000);
});
