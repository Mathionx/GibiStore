/* js/view-admin.js */
// ============================================================================
// GIBI STORE v3 — #admin view
// Visible to 'admin' and 'super_admin' roles (route guard enforces this;
// RLS + in_admin_scope() enforce it server-side too). Tabs: Orders,
// Listings, Users, Reports, Stats. Super admins get a button through to
// the Owner Panel.
// ============================================================================

const ViewAdmin = {
  activeTab: 'orders',
  ordersChannel: null,

  registerRoute() {
    Router.register('admin', { render: (el) => this.render(el), auth: true, role: 'admin', tab: true, title: 'Admin' });
  },

  render(el) {
    const p = Auth.profile;
    const scopeText = p.role === 'super_admin'
      ? 'Viewing all universities and campuses (super admin).'
      : `Scope: ${p.assigned_university || 'All universities'}${p.assigned_campus ? ' · ' + p.assigned_campus : ''}`;

    el.innerHTML = `
      <div class="subpage-header">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1>Admin Dashboard</h1>
        ${Auth.isSuperAdmin ? `<button class="icon-btn" id="owner-btn" style="background:var(--gray-bg);color:var(--text);" title="Owner Panel">${Icon('shield', 17)}</button>` : ''}
      </div>
      <div class="section-pad" style="padding:0 18px 10px;font-size:12.5px;color:var(--text-muted);background:var(--gray-bg);margin:0 18px 12px;border-radius:var(--radius-sm);">
        <p style="margin:10px 0;">${scopeText}</p>
      </div>
      <div class="admin-tabs" style="display:flex;gap:6px;padding:0 18px 12px;overflow-x:auto;">
        ${['orders', 'listings', 'users', 'reports', 'stats'].map(t => `
          <button class="small-btn ${this.activeTab === t ? 'btn-primary' : 'btn-ghost'}" data-admin-tab="${t}" style="padding:8px 14px;text-transform:capitalize;white-space:nowrap;">${t}</button>
        `).join('')}
      </div>
      <div id="admin-content"></div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.go('#home'));
    document.getElementById('owner-btn')?.addEventListener('click', () => Router.go('#owner'));

    el.querySelectorAll('[data-admin-tab]').forEach(btn => {
      btn.addEventListener('click', () => { this.activeTab = btn.dataset.adminTab; this.render(el); });
    });

    this.renderTab();
  },

  renderTab() {
    const content = document.getElementById('admin-content');
    content.innerHTML = `<div class="spinner"></div>`;
    if (this.activeTab === 'orders') return this.renderOrders();
    if (this.activeTab === 'listings') return this.renderListings();
    if (this.activeTab === 'users') return this.renderUsers();
    if (this.activeTab === 'reports') return this.renderReports();
    if (this.activeTab === 'stats') return this.renderStats();
  },

  subscribeRealtime() {
    if (this.ordersChannel) return;
    this.ordersChannel = supabaseClient
      .channel('public:admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (this.activeTab === 'orders' || this.activeTab === 'stats') this.renderTab();
      })
      .subscribe();
  },

  async renderOrders() {
    const content = document.getElementById('admin-content');
    const { data, error } = await supabaseClient
      .from('orders')
      .select(`
        id, status, created_at, fee_amount, buyer_phone, buyer_dorm, buyer_block, buyer_campus,
        pickup_location_type, pickup_location_other,
        listing:listing_id ( title, price, discount_price ),
        buyer:buyer_id ( name, phone, university, campus ),
        seller:seller_id ( name, phone, university, campus )
      `)
      .order('created_at', { ascending: false });

    if (error) { content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(error.message)}</p></div>`; return; }
    if (!data || data.length === 0) { content.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('box', 24)}</div><h3>No orders yet</h3></div>`; return; }

    content.innerHTML = data.map(o => `
      <div class="admin-card">
        <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;display:flex;justify-content:space-between;">
          <span>${escapeHTML(o.listing?.title || 'Listing removed')}</span>
          <span class="status-tag ${o.status}">${o.status}</span>
        </div>
        <div class="admin-row"><span>Price</span><span>${Number(o.listing?.discount_price || o.listing?.price || 0).toFixed(0)} ${CURRENCY}</span></div>
        <div class="admin-row"><span>Fee</span><span>${Number(o.fee_amount || 0).toFixed(0)} ${CURRENCY}</span></div>
        <div class="admin-row"><span>Buyer</span><span>${escapeHTML(o.buyer?.name || '—')}</span></div>
        <div class="admin-row"><span>Buyer Phone</span><span>${escapeHTML(o.buyer_phone || '—')}</span></div>
        <div class="admin-row"><span>Pickup</span><span>${o.pickup_location_type === 'other' ? escapeHTML(o.pickup_location_other || '') : `${escapeHTML(o.buyer_dorm)} / ${escapeHTML(o.buyer_block)}`}</span></div>
        <div class="admin-row"><span>Campus</span><span>${escapeHTML(o.buyer_campus || o.buyer?.campus || '—')}</span></div>
        <div class="admin-row"><span>Seller</span><span>${escapeHTML(o.seller?.name || '—')}</span></div>
        <div class="admin-row"><span>Seller Phone</span><span>${escapeHTML(o.seller?.phone || '—')}</span></div>
        <div class="admin-row"><span>Date</span><span>${new Date(o.created_at).toLocaleString()}</span></div>
      </div>
    `).join('');

    this.subscribeRealtime();
  },

  async renderListings() {
    const content = document.getElementById('admin-content');
    const { data, error } = await supabaseClient
      .from('listings').select('*, profiles:seller_id ( name, university, campus )').order('created_at', { ascending: false });

    if (error) { content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(error.message)}</p></div>`; return; }
    if (!data || data.length === 0) { content.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('box', 24)}</div><h3>No listings yet</h3></div>`; return; }

    content.innerHTML = data.map(l => `
      <div class="list-row">
        <img src="${escapeAttr((l.images && l.images[0]) || `https://picsum.photos/seed/${l.id}/200`)}" alt="">
        <div class="list-row-body">
          <div class="list-row-title">${escapeHTML(l.title)}</div>
          <div class="list-row-meta">${Number(l.price).toFixed(0)} ${CURRENCY} · ${escapeHTML(l.profiles?.name || 'Unknown')} · <span class="status-tag ${l.status}">${l.status}</span></div>
        </div>
        <button class="small-btn btn-danger" data-remove-listing="${l.id}">Remove</button>
      </div>
    `).join('');

    content.querySelectorAll('[data-remove-listing]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Remove this listing?')) return;
      const { error } = await supabaseClient.from('listings').update({ status: 'deleted' }).eq('id', btn.dataset.removeListing);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Listing removed.', 'success');
      this.renderListings();
    }));
  },

  async renderUsers() {
    const content = document.getElementById('admin-content');
    const { data, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });

    if (error) { content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(error.message)}</p></div>`; return; }

    content.innerHTML = (data || []).map(u => `
      <div class="list-row">
        <div class="avatar-circle-sm">${(u.name || 'U').charAt(0).toUpperCase()}</div>
        <div class="list-row-body">
          <div class="list-row-title" style="display:flex;align-items:center;gap:6px;">
            ${escapeHTML(u.name || 'Unnamed')} ${u.campus_verified ? `<span class="icon-inline">${Icon('shield', 12)}</span>` : ''}
            <span class="status-tag ${u.role === 'banned' ? 'banned' : 'active'}">${u.role}</span>
          </div>
          <div class="list-row-meta">${escapeHTML(u.email || '—')} · ${escapeHTML(u.university || 'No university')} ${u.campus ? '· ' + escapeHTML(u.campus) : ''}</div>
        </div>
        ${Auth.isSuperAdmin
          ? (u.role === 'banned'
            ? `<button class="small-btn btn-primary" data-unban="${u.id}">Unban</button>`
            : `<button class="small-btn btn-danger" data-ban="${u.id}">Ban</button>`)
          : ''}
      </div>
    `).join('');

    content.querySelectorAll('[data-ban]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Ban this user?')) return;
      const { error } = await supabaseClient.from('profiles').update({ role: 'banned' }).eq('id', btn.dataset.ban);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('User banned.', 'success'); this.renderUsers();
    }));
    content.querySelectorAll('[data-unban]').forEach(btn => btn.addEventListener('click', async () => {
      const { error } = await supabaseClient.from('profiles').update({ role: 'user' }).eq('id', btn.dataset.unban);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('User unbanned.', 'success'); this.renderUsers();
    }));
  },

  async renderReports() {
    const content = document.getElementById('admin-content');
    const { data, error } = await supabaseClient
      .from('reports').select('*, reporter:reporter_id(name), reported:reported_seller_id(name)').order('created_at', { ascending: false });

    if (error) { content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(error.message)}</p></div>`; return; }
    if (!data || data.length === 0) { content.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('alert', 24)}</div><h3>No reports</h3></div>`; return; }

    content.innerHTML = data.map(r => `
      <div class="admin-card">
        <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;">${escapeHTML(r.reason)}</div>
        <div class="admin-row"><span>Reporter</span><span>${escapeHTML(r.reporter?.name || '—')}</span></div>
        <div class="admin-row"><span>Reported</span><span>${escapeHTML(r.reported?.name || '—')}</span></div>
        <div class="admin-row"><span>Details</span><span>${escapeHTML(r.details || '—')}</span></div>
        <div class="admin-row"><span>Date</span><span>${new Date(r.created_at).toLocaleString()}</span></div>
      </div>
    `).join('');
  },

  async renderStats() {
    const content = document.getElementById('admin-content');
    const [{ count: listingCount }, { count: orderCount }, { count: userCount }] = await Promise.all([
      supabaseClient.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseClient.from('orders').select('*', { count: 'exact', head: true }),
      supabaseClient.from('profiles').select('*', { count: 'exact', head: true })
    ]);

    let feeHTML = '';
    if (Auth.isSuperAdmin) {
      const { data: fees } = await supabaseClient.from('orders').select('fee_amount').eq('status', 'completed');
      const total = (fees || []).reduce((sum, o) => sum + Number(o.fee_amount || 0), 0);
      feeHTML = `<div class="stat-card"><div class="stat-value">${total.toFixed(0)} ${CURRENCY}</div><div class="stat-label">Total Fees Collected</div></div>`;
    }

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${listingCount ?? 0}</div><div class="stat-label">Active Listings</div></div>
        <div class="stat-card"><div class="stat-value">${orderCount ?? 0}</div><div class="stat-label">Total Orders</div></div>
        <div class="stat-card"><div class="stat-value">${userCount ?? 0}</div><div class="stat-label">Users</div></div>
        ${feeHTML}
      </div>`;
  }
};
