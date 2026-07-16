/* ============================================
   PrintForge — Main App
   ============================================ */
const API = 'https://sergio7708.github.io/jarvis-bot-store';
let products = [], cart = JSON.parse(localStorage.getItem('pf_cart') || '[]');
let filter = 'all', page = 1, PP = 12;

function imgUrl(p) {
  return API + p.photo_url;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProd();
  renderFilters();
  render();
  updateCart();
  uiInit();
});

async function loadProd() {
  try {
    const r = await fetch(API + '/products.json');
    products = await r.json();
  } catch(e) {
    const g = document.getElementById('prodGrid');
    if(g) g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-dim)">Ошибка загрузки</div>';
  }
}

function cats() { return [...new Set(products.map(p => p.category))]; }

function renderFilters() {
  const el = document.getElementById('filterBar');
  if (!el) return;
  el.innerHTML = '<button class="filter-btn active" data-c="all">Все</button>' +
    cats().map(c => `<button class="filter-btn" data-c="${c}">${c}</button>`).join('');
  el.querySelectorAll('.filter-btn').forEach(b => b.onclick = () => {
    el.querySelectorAll('.filter-btn').forEach(x => x.classList.toggle('active', x === b));
    filter = b.dataset.c; page = 1; render();
  });
}

function render() {
  const grid = document.getElementById('prodGrid'), cnt = document.getElementById('prodCount');
  if (!grid) return;
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const s = document.getElementById('sortSelect')?.value || 'd';
  let p = products.filter(x => (filter === 'all' || x.category === filter) && (!q || x.title.toLowerCase().includes(q)));
  if (s === 'pa') p.sort((a,b) => a.price - b.price);
  else if (s === 'pd') p.sort((a,b) => b.price - a.price);
  else if (s === 'n') p.sort((a,b) => a.title.localeCompare(b.title));
  const pg = Math.ceil(p.length / PP);
  const sp = (page-1) * PP;
  const ip = p.slice(sp, sp+PP);
  if (cnt) cnt.textContent = `Показано ${ip.length} из ${p.length} товаров`;
  grid.innerHTML = ip.length ? ip.map(x => `
    <div class="prod-card">
      <a href="/printforge/pages/product.html?id=${x.id}"><img class="prod-card-img" src="${imgUrl(x)}" alt="${esc(x.title)}" loading="lazy"></a>
      <div class="prod-body">
        <div class="prod-cat">${x.category}</div>
        <a href="/printforge/pages/product.html?id=${x.id}" class="prod-name">${esc(x.title)}</a>
        <div class="prod-price">${x.price.toLocaleString()} ₽</div>
        <button class="prod-btn" onclick="addCart(${x.id})">В корзину</button>
      </div>
    </div>`).join('') : '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-dim)">Ничего не найдено</div>';
  renderPag(pg);
}

function renderPag(pg) {
  const el = document.getElementById('pagination');
  if (!el) return;
  if (pg <= 1) { el.innerHTML = ''; return; }
  let h = '';
  if (page > 1) h += `<button class="page-btn" data-p="${page-1}">‹</button>`;
  h += `<span style="padding:0 12px;color:var(--gold);font-weight:600">${page} / ${pg}</span>`;
  if (page < pg) h += `<button class="page-btn" data-p="${page+1}">›</button>`;
  el.innerHTML = h;
  el.querySelectorAll('.page-btn').forEach(b => b.onclick = () => { page = +b.dataset.p; render(); window.scrollTo({top: document.getElementById('catalog')?.offsetTop-100||0,behavior:'smooth'}); });
}

function addCart(id) {
  const i = cart.find(x => x.id === id);
  if (i) i.qty++; else cart.push({id, qty: 1});
  updateCart();
  toast('Добавлено в корзину');
}

function updCartItem(id, d) {
  const i = cart.find(x => x.id === id);
  if (!i) return;
  i.qty += d;
  if (i.qty <= 0) cart = cart.filter(x => x.id !== id);
  updateCart();
}

function clearCart() { cart = []; updateCart(); toast('Корзина очищена'); }

function updateCart() {
  localStorage.setItem('pf_cart', JSON.stringify(cart));
  const n = cart.reduce((s,i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => b.textContent = n);
  renderCart();
  renderCartPage();
}

function renderCart() {
  const el = document.getElementById('cartItems');
  if (!el) return;
  if (!cart.length) {
    el.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-bag" style="font-size:40px;opacity:.3;margin-bottom:12px;display:block"></i>Корзина пуста</div>';
    document.getElementById('cartFooter').style.display = 'none';
    return;
  }
  const t = cart.reduce((s,i) => { const p = products.find(x => x.id === i.id); return s + (p ? p.price * i.qty : 0); }, 0);
  document.getElementById('cartFooter').style.display = 'block';
  document.getElementById('cartTotal').textContent = t.toLocaleString() + ' ₽';
  el.innerHTML = cart.map(i => {
    const p = products.find(x => x.id === i.id);
    if (!p) return '';
    return `<div class="cart-item">
      <img class="cart-item-img" src="${imgUrl(p)}" alt="${esc(p.title)}" loading="lazy">
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(p.title)}</div>
        <div class="cart-item-price">${p.price.toLocaleString()} ₽</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" onclick="updCartItem(${i.id},-1)">−</button>
          <span>${i.qty}</span>
          <button class="cart-qty-btn" onclick="updCartItem(${i.id},1)">+</button>
        </div>
      </div>
      <div class="cart-item-total">${(i.qty*p.price).toLocaleString()} ₽</div>
      <button class="cart-remove" onclick="updCartItem(${i.id},-Infinity)">✕</button>
    </div>`;
  }).join('');
}

function renderCartPage() {
  const el = document.getElementById('cartPageItems');
  if (!el) return;
  if (!cart.length) {
    el.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-bag" style="font-size:48px;opacity:.3;margin-bottom:16px;display:block"></i><p>Корзина пуста</p><a href="/printforge/pages/catalog.html" style="color:var(--gold);display:inline-block;margin-top:16px">В каталог</a></div>';
    document.getElementById('cartPageFooter').style.display = 'none';
    return;
  }
  const t = cart.reduce((s,i) => { const p = products.find(x => x.id === i.id); return s + (p ? p.price * i.qty : 0); }, 0);
  document.getElementById('cartPageFooter').style.display = 'block';
  document.getElementById('cartPageTotal').textContent = t.toLocaleString() + ' ₽';
  el.innerHTML = cart.map(i => {
    const p = products.find(x => x.id === i.id);
    if (!p) return '';
    return `<div class="cart-item">
      <img class="cart-item-img" src="${imgUrl(p)}" alt="${esc(p.title)}" loading="lazy">
      <div class="cart-item-info">
        <div class="cart-item-name">${esc(p.title)}</div>
        <div class="cart-item-price">${p.price.toLocaleString()} ₽</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" onclick="updCartItem(${i.id},-1)">−</button>
          <span>${i.qty}</span>
          <button class="cart-qty-btn" onclick="updCartItem(${i.id},1)">+</button>
        </div>
      </div>
      <div class="cart-item-total">${(i.qty*p.price).toLocaleString()} ₽</div>
      <button class="cart-remove" onclick="updCartItem(${i.id},-Infinity)">✕</button>
    </div>`;
  }).join('');
}

function toggleCart() {
  document.getElementById('cartOverlay')?.classList.toggle('open');
  document.getElementById('cartSide')?.classList.toggle('open');
}

function showForm() {
  if (!cart.length) { toast('Корзина пуста'); return; }
  const el = document.getElementById('cartItems');
  if (!el) return;
  document.getElementById('cartFooter').style.display = 'none';
  const t = cart.reduce((s,i) => { const p = products.find(x => x.id === i.id); return s + (p ? p.price * i.qty : 0); }, 0);
  el.innerHTML = `
    <div style="padding:20px 24px">
      <h3 style="font-family:var(--font-heading);font-size:18px;color:var(--gold-dark);margin-bottom:16px">Оформление</h3>
      ${cart.map(i => { const p = products.find(x => x.id === i.id); return p ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:14px"><span>${esc(p.title)} ×${i.qty}</span><span>${(p.price*i.qty).toLocaleString()} ₽</span></div>` : ''; }).join('')}
      <div style="display:flex;justify-content:space-between;padding:8px 0 16px;font-weight:700;color:var(--gold-dark);border-top:1px solid var(--border);margin-top:8px"><span>Итого:</span><span>${t.toLocaleString()} ₽</span></div>
      <div class="form-group"><label>Имя *</label><input id="ordName" placeholder="Ваше имя"></div>
      <div class="form-group"><label>Телефон *</label><input id="ordPhone" placeholder="+7 (999) 123-45-67"></div>
      <div class="form-group"><label>Email</label><input id="ordEmail" placeholder="email@example.com"></div>
      <div class="form-group"><label>Адрес доставки</label><input id="ordAddr" placeholder="Город, улица, дом"></div>
      <div class="form-group"><label>Комментарий</label><textarea id="ordComment" placeholder="Пожелания"></textarea></div>
      <button class="btn-gold" onclick="submitOrder()">Подтвердить заказ</button>
      <button class="btn-ghost" onclick="toggleCart()" style="width:100%;margin-top:4px">Отмена</button>
    </div>`;
}

function submitOrder() {
  const name = document.getElementById('ordName')?.value.trim();
  const ph = document.getElementById('ordPhone')?.value.trim();
  if (!name || !ph) { toast('Заполните имя и телефон'); return; }
  const t = cart.reduce((s,i) => { const p = products.find(x => x.id === i.id); return s + (p ? p.price * i.qty : 0); }, 0);
  const o = {
    id: Date.now().toString(36).toUpperCase(),
    date: new Date().toISOString(),
    name, phone: ph,
    email: document.getElementById('ordEmail')?.value.trim() || '',
    addr: document.getElementById('ordAddr')?.value.trim() || '',
    comment: document.getElementById('ordComment')?.value.trim() || '',
    items: cart.map(i => { const p = products.find(x => x.id === i.id); return p ? {title: p.title, price: p.price, qty: i.qty} : null; }).filter(Boolean),
    total: t
  };
  const orders = JSON.parse(localStorage.getItem('pf_orders') || '[]');
  orders.unshift(o);
  localStorage.setItem('pf_orders', JSON.stringify(orders));
  const el = document.getElementById('cartItems');
  if (el) el.innerHTML = `
    <div class="cart-empty" style="padding:40px 20px">
      <i class="fas fa-check-circle" style="font-size:48px;color:var(--gold);margin-bottom:12px;display:block"></i>
      <h3 style="font-family:var(--font-heading);color:var(--gold-dark);margin-bottom:6px;font-size:18px">Заказ #${o.id} принят!</h3>
      <p style="color:var(--text-muted);margin-bottom:4px">Спасибо, ${esc(name)}!</p>
      <p style="color:var(--text-dim);font-size:14px;margin-bottom:20px">Мы свяжемся с вами.</p>
      <button class="btn-gold" style="width:auto;padding:12px 32px;display:inline-block" onclick="clearCart();toggleCart()">Продолжить</button>
    </div>`;
  cart = []; updateCart();
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function uiInit() {
  // Search
  const si = document.getElementById('searchInput');
  if (si) {
    let tm;
    si.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { page=1; render(); }, 300); };
  }
  // Sort
  const ss = document.getElementById('sortSelect');
  if (ss) ss.onchange = () => { page=1; render(); };
  // Header scroll
  window.onscroll = () => {
    const h = document.getElementById('header');
    if (h) h.style.boxShadow = window.scrollY > 60 ? '0 2px 20px rgba(0,0,0,.1)' : 'none';
    const bg = document.getElementById('heroBg');
    if (bg) bg.style.transform = `translateY(${window.scrollY*.3}px)`;
  };
  // Reveal
  new IntersectionObserver(e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('vis'); }), {threshold:.1})
    .observe(document.querySelector('.reveal'));
  // Re-run on all reveals after render
  document.querySelectorAll('.reveal').forEach(el => {
    new IntersectionObserver(entries => entries.forEach(x => { if (x.isIntersecting) x.target.classList.add('vis'); }), {threshold:.1}).observe(el);
  });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// Expose
window.addCart = addCart;
window.updCartItem = updCartItem;
window.clearCart = clearCart;
window.toggleCart = toggleCart;
window.showForm = showForm;
window.submitOrder = submitOrder;
window.checkout = showForm;
