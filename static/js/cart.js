let cart = [];

function addToCart(item, customizations = null) {
    // Calcular precio adicional por extras
    let extraPrice = 0;
    if (customizations && customizations.extras) {
        customizations.extras.forEach(extra => {
            if (extra === 'cheese') extraPrice += 50;
            if (extra === 'bacon') extraPrice += 80;
        });
    }

    const cartItem = {
        id: item.id,
        name: item.name,
        price: item.price + extraPrice,
        quantity: 1,
        customizations
    };

    const existingItemIndex = cart.findIndex(i => 
        i.id === item.id && 
        JSON.stringify(i.customizations) === JSON.stringify(customizations)
    );

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += 1;
    } else {
        cart.push(cartItem);
    }

    updateCartDisplay();
    
    // Mostrar notificación más amigable
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1050';
    
    toastContainer.innerHTML = `
        <div class="toast align-items-center text-white bg-success border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-check-circle me-2"></i>¡Producto agregado al carrito!
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    document.body.appendChild(toastContainer);
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
    
    // Remover el contenedor después de que se oculte el toast
    toastContainer.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toastContainer);
    });
}

function updateCartDisplay() {
    const cartContainer = document.getElementById('cart-items');
    const subtotalElement = document.getElementById('cart-subtotal');
    const totalElement = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-muted text-center">Tu carrito está vacío</p>';
        subtotalElement.textContent = '$0.00';
        totalElement.textContent = '$0.00';
        checkoutBtn.disabled = true;
        return;
    }

    let cartHTML = '';
    cart.forEach((item, index) => {
        cartHTML += `
            <div class="cart-item mb-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${item.name}</h6>
                        ${item.customizations ? `
                            <small class="text-muted">
                                ${Object.entries(item.customizations)
                                    .filter(([key, value]) => value && key !== 'instructions')
                                    .map(([key, value]) => `${key}: ${value}`).join(', ')}
                            </small>
                            ${item.customizations.instructions ? `
                                <small class="d-block text-muted">
                                    <i class="bi bi-info-circle-fill me-1"></i>${item.customizations.instructions}
                                </small>
                            ` : ''}
                        ` : ''}
                    </div>
                    <div class="text-end ms-3">
                        <div class="fw-bold mb-1">$${(item.price * item.quantity).toFixed(2)}</div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, -1)">
                                <i class="bi bi-dash"></i>
                            </button>
                            <span class="btn btn-outline-secondary disabled">${item.quantity}</span>
                            <button class="btn btn-outline-secondary" onclick="updateQuantity(${index}, 1)">
                                <i class="bi bi-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    cartContainer.innerHTML = cartHTML;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
    totalElement.textContent = `$${subtotal.toFixed(2)}`;
    checkoutBtn.disabled = false;
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCartDisplay();
}

// Initialize checkout button handler
document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) return;

    const customerName = prompt('Please enter your name for the order:');
    if (!customerName) return;

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerName,
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    customizations: item.customizations || {}
                }))
            })
        });

        if (response.ok) {
            alert('Order placed successfully!');
            cart = [];
            updateCartDisplay();
        } else {
            throw new Error('Failed to place order');
        }
    } catch (error) {
        alert('Error placing order: ' + error.message);
    }
});
