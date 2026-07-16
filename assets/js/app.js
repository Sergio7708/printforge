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
const BASE = ''; // relative to /printforge/ root

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

function checkout() {
  if (!cart.length) { toast('Корзина пуста'); return; }
  const items = cart.map(i => {
    const p = products.find(x => x.id === i.id);
    return p ? `${p.title} ×${i.qty}` : '';
  }).filter(Boolean).join(', ');
  const total = cart.reduce((s, i) => {
    const p = products.find(x => x.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0);
  const msg = `Заказ:%0A${items}%0A%0AИтого: ${total.toLocaleString()} ₽`;
  window.open(`https://t.me/D3ModelerDesigner?text=${msg}`, '_blank');
  toast('Заказ отправлен!');
  cart = [];
  updateCart();
  toggleCart();
}

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
