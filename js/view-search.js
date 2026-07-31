/* js/view-search.js */
// ============================================================================
// GIBI STORE v3 — #search view
// Advanced filtering beyond the home feed's quick chips: price range,
// condition, campus, and sort order. Reuses ViewHome's card renderer so
// listing cards look and behave identically everywhere in the app.
// ============================================================================

const ViewSearch = {
  allListings: [],

  registerRoute() {
    Router.register('search', { render: (el) => this.render(el), title: 'Search' });
  },

  async render(el) {
    el.innerHTML = `
      <div class="subpage-header">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1>Search &amp; Filters</h1>
      </div>
      <div class="section-pad" style="padding-top:0;">
        <div class="search-wrap" style="margin-bottom:14px;">
          <span class="search-icon" style="color:var(--text-muted);">${Icon('search', 17)}</span>
          <input type="text" class="search-input" id="q" placeholder="Search by title…" style="box-shadow:none;border:1.5px solid var(--border);" />
        </div>

        <div class="field">
          <label>Price Range (${CURRENCY})</label>
          <div style="display:flex;gap:8px;">
            <input type="number" id="price-min" placeholder="Min" min="0" />
            <input type="number" id="price-max" placeholder="Max" min="0" />
          </div>
        </div>

        <div class="field">
          <label>Condition</label>
          <div class="pill-group" id="condition-filter">
            <div class="pill-option selected" data-value="">Any</div>
            <div class="pill-option" data-value="Like New">Like New</div>
            <div class="pill-option" data-value="Good">Good</div>
            <div class="pill-option" data-value="Fair">Fair</div>
          </div>
        </div>

        <div class="field">
          <label>Category</label>
          <select id="category-filter">
            <option value="">All categories</option>
            <option>Textbooks</option><option>Electronics</option><option>DormGear</option>
            <option>Snacks</option><option>Services</option><option>Clothes</option><option>Shoes</option>
          </select>
        </div>

        <div class="field">
          <label>Sort By</label>
          <select id="sort-filter">
            <option value="newest">Newest first</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>

        <button class="btn btn-primary btn-block" id="apply-filters" type="button">Apply Filters</button>
      </div>
      <div class="section-title">Results</div>
      <div class="feed-grid" id="search-results"></div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.back());

    document.getElementById('condition-filter').addEventListener('click', (e) => {
      const pill = e.target.closest('.pill-option');
      if (!pill) return;
      document.querySelectorAll('#condition-filter .pill-option').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
    });

    document.getElementById('apply-filters').addEventListener('click', () => this.applyFilters());
    document.getElementById('q').addEventListener('input', () => this.applyFilters());

    await this.loadAll();
    this.applyFilters();
  },

  async loadAll() {
    const { data } = await supabaseClient
      .from('listings')
      .select('*, profiles:seller_id ( name, campus_verified, total_rating, rating_count )')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    this.allListings = data || [];
  },

  applyFilters() {
    const grid = document.getElementById('search-results');
    const q = document.getElementById('q').value.trim().toLowerCase();
    const min = parseFloat(document.getElementById('price-min').value);
    const max = parseFloat(document.getElementById('price-max').value);
    const condition = document.querySelector('#condition-filter .pill-option.selected')?.dataset.value || '';
    const category = document.getElementById('category-filter').value;
    const sort = document.getElementById('sort-filter').value;

    let items = [...this.allListings];
    if (q) items = items.filter(l => l.title.toLowerCase().includes(q));
    if (!isNaN(min)) items = items.filter(l => Number(l.discount_price || l.price) >= min);
    if (!isNaN(max)) items = items.filter(l => Number(l.discount_price || l.price) <= max);
    if (condition) items = items.filter(l => l.condition === condition);
    if (category) items = items.filter(l => l.category === category);

    if (sort === 'price-low') items.sort((a, b) => Number(a.discount_price || a.price) - Number(b.discount_price || b.price));
    else if (sort === 'price-high') items.sort((a, b) => Number(b.discount_price || b.price) - Number(a.discount_price || a.price));

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="state-icon">${Icon('search', 24)}</div><h3>No matches</h3><p>Try widening your filters.</p></div>`;
      return;
    }

    grid.innerHTML = items.map(l => ViewHome.cardHTML.call(ViewHome, l)).join('');

    grid.querySelectorAll('[data-reserve-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!Auth.isLoggedIn) { Router.go('#login'); return; }
        const listing = items.find(l => String(l.id) === btn.dataset.reserveId);
        Order.open(listing);
      });
    });
    grid.querySelectorAll('[data-card-id]').forEach(card => {
      card.addEventListener('click', () => Router.go(`#listing/${card.dataset.cardId}`));
    });
  }
};
