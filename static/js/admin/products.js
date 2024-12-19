// Variables globales
let products = [];
let editingProduct = null;

// Cargar productos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});

// Función para cargar productos
async function loadProducts() {
    try {
        const response = await fetch('/api/products/all');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        products = await response.json();
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error al cargar productos', 'error');
    }
}

// Función para mostrar productos en la tabla
function displayProducts() {
    const tableBody = document.getElementById('productsTableBody');
    tableBody.innerHTML = products.map(product => `
        <tr>
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${getCategoryName(product.category)}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>
                <span class="badge ${product.available ? 'bg-success' : 'bg-danger'}">
                    ${product.available ? 'Disponible' : 'No disponible'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editProduct(${product.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Función para obtener el nombre de la categoría
function getCategoryName(category) {
    const categories = {
        'burgers': 'Hamburguesas',
        'sides': 'Acompañamientos',
        'drinks': 'Bebidas',
        'desserts': 'Postres'
    };
    return categories[category] || category;
}

// Función para preparar el modal para un nuevo producto
function newProduct() {
    editingProduct = null;
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.querySelector('#productModal .modal-title').textContent = 'Nuevo Producto';
}

// Función para editar un producto existente
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    editingProduct = product;
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productAvailable').checked = product.available;

    document.querySelector('#productModal .modal-title').textContent = 'Editar Producto';
    // new bootstrap.Modal(document.getElementById('productModal')).show();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal'));
    modal.show();
}

// Función para guardar un producto
async function saveProduct() {
    const form = document.getElementById('productForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const productData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        available: document.getElementById('productAvailable').checked
    };

    try {
        const url = editingProduct 
            ? `/api/products/${editingProduct.id}`
            : '/api/products';
        
        const response = await fetch(url, {
            method: editingProduct ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const savedProduct = await response.json();
        
        if (editingProduct) {
            const index = products.findIndex(p => p.id === editingProduct.id);
            if (index !== -1) {
                products[index] = savedProduct;
            }
        } else {
            products.push(savedProduct);
        }

        displayProducts();
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        showNotification('Producto guardado exitosamente', 'success');
    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error al guardar el producto', 'error');
    }
}

// Función para eliminar un producto
async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        products = products.filter(p => p.id !== productId);
        displayProducts();
        showNotification('Producto eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error al eliminar el producto', 'error');
    }
}

// Función para mostrar notificaciones
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

// Event Listeners
document.getElementById('productModal').addEventListener('show.bs.modal', function (event) {
    if (!editingProduct) {
        newProduct();
    }
});
