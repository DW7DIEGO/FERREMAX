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
            <a href="index.html" class="logo">
                <img src="img/ferremax-logo.png" alt="FerreMax Logo">

            </a>
            
            <button class="mobile-menu-btn" id="mobile-menu-btn">
                <i class="fas fa-bars"></i>
            </button>
            
            <nav>
                <ul class="nav-menu" id="nav-menu">
                    <li><a href="index.html" class="nav-link">Inicio</a></li>
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

    // Set active nav link based on current page
    setActiveNavLink();

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
        } else if (currentPage === '' && linkPage === 'index.html') {
            link.classList.add('active');
        }
    });
}

// Update cart badge with current number of items
function updateCartBadge() {
    const badge = document.querySelector('#cart-icon .badge');
    if (!badge) return;
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    badge.textContent = itemCount;
}

// Format price with currency symbol
function formatPrice(price) {
    return '$' + price.toFixed(2);
}

// Get URL parameters
function getUrlParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');
    
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    
    return params;
}

// Show/hide loading spinner
function toggleLoading(show, element = document.body) {
    const loadingId = 'loading-spinner';
    let spinner = document.getElementById(loadingId);
    
    if (show) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = loadingId;
            spinner.className = 'spinner';
            element.appendChild(spinner);
        }
    } else if (spinner) {
        spinner.remove();
    }
}