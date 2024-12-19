// Variables globales
let categories = [];
let editingCategory = null;

// Cargar categorías al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
});

// Función para cargar categorías
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        categories = await response.json();
        displayCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        showNotification('Error al cargar categorías', 'error');
    }
}

// Función para mostrar categorías
function displayCategories() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = categories.map(category => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title">${category.name}</h5>
                        <span class="badge ${category.active ? 'bg-success' : 'bg-danger'}">
                            ${category.active ? 'Activa' : 'Inactiva'}
                        </span>
                    </div>
                    <p class="card-text text-muted small">${category.slug}</p>
                    <p class="card-text">${category.description || 'Sin descripción'}</p>
                    <div class="mt-3">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editCategory(${category.id})">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${category.id})">
                            <i class="bi bi-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Función para preparar el modal para una nueva categoría
function newCategory() {
    editingCategory = null;
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.querySelector('#categoryModal .modal-title').textContent = 'Nueva Categoría';
    document.getElementById('categoryActive').checked = true;
}

// Función para editar una categoría existente
function editCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    editingCategory = category;
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categorySlug').value = category.slug;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryActive').checked = category.active;

    document.querySelector('#categoryModal .modal-title').textContent = 'Editar Categoría';
    new bootstrap.Modal(document.getElementById('categoryModal')).show();
}

// Función para guardar una categoría
async function saveCategory() {
    const form = document.getElementById('categoryForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const categoryData = {
        name: document.getElementById('categoryName').value,
        slug: document.getElementById('categorySlug').value,
        description: document.getElementById('categoryDescription').value,
        active: document.getElementById('categoryActive').checked
    };

    try {
        const url = editingCategory 
            ? `/api/categories/${editingCategory.id}`
            : '/api/categories';
        
        const response = await fetch(url, {
            method: editingCategory ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const savedCategory = await response.json();
        
        if (editingCategory) {
            const index = categories.findIndex(c => c.id === editingCategory.id);
            if (index !== -1) {
                categories[index] = savedCategory;
            }
        } else {
            categories.push(savedCategory);
        }

        displayCategories();
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        showNotification('Categoría guardada exitosamente', 'success');
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error al guardar la categoría', 'error');
    }
}

// Función para eliminar una categoría
async function deleteCategory(categoryId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
        return;
    }

    try {
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        categories = categories.filter(c => c.id !== categoryId);
        displayCategories();
        showNotification('Categoría eliminada exitosamente', 'success');
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Error al eliminar la categoría', 'error');
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
document.getElementById('categoryModal').addEventListener('show.bs.modal', function (event) {
    if (!editingCategory) {
        newCategory();
    }
});

// Generar slug automáticamente desde el nombre
document.getElementById('categoryName').addEventListener('input', function(e) {
    if (!editingCategory) {
        const slug = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        document.getElementById('categorySlug').value = slug;
    }
});
