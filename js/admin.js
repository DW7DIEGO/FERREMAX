// admin.js - Admin panel functionality

document.addEventListener('DOMContentLoaded', function() {
    initAdminNavigation();
    initLogout();
    
    // Check admin authentication
    checkAdminAuth();
});

// Initialize admin navigation
function initAdminNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const adminPages = document.querySelectorAll('.admin-page');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPage = this.getAttribute('data-page');
            
            // Update active navigation item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show target page, hide others
            adminPages.forEach(page => {
                if (page.id === `${targetPage}-page`) {
                    page.style.display = 'block';
                } else {
                    page.style.display = 'none';
                }
            });
        });
    });
}

// Initialize logout functionality
function initLogout() {
    const logoutBtn = document.getElementById('admin-logout');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (confirm('¿Seguro que deseas cerrar sesión?')) {
                // Remove user from localStorage
                localStorage.removeItem('currentUser');
                
                // Redirect to login page
                window.location.href = 'login.html';
            }
        });
    }
}

// Check if user is admin
function checkAdminAuth() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
        // Not logged in, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    const user = JSON.parse(currentUser);
    
    if (!user.isAdmin) {
        // Not an admin, redirect to home
        window.location.href = 'index.html';
        alert('No tienes permisos para acceder al panel de administración');
    }
}

// Initialize product management
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the products page in admin
    if (document.getElementById('products-page')) {
        initProductsTable();
    }
});

// Initialize products table
function initProductsTable() {
    // In a real application, this would fetch products from a database
    // For this demo, we'll use sample data and mock functionality
    
    // Add event listeners for table actions
    const editButtons = document.querySelectorAll('.data-table .fa-edit');
    const deleteButtons = document.querySelectorAll('.data-table .fa-trash-alt');
    
    // Edit product
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const productId = row.querySelector('td:nth-child(2)').textContent;
            
            alert(`Editando producto #${productId} - Esta funcionalidad se implementaría en un sitio web real.`);
        });
    });
    
    // Delete product
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const productId = row.querySelector('td:nth-child(2)').textContent;
            
            if (confirm(`¿Estás seguro de que deseas eliminar el producto #${productId}?`)) {
                alert('Producto eliminado - Esta funcionalidad se implementaría en un sitio web real.');
                
                // For demo purposes, just hide the row
                row.style.display = 'none';
            }
        });
    });
    
    // Add new product button
    const addNewBtn = document.querySelector('.add-new');
    if (addNewBtn) {
        addNewBtn.addEventListener('click', function() {
            alert('Agregando nuevo producto - Esta funcionalidad se implementaría en un sitio web real.');
        });
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the dashboard page
    if (document.getElementById('dashboard-page')) {
        // In a real app, this would fetch real-time data and update charts
        // For this demo, we'll just display static content
    }
});