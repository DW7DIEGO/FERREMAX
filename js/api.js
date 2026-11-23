// api.js - Unica capa de comunicacion con el backend (Python hoy, PHP manana).
// El resto del codigo NO debe usar fetch directamente: siempre pasa por estas funciones.

const SESSION_KEY = 'ferremax_session';

function getSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || 'null');
    } catch (e) {
        return null;
    }
}

function saveSession(token, user, remember = true) {
    clearSession();
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({ token, user }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
    const s = getSession();
    return s ? s.user : null;
}

async function apiRequest(path, { method = 'GET', body = null, auth = false } = {}) {
    const cfg = window.FERREMAX_CONFIG;
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const session = getSession();
        if (session && session.token) headers['Authorization'] = 'Bearer ' + session.token;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.API_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(cfg.API_BASE_URL + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
            signal: controller.signal
        });
    } catch (e) {
        const err = new Error('No se pudo conectar con el servidor');
        err.network = true;
        throw err;
    } finally {
        clearTimeout(timer);
    }
    let data = {};
    try { data = await response.json(); } catch (e) { /* respuesta sin cuerpo */ }
    if (!response.ok) {
        if (response.status === 401 && auth) clearSession();
        const err = new Error(data.error || 'Error del servidor');
        err.status = response.status;
        throw err;
    }
    return data;
}

const api = {
    login: (email, password) => apiRequest('/login', { method: 'POST', body: { email, password } }),
    register: (name, email, password) => apiRequest('/register', { method: 'POST', body: { name, email, password } }),
    logout: () => apiRequest('/logout', { method: 'POST', auth: true }),
    me: () => apiRequest('/me', { auth: true }),
    products: () => apiRequest('/products'),
    createOrder: (items, shipping = 'standard', address = '', phone = '', city = '') => apiRequest('/orders', { method: 'POST', body: { items, shipping, address, phone, city }, auth: true }),

    // --- Administración (el servidor exige rol admin en todas) ---
    adminStore: () => apiRequest('/admin/store', {auth: true}),
    saveStore: body => apiRequest('/admin/store', {method: 'PUT', body, auth: true}),
    settings: () => apiRequest('/settings'),
    saveSettings: body => apiRequest('/admin/settings', {method: 'PUT', body, auth: true}),
    renameCategory: (old, name) => apiRequest('/admin/categories', {method: 'PUT', body: {old, name}, auth: true}),
    activity: () => apiRequest('/admin/activity', {auth: true}),
    orderDetail: id => apiRequest('/admin/orders/' + id, {auth: true}),
    preferences: () => apiRequest('/preferences', {auth: true}),
    savePreferences: body => apiRequest('/preferences', {method: 'PUT', body, auth: true}),
    adminStats: () => apiRequest('/admin/stats', { auth: true }),
    adminOrders: () => apiRequest('/admin/orders', { auth: true }),
    adminUpdateOrder: (id, status) => apiRequest('/admin/orders/' + id, { method: 'PUT', body: { status }, auth: true }),
    adminCustomers: () => apiRequest('/admin/customers', { auth: true }),
    createProduct: (product) => apiRequest('/products', { method: 'POST', body: product, auth: true }),
    updateProduct: (id, product) => apiRequest('/products/' + id, { method: 'PUT', body: product, auth: true }),
    deleteProduct: (id) => apiRequest('/products/' + id, { method: 'DELETE', auth: true })
};
