/* PrintForge — Store Logic v3 (real data from products.json) */
(function() {
  'use strict';

  // ===== CONFIG =====
  var isInPages = window.location.pathname.indexOf('/pages/') >= 0;
  var DATA_URL = (isInPages ? '../' : '') + 'assets/data/products.json';
  var IMG_BASE = (isInPages ? '../' : '') + 'assets/img/';
  var ITEMS_PER_PAGE = 9;
  var STORAGE_KEY = 'pf_cart';
  var ORDERS_KEY = 'pf_orders';

  // ===== STATE =====
  var PRODUCTS = [];
  var CATEGORIES = ['Все'];
  var currentCategory = 'Все';
  var currentSort = 'popular';
  var currentPage = 1;
  var searchQuery = '';

  // ===== HELPERS =====
  function fmt(n) {
    return n.toLocaleString('ru-RU') + ' \u20BD';
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 2500);
  }

  function getCart() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e) { return []; } }
  function saveCart(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); updateCartBadge(); }
  function getOrders() { try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch(e) { return []; } }
  function saveOrders(o) { localStorage.setItem(ORDERS_KEY, JSON.stringify(o)); }

  function updateCartBadge() {
    var count = getCart().reduce(function(s,i){return s+i.qty;},0);
    document.querySelectorAll('.cart-badge').forEach(function(b){
      b.textContent = count; b.classList.toggle('show', count>0);
    });
  }

  // ===== CART LOGIC =====
  function addToCart(id) {
    var p = PRODUCTS.find(function(x){return x.id===id;});
    if (!p) return;
    var cart = getCart();
    var ex = cart.find(function(x){return x.id===id;});
    if (ex) ex.qty++; else cart.push({id:id, qty:1});
    saveCart(cart); toast(p.name + ' добавлен в корзину');
  }

  function removeFromCart(id) { saveCart(getCart().filter(function(i){return i.id!==id;})); renderCart(); }

  function changeQty(id, d) {
    var cart = getCart(); var item = cart.find(function(x){return x.id===id;});
    if (!item) return; item.qty += d;
    if (item.qty <= 0) cart = cart.filter(function(x){return x.id!==id;});
    saveCart(cart); renderCart();
  }

  function renderCart() {
    var items = document.getElementById('cart-items');
    var footer = document.getElementById('cart-footer');
    var cart = getCart();
    if (!items) return;
    if (cart.length === 0) {
      items.innerHTML = '<div class="cart-empty"><p>Корзина пуста</p></div>';
      if (footer) footer.style.display = 'none'; return;
    }
    if (footer) footer.style.display = 'block';
    items.innerHTML = cart.map(function(item){
      var p = PRODUCTS.find(function(x){return x.id===item.id;});
      if (!p) return '';
      return '<div class="cart-item">'+
        '<div class="cart-item-img"><img src="'+IMG_BASE+p.photo_url.split('/').pop()+'" alt="'+p.name+'" onerror="this.style.background=\'#e5e5e5\'"></div>'+
        '<div class="cart-item-info">'+
          '<div class="cart-item-name">'+p.name+'</div>'+
          '<div class="cart-item-price">'+fmt(p.price)+'</div>'+
          '<div class="cart-item-qty">'+
            '<button class="qty-btn" onclick="PF.changeQty('+p.id+',-1)">−</button>'+
            '<span>'+item.qty+'</span>'+
            '<button class="qty-btn" onclick="PF.changeQty('+p.id+',1)">+</button>'+
          '</div>'+
          '<div class="cart-item-remove" onclick="PF.removeFromCart('+p.id+')">Удалить</div>'+
        '</div>'+
      '</div>';
    }).join('');
    var total = cart.reduce(function(s,i){var p=PRODUCTS.find(function(x){return x.id===i.id;});return s+(p?p.price*i.qty:0);},0);
    var te = document.getElementById('cart-total');
    if (te) te.textContent = fmt(total);
  }

  function toggleCart(open) {
    var o = document.getElementById('cart-overlay'); var s = document.getElementById('cart-sidebar');
    if (o) o.classList.toggle('open', open);
    if (s) s.classList.toggle('open', open);
    if (open) renderCart();
  }

  function openCheckout() {
    var cart = getCart(); if (cart.length===0){toast('Корзина пуста');return;}
    toggleCart(false);
    var m = document.getElementById('checkout-modal'); var sm = document.getElementById('checkout-summary');
    if (!m||!sm) return;
    var total = cart.reduce(function(s,i){var p=PRODUCTS.find(function(x){return x.id===i.id;});return s+(p?p.price*i.qty:0);},0);
    sm.innerHTML = cart.map(function(i){
      var p=PRODUCTS.find(function(x){return x.id===i.id;});
      return p?'<div class="order-line"><span>'+p.name+' × '+i.qty+'</span><span>'+fmt(p.price*i.qty)+'</span></div>':'';
    }).join('')+'<div class="order-line order-total"><span>Итого</span><span>'+fmt(total)+'</span></div>';
    m.classList.add('open');
  }

  function submitOrder(e) {
    e.preventDefault();
    var cart = getCart(); if (cart.length===0) return;
    var fd = new FormData(document.getElementById('checkout-form'));
    var order = {
      id:'PF-'+Date.now().toString(36).toUpperCase(), date:new Date().toLocaleDateString('ru-RU'),
      name:fd.get('name'), phone:fd.get('phone'), email:fd.get('email'),
      address:fd.get('address'), comment:fd.get('comment'),
      items:cart.map(function(i){var p=PRODUCTS.find(function(x){return x.id===i.id;});return{title:p.name,price:p.price,qty:i.qty};}),
      total:cart.reduce(function(s,i){var p=PRODUCTS.find(function(x){return x.id===i.id;});return s+(p?p.price*i.qty:0);},0)
    };
    // Send to Telegram bot via Mini App API
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.sendData) {
      window.Telegram.WebApp.sendData(JSON.stringify(order));
    }
    // Also save locally as fallback
    var orders=getOrders(); orders.unshift(order); saveOrders(orders); saveCart([]);
    document.getElementById('checkout-modal').classList.remove('open');
    document.getElementById('checkout-form').reset();
    toast('Заказ '+order.id+' оформлен!');
  }

  // ===== PRODUCT CARD =====
  function renderProductCard(p) {
    var imgFile = p.photo_url.split('/').pop();
    return '<div class="product-card">'+
      '<div class="product-img" onclick="PF.openProduct('+p.id+')">'+
        '<img src="'+IMG_BASE+imgFile+'" alt="'+p.name+'" loading="lazy" onerror="this.style.background=\'#e5e5e5\';this.style.height=\'100%\'">'+
      '</div>'+
      '<div class="product-info">'+
        '<div class="product-category">'+p.category+'</div>'+
        '<div class="product-name" onclick="PF.openProduct('+p.id+')">'+p.name+'</div>'+
        '<div class="product-price">'+fmt(p.price)+'</div>'+
        '<div class="product-bottom">'+
          '<button class="btn-add" onclick="PF.addToCart('+p.id+')">В корзину</button>'+
          '<div class="product-rating"><span>★</span> '+p.rating+'</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function openProduct(id) {
    window.location.href = 'pages/product.html?id='+id;
  }

  // ===== CATALOG LOGIC =====
  function getFilteredProducts() {
    var list = PRODUCTS.slice();
    if (currentCategory !== 'Все') list = list.filter(function(p){return p.category===currentCategory;});
    if (searchQuery) list = list.filter(function(p){return p.name.toLowerCase().indexOf(searchQuery.toLowerCase())>=0;});
    switch(currentSort) {
      case 'price-asc': list.sort(function(a,b){return a.price-b.price;}); break;
      case 'price-desc': list.sort(function(a,b){return b.price-a.price;}); break;
      case 'name': list.sort(function(a,b){return a.name.localeCompare(b.name);}); break;
      default: list.sort(function(a,b){return (b.orders||0)-(a.orders||0);});
    }
    return list;
  }

  function renderCatalog() {
    var grid = document.getElementById('products-grid'); if (!grid) return;
    var filtered = getFilteredProducts();
    var start = (currentPage-1)*ITEMS_PER_PAGE;
    var page = filtered.slice(start, start+ITEMS_PER_PAGE);
    grid.innerHTML = page.map(renderProductCard).join('');

    var pag = document.getElementById('pagination');
    if (pag) {
      var pages = Math.ceil(filtered.length/ITEMS_PER_PAGE);
      pag.innerHTML = '';
      for (var i=1; i<=pages; i++) {
        var btn = document.createElement('button');
        btn.className = 'page-btn'+(i===currentPage?' active':'');
        btn.textContent = i;
        btn.setAttribute('data-page', i);
        btn.addEventListener('click', function(){ currentPage=parseInt(this.getAttribute('data-page')); renderCatalog(); });
        pag.appendChild(btn);
      }
    }
    var cnt = document.getElementById('products-count');
    if (cnt) cnt.textContent = filtered.length + ' товаров';
  }

  function filterCategory(cat) {
    currentCategory = cat; currentPage = 1;
    document.querySelectorAll('.filter-btn').forEach(function(b){
      b.classList.toggle('active', b.textContent===cat);
    });
    renderCatalog();
  }

  function sortProducts(val) { currentSort = val; currentPage = 1; renderCatalog(); }

  // ===== INIT =====
  function init() {
    updateCartBadge();

    // Load products
    fetch(DATA_URL)
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
      .then(function(data){
        // Normalize: map title->name, ensure fields
        PRODUCTS = data.map(function(p, idx){
          return {
            id: p.id || (idx+1),
            name: p.title || p.name || 'Товар '+(idx+1),
            category: p.category || 'Прочее',
            price: Number(p.price) || 0,
            rating: Number(p.rating) || 4.5,
            orders: p.orders || 0,
            photo_url: p.photo_url || '',
            desc: p.desc || p.description || 'Описание отсутствует',
            material: p.material || 'PLA',
            dims: p.dims || p.dimensions || '—',
            weight: p.weight || '—',
            time: p.time || p.print_time || '—'
          };
        });

        // Build categories
        var cats = ['Все'];
        PRODUCTS.forEach(function(p){ if(cats.indexOf(p.category)===-1) cats.push(p.category); });
        CATEGORIES = cats;

        // Render filter buttons
        var fb = document.getElementById('filter-buttons');
        if (fb) {
          fb.innerHTML = CATEGORIES.map(function(c){
            return '<button class="filter-btn'+(c==='Все'?' active':'')+'" onclick="PF.filterCategory(\''+c.replace(/'/g,"\\'")+'\')">'+c+'</button>';
          }).join('');
        }

        // Initial renders
        if (document.getElementById('products-grid')) renderCatalog();
        if (document.getElementById('catalog-preview')) {
          document.getElementById('catalog-preview').innerHTML = PRODUCTS.slice(0,6).map(renderProductCard).join('');
        }
        if (document.getElementById('product-detail')) renderProductDetail();
        if (document.getElementById('orders-list')) renderOrders();
      })
      .catch(function(err){ console.error('Failed to load products:', err); toast('Ошибка загрузки каталога'); });

    // Search
    var si = document.getElementById('search-input');
    if (si) {
      si.addEventListener('input', function(){
        searchQuery = this.value; currentPage = 1;
        if (document.getElementById('products-grid')) renderCatalog();
        if (document.getElementById('catalog-preview')) {
          var f = PRODUCTS.filter(function(p){return p.name.toLowerCase().indexOf(searchQuery.toLowerCase())>=0;});
          document.getElementById('catalog-preview').innerHTML = f.slice(0,6).map(renderProductCard).join('');
        }
      });
    }

    // Cart overlay click
    var co = document.getElementById('cart-overlay');
    if (co) co.onclick = function(){toggleCart(false);};
  }

  // ===== PRODUCT DETAIL PAGE =====
  function renderProductDetail() {
    var pd = document.getElementById('product-detail'); if (!pd) return;
    var id = parseInt(new URLSearchParams(window.location.search).get('id'));
    var p = PRODUCTS.find(function(x){return x.id===id;});
    if (!p) { pd.innerHTML = '<p style="text-align:center;padding:40px">Товар не найден</p>'; return; }
    var imgFile = p.photo_url.split('/').pop();
    document.title = p.name+' — PrintForge';
    var breadcrumb = document.getElementById('breadcrumb-name');
    if (breadcrumb) breadcrumb.textContent = p.name;
    pd.innerHTML =
      '<div class="product-detail-img"><img src="'+IMG_BASE+imgFile+'" alt="'+p.name+'" onerror="this.style.background=\'#e5e5e5\'"></div>'+
      '<div class="product-detail-info">'+
        '<div class="product-category" style="margin-bottom:8px">'+p.category+'</div>'+
        '<h1>'+p.name+'</h1>'+
        '<div class="price">'+fmt(p.price)+'</div>'+
        '<p class="desc">'+p.desc+'</p>'+
        '<dl class="product-specs">'+
          '<dt>Материал</dt><dd>'+p.material+'</dd>'+
          '<dt>Размеры</dt><dd>'+p.dims+'</dd>'+
          '<dt>Вес</dt><dd>'+p.weight+'</dd>'+
          '<dt>Время печати</dt><dd>'+p.time+'</dd>'+
          '<dt>Заказов</dt><dd>'+p.orders+'</dd>'+
        '</dl>'+
        '<button class="btn btn-primary" onclick="PF.addToCart('+p.id+')">В корзину — '+fmt(p.price)+'</button>'+
      '</div>';
  }

  // ===== ORDERS PAGE =====
  function renderOrders() {
    var ol = document.getElementById('orders-list'); if (!ol) return;
    var orders = getOrders();
    if (orders.length===0) { ol.innerHTML='<div style="text-align:center;padding:60px;color:#999"><p>Заказов пока нет</p></div>'; }
    else {
      ol.innerHTML = orders.map(function(o){
        return '<div class="order-card">'+
          '<div class="order-header"><span class="order-id">'+o.id+'</span><span class="order-date">'+o.date+'</span></div>'+
          '<ul class="order-items">'+o.items.map(function(i){return '<li><span>'+i.title+' × '+i.qty+'</span><span>'+fmt(i.price*i.qty)+'</span></li>';}).join('')+'</ul>'+
          '<div class="order-contact">'+o.name+' · '+o.phone+(o.email?' · '+o.email:'')+(o.address?'<br>Адрес: '+o.address:'')+(o.comment?'<br>Комментарий: '+o.comment:'')+'</div>'+
          '<div class="order-total-line">'+fmt(o.total)+'</div>'+
        '</div>';
      }).join('');
    }
  }

  // Expose to global
  window.PF = {
    addToCart:addToCart, removeFromCart:removeFromCart, changeQty:changeQty,
    toggleCart:toggleCart, openCheckout:openCheckout, submitOrder:submitOrder,
    openProduct:openProduct, filterCategory:filterCategory, sortProducts:sortProducts
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();