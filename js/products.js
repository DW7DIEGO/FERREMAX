// products.js - Products related functionality

// Catalogo local de respaldo: se usa solo si la API no responde.
// Cuando la API funciona, `products` se reemplaza con los datos de la base de datos.
let products = [];
let catalogAvailable = false;

// Filtros extra que vienen de la URL (buscador y ofertas)
const urlFilters = { search: '', promo: false };

// Intenta cargar el catalogo desde la API; si falla, deja el catalogo local
async function syncProductsFromApi() {
    try {
        const data = await api.products();
        if (!Array.isArray(data.products)) throw new Error('Cat?logo inv?lido');
        products = data.products;
        catalogAvailable = true;
    } catch (e) {
        products = [];
        catalogAvailable = false;
        console.warn('No se pudo cargar el cat?logo:', e.message);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const needsProducts = document.getElementById('products-grid') ||
        document.getElementById('product-main-image') ||
        document.getElementById('featured-products') ||
        document.getElementById('related-products');
    if (!needsProducts) return;

    await syncProductsFromApi();
    if (!catalogAvailable) {
        const container = document.getElementById('products-grid') || document.getElementById('featured-products');
        if (container) container.textContent = 'No se pudo cargar el cat?logo. Comprueba la conexi?n y recarga la p?gina.';
        if (document.getElementById('product-main-image')) {
            const button = document.getElementById('add-to-cart');
            if (button) button.disabled = true;
            alert('No se pudo cargar el producto. Comprueba la conexi?n y recarga la p?gina.');
        }
        return;
    }

    if (document.getElementById('products-grid')) {
        initProductsPage();
    }
    if (document.getElementById('product-main-image')) {
        initProductDetailPage();
    }
    if (document.getElementById('featured-products')) {
        loadFeaturedProducts();
    }
    if (document.getElementById('related-products')) {
        loadRelatedProducts();
    }
});

// Initialize products page functionality
function initProductsPage() {
    // Get URL parameters for any filtering
    const params = getUrlParams();
    const categoryFilter = params.category || 'all';
    urlFilters.search = (params.search || '').trim().toLowerCase();
    urlFilters.promo = params.promo === 'true';
    
    // Update page title based on category
    const productsTitle = document.getElementById('products-title');
    if (productsTitle && urlFilters.search) {
        productsTitle.textContent = `Resultados para "${params.search}"`;
    } else if (productsTitle && urlFilters.promo) {
        productsTitle.textContent = 'Ofertas especiales';
    } else if (productsTitle && categoryFilter !== 'all') {
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
            window.location.href = `products.html${category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`;
        });
    });
    
    // Initialize price range slider
    const priceRange = document.getElementById('price-range');
    const priceValue = document.getElementById('price-value');
    
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', function() {
            priceValue.textContent = formatPrice(Number(this.value));
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
            const maxPrice = Number(document.getElementById('price-range').value);
            
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
                priceValue.textContent = formatPrice(Number(priceRange.max));
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
    const product = products.find(p => p.id === productId);
    if (!product) {
        window.location.href = 'products.html';
        return;
    }
    
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
        mainImage.src = imgUrl(product.images[0] || product.image);
        mainImage.alt = product.name;
    }
    
    const gallery = document.querySelector('.product-thumbnails');
    for (const [index, image] of product.images.entries()) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'thumbnail' + (index === 0 ? ' active' : '');
        const photo = new Image();
        photo.src = imgUrl(image);
        photo.alt = product.name + ' · imagen ' + (index + 1);
        button.append(photo);
        button.onclick = () => {
            gallery.querySelector('.active')?.classList.remove('active');
            button.classList.add('active');
            mainImage.src = photo.src;
        };
        gallery.append(button);
    }
    const categoryLink = document.getElementById('product-category-link');
    categoryLink.textContent = product.category;
    categoryLink.href = 'products.html?category=' + encodeURIComponent(product.category);
    const availability = document.querySelector('.product-availability');
    availability.textContent = product.inStock === 0 ? 'Agotado' : (product.inStock <= 5 ? 'Stock bajo' : 'En stock') + ' · ' + product.inStock;
    availability.classList.add(product.inStock === 0 ? 'danger' : product.inStock <= 5 ? 'warning' : 'success');
    const summary = product.reviewCount ? product.rating + ' / 5 · ' + product.reviewCount + ' valoraciones' : 'Sin valoraciones';
    document.querySelector('.product-meta .product-rating').textContent = summary;
    document.getElementById('review-summary').textContent = summary;
    const specs = [['Código', product.code], ['Marca', product.brand], ['Categoría', product.category], ['Subcategoría', product.subcategory]];
    document.getElementById('spec-rows').innerHTML = specs.filter(([,value]) => value).map(([label,value]) =>
        `<tr><th scope="row">${label}</th><td>${escapeHtml(value)}</td></tr>`).join('');

    // Update product info
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-code').textContent = product.code;
    document.getElementById('product-price').textContent = formatPrice(product.price);
    
    if (product.oldPrice) {
        document.getElementById('product-old-price').textContent = formatPrice(product.oldPrice);
        document.getElementById('product-old-price').style.display = 'inline';
        const badge = document.querySelector('.discount-badge');
        if (badge) badge.textContent = `-${Math.round((1 - product.price / product.oldPrice) * 100)}%`;
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
        quantityInput.value = Math.min(product.inStock, currentValue + 1);
    });
    
    // Initialize add to cart button
    const addToCartBtn = document.getElementById('add-to-cart');
    addToCartBtn.disabled = product.inStock <= 0;
    quantityInput.min = '1';
    quantityInput.max = String(product.inStock);
    addToCartBtn.addEventListener('click', function() {
        const quantity = parseInt(quantityInput.value);
        if (!addToCart(product, quantity)) return;
        
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
function loadProducts(category = 'all', sort = 'relevance', brands = [], maxPrice = Infinity) {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    
    // Filter products by category
    let filteredProducts = [...products];
    
    if (category !== 'all') {
        filteredProducts = products.filter(product => product.category === category);
    }
    
    // Filtros que vienen de la URL
    if (urlFilters.search) {
        filteredProducts = filteredProducts.filter(product =>
            `${product.name} ${product.brand || ''} ${product.shortDescription || ''}`.toLowerCase().includes(urlFilters.search));
    }
    if (urlFilters.promo) {
        filteredProducts = filteredProducts.filter(product => product.isOnSale);
    }

    // Apply brand filter if any brands selected
    if (brands.length > 0) {
        filteredProducts = filteredProducts.filter(product => brands.includes((product.brand || '').toLowerCase()));
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
            <img src="${escapeHtml(imgUrl(product.image))}" alt="${escapeHtml(product.name)}">
            ${badgesHtml}
        </div>
        <div class="product-info">
            <div class="product-category">${escapeHtml(product.category)}</div>
            <h3 class="product-title">
                <a href="product-detail.html?id=${Number(product.id)}">${escapeHtml(product.name)}</a>
            </h3>
            <div class="product-price">
                ${product.oldPrice ? `<span class="old-price">${formatPrice(product.oldPrice)}</span>` : ''}
                <span class="current-price">${formatPrice(product.price)}</span>
            </div>
            <div class="product-rating">
                ${ratingHtml}
                <span>(${product.reviewCount})</span>
            </div>
            <p class="product-description" style="display: none;">${escapeHtml(product.shortDescription)}</p>
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
            if (!addToCart(product, 1)) return;
            
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
    const currentProduct = products.find(p => p.id === productId);
    if (!currentProduct) return;
    
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
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
        alert('Ingresa una cantidad entera entre 1 y 1000.');
        return false;
    }
    // Get current cart from localStorage
    const cart = readStoredList('cart');
    
    // Check if product already in cart
    const existingProductIndex = cart.findIndex(item => item.id === product.id);
    
    const totalQuantity = quantity + (existingProductIndex >= 0 ? cart[existingProductIndex].quantity : 0);
    if (totalQuantity > product.inStock || totalQuantity > 1000) {
        alert('La cantidad supera las unidades disponibles.');
        return false;
    }
    if (existingProductIndex >= 0) {
        // Update quantity
        cart[existingProductIndex].quantity += quantity;
    } else {
        // Add new product to cart
        cart.push({
            id: product.id,
            name: product.name,
            code: product.code,
            price: product.price,
            image: product.image,
            quantity: quantity
        });
    }
    
    // Save cart to localStorage
    writeStoredList('cart', cart);
    return true;
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