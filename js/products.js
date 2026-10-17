// products.js - Products related functionality

// Sample products data (in a real app, this would come from a server/database)
const products = [
    {
        id: 1,
        name: 'Taladro Percutor Inalámbrico 20V Bosch',
        code: 'BSCH-20V-TLD',
        category: 'herramientas',
        subcategory: 'herramientas eléctricas',
        brand: 'Bosch',
        price: 199.99,
        oldPrice: 249.99,
        rating: 4.5,
        reviewCount: 24,
        inStock: 3,
        isNew: false,
        isOnSale: true,
        image: 'img/taladro.jpg',
        images: [
            'img/taladro.jpg',
            'img/taladro.jpg',
            'img/taladro.jpg',
            'img/taladro.jpg'
        ],
        shortDescription: 'Taladro percutor inalámbrico con batería de litio de 20V, 2 velocidades, 13mm de capacidad de portabroca.',
        description: `El taladro percutor inalámbrico Bosch de 20V es una herramienta profesional diseñada para ofrecer un rendimiento excepcional en todo tipo de trabajos de perforación y atornillado. Con su potente motor sin escobillas, proporciona más potencia y mayor duración de la batería.

        Características principales:
        - Motor sin escobillas para mayor eficiencia y durabilidad
        - 2 velocidades variables para mayor control
        - 20 posiciones de par + taladro + percutor
        - Luz LED para trabajar en áreas con poca iluminación
        - Batería de litio de 20V con indicador de carga
        - Mango ergonómico con revestimiento antideslizante`
    },
    {
        id: 2,
        name: 'Juego de Destornilladores 42 pzs Stanley',
        code: 'STNL-42-DST',
        category: 'herramientas',
        subcategory: 'herramientas manuales',
        brand: 'Stanley',
        price: 45.99,
        oldPrice: null,
        rating: 4.2,
        reviewCount: 18,
        inStock: 28,
        isNew: true,
        isOnSale: false,
        image: 'img/alicates.jpg',
        images: [
            'img/alicates.jpg',
            'img/alicates.jpg',
            'img/alicates.jpg'
        ],
        shortDescription: 'Juego de 42 destornilladores de precisión con puntas intercambiables y mango ergonómico.',
        description: 'Juego completo de destornilladores Stanley con 42 piezas para todo tipo de trabajos. Incluye puntas Phillips, planas, Torx, hexagonales y más.'
    },
    {
        id: 3,
        name: 'Sierra Circular 7-1/4" DeWalt 1800W',
        code: 'DWLT-7-CIRC',
        category: 'herramientas',
        subcategory: 'herramientas eléctricas',
        brand: 'DeWalt',
        price: 159.99,
        oldPrice: 179.99,
        rating: 4.8,
        reviewCount: 32,
        inStock: 15,
        isNew: false,
        isOnSale: true,
        image: 'img/sierra electrica.jpg',
        images: [
            'img/sierra electrica.jpg',
            'img/sierra electrica.jpg'
        ],
        shortDescription: 'Sierra circular potente de 1800W con disco de 7-1/4" y guía láser para cortes precisos.',
        description: 'Sierra circular DeWalt con potente motor de 1800W. Ideal para trabajos profesionales de carpintería y construcción.'
    },
    {
        id: 4,
        name: 'Escalera Multiposición Aluminio 12 Pasos',
        code: 'TRUP-12-ESC',
        category: 'construccion',
        subcategory: 'escaleras',
        brand: 'Truper',
        price: 129.99,
        oldPrice: null,
        rating: 4.3,
        reviewCount: 14,
        inStock: 10,
        isNew: false,
        isOnSale: false,
        image: 'img/escalera.jpg',
        images: [
            'img/escalera.jpg',
            'img/escalera.jpg'
        ],
        shortDescription: 'Escalera multiposición de aluminio con 12 pasos y bloqueo de seguridad.',
        description: 'Escalera versátil que se puede configurar en múltiples posiciones: recta, en A, o escalonada. Fabricada en aluminio ligero y resistente.'
    },
    {
        id: 5,
        name: 'Set de Brocas para Metal 15 pzs Makita',
        code: 'MKIT-15-BRC',
        category: 'herramientas',
        subcategory: 'accesorios',
        brand: 'Makita',
        price: 24.99,
        oldPrice: 29.99,
        rating: 4.0,
        reviewCount: 22,
        inStock: 42,
        isNew: false,
        isOnSale: true,
        image: 'img/Tipos-de-brocas.jpg',
        images: [
            'img/Tipos-de-brocas.jpg',
            'img/Tipos-de-brocas.jpg'
        ],
        shortDescription: 'Set de 15 brocas para metal HSS-R de alta resistencia al desgaste.',
        description: 'Juego profesional de brocas Makita para taladrado preciso en metal. Incluye estuche organizador y brocas de diferentes diámetros.'
    },
    {
        id: 6,
        name: 'Lámpara LED de Trabajo Recargable 20W',
        code: 'ILUM-20-LED',
        category: 'iluminacion',
        subcategory: 'lámparas de trabajo',
        brand: 'WorkLight',
        price: 35.99,
        oldPrice: null,
        rating: 4.5,
        reviewCount: 19,
        inStock: 0,
        isNew: true,
        isOnSale: false,
        image: 'img/FOCOS LED.jpg',
        images: [
            'img/FOCOS LED.jpg',
            'img/FOCOS LED.jpg'
        ],
        shortDescription: 'Lámpara LED de trabajo con batería recargable y soporte ajustable.',
        description: 'Lámpara LED potente con 20W de potencia. Incluye batería recargable con hasta 8 horas de autonomía y soporte ajustable para diferentes ángulos.'
    },
    {
        id: 7,
        name: 'Juego de Llaves Combinadas Stanley - 12 pzs',
        code: 'STNL-12-CW',
        category: 'herramientas',
        subcategory: 'herramientas manuales',
        brand: 'Stanley',
        price: 45.99,
        oldPrice: 52.99,
        rating: 4.7,
        reviewCount: 26,
        inStock: 18,
        isNew: false,
        isOnSale: true,
        image: 'img/juego de llaves.jpg',
        images: [
            'img/juego de llaves.jpg',
            'img/juego de llaves.jpg'
        ],
        shortDescription: 'Juego de 12 llaves combinadas Stanley en acero cromo vanadio.',
        description: 'Set de llaves combinadas fabricadas en acero cromo vanadio para mayor durabilidad. Acabado cromado que previene la corrosión.'
    },
    {
        id: 8,
        name: 'Motosierra a Gasolina 18" Husqvarna',
        code: 'HSQV-18-MS',
        category: 'jardin',
        subcategory: 'herramientas de jardín',
        brand: 'Husqvarna',
        price: 299.99,
        oldPrice: 349.99,
        rating: 4.9,
        reviewCount: 48,
        inStock: 5,
        isNew: false,
        isOnSale: true,
        image: 'img/motosierra.jpg',
        images: [
            'img/motosierra.jpg',
            'img/motosierra.jpg'
        ],
        shortDescription: 'Motosierra potente con motor de 50cc y barra de 18 pulgadas.',
        description: 'Motosierra Husqvarna profesional con potente motor de 2 tiempos. Sistema anti-vibración y freno de cadena para mayor seguridad.'
    }
];

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the products page
    if (document.getElementById('products-grid')) {
        initProductsPage();
    }
    
    // Check if we're on the product detail page
    if (document.getElementById('product-main-image')) {
        initProductDetailPage();
    }
    
    // Check if we're on the home page with featured products
    if (document.getElementById('featured-products')) {
        loadFeaturedProducts();
    }
    
    // Check if we're on a page with related products
    if (document.getElementById('related-products')) {
        loadRelatedProducts();
    }
});

// Initialize products page functionality
function initProductsPage() {
    // Get URL parameters for any filtering
    const params = getUrlParams();
    const categoryFilter = params.category || 'all';
    
    // Update page title based on category
    const productsTitle = document.getElementById('products-title');
    if (productsTitle && categoryFilter !== 'all') {
        productsTitle.textContent = `Productos - ${capitalizeFirstLetter(categoryFilter)}`;
    }
    
    // Set active category in sidebar
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        if (itemCategory === categoryFilter) {
            item.classList.add('active');
        } else if (categoryFilter === 'all' && itemCategory === 'all') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
        
        // Add click event to filter by category
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const category = this.getAttribute('data-category');
            window.location.href = `products.html${category !== 'all' ? `?category=${category}` : ''}`;
        });
    });
    
    // Initialize price range slider
    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = `$${this.value}`;
        });
    }
    
    // Initialize grid/list view toggle
    const gridViewBtn = document.getElementById('grid-view');
    const listViewBtn = document.getElementById('list-view');
    const productsGrid = document.getElementById('products-grid');
    
    if (gridViewBtn && listViewBtn && productsGrid) {
        gridViewBtn.addEventListener('click', function() {
            productsGrid.classList.remove('list-view');
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            localStorage.setItem('productsView', 'grid');
        });
        
        listViewBtn.addEventListener('click', function() {
            productsGrid.classList.add('list-view');
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            localStorage.setItem('productsView', 'list');
        });
        
        // Check saved view preference
        const savedView = localStorage.getItem('productsView');
        if (savedView === 'list') {
            productsGrid.classList.add('list-view');
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        }
    }
    
    // Initialize sort functionality
    const sortBy = document.getElementById('sort-by');
    if (sortBy) {
        sortBy.addEventListener('change', function() {
            loadProducts(categoryFilter, this.value);
        });
    }
    
    // Filter buttons
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            // Get selected filters
            const selectedBrands = getSelectedCheckboxValues('brand');
            const maxPrice = document.getElementById('price-range').value;
            
            // Apply filters
            loadProducts(categoryFilter, sortBy.value, selectedBrands, maxPrice);
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Reset all filters
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            if (priceRange) {
                priceRange.value = priceRange.max;
                priceValue.textContent = `$${priceRange.max}`;
            }
            
            // Reset to default view
            loadProducts(categoryFilter, 'relevance');
        });
    }
    
    // Load products with initial filters
    loadProducts(categoryFilter, 'relevance');
}

// Initialize product detail page functionality
function initProductDetailPage() {
    // Get product ID from URL
    const params = getUrlParams();
    const productId = parseInt(params.id) || 1; // Default to first product if no ID
    
    // Find the product in our data
    const product = products.find(p => p.id === productId) || products[0];
    
    // Update product details in the page
    document.title = `${product.name} - FerreMax`;
    
    // Update breadcrumb
    const breadcrumbName = document.getElementById('product-breadcrumb-name');
    if (breadcrumbName) {
        breadcrumbName.textContent = product.name;
    }
    
    // Update product image
    const mainImage = document.getElementById('product-main-image');
    if (mainImage) {
        mainImage.src = product.images[0] || product.image;
        mainImage.alt = product.name;
    }
    
    // Update thumbnails
    const thumbnails = document.querySelectorAll('.thumbnail');
    if (thumbnails.length > 0 && product.images.length > 0) {
        thumbnails.forEach((thumb, index) => {
            if (index < product.images.length) {
                const img = thumb.querySelector('img');
                if (img) {
                    img.src = product.images[index].replace('500x500', '100x100');
                    img.alt = `${product.name} ${index + 1}`;
                }
                thumb.setAttribute('data-src', product.images[index]);
                
                // Add click event to change main image
                thumb.addEventListener('click', function() {
                    const src = this.getAttribute('data-src');
                    mainImage.src = src;
                    
                    // Update active thumbnail
                    thumbnails.forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                });
            }
        });
    }
    
    // Update product info
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-code').textContent = product.code;
    document.getElementById('product-price').textContent = formatPrice(product.price);
    
    if (product.oldPrice) {
        document.getElementById('product-old-price').textContent = formatPrice(product.oldPrice);
        document.getElementById('product-old-price').style.display = 'inline';
    } else {
        document.getElementById('product-old-price').style.display = 'none';
        document.querySelector('.discount-badge').style.display = 'none';
    }
    
    document.getElementById('product-short-desc').textContent = product.shortDescription;
    document.getElementById('product-description').textContent = product.description;
    
    // Initialize quantity controls
    const quantityInput = document.getElementById('product-quantity');
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');
    
    decreaseBtn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        const currentValue = parseInt(quantityInput.value);
        quantityInput.value = currentValue + 1;
    });
    
    // Initialize add to cart button
    const addToCartBtn = document.getElementById('add-to-cart');
    addToCartBtn.addEventListener('click', function() {
        const quantity = parseInt(quantityInput.value);
        addToCart(product, quantity);
        
        // Show confirmation message
        alert(`${quantity} x ${product.name} añadido al carrito`);
        
        // Update cart badge
        updateCartBadge();
    });
    
    // Initialize tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show the corresponding tab pane
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === tabId) {
                    pane.classList.add('active');
                }
            });
        });
    });
}

// Load products with filters
function loadProducts(category = 'all', sort = 'relevance', brands = [], maxPrice = 1000) {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    // Filter products by category
    let filteredProducts = products;
    
    if (category !== 'all') {
        filteredProducts = products.filter(product => product.category === category);
    }
    
    // Apply brand filter if any brands selected
    if (brands.length > 0) {
        filteredProducts = filteredProducts.filter(product => brands.includes(product.brand.toLowerCase()));
    }
    
    // Apply price filter
    filteredProducts = filteredProducts.filter(product => product.price <= maxPrice);
    
    // Sort products
    switch (sort) {
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name-asc':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
            break;
        default:
            // Default sorting (by relevance or featured)
            break;
    }
    
    // Clear current products
    productsGrid.innerHTML = '';
    
    // Check if we have products
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-products">
                <p>No se encontraron productos que coincidan con los filtros seleccionados.</p>
                <button id="reset-filters" class="btn btn-primary">Limpiar filtros</button>
            </div>
        `;
        
        document.getElementById('reset-filters').addEventListener('click', function() {
            document.getElementById('clear-filters').click();
        });
        
        return;
    }
    
    // Add products to grid
    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

// Create a product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const badgesHtml = `
        <div class="product-badges">
            ${product.isNew ? '<span class="product-badge new">Nuevo</span>' : ''}
            ${product.isOnSale ? '<span class="product-badge sale">Oferta</span>' : ''}
            ${product.inStock === 0 ? '<span class="product-badge out-of-stock">Agotado</span>' : ''}
        </div>
    `;
    
    const ratingHtml = createRatingStars(product.rating);
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}">
            ${badgesHtml}
        </div>
        <div class="product-info">
            <div class="product-category">${product.category}</div>
            <h3 class="product-title">
                <a href="product-detail.html?id=${product.id}">${product.name}</a>
            </h3>
            <div class="product-price">
                ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ''}
                <span class="current-price">${formatPrice(product.price)}</span>
            </div>
            <div class="product-rating">
                ${ratingHtml}
                <span>(${product.reviewCount})</span>
            </div>
            <p class="product-description" style="display: none;">${product.shortDescription}</p>
            <div class="product-actions">
                <button class="btn btn-primary add-to-cart" data-id="${product.id}" ${product.inStock === 0 ? 'disabled' : ''}>
                    ${product.inStock === 0 ? 'Agotado' : '<i class="fas fa-cart-plus"></i> Añadir'}
                </button>
                <button class="btn-icon add-to-wishlist" data-id="${product.id}">
                    <i class="far fa-heart"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add event listener to add to cart button
    const addToCartBtn = card.querySelector('.add-to-cart');
    if (addToCartBtn && product.inStock > 0) {
        addToCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addToCart(product, 1);
            
            // Show confirmation
            alert(`${product.name} añadido al carrito`);
            
            // Update cart badge
            updateCartBadge();
        });
    }
    
    return card;
}

// Create rating stars HTML
function createRatingStars(rating) {
    let starsHtml = '';
    
    // Calculate full stars, half stars, and empty stars
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }
    
    // Add half star if needed
    if (halfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star"></i>';
    }
    
    return starsHtml;
}

// Load featured products for homepage
function loadFeaturedProducts() {
    const featuredContainer = document.getElementById('featured-products');
    if (!featuredContainer) return;
    
    // Get featured products (on sale or new)
    const featuredProducts = products
        .filter(product => product.isOnSale || product.isNew)
        .slice(0, 4); // Limit to 4 products
    
    featuredContainer.innerHTML = '';
    
    featuredProducts.forEach(product => {
        const productCard = createProductCard(product);
        featuredContainer.appendChild(productCard);
    });
}

// Load related products for product detail page
function loadRelatedProducts() {
    const relatedContainer = document.getElementById('related-products');
    if (!relatedContainer) return;
    
    // Get product ID from URL
    const params = getUrlParams();
    const productId = parseInt(params.id) || 1;
    
    // Find the current product
    const currentProduct = products.find(p => p.id === productId) || products[0];
    
    // Get products in the same category but not the current product
    const relatedProducts = products
        .filter(product => product.category === currentProduct.category && product.id !== currentProduct.id)
        .slice(0, 4); // Limit to 4 products
    
    relatedContainer.innerHTML = '';
    
    relatedProducts.forEach(product => {
        const productCard = createProductCard(product);
        relatedContainer.appendChild(productCard);
    });
}

// Add a product to cart
function addToCart(product, quantity = 1) {
    // Get current cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart
    const existingProductIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingProductIndex >= 0) {
        // Update quantity
        cart[existingProductIndex].quantity += quantity;
    } else {
        // Add new product to cart
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }
    
    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Helper functions
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function getSelectedCheckboxValues(name) {
    const checkboxes = document.querySelectorAll(`input[id^="${name}"]`);
    const values = [];
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            values.push(checkbox.value);
        }
    });
    
    return values;
}