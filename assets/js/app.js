/* ============================================
   PrintForge — Main Application
   ============================================ */

const API = 'https://sergio7708.github.io/jarvis-bot-store';
const STORE = 'pf_';

let products = [];
let cart = JSON.parse(localStorage.getItem(STORE + 'cart') || '[]');
let currentFilter = 'all';
let currentPage = 1;
const PER_PAGE = 12;
const BASE = '/printforge';

function photoUrl(p) {
  // Local photos for first 30 products, fallback to jarvis-bot-store
  if (p.id <= 30) return BASE + '/assets/photos/' + p.id + '.jpg';
  return 'https://sergio7708.github.io/jarvis-bot-store' + p.photo_url;
}

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderFilters();
  renderCatalog();
  updateCart();
  initHeaderScroll();
  initReveal();
  initBreadcrumbs();

  // Toast from URL params (add to cart redirect)
  const params = new URLSearchParams(window.location.search);
  if (params.get('added')) toast('Товар добавлен в корзину');
});

async function loadProducts() {
  try {
    const res = await fetch(API + '/products.json');
    products = await res.json();
  } catch (e) {
    console.error('Failed to load products', e);
    document.getElementById('prodGrid').innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:80px;color:rgba(255,255,255,.3)">Ошибка загрузки товаров</div>';
  }
}

/* ---- Categories ---- */
function getCategories() {
  return [...new Set(products.map(p => p.category))];
}

function renderFilters() {
  const bar = document.getElementById('filterBar');
  if (!bar) return;
  let html = '<button class="filter-btn active" data-c="all">Все</button>';
  getCategories().forEach(c => {
    html += `<button class="filter-btn" data-c="${c}">${c}</button>`;
  });
  bar.innerHTML = html;
  bar.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.c;
      currentPage = 1;
      renderCatalog();
    });
  });
}

/* ---- Catalog Render ---- */
function renderCatalog() {
  const grid = document.getElementById('prodGrid');
  const count = document.getElementById('prodCount');
  if (!grid) return;

  const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const sort = document.getElementById('sortSelect')?.value || 'default';

  let filtered = products.filter(p =>
    (currentFilter === 'all' || p.category === currentFilter) &&
    (!q || p.title.toLowerCase().includes(q))
  );

  switch (sort) {
    case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
    case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
    case 'name': filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
  }

  const total = filtered.length;
  const pages = Math.ceil(total / PER_PAGE);
  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  if (count) count.textContent = `Показано ${pageItems.length} из ${total} товаров`;

  if (!pageItems.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:80px;color:rgba(255,255,255,.3)">Ничего не найдено</div>';
    renderPagination(pages);
    return;
  }

  grid.innerHTML = pageItems.map(p => `
    <div class="prod-card">
      <a href="/pages/product.html?id=${p.id}">
        <img class="prod-card-img" src="${photoUrl(p)}" alt="${escapeHtml(p.title)}" loading="lazy">
      </a>
      <div class="prod-body">
        <div class="prod-cat">${p.category}</div>
        <a href="/pages/product.html?id=${p.id}" class="prod-name" style="display:block">${escapeHtml(p.title)}</a>
        <div class="prod-price">${p.price.toLocaleString()} ₽</div>
        <button class="prod-btn" onclick="addToCart(${p.id});event.preventDefault()">В корзину</button>
      </div>
    </div>
  `).join('');

  renderPagination(pages);
}

function renderPagination(pages) {
  const el = document.getElementById('pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = '';
  if (currentPage > 1) {
    html += `<button class="page-btn" data-page="${currentPage - 1}">‹</button>`;
  }
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - currentPage) <= 2) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (html.endsWith('...</span>') === false && i > 1) {
      // check if last rendered was a number
    }
  }
  // Simplified pagination
  html = '';
  if (currentPage > 1) html += `<button class="page-btn" data-page="1">«</button>`;
  if (currentPage > 1) html += `<button class="page-btn" data-page="${currentPage - 1}">‹</button>`;
  html += `<span style="color:var(--gold);padding:0 12px">${currentPage} / ${pages}</span>`;
  if (currentPage < pages) html += `<button class="page-btn" data-page="${currentPage + 1}">›</button>`;
  if (currentPage < pages) html += `<button class="page-btn" data-page="${pages}">»</button>`;
  el.innerHTML = html;

  el.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      renderCatalog();
      window.scrollTo({ top: document.getElementById('catalog')?.offsetTop - 100 || 0, behavior: 'smooth' });
    });
  });
}

/* ---- Search ---- */
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      currentPage = 1;
      renderCatalog();
    }, 300);
  });
}

/* ---- Sort ---- */
function initSort() {
  const sel = document.getElementById('sortSelect');
  if (!sel) return;
  sel.addEventListener('change', () => {
    currentPage = 1;
    renderCatalog();
  });
}

/* ---- Cart ---- */
function addToCart(id) {
  const item = cart.find(x => x.id === id);
  if (item) item.qty++;
  else cart.push({ id, qty: 1 });
  updateCart();
  toast('Товар добавлен в корзину');
  // Animate badge
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.style.transform = 'scale(1.3)';
    setTimeout(() => badge.style.transform = 'scale(1)', 200);
  }
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  updateCart();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  updateCart();
}

function clearCart() {
  cart = [];
  updateCart();
  toast('Корзина очищена');
}

function updateCart() {
  localStorage.setItem(STORE + 'cart', JSON.stringify(cart));
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = count;
  renderCartSide();
  renderCartPage();
}

function renderCartSide() {
  const el = document.getElementById('cartItems');
  const ft = document.getElementById('cartFooter');
  if (!el) return;

  if (!cart.length) {
    el.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div>Корзина пуста</div>';
    if (ft) ft.style.display = 'none';
    return;
  }

  const total = cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  if (ft) {
    ft.style.display = 'block';
    document.getElementById('cartTotal').textContent = total.toLocaleString() + ' ₽';
  }

  el.innerHTML = cart.map(i => {
    const p = products.find(x => x.id === i.id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${photoUrl(p)}" alt="${escapeHtml(p.title)}" loading="lazy">
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(p.title)}</div>
          <div class="cart-item-price">${p.price.toLocaleString()} ₽</div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
            <span>${i.qty}</span>
            <button class="cart-qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
          </div>
        </div>
        <div class="cart-item-total">${(i.qty * p.price).toLocaleString()} ₽</div>
        <button class="cart-remove" onclick="removeFromCart(${i.id})">✕</button>
      </div>
    `;
  }).join('');
}

function renderCartPage() {
  const el = document.getElementById('cartPageItems');
  if (!el) return;

  if (!cart.length) {
    el.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Корзина пуста</p><a href="/" style="color:var(--gold);margin-top:16px;display:inline-block">Вернуться в каталог</a></div>';
    return;
  }

  const total = cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  el.innerHTML = cart.map(i => {
    const p = products.find(x => x.id === i.id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${photoUrl(p)}" alt="${escapeHtml(p.title)}" loading="lazy">
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHtml(p.title)}</div>
          <div class="cart-item-price">${p.price.toLocaleString()} ₽</div>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
            <span>${i.qty}</span>
            <button class="cart-qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
          </div>
        </div>
        <div class="cart-item-total">${(i.qty * p.price).toLocaleString()} ₽</div>
        <button class="cart-remove" onclick="removeFromCart(${i.id})">✕</button>
      </div>
    `;
  }).join('');

  document.getElementById('cartPageTotal').textContent = total.toLocaleString() + ' ₽';
}

function toggleCart() {
  document.getElementById('cartOverlay')?.classList.toggle('open');
  document.getElementById('cartSide')?.classList.toggle('open');
}

/* ---- Checkout Form ---- */
function showCheckoutForm() {
  if (!cart.length) { toast('Корзина пуста'); return; }

  const total = cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  const el = document.getElementById('cartItems') || document.getElementById('cartPageItems');
  if (!el) return;
  document.getElementById('cartFooter').style.display = 'none';
  if (document.getElementById('cartPageFooter')) document.getElementById('cartPageFooter').style.display = 'none';

  const itemsHtml = cart.map(i => {
    const p = products.find(x => x.id === i.id);
    return p ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${escapeHtml(p.title)} ×${i.qty}</span><span>${(p.price*i.qty).toLocaleString()} ₽</span></div>` : '';
  }).join('');

  el.innerHTML = `
    <div class="cart-empty" style="padding:30px 24px;text-align:left">
      <h3 style="font-family:var(--font-display);font-size:20px;color:var(--gold);margin-bottom:20px;text-align:center">Оформление заказа</h3>
      <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--card-border)">
        ${itemsHtml}
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-weight:700;color:var(--gold);border-top:1px solid var(--card-border);margin-top:8px">
          <span>Итого:</span><span>${total.toLocaleString()} ₽</span>
        </div>
      </div>
      <div id="checkoutForm">
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:13px;color:var(--text-dim);margin-bottom:4px">Имя *</label>
          <input id="ordName" placeholder="Ваше имя" style="width:100%;padding:10px 14px;border-radius:12px;border:1px solid var(--card-border);background:rgba(255,255,255,.03);color:#fff;font-size:14px;outline:none">
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:13px;color:var(--text-dim);margin-bottom:4px">Телефон *</label>
          <input id="ordPhone" placeholder="+7 (999) 123-45-67" style="width:100%;padding:10px 14px;border-radius:12px;border:1px solid var(--card-border);background:rgba(255,255,255,.03);color:#fff;font-size:14px;outline:none">
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:13px;color:var(--text-dim);margin-bottom:4px">Email</label>
          <input id="ordEmail" placeholder="email@example.com" style="width:100%;padding:10px 14px;border-radius:12px;border:1px solid var(--card-border);background:rgba(255,255,255,.03);color:#fff;font-size:14px;outline:none">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;color:var(--text-dim);margin-bottom:4px">Адрес доставки</label>
          <input id="ordAddress" placeholder="Город, улица, дом, квартира" style="width:100%;padding:10px 14px;border-radius:12px;border:1px solid var(--card-border);background:rgba(255,255,255,.03);color:#fff;font-size:14px;outline:none">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;color:var(--text-dim);margin-bottom:4px">Комментарий к заказу</label>
          <textarea id="ordComment" placeholder="Дополнительные пожелания" style="width:100%;padding:10px 14px;border-radius:12px;border:1px solid var(--card-border);background:rgba(255,255,255,.03);color:#fff;font-size:14px;outline:none;resize:vertical;min-height:50px;font-family:inherit"></textarea>
        </div>
        <button onclick="submitOrder()" style="width:100%;padding:14px;background:var(--gold);color:var(--black);border:none;border-radius:var(--radius);font-size:15px;text-transform:uppercase;letter-spacing:.06em;cursor:pointer">Подтвердить заказ</button>
        <button onclick="toggleCart()" style="width:100%;padding:10px;background:none;border:none;color:var(--text-dim);font-size:13px;cursor:pointer;margin-top:8px">Отмена</button>
      </div>
    </div>
  `;
}

function submitOrder() {
  const name = document.getElementById('ordName')?.value.trim();
  const phone = document.getElementById('ordPhone')?.value.trim();
  if (!name || !phone) { toast('Заполните имя и телефон'); return; }

  const total = cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  const order = {
    id: Date.now().toString(36).toUpperCase(),
    date: new Date().toISOString(),
    name, phone,
    email: document.getElementById('ordEmail')?.value.trim() || '',
    address: document.getElementById('ordAddress')?.value.trim() || '',
    comment: document.getElementById('ordComment')?.value.trim() || '',
    items: cart.map(i => {
      const p = products.find(x => x.id === i.id);
      return p ? { id: p.id, title: p.title, price: p.price, qty: i.qty } : null;
    }).filter(Boolean),
    total
  };

  // Save order
  const orders = JSON.parse(localStorage.getItem('pf_orders') || '[]');
  orders.unshift(order);
  localStorage.setItem('pf_orders', JSON.stringify(orders));

  // Show confirmation
  const el = document.getElementById('cartItems') || document.getElementById('cartPageItems');
  if (!el) return;

  el.innerHTML = `
    <div class="cart-empty" style="padding:40px 20px">
      <div style="font-size:48px;color:var(--gold);margin-bottom:12px">✓</div>
      <h3 style="font-family:var(--font-display);color:var(--gold);margin-bottom:8px;font-size:20px">Заказ #${order.id} принят!</h3>
      <p style="color:var(--text-muted);margin-bottom:4px">Спасибо, ${escapeHtml(name)}!</p>
      <p style="color:var(--text-dim);font-size:14px;margin-bottom:20px">Мы свяжемся с вами в ближайшее время.</p>
      <div style="border-top:1px solid var(--card-border);padding-top:12px;margin-bottom:16px;font-size:14px;color:var(--text-dim);text-align:left">
        <div style="margin-bottom:4px">${order.items.map(i => `${escapeHtml(i.title)} ×${i.qty} — ${(i.price*i.qty).toLocaleString()} ₽`).join('<br>')}</div>
        <div style="font-weight:700;color:var(--gold);margin-top:8px">Итого: ${total.toLocaleString()} ₽</div>
      </div>
      <button onclick="clearCart();toggleCart()" style="padding:12px 32px;background:var(--gold);color:var(--black);border:none;border-radius:var(--radius);font-size:14px;cursor:pointer;text-transform:uppercase;letter-spacing:.06em">Продолжить покупки</button>
    </div>
  `;

  cart = [];
  updateCart();
}

function checkout() { showCheckoutForm(); }
window.showCheckoutForm = showCheckoutForm;
window.submitOrder = submitOrder;


/* ---- Toast ---- */
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ---- Header Scroll ---- */
function initHeaderScroll() {
  window.addEventListener('scroll', () => {
    document.getElementById('header')?.classList.toggle('scrolled', window.scrollY > 80);
    // Parallax hero bg
    const bg = document.getElementById('heroBg');
    if (bg) bg.style.transform = `translateY(${window.scrollY * 0.35}px)`;
  });
}

/* ---- Reveal Animations ---- */
function initReveal() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ---- Breadcrumbs ---- */
function initBreadcrumbs() {
  const el = document.getElementById('breadcrumbs');
  if (!el) return;
  const path = window.location.pathname;
  let html = '<a href="/">Главная</a>';
  if (path.includes('/pages/product.html')) {
    html += '<span> / </span><span>Товар</span>';
  } else if (path.includes('/pages/cart.html')) {
    html += '<span> / </span><span>Корзина</span>';
  }
  el.innerHTML = html;
}

/* ---- Helpers ---- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---- Expose globally ---- */
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.changeQty = changeQty;
window.clearCart = clearCart;
window.toggleCart = toggleCart;
window.checkout = checkout;

/* ---- Re-init on dynamic pages ---- */
document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initSort();
});
