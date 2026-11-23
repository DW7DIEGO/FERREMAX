// cart.js - Shopping cart functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the cart page
    if (document.querySelector('.cart-container')) {
        loadCartItems();
        initCartFunctionality();
        document.getElementById('delivery-form')?.addEventListener('submit', e => { e.preventDefault(); document.querySelector('.checkout-btn').click(); });
        document.addEventListener('click', e => {
            if (e.target.closest('.coupon button')) alert('Las promociones se aplican directamente al precio de los productos.');
        });
    }
});

// Load cart items from localStorage
function loadCartItems() {
    const cartContent = document.getElementById('cart-content');
    const emptyCart = document.getElementById('empty-cart');
    
    // Get cart from localStorage
    const cart = readStoredList('cart');
    
    // Show empty cart message if cart is empty
    if (cart.length === 0) {
        if (cartContent) cartContent.style.display = 'none';
        if (emptyCart) emptyCart.style.display = 'block';
        return;
    }
    
    // Hide empty cart message and show cart content
    if (cartContent) cartContent.style.display = 'flex';
    if (emptyCart) emptyCart.style.display = 'none';
    
    // Get cart items container
    const cartItems = document.querySelector('.cart-items');
    if (!cartItems) return;
    
    // Clear current items (except the cart actions at the bottom)
    const cartActions = cartItems.querySelector('.cart-actions');
    cartItems.innerHTML = '';
    
    // Add cart items
    let subtotal = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.setAttribute('data-id', item.id);
        
        cartItem.innerHTML = `
            <div class="item-image">
                <img src="${escapeHtml(imgUrl(item.image))}" alt="${escapeHtml(item.name)}">
            </div>
            <div class="item-details">
                <h3 class="item-name">${escapeHtml(item.name)}</h3>
                <p class="item-code">Código: ${escapeHtml(item.code || 'N/A')}</p>
            </div>
            <div class="item-price">${formatPrice(item.price)}</div>
            <div class="item-quantity">
                <button class="quantity-btn decrease">-</button>
                <input type="number" value="${item.quantity}" min="1">
                <button class="quantity-btn increase">+</button>
            </div>
            <div class="item-total">${formatPrice(itemTotal)}</div>
            <div class="item-actions">
                <button class="btn-icon"><i class="far fa-heart"></i></button>
                <button class="btn-icon remove-item"><i class="far fa-trash-alt"></i></button>
            </div>
        `;
        
        cartItems.appendChild(cartItem);
    });
    
    // Add back the cart actions
    if (cartActions) {
        cartItems.appendChild(cartActions);
    } else {
        // Create cart actions if not present
        const newCartActions = document.createElement('div');
        newCartActions.className = 'cart-actions';
        newCartActions.innerHTML = `
            <p>Las ofertas ya estan incluidas en el precio.</p>
            <button class="btn btn-secondary update-cart">Actualizar Carrito</button>
        `;
        cartItems.appendChild(newCartActions);
    }
    
    // Update summary
    updateCartSummary(subtotal);
}

// Initialize cart functionality
function initCartFunctionality() {
    // Update cart when quantity changes
    document.addEventListener('click', function(e) {
        // Handle quantity decrease
        if (e.target.classList.contains('decrease')) {
            const input = e.target.nextElementSibling;
            let value = parseInt(input.value);
            if (value > 1) {
                input.value = value - 1;
                updateItemQuantity(input);
            }
        }
        
        // Handle quantity increase
        if (e.target.classList.contains('increase')) {
            const input = e.target.previousElementSibling;
            let value = parseInt(input.value);
            input.value = value + 1;
            updateItemQuantity(input);
        }
        
        // Handle remove item
        if (e.target.classList.contains('fa-trash-alt') || 
            (e.target.classList.contains('remove-item'))) {
            
            const itemElement = e.target.closest('.cart-item');
            if (itemElement) {
                const itemId = parseInt(itemElement.getAttribute('data-id'));
                removeCartItem(itemId);
            }
        }
    });
    
    // Handle input change
    document.addEventListener('change', function(e) {
        if (e.target.closest('.item-quantity') && e.target.tagName === 'INPUT') {
            updateItemQuantity(e.target);
        }
    });
    
    // Handle update cart button
    const updateCartBtn = document.querySelector('.update-cart');
    if (updateCartBtn) {
        updateCartBtn.addEventListener('click', function() {
            // Get all quantity inputs
            const quantityInputs = document.querySelectorAll('.item-quantity input');
            
            // Update all quantities
            quantityInputs.forEach(input => {
                updateItemQuantity(input);
            });
            
            alert('Carrito actualizado');
        });
    }
    
    // Handle checkout button
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async function() {
            const cart = readStoredList('cart');
            if (!cart.length) return alert('Tu carrito está vacío.');
            if (!getCurrentUser()) {
                alert('Inicia sesión para finalizar tu compra.');
                window.location.href = 'login.html';
                return;
            }
            if (!document.getElementById('delivery-form').reportValidity()) return;
            checkoutBtn.disabled = true;
            try {
                // El servidor recalcula los precios; el cliente solo envia producto y cantidad
                await preferenceSave.catch(() => {});
                const data = await api.createOrder(cart.map(i => ({ product_id: i.id, quantity: i.quantity })), (document.querySelector('input[name="shipping"]:checked')?.id || 'shipping-standard').replace('shipping-', ''), document.getElementById('delivery-address').value, document.getElementById('delivery-phone').value, document.getElementById('delivery-city').value);
                await writeStoredList('cart', []).catch(() => {});
                alert(`¡Pedido #${data.order.id} registrado! Total: ${formatPrice(data.order.total)}`);
                window.location.href = 'home.html';
            } catch (error) {
                if (error.status === 401) {
                    alert('Tu sesión expiró. Inicia sesión de nuevo.');
                    window.location.href = 'login.html';
                } else {
                    alert(error.network ? 'No se pudo conectar con el servidor.' : error.message);
                }
            } finally {
                checkoutBtn.disabled = false;
            }
        });
    }
    
    // Handle shipping method change
    const shippingOptions = document.querySelectorAll('input[name="shipping"]');
    shippingOptions.forEach(option => {
        option.addEventListener('change', function() {
            updateShippingCost();
        });
    });
}

// Update item quantity in localStorage and UI
function updateItemQuantity(input) {
    const itemElement = input.closest('.cart-item');
    const itemId = parseInt(itemElement.getAttribute('data-id'));
    const newQuantity = Number(input.value);
    if (!Number.isSafeInteger(newQuantity) || newQuantity < 1 || newQuantity > 1000) {
        const previous = readStoredList('cart').find(item => item.id === itemId);
        input.value = previous ? previous.quantity : 1;
        alert('Ingresa una cantidad entera entre 1 y 1000.');
        return;
    }
    
    // Get cart from localStorage
    const cart = readStoredList('cart');
    
    // Find the item and update quantity
    const itemIndex = cart.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        cart[itemIndex].quantity = newQuantity;
        
        // Update localStorage
        writeStoredList('cart', cart);
        
        // Update item total in UI
        const itemPrice = cart[itemIndex].price;
        const itemTotal = itemPrice * newQuantity;
        
        const itemTotalElement = itemElement.querySelector('.item-total');
        if (itemTotalElement) {
            itemTotalElement.textContent = formatPrice(itemTotal);
        }
        
        // Update cart summary
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        updateCartSummary(subtotal);
        
        // Update cart badge
        updateCartBadge();
    }
}

// Remove item from cart
function removeCartItem(itemId) {
    // Get cart from localStorage
    const cart = readStoredList('cart');
    
    // Find the item and remove it
    const newCart = cart.filter(item => item.id !== itemId);
    
    // Update localStorage
    writeStoredList('cart', newCart);
    
    // Reload cart items
    loadCartItems();
    
    // Update cart badge
    updateCartBadge();
}

// Update cart summary
function updateCartSummary(subtotal) {
    const summarySubtotal = document.querySelector('.summary-row:first-child .summary-value');
    const summaryTotal = document.querySelector('.summary-row.total .summary-value');
    
    if (summarySubtotal) {
        summarySubtotal.textContent = formatPrice(subtotal);
    }
    
    // Calculate shipping cost
    const shippingCost = getShippingCost(subtotal);
    
    // Calculate discount (if any)
    // For demo purposes, we'll assume no discount
    const discount = 0;
    
    // Update total
    if (summaryTotal) {
        const total = subtotal + shippingCost - discount;
        summaryTotal.textContent = formatPrice(total);
    }
}

// Tarifas de envío en COP
let FREE_SHIPPING_FROM = 200000;
let SHIPPING_STANDARD = 20000;
let SHIPPING_EXPRESS = 40000;

// Get shipping cost based on selected option and cart subtotal
function getShippingCost(subtotal) {
    // Envío gratis en pedidos desde $200.000
    if (subtotal >= FREE_SHIPPING_FROM) {
        const freeShippingRadio = document.getElementById('shipping-free');
        if (freeShippingRadio) {
            freeShippingRadio.disabled = false;
            freeShippingRadio.checked = true;
        }
        return 0;
    }
    
    const freeRadio = document.getElementById('shipping-free');
    if (freeRadio) {
        freeRadio.disabled = true;
        if (freeRadio.checked) document.getElementById('shipping-standard').checked = true;
    }
    // Otherwise, use selected shipping option
    const selectedShipping = document.querySelector('input[name="shipping"]:checked');
    
    if (selectedShipping) {
        if (selectedShipping.id === 'shipping-standard') {
            return SHIPPING_STANDARD;
        } else if (selectedShipping.id === 'shipping-express') {
            return SHIPPING_EXPRESS;
        } else if (selectedShipping.id === 'shipping-free') {
            return 0;
        }
    }
    
    // Default to standard shipping
    return SHIPPING_STANDARD;
}

// Update shipping cost when option changes
function updateShippingCost() {
    // Get cart from localStorage
    const cart = readStoredList('cart');
    
    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Update summary with new shipping cost
    updateCartSummary(subtotal);
}
document.addEventListener('DOMContentLoaded', async () => {
    const button = document.querySelector('.checkout-btn');
    if (!button) return;
    button.disabled = true;
    try {
        const {settings} = await api.settings();
        FREE_SHIPPING_FROM = settings.freeFrom; SHIPPING_STANDARD = settings.standard; SHIPPING_EXPRESS = settings.express;
        for (const [id, text] of [['standard', 'Estandar - ' + formatPrice(SHIPPING_STANDARD)], ['express', 'Express - ' + formatPrice(SHIPPING_EXPRESS)], ['free', 'Gratis desde ' + formatPrice(FREE_SHIPPING_FROM)]]) {
            document.querySelector('label[for="shipping-' + id + '"]').textContent = text;
        }
        updateShippingCost(); button.disabled = false;
    } catch (error) { button.textContent = 'Inicia el servidor para comprar'; }
});
