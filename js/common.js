// common.js - Contains common JavaScript functionality

// Load header and footer components
document.addEventListener('DOMContentLoaded', function() {
    loadHeader();
    loadFooter();
    handleMobileMenu();
});

// Load header content
function loadHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    header.innerHTML = `
        <div class="header-container container">
            <a href="home.html" class="logo">
                <img src="${imgUrl('img/LOGO.jpeg')}" alt="FerreMax Logo">

            </a>
            
            <button class="mobile-menu-btn" id="mobile-menu-btn">
                <i class="fas fa-bars"></i>
            </button>
            
            <nav>
                <ul class="nav-menu" id="nav-menu">
                    <li><a href="home.html" class="nav-link">Inicio</a></li>
                    <li><a href="products.html" class="nav-link">Productos</a></li>
                </ul>
            </nav>
            
            <div class="header-actions">
                <a href="#" class="header-icon" id="search-icon">
                    <i class="fas fa-search"></i>
                </a>
                <a href="login.html" class="header-icon" id="user-icon">
                    <i class="fas fa-user"></i>
                </a>
                <a href="cart.html" class="header-icon" id="cart-icon">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="badge">0</span>
                </a>
            </div>
        </div>
        
        <div class="search-overlay" id="search-overlay" style="display: none;">
            <div class="container">
                <div class="search-container">
                    <input type="text" placeholder="Buscar productos..." class="search-input">
                    <button class="search-close" id="search-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Update cart badge with items count from localStorage
    updateCartBadge();

    const user = getCurrentUser();
    if (user && user.isAdmin) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="admin.html" class="nav-link">Administraci?n</a>';
        document.getElementById('nav-menu').appendChild(li);
    }

    // Set active nav link based on current page
    setActiveNavLink();

    // Avisar a otros scripts (auth.js) que el header ya existe
    document.dispatchEvent(new CustomEvent('ferremax:header-ready'));

    // Add event listeners for search functionality
    const searchIcon = document.getElementById('search-icon');
    const searchOverlay = document.getElementById('search-overlay');
    const searchClose = document.getElementById('search-close');

    if (searchIcon && searchOverlay && searchClose) {
        searchIcon.addEventListener('click', function(e) {
            e.preventDefault();
            searchOverlay.style.display = 'block';
            document.querySelector('.search-input').focus();
        });

        searchClose.addEventListener('click', function() {
            searchOverlay.style.display = 'none';
        });

        const searchInput = document.querySelector('.search-input');
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                window.location.href = 'products.html?search=' + encodeURIComponent(this.value.trim());
            }
            if (e.key === 'Escape') searchOverlay.style.display = 'none';
        });
    }
}

// Load footer content
function loadFooter() {
    const footer = document.getElementById('footer');
    if (!footer) return;

    footer.innerHTML = `
        <div class="container">
            <div class="footer-content">
                <div class="footer-column">
                    <h3>FerreMax</h3>
                    <ul>
                        <li><a href="#">Sobre Nosotros</a></li>
                        <li><a href="#">Nuestras Tiendas</a></li>
                        <li><a href="#">Blog</a></li>
                        <li><a href="#">Trabaja con Nosotros</a></li>
                    </ul>
                </div>
                
                <div class="footer-column">
                    <h3>Ayuda</h3>
                    <ul>
                        <li><a href="#">Preguntas Frecuentes</a></li>
                        <li><a href="#">Envíos y Entregas</a></li>
                        <li><a href="#">Devoluciones</a></li>
                        <li><a href="#">Garantías</a></li>
                    </ul>
                </div>
                
                <div class="footer-column">
                    <h3>Categorías</h3>
                    <ul>
                        <li><a href="products.html?category=herramientas">Herramientas</a></li>
                        <li><a href="products.html?category=electricidad">Electricidad</a></li>
                        <li><a href="products.html?category=plomeria">Plomería</a></li>
                        <li><a href="products.html?category=jardin">Jardín</a></li>
                    </ul>
                </div>
                
                <div class="footer-subscribe">
                    <h3>Recibe Nuestras Ofertas</h3>
                    <p>Suscríbete para recibir ofertas exclusivas y novedades.</p>
                    <div class="subscribe-form">
                        <input type="email" placeholder="Tu correo electrónico">
                        <button class="btn btn-primary">Suscribirse</button>
                    </div>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p>&copy; 2025 FerreMax. Todos los derechos reservados.</p>
                
                <div class="social-links">
                    <a href="#"><i class="fab fa-facebook-f"></i></a>
                    <a href="#"><i class="fab fa-instagram"></i></a>
                    <a href="#"><i class="fab fa-twitter"></i></a>
                    <a href="#"><i class="fab fa-youtube"></i></a>
                </div>
            </div>
        </div>
    `;
}

// Handle mobile menu toggle
function handleMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Toggle icon between bars and times
            const icon = mobileMenuBtn.querySelector('i');
            if (icon.classList.contains('fa-bars')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Set active navigation link based on current page
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        } else if ((currentPage === '' || currentPage === 'index.html') && linkPage === 'home.html') {
            link.classList.add('active');
        }
    });
}

// Update cart badge with current number of items
function updateCartBadge() {
    const badge = document.querySelector('#cart-icon .badge');
    if (!badge) return;
    
    const cart = readStoredList('cart');
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    badge.textContent = itemCount;
}

// Formato de precio en pesos colombianos (COP): $ 199.000 (sin decimales)
const COP_FORMATTER = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
function formatPrice(price) {
    return COP_FORMATTER.format(Number(price) || 0);
}

// Get URL parameters
function getUrlParams() {
    const params = {};
    new URLSearchParams(window.location.search).forEach((value, key) => { params[key] = value; });
    return params;
}

// Las páginas viven en html/, pero las imágenes (y sus rutas guardadas en la BD) son "img/...".
// imgUrl() las convierte a una ruta válida desde html/. Si ya es absoluta o externa, no la toca.
function imgUrl(path) {
    if (!path) return '';
    return /^(https?:|data:|\/|\.\.\/)/.test(path) ? path : '../' + path;
}

// Escapa texto antes de insertarlo con innerHTML (evita inyeccion de HTML/JS desde datos del catalogo)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
    ));
}

// Tolera datos locales da?ados y descarta cantidades inv?lidas.
function readStoredList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(preferenceKey(key)) || '[]');
        if (!Array.isArray(value)) return [];
        if (key === 'cart') return value.filter(item => item &&
            Number.isSafeInteger(item.id) && item.id > 0 &&
            Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 1000 &&
            Number.isFinite(item.price) && item.price >= 0);
        return value.filter(id => Number.isSafeInteger(id) && id > 0);
    } catch (e) { return []; }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const {categories} = await apiRequest('/categories');
        document.querySelectorAll('.category-item[data-category], a[href*="category="]').forEach(link => {
            const category = link.dataset.category || new URL(link.href, location.href).searchParams.get('category');
            if (category && category !== 'all' && !categories.includes(category)) {
                const card = link.closest('.category-card'); (card || link.closest('li') || link).remove();
            }
        });
        const sidebar = document.querySelector('.category-item[data-category="all"]')?.closest('ul');
        if (sidebar) sidebar.innerHTML = '<li><a class="category-item" href="products.html" data-category="all">Todos los productos</a></li>' + categories.map(c => `<li><a class="category-item" data-category="${escapeHtml(c)}" href="products.html?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a></li>`).join('');
        const title = [...document.querySelectorAll('.footer-column h3')].find(h => h.textContent.startsWith('Categor'));
        if (title) title.nextElementSibling.innerHTML = categories.map(c => `<li><a href="products.html?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a></li>`).join('');
    } catch (error) { /* El catalogo de respaldo permanece disponible sin API. */ }
});

function preferenceKey(key) {
    const user = getCurrentUser();
    return user ? 'ferremax_' + user.id + '_' + key : key;
}
let preferenceSave = Promise.resolve();
function writeStoredList(key, value) {
    localStorage.setItem(preferenceKey(key), JSON.stringify(value));
    if (getSession()) preferenceSave = preferenceSave.catch(() => {}).then(() => api.savePreferences({cart: readStoredList('cart'), wishlist: readStoredList('wishlist')}));
    preferenceSave.catch(() => {
        let note = document.getElementById('preferences-error');
        if (!note) { note = document.createElement('p'); note.id = 'preferences-error'; note.setAttribute('role', 'status'); document.body.append(note); }
        note.textContent = 'Cambios guardados en este navegador. No se pudieron sincronizar con tu cuenta; comprueba la conexion.';
    });
    return preferenceSave;
}
async function syncAccountPreferences(mergeGuest = false) {
    if (!getSession()) return;
    try {
        let {preferences} = await api.preferences();
        if (mergeGuest) {
            preferences = preferences || {cart: readStoredList('cart'), wishlist: readStoredList('wishlist')};
            let guestCart = [], guestWishlist = [];
            try { guestCart = JSON.parse(localStorage.getItem('cart') || '[]'); guestWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch (error) {}
            if (Array.isArray(guestCart)) for (const item of guestCart) {
                if (!item || !Number.isSafeInteger(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) continue;
                const existing = preferences.cart.find(p => p.id === item.id);
                if (existing) existing.quantity = Math.min(1000, existing.quantity + item.quantity);
                else preferences.cart.push({...item, quantity: Math.min(1000, item.quantity)});
            }
            if (Array.isArray(guestWishlist)) preferences.wishlist = [...new Set([...preferences.wishlist, ...guestWishlist.filter(id => Number.isSafeInteger(id) && id > 0)])];
        }
        if (preferences) {
            const {products} = await api.products();
            preferences.cart = (preferences.cart || []).flatMap(item => { const product = products.find(p => p.id === item.id); return product ? [{...product, quantity: item.quantity}] : []; });
            for (const key of ['cart','wishlist']) localStorage.setItem(preferenceKey(key), JSON.stringify(preferences[key] || []));
        } else {
            await api.savePreferences({cart: readStoredList('cart'), wishlist: readStoredList('wishlist')});
        }
        if (mergeGuest) {
            await api.savePreferences({cart: readStoredList('cart'), wishlist: readStoredList('wishlist')});
            localStorage.removeItem('cart'); localStorage.removeItem('wishlist');
        }
        updateCartBadge();
        if (typeof loadCartItems === 'function') loadCartItems();
        if (typeof initWishlist === 'function') {
            const button = document.getElementById('add-to-wishlist');
            const id = Number(new URLSearchParams(location.search).get('id'));
            if (button) updateWishlistButton(button, readStoredList('wishlist').includes(id));
        }
    } catch (error) { /* La copia local por cuenta sigue disponible. */ }
}
document.addEventListener('DOMContentLoaded', () => syncAccountPreferences());
