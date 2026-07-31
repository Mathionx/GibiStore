/* js/view-seller.js */
// ============================================================================
// GIBI STORE v3 — #seller/:id view
// Public page for any seller: avatar, verified badge, star rating, trade
// count, and a grid of their active listings.
// ============================================================================

const ViewSeller = {
  registerRoute() {
    Router.register('seller', { render: (el, params) => this.render(el, params[0]), title: 'Seller' });
  },

  async render(el, id) {
    el.innerHTML = `<div class="spinner"></div>`;

    const { data: seller, error } = await supabaseClient.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error || !seller) {
      el.innerHTML = `<div class="subpage-header"><button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button><h1>Seller</h1></div>
        <div class="empty-state"><div class="state-icon">${Icon('alert', 24)}</div><h3>Seller not found</h3></div>`;
      document.getElementById('back-btn').addEventListener('click', () => Router.back());
      return;
    }

    const { data: listings } = await supabaseClient
      .from('listings').select('*').eq('seller_id', id).eq('status', 'active').order('created_at', { ascending: false });

    const r = Math.round(seller.total_rating || 0);
    let starsHTML = '';
    for (let i = 0; i < 5; i++) starsHTML += StarIcon(i < r, 14);

    el.innerHTML = `
      <div class="subpage-header">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1>Seller Profile</h1>
      </div>
      <div class="section-pad" style="padding-top:0;display:flex;align-items:center;gap:14px;">
        <div class="avatar-circle" style="width:72px;height:72px;font-size:26px;">
          ${seller.avatar_url ? `<img src="${escapeAttr(seller.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : (seller.name || 'S').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-size:18px;font-weight:800;display:flex;align-items:center;gap:6px;">
            ${escapeHTML(seller.name || 'Student')} ${seller.campus_verified ? `<span class="verified-shield icon-inline">${Icon('shield', 15)}</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHTML(seller.university || '')}${seller.campus ? ' · ' + escapeHTML(seller.campus) : ''}</div>
          <div class="icon-inline" style="margin-top:6px;">${starsHTML}<span style="margin-left:6px;font-size:12px;color:var(--text-muted);">${seller.rating_count ? `(${seller.rating_count})` : 'No ratings yet'}</span></div>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);">
        <div class="stat-card"><div class="stat-value">${seller.completed_trades || 0}</div><div class="stat-label">Completed Trades</div></div>
        <div class="stat-card"><div class="stat-value">${(listings || []).length}</div><div class="stat-label">Active Listings</div></div>
      </div>

      <div class="section-title">Active Listings</div>
      <div class="feed-grid" id="seller-listings"></div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.back());

    const grid = document.getElementById('seller-listings');
    if (!listings || listings.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="state-icon">${Icon('box', 24)}</div><h3>No active listings</h3></div>`;
      return;
    }

    grid.innerHTML = listings.map(l => {
      const images = (l.images && l.images.length) ? l.images : [`https://picsum.photos/seed/${l.id}/400`];
      const hasDiscount = l.discount_price != null && l.discount_price < l.price;
      const displayPrice = hasDiscount ? l.discount_price : l.price;
      return `
        <div class="card" data-card-id="${l.id}">
          <div class="card-image-wrap">
            <img src="${escapeAttr(images[0])}" alt="${escapeAttr(l.title)}" loading="lazy">
            <span class="badge ${l.condition === 'Like New' ? 'like-new' : l.condition === 'Good' ? 'good' : 'fair'}">${escapeHTML(l.condition)}</span>
          </div>
          <div class="card-body">
            <div class="card-title">${escapeHTML(l.title)}</div>
            <div class="card-price">${Number(displayPrice).toFixed(0)} ${CURRENCY}</div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-card-id]').forEach(card => {
      card.addEventListener('click', () => Router.go(`#listing/${card.dataset.cardId}`));
    });
  }
};
