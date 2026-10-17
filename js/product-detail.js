// product-detail.js - Product detail page specific functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize thumbnail gallery
    initProductGallery();
    
    // Initialize wishlist functionality
    initWishlist();
});

// Initialize product gallery
function initProductGallery() {
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImage = document.getElementById('product-main-image');
    
    if (!thumbnails.length || !mainImage) return;
    
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Remove active class from all thumbnails
            thumbnails.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Update main image
            const imageSrc = this.getAttribute('data-src');
            mainImage.src = imageSrc;
            
            // Optional: Add a fade effect
            mainImage.classList.add('fade');
            setTimeout(() => {
                mainImage.classList.remove('fade');
            }, 300);
        });
    });
    
    // Optional: Add zoom effect on hover
    if (mainImage) {
        const imageContainer = mainImage.parentElement;
        
        imageContainer.addEventListener('mousemove', function(e) {
            // Only apply zoom on larger screens
            if (window.innerWidth < 992) return;
            
            const { left, top, width, height } = this.getBoundingClientRect();
            const x = (e.clientX - left) / width;
            const y = (e.clientY - top) / height;
            
            mainImage.style.transformOrigin = `${x * 100}% ${y * 100}%`;
            mainImage.style.transform = 'scale(1.5)';
        });
        
        imageContainer.addEventListener('mouseleave', function() {
            mainImage.style.transform = 'scale(1)';
        });
    }
}

// Initialize wishlist functionality
function initWishlist() {
    const wishlistBtn = document.getElementById('add-to-wishlist');
    
    if (!wishlistBtn) return;
    
    // Get product ID from URL
    const params = getUrlParams();
    const productId = parseInt(params.id) || 1;
    
    // Check if product is already in wishlist
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    const isInWishlist = wishlist.includes(productId);
    
    // Update button appearance
    updateWishlistButton(wishlistBtn, isInWishlist);
    
    // Add click event
    wishlistBtn.addEventListener('click', function() {
        const newWishlist = toggleWishlistItem(productId);
        const isNowInWishlist = newWishlist.includes(productId);
        
        // Update button appearance
        updateWishlistButton(wishlistBtn, isNowInWishlist);
        
        // Show confirmation
        if (isNowInWishlist) {
            alert('Producto añadido a la lista de deseos');
        } else {
            alert('Producto eliminado de la lista de deseos');
        }
    });
}

// Toggle a product in the wishlist
function toggleWishlistItem(productId) {
    // Get current wishlist
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    // Check if product is already in wishlist
    const index = wishlist.indexOf(productId);
    
    if (index >= 0) {
        // Remove from wishlist
        wishlist.splice(index, 1);
    } else {
        // Add to wishlist
        wishlist.push(productId);
    }
    
    // Save updated wishlist
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    return wishlist;
}

// Update wishlist button appearance
function updateWishlistButton(button, isInWishlist) {
    const icon = button.querySelector('i');
    
    if (isInWishlist) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        button.title = 'Quitar de la lista de deseos';
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        button.title = 'Añadir a la lista de deseos';
    }
}