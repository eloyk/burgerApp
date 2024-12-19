let orders = [];
const socket = io();

// Listen for real-time updates
socket.on('connect', function() {
    console.log('Connected to WebSocket server');
    updateOrders(); // Update orders when connection is established
});

socket.on('order_update', function(data) {
    console.log('Order update received:', data);
    updateOrders();
});

socket.on('order_status_changed', function(data) {
    console.log('Order status changed:', data);
    updateOrders();
});

socket.on('disconnect', function() {
    console.log('Disconnected from WebSocket server');
    document.getElementById('kitchen-error').innerHTML = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            Conexión perdida. Reconectando...
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
});

socket.on('connect_error', function(error) {
    console.error('WebSocket connection error:', error);
    document.getElementById('kitchen-error').innerHTML = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
            Problemas de conexión. Intentando reconectar...
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
});

async function updateOrders() {
    try {
        console.log('Fetching orders...');
        const response = await fetch('/api/orders');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received orders data:', data);
        
        if (Array.isArray(data)) {
            // Filtrar solo pedidos pendientes y en preparación
            orders = data.filter(order => 
                order.status === 'pending' || 
                order.status === 'preparing' ||
                order.status === 'ready'
            );
            
            console.log('Active orders after filtering:', orders);
            
            // Actualizar contadores inmediatamente
            const pendingOrders = orders.filter(order => order.status === 'pending');
            const preparingOrders = orders.filter(order => order.status === 'preparing');
            const readyOrders = orders.filter(order => order.status === 'ready');
            
            document.getElementById('new-orders-count').textContent = pendingOrders.length.toString();
            document.getElementById('in-progress-count').textContent = preparingOrders.length.toString();
            document.getElementById('ready-count').textContent = readyOrders.length.toString();
            document.getElementById('active-orders-count').textContent = `${orders.length} Activos`;
            
            // Mostrar los pedidos en sus respectivas secciones
            displayOrders();
            
            // Actualizar el mapa de cocina
            updateKitchenMap(orders);
        } else {
            throw new Error('Invalid data format received from server');
        }
    } catch (error) {
        console.error('Error fetching orders:', error);
        // Mostrar mensaje de error al usuario
        document.getElementById('kitchen-error').innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                Error al cargar los pedidos: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

function displayOrders() {
    console.log('Starting displayOrders with all orders:', orders);
    
    // Limpiar el mensaje de error si existe
    const kitchenError = document.getElementById('kitchen-error');
    if (kitchenError) {
        kitchenError.innerHTML = '';
    }
    
    try {
        // Filtrar pedidos por estado
        const newOrders = orders.filter(order => order.status === 'pending');
        const inProgressOrders = orders.filter(order => order.status === 'preparing');
        const readyOrders = orders.filter(order => order.status === 'ready');

        console.log('Orders by status:', {
            pending: newOrders,
            preparing: inProgressOrders,
            ready: readyOrders
        });

        // Actualizar las secciones de pedidos
        const newOrdersContainer = document.getElementById('new-orders');
        const inProgressContainer = document.getElementById('in-progress-orders');
        const readyContainer = document.getElementById('ready-orders');

        console.log('Containers found:', {
            newOrders: newOrdersContainer,
            inProgress: inProgressContainer,
            ready: readyContainer
        });

        if (newOrdersContainer) {
            const newOrdersHtml = renderOrders(newOrders, 'preparing');
            console.log('New orders HTML:', newOrdersHtml);
            newOrdersContainer.innerHTML = newOrdersHtml;
        } else {
            console.error('New orders container not found');
        }

        if (inProgressContainer) {
            const inProgressHtml = renderOrders(inProgressOrders, 'ready');
            console.log('In progress HTML:', inProgressHtml);
            inProgressContainer.innerHTML = inProgressHtml;
        } else {
            console.error('In progress container not found');
        }

        if (readyContainer) {
            const readyHtml = renderOrders(readyOrders, 'completed');
            console.log('Ready HTML:', readyHtml);
            readyContainer.innerHTML = readyHtml;
        } else {
            console.error('Ready container not found');
        }

        // Actualizar contadores
        const counters = {
            'new-orders-count': newOrders.length,
            'in-progress-count': inProgressOrders.length,
            'ready-count': readyOrders.length,
            'active-orders-count': `${orders.length} Activos`
        };

        Object.entries(counters).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            } else {
                console.error(`Counter element ${id} not found`);
            }
        });

        // Actualizar el mapa de cocina con todos los pedidos activos
        updateKitchenMap([...newOrders, ...inProgressOrders]);
        
        // Mostrar mensaje si no hay pedidos activos
        if (orders.length === 0) {
            document.getElementById('kitchen-error').innerHTML = `
                <div class="alert alert-info alert-dismissible fade show" role="alert">
                    No hay pedidos activos en este momento.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error displaying orders:', error);
        document.getElementById('kitchen-error').innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                Error al mostrar los pedidos: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

function updateCounter(elementId, newValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent);
    if (currentValue !== newValue) {
        element.classList.add('badge-pulse');
        element.textContent = newValue;
        setTimeout(() => element.classList.remove('badge-pulse'), 500);
    }
}

function updateOrderList(containerId, orders, nextStatus) {
    const container = document.getElementById(containerId);
    const newContent = renderOrders(orders, nextStatus);
    
    if (container.innerHTML !== newContent) {
        container.innerHTML = newContent;
        Array.from(container.children).forEach((child, index) => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';
            setTimeout(() => {
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
}

function updateKitchenMap(activeOrders) {
    console.log('Updating kitchen map with orders:', activeOrders);
    // Reiniciar todas las estaciones
    const stations = ['grill', 'prep', 'assembly', 'garnish'];
    stations.forEach(stationId => {
        const station = document.querySelector(`[data-station="${stationId}"] .station-orders`);
        if (station) {
            station.innerHTML = `
                <div class="text-muted text-center" id="${stationId}-empty">
                    <i class="bi bi-emoji-smile opacity-50"></i>
                    <small class="d-block">Estación libre</small>
                </div>
            `;
        }
    });

    if (!activeOrders || activeOrders.length === 0) {
        console.log('No active orders to display');
        return;
    }

    // Usar activeOrders en lugar de inProgressOrders
    activeOrders.forEach(order => {
        if (!order.items || !Array.isArray(order.items)) {
            console.error('Invalid order items:', order);
            return;
        }

        order.items.forEach(item => {
            let stationId;
            let timeEstimate;
            
            // Determinar la estación basada en el tipo de producto
            if (item.productName.toLowerCase().includes('burger')) {
                stationId = 'grill';
                timeEstimate = '8-10 min';
            } else if (item.customizations && Object.keys(item.customizations).length > 0) {
                stationId = 'prep';
                timeEstimate = '3-5 min';
            } else if (item.productName.toLowerCase().includes('fries')) {
                stationId = 'garnish';
                timeEstimate = '2-4 min';
            } else {
                stationId = 'assembly';
                timeEstimate = '2-3 min';
            }

            const station = document.querySelector(`[data-station="${stationId}"] .station-orders`);
            const emptyMessage = document.getElementById(`${stationId}-empty`);

            if (station) {
                // Ocultar el mensaje de estación vacía
                if (emptyMessage) {
                    emptyMessage.style.display = 'none';
                }

                // Crear y añadir el elemento del pedido
                const orderDiv = document.createElement('div');
                orderDiv.className = 'station-order';
                orderDiv.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong class="text-primary">Pedido #${order.id}</strong>
                        <span class="badge bg-primary">${timeEstimate}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <span>${item.quantity}x ${item.productName}</span>
                        <i class="bi bi-arrow-clockwise text-warning"></i>
                    </div>
                    ${item.customizations ? `
                        <small class="text-muted d-block mt-1">
                            <i class="bi bi-info-circle me-1"></i>
                            ${Object.entries(item.customizations)
                                .filter(([key, value]) => value && key !== 'instructions')
                                .map(([key, value]) => {
                                    if (Array.isArray(value)) {
                                        return `${key}: ${value.join(', ')}`;
                                    }
                                    return `${key}: ${value}`;
                                })
                                .join(', ')}
                        </small>
                        ${item.customizations.instructions ? `
                            <small class="text-muted d-block mt-1">
                                <i class="bi bi-chat-text me-1"></i>
                                Instrucciones: ${item.customizations.instructions}
                            </small>
                        ` : ''}
                    ` : ''}
                `;
                
                // Añadir con animación
                orderDiv.style.opacity = '0';
                orderDiv.style.transform = 'translateY(10px)';
                station.appendChild(orderDiv);
                
                // Trigger animation
                setTimeout(() => {
                    orderDiv.style.opacity = '1';
                    orderDiv.style.transform = 'translateY(0)';
                }, 100);
            }
        });
    });
}

function renderOrders(orders, nextStatus) {
    console.log('Rendering orders:', orders, 'nextStatus:', nextStatus);
    
    if (!orders || orders.length === 0) {
        return '<p class="text-center text-muted">No hay pedidos en esta sección</p>';
    }

    return orders.map(order => {
        console.log('Rendering order:', order);
        const orderDate = new Date(order.createdAt);
        const timeString = orderDate.toLocaleTimeString();
        
        return `
            <div class="card order-card mb-3">
                <div class="card-header bg-light">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="bi bi-receipt me-2"></i>
                            Pedido #${order.id}
                        </h5>
                        <div>
                            <span class="badge bg-primary">
                                <i class="bi bi-clock me-1"></i>
                                ${timeString}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <div class="d-flex align-items-center mb-2">
                            <i class="bi bi-person-circle me-2"></i>
                            <strong>${order.customerName}</strong>
                        </div>
                        ${order.customerPhone ? `
                            <div class="d-flex align-items-center text-muted">
                                <i class="bi bi-telephone me-2"></i>
                                ${order.customerPhone}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="order-items">
                        <h6 class="border-bottom pb-2 mb-3">
                            <i class="bi bi-list-check me-2"></i>Items del Pedido
                        </h6>
                        <div class="list-group list-group-flush">
                            ${order.items.map(item => `
                                <div class="list-group-item border-0 px-0">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="ms-2 me-auto">
                                            <div class="fw-bold">
                                                ${item.quantity}x ${item.productName}
                                            </div>
                                            ${item.customizations && Object.keys(item.customizations).length > 0 ? `
                                                <small class="text-muted">
                                                    ${Object.entries(item.customizations)
                                                        .filter(([key, value]) => value && key !== 'instructions')
                                                        .map(([key, value]) => {
                                                            if (Array.isArray(value)) {
                                                                return `${key}: ${value.join(', ')}`;
                                                            }
                                                            return `${key}: ${value}`;
                                                        })
                                                        .join(' | ')}
                                                </small>
                                            ` : ''}
                                            ${item.customizations?.instructions ? `
                                                <div class="mt-1">
                                                    <small class="text-warning">
                                                        <i class="bi bi-info-circle me-1"></i>
                                                        ${item.customizations.instructions}
                                                    </small>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-primary w-100" 
                                onclick="updateOrderStatus(${order.id}, '${nextStatus}')">
                            <i class="bi bi-arrow-right-circle me-2"></i>
                            Marcar como ${getStatusText(nextStatus)}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusText(status) {
    const statusTexts = {
        'preparing': 'En Preparación',
        'ready': 'Listo',
        'completed': 'Completado'
    };
    return statusTexts[status] || status;
}

function updateOrderStatus(orderId, status) {
    // Mostrar indicador de carga en el botón
    const button = document.querySelector(`button[onclick="updateOrderStatus(${orderId}, '${status}')"]`);
    if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="bi bi-arrow-repeat spin me-2"></i>Actualizando...';
        button.disabled = true;
    }

    fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Order status updated:', data);
        // Actualizar la vista
        updateOrders();
        // Mostrar notificación de éxito
        showNotification(`Pedido #${orderId} actualizado a ${getStatusText(status)}`, 'success');
        
        if (status === 'completed') {
            showFeedbackModal(orderId);
        }
    })
    .catch(error => {
        console.error('Error updating order:', error);
        showNotification(`Error al actualizar el pedido: ${error.message}`, 'error');
        // Restaurar el botón en caso de error
        if (button) {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });
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
    
    // Remover la notificación después de 3 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function showFeedbackModal(orderId) {
    // Add your modal implementation here.  This is a placeholder.
    //  This would typically involve creating and displaying a modal element
    //  containing emoji buttons for user feedback, and handling the submission
    //  of that feedback to your backend.
    alert(`Order ${orderId} completed! Show feedback modal here.`);
}


// Initial load and periodic updates
document.addEventListener('DOMContentLoaded', () => {
    updateOrders();
    setInterval(updateOrders, 10000); // Update every 10 seconds
});