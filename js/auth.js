// auth.js - Autenticacion del frontend (usa api.js; la sesion real vive en el servidor)

document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.auth-tabs')) {
        initAuthTabs();
        initLoginForm();
        initRegisterForm();
        document.querySelector('.forgot-password')?.addEventListener('click', e => {
            e.preventDefault();
            alert('Para recuperar el acceso, solicita al administrador el restablecimiento de tu contrase?a.');
        });
    }
});

// common.js avisa cuando el header ya existe (antes el icono de usuario nunca se actualizaba)
document.addEventListener('ferremax:header-ready', checkAuthStatus);

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.color = 'red';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
}

// Antes se llamaba toggleLoading y chocaba con otra funcion del mismo nombre en common.js
function setFormLoading(isLoading, form) {
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;
    submitButton.disabled = isLoading;
    submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
    submitButton.textContent = isLoading ? 'Cargando...' : submitButton.dataset.originalText;
}

function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const target = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            forms.forEach(form => {
                form.classList.toggle('active', form.id === `${target}-form`);
            });
        });
    });
}

function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('register-error');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        errorMessage.style.display = 'none';

        if (!name || !email || !password || !confirmPassword) {
            return showError(errorMessage, 'Por favor completa todos los campos');
        }
        if (password.length < 8) {
            return showError(errorMessage, 'La contraseña debe tener al menos 8 caracteres');
        }
        if (password !== confirmPassword) {
            return showError(errorMessage, 'Las contraseñas no coinciden');
        }

        setFormLoading(true, registerForm);
        try {
            await api.register(name, email, password);
            alert('¡Registro exitoso! Ya puedes iniciar sesión.');
            document.querySelector('.auth-tab[data-tab="login"]').click();
            registerForm.reset();
        } catch (error) {
            showError(errorMessage, error.network
                ? 'La API no está encendida. Ejecuta iniciar.bat (o "python server/app.py") y vuelve a intentarlo.'
                : error.message);
        } finally {
            setFormLoading(false, registerForm);
        }
    });
}

function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('login-error');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        errorMessage.style.display = 'none';
        if (!email || !password) {
            return showError(errorMessage, 'Ingresa tu email y contraseña.');
        }

        setFormLoading(true, loginForm);
        try {
            const data = await api.login(email, password);
            saveSession(data.token, data.user, document.getElementById('remember-me').checked);
            await syncAccountPreferences(true);
            window.location.href = data.user.isAdmin ? 'admin.html' : 'home.html';
        } catch (error) {
            setFormLoading(false, loginForm);
            showError(errorMessage, error.network
                ? 'La API no está encendida. Ejecuta iniciar.bat (o "python server/app.py") y vuelve a intentarlo.'
                : error.message);
        }
    });
}

async function logout() {
    try { await preferenceSave; } catch (error) { /* Conserva copia local. */ }
    try { await api.logout(); } catch (e) { /* si el servidor no responde igual cerramos localmente */ }
    clearSession();
    window.location.href = 'login.html';
}

function redirectToLogin(e) {
    e.preventDefault();
    window.location.href = 'login.html';
}

function checkAuthStatus() {
    const user = getCurrentUser();
    const userIcon = document.getElementById('user-icon');
    const currentPage = window.location.pathname.split('/').pop();

    if (userIcon) {
        // Se reemplaza el nodo para no acumular listeners repetidos
        const fresh = userIcon.cloneNode(false);
        fresh.innerHTML = `<i class="fas ${user ? 'fa-user-check' : 'fa-user'}"></i>`;
        fresh.title = user ? `Cerrar sesión (${user.name})` : 'Iniciar sesión';
        fresh.addEventListener('click', user
            ? function (e) { e.preventDefault(); logout(); }
            : redirectToLogin);
        userIcon.replaceWith(fresh);
    }

    if (user && currentPage === 'login.html') {
        window.location.href = user.isAdmin ? 'admin.html' : 'home.html';
    }
}
