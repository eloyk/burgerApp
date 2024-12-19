// Variables globales
let menuItems = [];
let categories = [];
let currentItem = null;

// Cargar productos cuando se inicia la página
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Primero cargar las categorías
        await loadCategories();
        // Luego inicializar la navegación
        initializeCategoryNav();
        // Configurar event listeners
        setupEventListeners();
        // Finalmente cargar los productos
        await loadProducts();
        // Mostrar todos los productos inicialmente
        displayMenuItems('all');
    } catch (error) {
        console.error('Error inicializando la página:', error);
        showError('Error al cargar la página. Por favor, recarga.');
    }
});

// Función para cargar las categorías
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        categories = await response.json();
        console.log('Categorías cargadas:', categories);
    } catch (error) {
        console.error('Error cargando categorías:', error);
        showError('Error al cargar las categorías. Por favor, recarga la página.');
    }
}

// Función para cargar los productos desde la API
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        const products = await response.json();
        console.log('Productos cargados:', products);
        
        // Añadir la imagen y customizable basado en la categoría
        menuItems = products.map(product => {
            const categoryId = product.category_id || (product.category ? product.category.id : null);
            return {
                ...product,
                // image: getCategoryImage(categoryId),
                customizable: categoryId === 1 // ID 1 es para hamburguesas
            };
        });
        
        // Mostrar los productos
        displayMenuItems('all');
    } catch (error) {
        console.error('Error cargando productos:', error);
        showError('Error al cargar los productos. Por favor, recarga la página.');
    }
}

// Función para inicializar la navegación por categorías
function initializeCategoryNav() {
    const categoryNav = document.querySelector('.menu-categories');
    if (!categoryNav) return;

    const categoryButtons = categories.map(category => `
        <button class="btn btn-outline-primary ${category.active ? '' : 'disabled'}"
                data-category="${category.id}"
                ${category.active ? '' : 'disabled'}>
            <i class="bi ${category.icon || 'bi-tag'} me-2"></i>
            ${category.name}
        </button>
    `).join('');

    categoryNav.innerHTML = `
        <button class="btn btn-outline-primary active" data-category="all">
            <i class="bi bi-grid-3x3-gap me-2"></i>
            Todos
        </button>
        ${categoryButtons}
    `;
}

// Función para obtener la imagen según la categoría
function getCategoryImage(categoryId) {
    // Definir imágenes específicas para cada categoría
    const images = {
        1: [ // Hamburguesas
            "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
            "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5",
            "https://images.unsplash.com/photo-1586190848861-99aa4a171e90",
            "https://images.unsplash.com/photo-1553979459-d2229ba7433b"
        ],
        2: [ // Acompañamientos
            "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d",
            "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5",
            "https://images.unsplash.com/photo-1600891964599-f61ba0e24092",
            "https://images.unsplash.com/photo-1576107232684-1279f390859f"
        ],
        3: [ // Bebidas
            "https://images.unsplash.com/photo-1581636625402-29b2a704ef13",
            "https://images.unsplash.com/photo-1543253687-c931c8e01820",
            "https://images.unsplash.com/photo-1437418747212-8d9709afab22",
            "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd"
        ]
    };

    // Parsear categoryId como número si es string
    const id = parseInt(categoryId);
    
    // Si no hay ID válido o no hay imágenes para esa categoría
    if (!id || !images[id]) {
        console.warn(`No hay imágenes para la categoría ${id}, usando imagen por defecto`);
        return "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&h=400&fit=crop";
    }

    // Usar un hash simple basado en el ID de la categoría para seleccionar una imagen
    const categoryImages = images[id];
    const index = id % categoryImages.length;
    return `${categoryImages[index]}?w=500&h=400&fit=crop&auto=format`;
}

// Configurar los event listeners
function setupEventListeners() {
    // Eventos para los botones de categoría
    const categoryNav = document.querySelector('.menu-categories');
    if (categoryNav) {
        categoryNav.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            e.preventDefault();
            
            // Remover clase active de todos los botones
            categoryNav.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            
            // Añadir clase active al botón clickeado
            button.classList.add('active');
            
            const categoryId = button.dataset.category;
            console.log('Filtrando por categoría:', categoryId);
            displayMenuItems(categoryId);
        });
    }

    // Inicializar elementos del modal
    const customizeModal = document.getElementById('customizeModal');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const customizeForm = document.getElementById('customize-form');

    if (!customizeModal || !addToCartBtn || !customizeForm) {
        console.error('Error: Modal elements not found');
        return;
    }

    // Función para manejar el botón de personalización
    window.handleCustomizeButton = function(itemId) {
        currentItem = menuItems.find(item => item.id === itemId);
        if (currentItem) {
            const customizeForm = document.getElementById('customize-form');
            customizeForm.reset();
            
            const modal = document.getElementById('customizeModal');
            const bsModal = new bootstrap.Modal(modal, {
                backdrop: 'static',
                keyboard: true
            });
            bsModal.show();
        }
    };

    // Limpiar datos al cerrar el modal
    customizeModal.addEventListener('hidden.bs.modal', function () {
        currentItem = null;
        customizeForm.reset();
        // Remover el backdrop manualmente si es necesario
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    });

    // Manejar el evento de escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }
    });

    // Manejar el botón de añadir al carrito
    addToCartBtn.addEventListener('click', () => {
        if (!currentItem) return;
        
        const formData = new FormData(customizeForm);
        const customizations = {
            cooking: formData.get('cooking'),
            extras: formData.getAll('extras'),
            instructions: formData.get('instructions')
        };
        
        addToCart(currentItem, customizations);
        bootstrap.Modal.getInstance(document.getElementById('customizeModal')).hide();
    });

    // Limpiar al cerrar el modal
    customizeModal.addEventListener('hidden.bs.modal', () => {
        currentItem = null;
        customizeForm.reset();
    });
}

// Mostrar los items del menú
function displayMenuItems(categoryId) {
    console.log('Mostrando items para categoría:', categoryId);
    const menuContainer = document.getElementById('menu-items');
    if (!menuContainer) {
        console.error('Container de menú no encontrado');
        return;
    }

    // Filtrar items según la categoría seleccionada
    let filteredItems = menuItems;
    if (categoryId !== 'all') {
        const categoryIdNum = parseInt(categoryId);
        filteredItems = menuItems.filter(item => item.category_id === categoryIdNum);
        console.log('Items filtrados:', filteredItems);
        
        // Si no hay items en esta categoría
        if (filteredItems.length === 0) {
            menuContainer.innerHTML = `
                <div class="alert alert-info">
                    No hay productos disponibles en esta categoría
                </div>
            `;
            return;
        }
    }

    // Agrupar items por categoría
    const groupedItems = filteredItems.reduce((acc, item) => {
        if (!item.category) return acc;
        
        const categoryKey = item.category.id;
        if (!acc[categoryKey]) {
            acc[categoryKey] = {
                category: item.category,
                items: []
            };
        }
        acc[categoryKey].items.push(item);
        return acc;
    }, {});

    console.log('Items agrupados:', groupedItems);

    // Renderizar los items agrupados
    menuContainer.innerHTML = Object.values(groupedItems)
        .filter(group => group.category && group.items.length > 0)
        .sort((a, b) => (a.category.order || 0) - (b.category.order || 0))
        .map(group => `
            <div class="category-section mb-5">
                <h3 class="category-title mb-4">
                    <i class="bi ${group.category.icon || 'bi-tag'} me-2"></i>
                    ${group.category.name}
                </h3>
                <div class="row g-4">
                    ${renderMenuItems(group.items)}
                </div>
            </div>
        `).join('');
}

// Función auxiliar para renderizar los items del menú
function renderMenuItems(items) {
    return items.map(item => `
        <div class="col-12 col-md-6 mb-4">
            <div class="card h-100 menu-item-card shadow-sm border-0">
                <div class="position-relative overflow-hidden">
                    <img src="${item.image}?w=500&h=400&fit=crop&auto=format" 
                         class="card-img-top img-fluid" 
                         alt="${item.name}" 
                         loading="lazy"
                         style="height: 200px; object-fit: cover; transition: transform 0.3s ease;">
                    ${!item.available ? `
                        <div class="position-absolute top-0 end-0 m-2 badge bg-danger">
                            No disponible
                        </div>
                    ` : ''}
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title text-truncate">${item.name}</h5>
                    <p class="card-text text-muted small flex-grow-1">${item.description || ''}</p>
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="h5 mb-0">$${(item.price || 0).toLocaleString('es-CO')}</span>
                            ${item.available ? `
                                ${item.customizable ? `
                                    <button class="btn btn-primary btn-sm" onclick="handleCustomizeButton(${item.id})">
                                        <i class="bi bi-sliders me-1"></i>Personalizar
                                    </button>
                                ` : `
                                    <button class="btn btn-primary btn-sm" onclick="handleAddToCart(${item.id})">
                                        <i class="bi bi-plus-lg me-1"></i>Añadir
                                    </button>
                                `}
                            ` : `
                                <button class="btn btn-secondary btn-sm" disabled>
                                    <i class="bi bi-x-circle me-1"></i>No disponible
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Manejar el añadir al carrito
function handleAddToCart(itemId) {
    const item = menuItems.find(p => p.id === itemId);
    
    if (!item) {
        console.error('Producto no encontrado:', itemId);
        return;
    }

    // Si es una hamburguesa, debe ser personalizada
    if (item.category === 'burgers') {
        handleCustomizeButton(itemId);
    } else {
        // Si no es personalizable, añadir directamente al carrito
        addToCart(item);
    }
}

// Mostrar mensaje de error
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.menu-categories').after(errorDiv);
}

// Función para añadir items al carrito
async function addToCart(item, customizations = {}) {
    try {
        const customerName = prompt('Por favor, ingresa tu nombre:');
        if (!customerName) return;

        const orderData = {
            customerName: customerName,
            items: [{
                productId: item.id,
                quantity: 1,
                customizations: customizations
            }]
        };

        console.log('Enviando pedido:', orderData);

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Pedido creado exitosamente:', result);

        // Guardar el nombre del cliente para futuras referencias
        localStorage.setItem('customerName', customerName);

        // Conectar con WebSocket si no está conectado
        if (!window.socket) {
            window.socket = io();
            
            // Configurar manejadores de eventos WebSocket
            window.socket.on('connect', () => {
                console.log('WebSocket conectado');
            });
            
            window.socket.on('order_update', (data) => {
                console.log('Actualización de pedido recibida:', data);
            });
            
            window.socket.on('new_order', (data) => {
                console.log('Nuevo pedido recibido:', data);
            });
        }

        // Emitir evento de nuevo pedido
        window.socket.emit('new_order', result);

        alert('¡Pedido creado con éxito! Redirigiendo a la página de pedidos...');
        
        // Esperar un momento antes de redirigir para asegurar que el WebSocket se conecte
        setTimeout(() => {
            window.location.href = '/orders';
        }, 1000);
        
    } catch (error) {
        console.error('Error al crear el pedido:', error);
        alert('Error al crear el pedido: ' + error.message);
    }
}

// Placeholder for showPersonalizedRecommendations (needs implementation from original code)
async function showPersonalizedRecommendations() {
    const customerName = localStorage.getItem('customerName');
    if (!customerName) return;

    try {
        const response = await fetch(`/api/recommendations?customer_name=${encodeURIComponent(customerName)}`);
        const data = await response.json();
        
        if (data.recommendations && data.recommendations.length > 0) {
            const recommendationsHtml = `
                <div class="recommendations-section mb-4">
                    <h4 class="mb-3">
                        <i class="bi bi-star-fill text-warning me-2"></i>
                        Recomendados para ti
                    </h4>
                    <div class="row g-4">
                        ${data.recommendations.map(item => `
                            <div class="col-md-4">
                                <div class="card menu-item h-100">
                                    <div class="card-body">
                                        <div class="recommended-badge mb-2">
                                            <i class="bi bi-heart-fill text-danger"></i> Recomendado
                                        </div>
                                        <h5 class="card-title">${item.name}</h5>
                                        <p class="card-text">${item.description}</p>
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="h5 mb-0">$${item.price.toFixed(2)}</span>
                                            <button class="btn btn-primary" 
                                                    onclick="handleAddToCart(${item.id})"
                                                    ${item.category === 'burgers' ? 'data-bs-toggle="modal" data-bs-target="#customizeModal"' : ''}>
                                                Añadir al Carrito
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            
            const menuContainer = document.getElementById('menu-items');
            menuContainer.insertAdjacentHTML('beforebegin', recommendationsHtml);
        }
    } catch (error) {
        console.error('Error fetching recommendations:', error);
    }
}

// Initialize menu - moved here for better organization
document.addEventListener('DOMContentLoaded', function() {
    showPersonalizedRecommendations();
});

// async function hiddenModal() {
//     await bootstrap.Modal.getInstance(document.getElementById('customizeModal')).hide();
// }
