// js/auth.js - Funcionalidad de Autenticación (Versión Final y Corregida)

document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.auth-tabs')) {
        initAuthTabs();
        initLoginForm();
        initRegisterForm();
    }
    checkAuthStatus();
});

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.color = 'red';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000); 
}

function toggleLoading(isLoading, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = isLoading;
        submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
        submitButton.textContent = isLoading ? 'Cargando...' : submitButton.dataset.originalText;
    }
}

function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const target = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            forms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `${target}-form`) {
                    form.classList.add('active');
                }
            });
        });
    });
}

function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('register-error');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) { 
            e.preventDefault();
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            errorMessage.textContent = ''; 
            errorMessage.style.display = 'none';

            if (!name || !email || !password || !confirmPassword) {
                showError(errorMessage, 'Por favor completa todos los campos');
                return;
            }
            if (password !== confirmPassword) {
                showError(errorMessage, 'Las contraseñas no coinciden');
                return;
            }
            
            toggleLoading(true, registerForm);
            
            try {
                const response = await fetch('http://localhost:8000/api/register', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, email: email, password: password })
                });

                toggleLoading(false, registerForm);
                const data = await response.json();

                if (response.ok) {
                    alert('¡Registro exitoso! Ya puedes iniciar sesión.');
                    document.querySelector('.auth-tab[data-tab="login"]').click(); 
                    registerForm.reset(); 
                } else {
                    showError(errorMessage, data.error || 'Error desconocido al registrar.');
                }
            } catch (error) {
                toggleLoading(false, registerForm);
                console.error('Error de conexión:', error);
                showError(errorMessage, 'No se pudo conectar con el servidor API (localhost:8000). Asegúrate de que está corriendo.');
            }
        });
    }
}

function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('login-error');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            errorMessage.textContent = ''; 
            errorMessage.style.display = 'none';
            
            if (!email || !password) {
                showError(errorMessage, 'Ingresa tu email y contraseña.');
                return;
            }
            
            toggleLoading(true, loginForm);
            
            try {
                const response = await fetch('http://localhost:8000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                });
                
                toggleLoading(false, loginForm);
                const data = await response.json();
                
                if (response.ok && data.user) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    alert(`¡Bienvenido, ${data.user.name}!`);
                    
                    if (data.user.isAdmin) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                    
                } else {
                    showError(errorMessage, data.error || 'Credenciales inválidas.');
                }
            } catch (error) {
                toggleLoading(false, loginForm);
                console.error('Error de conexión:', error);
                showError(errorMessage, 'No se pudo conectar con el servidor API. Revisa la terminal.');
            }
        });
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    alert('Sesión cerrada correctamente.');
    window.location.href = 'login.html'; 
}

function redirectToLogin(e) {
    e.preventDefault();
    window.location.href = 'login.html';
}

function checkAuthStatus() {
    const currentUser = localStorage.getItem('currentUser');
    const userIcon = document.getElementById('user-icon');
    const currentPage = window.location.pathname.split('/').pop();

    if (currentUser) {
        const user = JSON.parse(currentUser);
        if (userIcon) {
            userIcon.innerHTML = `<i class="fas fa-user-check"></i>`;
            userIcon.removeEventListener('click', redirectToLogin); 
            userIcon.addEventListener('click', function(e) { e.preventDefault(); logout(); });
        }
        
        if (currentPage === 'login.html') {
            if (user.isAdmin) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }
        
    } else {
        if (userIcon) {
            userIcon.innerHTML = `<i class="fas fa-user"></i>`;
            userIcon.removeEventListener('click', logout); 
            userIcon.addEventListener('click', redirectToLogin);
        }
        // Lógica para proteger páginas si es necesario
    }
}