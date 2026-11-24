// El ticket se mantiene separado del carrito de compra en línea.
const pos = { quantities: new Map(), busy: false, pending: null };
const posMoney = new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 2});
const posField = id => document.getElementById('pos-' + id);

async function loadPos() {
    const selected = pos.pending?.customer || posField('customer').value;
    try {
        const [catalog, accounts] = await Promise.all([api.products(), api.adminCustomers()]);
        adminState.products = catalog.products;
        const clients = accounts.customers.filter(c => c.role === 'cliente' && c.active);
        const select = posField('customer');
        select.replaceChildren(new Option(clients.length ? 'Seleccionar cliente' : 'Sin clientes activos', ''));
        for (const client of clients) select.add(new Option(client.name + ' · ' + client.email, client.id));
        select.value = selected;
        renderPos();
    } catch (error) { showAdminError(error); }
}

function renderPos() {
    const text = posField('search').value.trim().toLowerCase();
    const products = adminState.products.filter(p => (p.name + ' ' + p.code).toLowerCase().includes(text));
    posField('products').innerHTML = products.map(p => {
        const qty = pos.quantities.get(p.id) || 0;
        return `<button type="button" class="pos-product" data-add="${Number(p.id)}" ${pos.pending || qty >= Math.min(1000,p.inStock) ? 'disabled' : ''}>
            <img src="${escapeHtml(imgUrl(p.image))}" alt=""><span><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.code)} · ${p.inStock} disponibles</small></span><strong>${posMoney.format(p.price)}</strong><span aria-hidden="true">+</span></button>`;
    }).join('') || '<p class="empty-note">Sin coincidencias.</p>';
    let subtotal = 0;
    const lines = [];
    for (const [id, qty] of pos.quantities) {
        const p = adminState.products.find(product => product.id === id);
        if (p) subtotal += p.price * qty;
        lines.push(`<div class="ticket-line"><span>${p ? escapeHtml(p.name) : 'Producto retirado'}<small>${qty} × ${p ? posMoney.format(p.price) : '—'}</small></span><button type="button" data-remove="${Number(id)}" aria-label="Restar una unidad" ${pos.pending ? 'disabled' : ''}>−</button></div>`);
    }
    posField('lines').innerHTML = lines.join('') || '<p class="empty-note">Selecciona productos para abrir el ticket.</p>';
    const tax = Math.round(subtotal * Number(posField('rate').value)) / 100;
    posField('subtotal').textContent = posMoney.format(subtotal);
    posField('tax').textContent = posMoney.format(tax);
    posField('total').textContent = posMoney.format(subtotal + tax);
    posField('charge').disabled = pos.busy || !lines.length || !posField('customer').value;
    posField('customer').disabled = posField('rate').disabled = Boolean(pos.pending);
    return Math.round((subtotal + tax) * 100) / 100;
}

function initPos() {
    const pendingKey = 'ferremax_pos_pending_' + getCurrentUser().id;
    const saved = sessionStorage.getItem(pendingKey);
    if (saved) {
        pos.pending = JSON.parse(saved);
        pos.quantities = new Map(pos.pending.items.map(i => [i.product_id, i.quantity]));
        posField('rate').value = pos.pending.taxRate;
        posField('message').textContent = 'Ticket pendiente de confirmación. Reintenta para consultar el cobro.';
    }
    posField('search').oninput = posField('rate').oninput = posField('customer').onchange = renderPos;
    posField('products').onclick = event => {
        const button = event.target.closest('[data-add]');
        if (!button || pos.pending) return;
        const id = Number(button.dataset.add);
        pos.quantities.set(id, (pos.quantities.get(id) || 0) + 1);
        posField('message').textContent = '';
        renderPos();
    };
    posField('lines').onclick = event => {
        const button = event.target.closest('[data-remove]');
        if (!button || pos.pending) return;
        const id = Number(button.dataset.remove);
        const qty = pos.quantities.get(id) - 1;
        if (qty) pos.quantities.set(id, qty);
        else pos.quantities.delete(id);
        renderPos();
    };
    posField('ticket').onsubmit = async event => {
        event.preventDefault();
        if (pos.busy || !pos.quantities.size) return;
        pos.pending ??= {
            requestId: crypto.randomUUID(), customer: Number(posField('customer').value),
            taxRate: Number(posField('rate').value), expectedTotal: renderPos(),
            items: Array.from(pos.quantities, ([product_id, quantity]) => ({ product_id, quantity }))
        };
        sessionStorage.setItem(pendingKey, JSON.stringify(pos.pending));
        pos.busy = true;
        renderPos();
        try {
            const { order } = await api.chargePos(pos.pending);
            posField('message').textContent = 'Cobro registrado · Pedido #' + order.id + ' · ' + posMoney.format(order.total);
            pos.quantities.clear();
            pos.pending = null;
            sessionStorage.removeItem(pendingKey);
            posField('customer').value = '';
            posField('rate').value = '0';
            await loadPos();
        } catch (error) {
            if (error.network || error.status >= 500) {
                posField('message').textContent = 'Sin confirmación. Reintenta con el mismo ticket.';
            } else {
                pos.pending = null;
                sessionStorage.removeItem(pendingKey);
                posField('message').textContent = error.message;
                await loadPos();
            }
        } finally {
            pos.busy = false;
            renderPos();
        }
    };
}
