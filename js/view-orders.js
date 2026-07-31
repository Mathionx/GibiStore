/* js/view-orders.js */
// ============================================================================
// GIBI STORE v3 — #orders view
// Buying / Selling tabs. Whichever side you're on, tap the confirm button
// once you've met up — the DB settles fees/points once BOTH sides confirm.
// ============================================================================

const ViewOrders = {
  tab: 'buying',

  registerRoute() {
    Router.register('orders', { render: (el) => this.render(el), auth: true, tab: true, title: 'My Orders' });
  },

  render(el) {
    el.innerHTML = `
      <div class="subpage-header">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1>My Orders</h1>
      </div>
      <div class="order-tabs section-pad" style="display:flex;gap:8px;padding-top:0;">
        <button class="btn ${this.tab === 'buying' ? 'btn-primary' : 'btn-ghost'}" style="flex:1;" data-order-tab="buying" type="button">Buying</button>
        <button class="btn ${this.tab === 'selling' ? 'btn-primary' : 'btn-ghost'}" style="flex:1;" data-order-tab="selling" type="button">Selling</button>
      </div>
      <div id="orders-list"></div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.go('#home'));
    el.querySelectorAll('[data-order-tab]').forEach(btn => {
      btn.addEventListener('click', () => { this.tab = btn.dataset.orderTab; this.render(el); this.load(); });
    });

    this.load();
  },

  async load() {
    const el = document.getElementById('orders-list');
    if (!el) return;
    el.innerHTML = `<div class="spinner"></div>`;

    const column = this.tab === 'buying' ? 'buyer_id' : 'seller_id';
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*, listing:listing_id(title, images, price, discount_price), buyer:buyer_id(name,phone), seller:seller_id(name,phone)')
      .eq(column, Auth.userId)
      .order('created_at', { ascending: false });

    if (error) { el.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('alert', 24)}</div><h3>Error</h3><p>${escapeHTML(error.message)}</p></div>`; return; }

    if (!data || data.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('box', 24)}</div><h3>No orders yet</h3><p>${this.tab === 'buying' ? 'Reserve an item from the feed to see it here.' : 'Orders on your listings will show up here.'}</p></div>`;
      return;
    }

    el.innerHTML = data.map(o => {
      const price = o.listing?.discount_price || o.listing?.price || 0;
      const img = (o.listing?.images && o.listing.images[0]) || `https://picsum.photos/seed/o${o.id}/200`;
      const otherParty = this.tab === 'buying' ? o.seller : o.buyer;
      const myConfirmed = this.tab === 'buying' ? o.buyer_confirmed : o.seller_confirmed;
      const theirConfirmed = this.tab === 'buying' ? o.seller_confirmed : o.buyer_confirmed;

      return `
      <div class="list-row" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;gap:12px;align-items:center;">
          <img src="${escapeAttr(img)}" alt="">
          <div class="list-row-body">
            <div class="list-row-title">${escapeHTML(o.listing?.title || 'Listing removed')}</div>
            <div class="list-row-meta">${Number(price).toFixed(0)} ${CURRENCY} · ${this.tab === 'buying' ? 'Seller' : 'Buyer'}: ${escapeHTML(otherParty?.name || '—')}</div>
          </div>
          <span class="status-tag ${o.status}">${o.status}</span>
        </div>
        ${o.status !== 'cancelled' ? `
        <div style="display:flex;gap:8px;margin-top:10px;">
          <span class="status-tag ${myConfirmed ? 'completed' : 'pending'}">You: ${myConfirmed ? 'Confirmed' : 'Pending'}</span>
          <span class="status-tag ${theirConfirmed ? 'completed' : 'pending'}">${this.tab === 'buying' ? 'Seller' : 'Buyer'}: ${theirConfirmed ? 'Confirmed' : 'Pending'}</span>
        </div>
        ${o.status === 'pending' && !myConfirmed ? `
          <button class="btn btn-primary btn-block" style="margin-top:10px;" data-confirm="${o.id}">
            ${this.tab === 'buying' ? 'Confirm Received' : 'Mark as Sold'}
          </button>` : ''}
        ` : ''}
      </div>`;
    }).join('');

    el.querySelectorAll('[data-confirm]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          if (this.tab === 'buying') await Order.confirmAsBuyer(parseInt(btn.dataset.confirm));
          else await Order.confirmAsSeller(parseInt(btn.dataset.confirm));
          showToast('Confirmation recorded.', 'success');
          this.load();
        } catch (err) {
          showToast(err.message || 'Could not confirm.', 'error');
          btn.disabled = false;
        }
      });
    });
  }
};
