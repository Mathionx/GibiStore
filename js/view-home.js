/* js/view-home.js */
// ============================================================================
// GIBI STORE v3 — #home view
// Guests see a hero + value cards above the feed; everyone (guest or not)
// can browse the feed. Reserving/selling prompts login. Renders its own
// topbar (search + category chips) since it only belongs on this view.
// ============================================================================

const ViewHome = {
  listings: [],
  category: 'All',
  query: '',
  channel: null,

  registerRoute() {
    Router.register('home', { render: (el) => this.render(el), tab: true, title: 'Home' });
  },

  async render(el) {
    const guest = !Auth.isLoggedIn;

    el.innerHTML = `
      ${guest ? `
        <section class="hero">
          <div class="brand-mark" style="margin:0 auto 12px;"><img src="icons/icon-192.png" alt="Gibi Store"></div>
          <h1>Buy, Sell &amp; Trade — Right on Campus.</h1>
          <p>Gibi Store connects you with students on your own campus — textbooks, electronics, dorm gear, and more, priced in ETB.</p>
          <div class="hero-cta">
            <button class="btn btn-accent" id="btn-hero-signup" type="button">Get Started</button>
            <button class="btn btn-outline" id="btn-hero-login" style="background:#fff;" type="button">Log In</button>
          </div>
          <div class="hero-badge">${Icon('gift', 15)}&nbsp; ${AppSettings.launch_mode ? escapeHTML(AppSettings.launch_banner_text) : 'Sign up and get 3 free listing passes'}</div>
        </section>
        <div class="value-cards">
          <div class="value-card"><div class="state-icon">${Icon('cap', 24)}</div><h3>Campus Verified</h3><p>Sign up with your .edu email for a verified badge.</p></div>
          <div class="value-card"><div class="state-icon">${Icon('coin', 24)}</div><h3>Priced in ETB</h3><p>Low fees on completed trades — your first 3 listings are free.</p></div>
          <div class="value-card"><div class="state-icon">${Icon('gift', 24)}</div><h3>Earn Rewards</h3><p>Get points for trades &amp; referrals, redeem for airtime.</p></div>
        </div>
      ` : `
        <header class="topbar" id="home-topbar">
          <div class="topbar-brand">
            <div class="brand">
                <div class="brand-mark">
                    <img src="icons/icon-192.png" alt="Gibi Store">
                </div> 
                <div class="logo">GIBI STORE</div>
            </div>
            <div class="topbar-actions">
              <div class="pill-stat" id="points-pill">${StarIcon(true, 13)} <span id="topbar-points">0</span></div>
              <button class="icon-btn" id="open-search-btn" type="button">${Icon('search', 18)}</button>
              <button class="icon-btn" id="notif-bell" type="button">${Icon('bell', 19)}<span class="notif-dot hidden" id="notif-dot"></span></button>
            </div>
          </div>
          <div class="search-wrap">
            <span class="search-icon">${Icon('search', 17)}</span>
            <input type="text" class="search-input" id="search-input" placeholder="Search for textbooks, gadgets, snacks…" />
          </div>
          <div class="chip-row" id="chip-row">
            <button class="chip active" data-category="All" type="button">All</button>
            <button class="chip" data-category="Textbooks" type="button">Textbooks</button>
            <button class="chip" data-category="Electronics" type="button">Electronics</button>
            <button class="chip" data-category="DormGear" type="button">Dorm Gear</button>
            <button class="chip" data-category="Snacks" type="button">Snacks</button>
            <button class="chip" data-category="Services" type="button">Services</button>
            <button class="chip" data-category="Clothes" type="button">Clothes</button>
            <button class="chip" data-category="Shoes" type="button">Shoes</button>
          </div>
        </header>
        ${AppSettings.launch_mode ? `<div class="section-pad" style="padding:10px 18px 0;"><div class="field hint" style="background:var(--primary-soft);color:var(--primary);padding:10px 14px;border-radius:var(--radius-sm);margin:0;">${escapeHTML(AppSettings.launch_banner_text)}</div></div>` : ''}
        <div id="notif-dropdown" class="notif-dropdown hidden"></div>
      `}
      <div id="feed-grid" class="feed-grid"></div>
    `;

    if (guest) {
      document.getElementById('btn-hero-signup').addEventListener('click', () => Router.go('#signup'));
      document.getElementById('btn-hero-login').addEventListener('click', () => Router.go('#login'));
    } else {
      document.getElementById('search-input').addEventListener('input', (e) => {
        this.query = e.target.value.trim().toLowerCase();
        this.renderGrid();
      });
      document.getElementById('chip-row').addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        document.querySelectorAll('#chip-row .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.category = chip.dataset.category;
        this.renderGrid();
      });
      document.getElementById('topbar-points').textContent = Auth.profile?.points ?? 0;
      document.getElementById('open-search-btn').addEventListener('click', () => Router.go('#search'));
      Notifications.init();
    }

    await this.load();
  },

  async load() {
    const grid = document.getElementById('feed-grid');
    if (!grid) return;
    grid.innerHTML = this.skeletonHTML(8);

    const { data, error } = await supabaseClient
      .from('listings')
      .select('*, profiles:seller_id ( name, campus_verified, total_rating, rating_count, university )')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="state-icon">${Icon('alert', 24)}</div><h3>Couldn't load listings</h3><p>${escapeHTML(error.message)}</p></div>`;
      return;
    }

    this.listings = data || [];
    const myUni = Auth.profile ? Auth.profile.university : null;
    if (myUni) {
      this.listings.sort((a, b) => (a.profiles?.university === myUni ? 0 : 1) - (b.profiles?.university === myUni ? 0 : 1));
    }
    this.renderGrid();
    this.subscribeRealtime();
  },

  subscribeRealtime() {
    if (this.channel) supabaseClient.removeChannel(this.channel);
    this.channel = supabaseClient
      .channel('public:listings:home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => this.load())
      .subscribe();
  },

  renderGrid() {
    const grid = document.getElementById('feed-grid');
    if (!grid) return;
    let items = this.listings;
    if (this.category !== 'All') items = items.filter(l => l.category === this.category);
    if (this.query) items = items.filter(l => l.title.toLowerCase().includes(this.query));

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="state-icon">${Icon('bag', 24)}</div><h3>No items found</h3><p>Try a different search or category — or be the first to list something!</p></div>`;
      return;
    }

    grid.innerHTML = items.map(l => this.cardHTML(l)).join('');

    grid.querySelectorAll('[data-reserve-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!Auth.isLoggedIn) { Router.go('#login'); return; }
        const listing = this.listings.find(l => String(l.id) === btn.dataset.reserveId);
        if (typeof Order !== 'undefined') Order.open(listing);
        else showToast('Reserve flow coming in the next build.', '');
      });
    });

    grid.querySelectorAll('[data-card-id]').forEach(card => {
      card.addEventListener('click', () => Router.go(`#listing/${card.dataset.cardId}`));
    });
  },

  conditionClass(c) { return c === 'Like New' ? 'like-new' : c === 'Good' ? 'good' : 'fair'; },
  starsHTML(rating, count) {
    if (!count) return '';
    const r = Math.round(rating);
    let stars = '';
    for (let i = 0; i < 5; i++) stars += StarIcon(i < r, 11);
    return `<span class="rating-stars">${stars}<span class="count">(${count})</span></span>`;
  },

  cardHTML(l) {
    const images = (l.images && l.images.length) ? l.images : [`https://picsum.photos/seed/${l.id}/400`];
    const sellerName = l.profiles?.name || 'Student';
    const verified = l.profiles?.campus_verified;
    const isOwn = Auth.userId === l.seller_id;
    const hasDiscount = l.discount_price != null && l.discount_price < l.price;
    const displayPrice = hasDiscount ? l.discount_price : l.price;
    const stars = this.starsHTML(l.profiles?.total_rating || 0, l.profiles?.rating_count || 0);

    return `
      <div class="card" data-card-id="${l.id}">
        <div class="card-image-wrap">
          <img src="${escapeAttr(images[0])}" alt="${escapeAttr(l.title)}" loading="lazy" onerror="this.src='https://picsum.photos/seed/fallback${l.id}/400'">
          <span class="badge ${this.conditionClass(l.condition)}">${escapeHTML(l.condition)}</span>
          ${hasDiscount ? `<span class="badge discount">SALE</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-title">${escapeHTML(l.title)}</div>
          <div class="card-price-row">
            <span class="card-price">${Number(displayPrice).toFixed(0)} ${CURRENCY}</span>
            ${hasDiscount ? `<span class="card-price strike">${Number(l.price).toFixed(0)} ${CURRENCY}</span>` : ''}
          </div>
          <div class="card-seller">${escapeHTML(sellerName)} ${verified ? `<span class="verified-shield icon-inline" title="Campus verified">${Icon('shield', 13)}</span>` : ''}</div>
          ${stars || ''}
          <div class="card-location"><span class="icon-inline">${Icon('pin', 13)}</span> ${escapeHTML(l.pickup_location || 'Campus')}</div>
          ${isOwn
            ? `<button class="btn-reserve" disabled style="opacity:.6;">Your Listing</button>`
            : `<button class="btn-reserve" data-reserve-id="${l.id}">Reserve &amp; Contact</button>`}
        </div>
      </div>`;
  },

  skeletonHTML(n) {
    return Array.from({ length: n }).map(() => `
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>`).join('');
  }
};
