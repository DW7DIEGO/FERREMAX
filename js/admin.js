// admin.js - Panel de administración (todos los datos vienen de la API / base de datos)

const adminState = { products: [], editingId: null };
const ORDER_TRANSITIONS = {pendiente: ['pagado','cancelado'], pagado: ['enviado','cancelado'], enviado: ['entregado','cancelado'], entregado: ['cancelado'], cancelado: []};
const ORDER_STATUSES = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];

document.addEventListener('DOMContentLoaded', async function () {
    initAdminNavigation();
    initLogout();
    const allowed = await checkAdminAuth();
    if (!allowed) return;
    initProductsPage();
    initManagement();
    loadDashboard();
    loadProductsTable();
});

// ---------------------------------------------------------------------------
// Sesión y permisos
// ---------------------------------------------------------------------------
// El panel queda oculto hasta que el SERVIDOR confirme que la sesión es de un administrador.
// (Mirar solo localStorage no sirve: cualquiera puede editarlo desde la consola.)
async function checkAdminAuth() {
    document.documentElement.style.visibility = 'hidden';
    if (!getSession()) {
        window.location.replace('login.html');
        return false;
    }
    try {
        const data = await api.me();
        if (!data.user.isAdmin) {
            alert('No tienes permisos para acceder al panel de administración');
            window.location.replace('home.html');
            return false;
        }
        const nameEl = document.getElementById('admin-user-name');
        if (nameEl) nameEl.textContent = data.user.name;
        document.documentElement.style.visibility = 'visible';
        return true;
    } catch (error) {
        if (error.network) {
            document.documentElement.style.visibility = 'visible';
            document.body.innerHTML = '<div style="max-width:560px;margin:4rem auto;font-family:sans-serif">' +
                '<h2>No se pudo conectar con la API</h2>' +
                '<p>Inicia el servidor (<code>python server/app.py</code> o el archivo <code>iniciar.bat</code>) y recarga la página.</p></div>';
        } else {
            clearSession();
            window.location.replace('login.html');
        }
        return false;
    }
}

function initLogout() {
    const logoutBtn = document.getElementById('admin-logout');
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('¿Seguro que deseas cerrar sesión?')) logout(); // logout() está en auth.js
    });
}

// ---------------------------------------------------------------------------
// Navegación
// ---------------------------------------------------------------------------
function initAdminNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const adminPages = document.querySelectorAll('.admin-page');
    const loaders = { dashboard: loadDashboard, products: loadProductsTable, orders: loadOrders, customers: loadCustomers, categories: loadCategories, promotions: loadPromotions, settings: loadSettings };

    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const target = this.getAttribute('data-page');
            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');

            let pageId = `${target}-page`;
            if (!document.getElementById(pageId)) pageId = 'soon-page';
            adminPages.forEach(page => { page.style.display = page.id === pageId ? 'block' : 'none'; });
            if (loaders[target]) loaders[target]();
        });
    });
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function showAdminError(error) {
    if (error.status === 401 || error.status === 403) {
        clearSession();
        window.location.replace('login.html');
        return;
    }
    alert(error.network ? 'No se pudo conectar con la API.' : error.message);
}

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T') + 'Z');
    return isNaN(d) ? value : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function statusClass(status) {
    return { pendiente: 'warning', pagado: 'success', enviado: 'success', entregado: 'success', cancelado: 'danger' }[status] || '';
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
async function loadDashboard() {
    try {
        const { stats } = await api.adminStats();
        document.getElementById('stat-sales').textContent = formatPrice(stats.sales);
        document.getElementById('stat-sales-note').textContent = 'Pedidos pagados, enviados y entregados';
        document.getElementById('stat-orders').textContent = stats.orders;
        document.getElementById('stat-orders-note').textContent = `${stats.pendingOrders} pendientes`;
        document.getElementById('stat-customers').textContent = stats.customers;
        document.getElementById('stat-customers-note').textContent = 'Usuarios con rol cliente';
        document.getElementById('stat-products').textContent = stats.products;
        document.getElementById('stat-products-note').textContent = `${stats.lowStock} con poco stock`;

        const list = document.getElementById('recent-orders');
        if (!stats.recentOrders.length) {
            list.innerHTML = '<p class="empty-note">Todavía no hay pedidos.</p>';
            return;
        }
        list.innerHTML = stats.recentOrders.map(o => `
            <div class="activity-item">
                <div class="activity-icon order"><i class="fas fa-shopping-bag"></i></div>
                <div class="activity-details">
                    <p class="activity-title">Pedido #${Number(o.id)} · ${escapeHtml(o.status)}</p>
                    <p class="activity-desc">${escapeHtml(o.customer)} — ${formatPrice(o.total)}</p>
                    <p class="activity-time">${escapeHtml(formatDate(o.date))}</p>
                </div>
            </div>`).join('');
    } catch (error) {
        showAdminError(error);
    }
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
function initProductsPage() {
    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal(null));
    document.getElementById('product-cancel').addEventListener('click', closeProductModal);
    document.getElementById('product-modal').addEventListener('click', e => {
        if (e.target.id === 'product-modal') closeProductModal();
    });
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    ['product-search', 'product-category-filter', 'product-stock-filter'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderProductsTable);
    });

    // Un solo listener para editar/eliminar (las filas se vuelven a dibujar)
    document.getElementById('products-tbody').addEventListener('click', async function (e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        const product = adminState.products.find(p => p.id === id);
        if (!product) return;
        if (btn.dataset.action === 'edit') return openProductModal(product);
        if (confirm(`¿Eliminar "${product.name}"? Dejará de mostrarse en la tienda.`)) {
            try {
                await api.deleteProduct(id);
                await loadProductsTable();
            } catch (error) {
                showAdminError(error);
            }
        }
    });
}

async function loadProductsTable() {
    try {
        const data = await api.products();
        adminState.products = data.products;
        const select = document.getElementById('product-category-filter');
        const current = select.value;
        const categories = [...new Set(data.products.map(p => p.category))].sort();
        select.innerHTML = '<option value="">Todas las categorías</option>' +
            categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        select.value = categories.includes(current) ? current : '';
        document.getElementById('pf-categories').innerHTML =
            categories.map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
        renderProductsTable();
    } catch (error) {
        showAdminError(error);
    }
}

function renderProductsTable() {
    const text = document.getElementById('product-search').value.trim().toLowerCase();
    const category = document.getElementById('product-category-filter').value;
    const stock = document.getElementById('product-stock-filter').value;

    const rows = adminState.products.filter(p =>
        (!text || `${p.name} ${p.code}`.toLowerCase().includes(text)) &&
        (!category || p.category === category) &&
        (!stock || (stock === 'out' && p.inStock === 0) || (stock === 'low' && p.inStock > 0 && p.inStock <= 5) || (stock === 'ok' && p.inStock > 5)));

    const tbody = document.getElementById('products-tbody');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-note">No hay productos para mostrar.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(p => {
        const cls = p.inStock === 0 ? 'danger' : p.inStock <= 5 ? 'warning' : 'success';
        return `<tr>
            <td>${Number(p.id)}</td>
            <td class="product-img"><img src="${escapeHtml(imgUrl(p.image))}" alt=""></td>
            <td>${escapeHtml(p.name)}<br><small>${escapeHtml(p.code)}</small></td>
            <td>${escapeHtml(p.category)}</td>
            <td>${formatPrice(p.price)}</td>
            <td><span class="status ${cls}">${Number(p.inStock)}</span></td>
            <td class="actions">
                <button class="btn-icon" data-action="edit" data-id="${Number(p.id)}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" data-action="delete" data-id="${Number(p.id)}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>`;
    }).join('');
}

function openProductModal(product) {
    adminState.editingId = product ? product.id : null;
    document.getElementById('product-modal-title').textContent = product ? 'Editar producto' : 'Nuevo producto';
    const set = (id, value) => { document.getElementById(id).value = value ?? ''; };
    set('pf-name', product?.name); set('pf-code', product?.code); set('pf-category', product?.category);
    set('pf-brand', product?.brand); set('pf-price', product?.price); set('pf-old-price', product?.oldPrice);
    set('pf-stock', product?.inStock ?? 0); set('pf-image', product?.image);
    set('pf-short', product?.shortDescription); set('pf-description', product?.description);
    document.getElementById('pf-new').checked = !!product?.isNew;
    document.getElementById('pf-sale').checked = !!product?.isOnSale;
    document.getElementById('product-form-error').style.display = 'none';
    document.getElementById('product-modal').style.display = 'flex';
    document.getElementById('pf-name').focus();
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

async function saveProduct(e) {
    e.preventDefault();
    const val = id => document.getElementById(id).value.trim();
    const existing = adminState.products.find(p => p.id === adminState.editingId);
    const image = val('pf-image');
    const payload = {
        name: val('pf-name'), code: val('pf-code'), category: val('pf-category').toLowerCase(),
        subcategory: existing ? existing.subcategory : null,
        brand: val('pf-brand') || null, price: Number(val('pf-price')),
        oldPrice: val('pf-old-price') ? Number(val('pf-old-price')) : null,
        inStock: parseInt(val('pf-stock'), 10), image: image || null,
        images: existing && existing.image === image ? existing.images : (image ? [image] : []),
        rating: existing ? existing.rating : 0, reviewCount: existing ? existing.reviewCount : 0,
        shortDescription: val('pf-short'), description: val('pf-description'),
        isNew: document.getElementById('pf-new').checked, isOnSale: document.getElementById('pf-sale').checked
    };
    const errorBox = document.getElementById('product-form-error');
    try {
        if (existing) await api.updateProduct(existing.id, payload);
        else await api.createProduct(payload);
        closeProductModal();
        await loadProductsTable();
        if (document.getElementById('promotions-page').style.display === 'block') await loadPromotions();
    } catch (error) {
        if (error.status === 401 || error.status === 403) return showAdminError(error);
        errorBox.textContent = error.message;
        errorBox.style.color = 'red';
        errorBox.style.display = 'block';
    }
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
async function loadOrders() {
    const tbody = document.getElementById('orders-tbody');
    try {
        const { orders } = await api.adminOrders();
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-note">Todavía no hay pedidos.</td></tr>';
            return;
        }
        tbody.innerHTML = orders.map(o => `<tr>
            <td>#${Number(o.id)}</td>
            <td>${escapeHtml(formatDate(o.date))}</td>
            <td>${escapeHtml(o.customer)}<br><small>${escapeHtml(o.email)}</small></td>
            <td>${Number(o.units)}</td>
            <td>${formatPrice(o.total)}</td>
            <td><select class="order-status" data-id="${Number(o.id)}" data-current="${escapeHtml(o.status)}"
                ${o.status === 'cancelado' ? 'disabled' : ''}>
                ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''} ${s !== o.status && !(ORDER_TRANSITIONS[o.status] || []).includes(s) ? 'disabled' : ''}>${s}</option>`).join('')}
            </select></td><td><button type="button" class="btn btn-secondary" data-order-detail="${Number(o.id)}">Ver detalle</button></td>
        </tr>`).join('');

        tbody.querySelectorAll('select.order-status').forEach(sel => {
            sel.addEventListener('change', async function () {
                if (this.value === 'cancelado' && !confirm('Cancelar el pedido devuelve las unidades al stock. ¿Continuar?')) {
                    this.value = this.dataset.current;
                    return;
                }
                try {
                    await api.adminUpdateOrder(this.dataset.id, this.value);
                    loadOrders();
                } catch (error) {
                    this.value = this.dataset.current;
                    showAdminError(error);
                }
            });
        });
    } catch (error) {
        showAdminError(error);
    }
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
async function loadCustomers() {
    const tbody = document.getElementById('customers-tbody');
    try {
        const { customers } = await api.adminCustomers();
        tbody.innerHTML = customers.map(c => `<tr>
            <td>${Number(c.id)}</td>
            <td>${escapeHtml(c.name)}</td>
            <td>${escapeHtml(c.email)}</td>
            <td><span class="status ${c.role === 'admin' ? 'warning' : 'success'}">${escapeHtml(c.role)}</span></td>
            <td>${escapeHtml(formatDate(c.createdAt))}</td>
            <td>${escapeHtml(formatDate(c.lastAccess))}</td>
        </tr>`).join('');
    } catch (error) {
        showAdminError(error);
    }
}

function initManagement() {
    document.getElementById('orders-tbody').addEventListener('click', async e => {
        const button = e.target.closest('[data-order-detail]'); if (!button) return;
        try {
            const {order, items, history} = await api.orderDetail(button.dataset.orderDetail);
            document.getElementById('order-detail-content').innerHTML = `<p>Pedido #${Number(order.id_pedido)} &middot; ${escapeHtml(order.estado)}</p><p>Direccion: ${escapeHtml(order.direccion || 'Sin direccion registrada')} &middot; ${escapeHtml(order.ciudad || '')}</p><p>Telefono: ${escapeHtml(order.telefono || 'Sin telefono registrado')}</p><p>Envio: ${escapeHtml(order.envio)} &middot; ${formatPrice(order.costo_envio)}</p><ul>${items.map(i => `<li>${escapeHtml(i.nombre)}: ${Number(i.cantidad)} &times; ${formatPrice(i.precio_unit)}</li>`).join('')}</ul><p>Total: ${formatPrice(order.total)}</p><h3>Historial de estados</h3><ul>${(history || []).map(h => `<li>${escapeHtml(formatDate(h.fecha))}: ${escapeHtml(h.anterior || "inicio")} &rarr; ${escapeHtml(h.nuevo)}</li>`).join('')}</ul>`;
            document.getElementById('order-detail').showModal();
        } catch (error) { showAdminError(error); }
    });
    document.getElementById('store-form').addEventListener('submit', async e => {
        e.preventDefault();
        try {
            await api.saveStore(Object.fromEntries(['name','nit','phone','address','city','description'].map(k => [k, document.getElementById('store-' + k).value])));
            document.getElementById('store-result').textContent = 'Datos guardados';
            await loadSettings();
        } catch (error) { showAdminError(error); }
    });
    document.getElementById('settings-form').addEventListener('submit', async e => {
        e.preventDefault();
        try {
            await api.saveSettings(Object.fromEntries(['standard','express','freeFrom'].map(k => [k, Number(document.getElementById('rate-' + k).value)])));
            await loadSettings(); document.getElementById('settings-result').textContent = 'Tarifas guardadas';
        } catch (error) { showAdminError(error); }
    });
    document.getElementById('admin-global-search').addEventListener('input', e => {
        document.querySelector('[data-page="products"]').click();
        document.getElementById('product-search').value = e.target.value; renderProductsTable();
    });
}
async function loadCategories() {
    try {
        const {products} = await api.products();
        const categories = [...new Set(products.map(p => p.category))].sort();
        const container = document.getElementById('category-management'); container.replaceChildren();
        for (const category of categories) {
            const form = document.createElement('form'); form.className = 'page-filters';
            const input = document.createElement('input'); input.value = category; input.required = true; input.maxLength = 50; input.setAttribute('aria-label', 'Nombre de categoria');
            const button = document.createElement('button'); button.textContent = 'Renombrar (' + products.filter(p => p.category === category).length + ' productos)'; button.className = 'btn btn-secondary';
            form.append(input, button); container.append(form);
            form.addEventListener('submit', async e => { e.preventDefault(); try { await api.renameCategory(category, input.value); await loadCategories(); } catch (error) { showAdminError(error); } });
        }
    } catch (error) { showAdminError(error); }
}
async function loadPromotions() {
    try {
        await loadProductsTable();
        const container = document.getElementById('promotion-management'); container.replaceChildren();
        for (const product of adminState.products) {
            const row = document.createElement('p'); const button = document.createElement('button');
            button.className = 'btn btn-secondary'; button.textContent = 'Editar'; button.onclick = () => openProductModal(product);
            row.append(document.createTextNode(product.name + ' ? ' + formatPrice(product.price) + (product.isOnSale ? ' ? En oferta ' : ' ')), button); container.append(row);
        }
    } catch (error) { showAdminError(error); }
}
async function loadSettings() {
    try {
        const [{settings}, {activity}, {store}] = await Promise.all([api.settings(), api.activity(), api.adminStore()]);
        for (const k of ['name','nit','phone','address','city','description']) document.getElementById('store-' + k).value = store[k];
        for (const k of ['standard','express','freeFrom']) document.getElementById('rate-' + k).value = settings[k];
        document.getElementById('activity-history').innerHTML = activity.map(a => `<p>${escapeHtml(formatDate(a.fecha))} &middot; ${escapeHtml(a.email || 'Usuario eliminado')} &middot; ${escapeHtml(a.accion)}</p>`).join('') || '<p>No hay acciones registradas.</p>';
    } catch (error) { showAdminError(error); }
}
