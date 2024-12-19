document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la página
    loadInventoryData();
    loadProductsData();
    
    // Event Listeners
    document.getElementById('save-item').addEventListener('click', saveInventoryItem);
    document.getElementById('save-ingredients').addEventListener('click', saveProductIngredients);
    document.getElementById('add-ingredient-row').addEventListener('click', addIngredientRow);
    
    // Actualizar cada 5 minutos
    setInterval(loadInventoryData, 300000);
    setInterval(loadProductsData, 300000);
});

async function loadInventoryData() {
    try {
        const response = await fetch('/api/inventory');
        const data = await response.json();
        
        // Actualizar contadores
        document.getElementById('low-stock-count').textContent = data.lowStockCount;
        document.getElementById('total-products').textContent = data.totalItems;
        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
        
        // Actualizar tabla de inventario
        const tbody = document.querySelector('#inventory-table tbody');
        tbody.innerHTML = data.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${item.unit}</td>
                <td>${item.minimum_stock} ${item.unit}</td>
                <td>
                    <span class="badge bg-${item.quantity <= item.minimum_stock ? 'danger' : 'success'}">
                        ${item.quantity <= item.minimum_stock ? 'Stock Bajo' : 'OK'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="updateStock(${item.id})">
                        <i class="bi bi-plus-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="editItem(${item.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        showError('Error al cargar el inventario');
    }
}

async function loadProductsData() {
    try {
        const response = await fetch('/api/products/ingredients');
        const data = await response.json();
        
        // Actualizar tabla de productos
        const tbody = document.querySelector('#products-table tbody');
        tbody.innerHTML = data.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>
                    <ul class="list-unstyled mb-0">
                        ${product.ingredients.map(ing => `
                            <li>${ing.quantity} ${ing.unit} de ${ing.name}</li>
                        `).join('')}
                    </ul>
                </td>
                <td>${product.stock}</td>
                <td>
                    <span class="badge bg-${product.stock > 0 ? 'success' : 'danger'}">
                        ${product.stock > 0 ? 'Disponible' : 'Sin Stock'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="editProductIngredients(${product.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // Actualizar select de productos en el modal
        const productSelect = document.querySelector('[name="product_id"]');
        productSelect.innerHTML = data.map(product => `
            <option value="${product.id}">${product.name}</option>
        `).join('');
        
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Error al cargar los productos');
    }
}

async function saveInventoryItem() {
    const form = document.getElementById('add-item-form');
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        
        if (!response.ok) throw new Error('Error al guardar el item');
        
        // Cerrar modal y recargar datos
        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
        form.reset();
        loadInventoryData();
        showSuccess('Item añadido correctamente');
        
    } catch (error) {
        console.error('Error saving item:', error);
        showError('Error al guardar el item');
    }
}

async function saveProductIngredients() {
    const form = document.getElementById('assign-ingredient-form');
    const productId = form.querySelector('[name="product_id"]').value;
    const ingredients = [];
    
    // Recoger datos de ingredientes
    form.querySelectorAll('.ingredient-entry').forEach(entry => {
        const ingredientId = entry.querySelector('.ingredient-select').value;
        const quantity = entry.querySelector('.quantity-input').value;
        if (ingredientId && quantity) {
            ingredients.push({ ingredientId, quantity });
        }
    });
    
    try {
        const response = await fetch(`/api/products/${productId}/ingredients`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients })
        });
        
        if (!response.ok) throw new Error('Error al guardar los ingredientes');
        
        // Cerrar modal y recargar datos
        bootstrap.Modal.getInstance(document.getElementById('addIngredientModal')).hide();
        form.reset();
        loadProductsData();
        showSuccess('Ingredientes asignados correctamente');
        
    } catch (error) {
        console.error('Error saving ingredients:', error);
        showError('Error al guardar los ingredientes');
    }
}

function addIngredientRow() {
    const container = document.getElementById('ingredients-container');
    const newRow = document.querySelector('.ingredient-entry').cloneNode(true);
    
    // Limpiar valores
    newRow.querySelector('.ingredient-select').value = '';
    newRow.querySelector('.quantity-input').value = '';
    
    // Añadir evento para eliminar
    newRow.querySelector('.remove-ingredient').addEventListener('click', function() {
        if (container.children.length > 1) {
            this.closest('.ingredient-entry').remove();
        }
    });
    
    container.appendChild(newRow);
}

async function updateStock(itemId) {
    const quantity = prompt('Ingrese la cantidad a añadir:');
    if (!quantity) return;
    
    try {
        const response = await fetch(`/api/inventory/${itemId}/stock`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quantity: parseFloat(quantity) })
        });
        
        if (!response.ok) throw new Error('Error al actualizar el stock');
        
        loadInventoryData();
        showSuccess('Stock actualizado correctamente');
        
    } catch (error) {
        console.error('Error updating stock:', error);
        showError('Error al actualizar el stock');
    }
}

function showError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
}

function showSuccess(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
}
