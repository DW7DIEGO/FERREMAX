const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function appContext() {
    const values = new Map();
    let user = null;
    let remote = null;
    const context = vm.createContext({
        console, Intl, URL, URLSearchParams, Number, Set,
        location: {search: '', href: 'http://localhost:9000/html/cart.html'},
        document: {addEventListener() {}, querySelector() {return null;}},
        localStorage: {
            getItem: k => values.get(k) || null,
            setItem: (k,v) => values.set(k,v),
            removeItem: k => values.delete(k)
        },
        getCurrentUser: () => user,
        getSession: () => user ? {user, token: 'test'} : null,
        api: {
            preferences: async () => ({preferences: remote}),
            products: async () => ({products: [{id: 1, name: 'Actual', price: 5000}]}),
            savePreferences: async data => {remote = JSON.parse(JSON.stringify(data));}
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/common.js'), 'utf8'), context);
    return {context, values, setUser: u => {user = u;}, remote: () => remote};
}

test('carrito y favoritos quedan aislados por cuenta', async () => {
    const app = appContext();
    app.setUser({id: 1});
    await vm.runInContext("writeStoredList('cart', [{id:1, quantity:2, price:5000}])", app.context);
    await vm.runInContext("writeStoredList('wishlist', [1])", app.context);
    assert.equal(app.remote().cart[0].quantity, 2);
    app.setUser({id: 2});
    assert.equal(vm.runInContext("readStoredList('cart').length", app.context), 0);
    assert.equal(vm.runInContext("readStoredList('wishlist').length", app.context), 0);
    app.setUser(null);
    assert.equal(vm.runInContext("readStoredList('cart').length", app.context), 0);
});

test('login incorpora carrito invitado y actualiza precio desde catalogo', async () => {
    const app = appContext();
    app.values.set('cart', JSON.stringify([{id:1, quantity:3, price:1}]));
    app.values.set('wishlist', '[1]');
    app.setUser({id: 1});
    await vm.runInContext('syncAccountPreferences(true)', app.context);
    assert.equal(app.remote().cart[0].quantity, 3);
    assert.equal(app.remote().cart[0].price, 5000);
    assert.deepEqual(app.remote().wishlist, [1]);
    assert.equal(app.values.has('cart'), false);
});

test('la API mantiene mismo origen al usar otro puerto', () => {
    const context = vm.createContext({window: {location: {port: '9000'}}});
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8'), context);
    assert.equal(context.window.FERREMAX_CONFIG.API_BASE_URL, '/api');
});

test('checkout envia direccion, ciudad y telefono al backend integrado', async () => {
    const context = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8'), context);
    vm.runInContext('apiRequest = async (route, options) => ({route, ...options})', context);
    const request = await vm.runInContext("api.createOrder([{product_id:1,quantity:2}], 'express', 'Calle 10', '3001234567', 'Bogota')", context);
    assert.equal(request.route, '/orders');
    assert.equal(request.auth, true);
    assert.equal(request.body.city, 'Bogota');
    assert.equal(request.body.address, 'Calle 10');
    assert.equal(request.body.phone, '3001234567');
    assert.equal(request.body.shipping, 'express');
});
