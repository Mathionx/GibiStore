/* js/view-owner.js */
// ============================================================================
// GIBI STORE v3 — #owner view
// Only role = 'super_admin' can reach this (route guard + RLS both enforce
// it). The "Settings" tab is the flexible control panel: turn fees/rewards/
// referrals on or off, edit fee tiers, wallet floor, free-listings default,
// and launch mode — all without touching code, exactly as requested.
// ============================================================================

const ViewOwner = {
  activeTab: 'settings',

  registerRoute() {
    Router.register('owner', { render: (el) => this.render(el), auth: true, role: 'super_admin', title: 'Owner Panel' });
  },

  render(el) {
    el.innerHTML = `
      <div class="subpage-header" style="background:#0B1120;color:#fff;">
        <button class="subpage-back" id="back-btn" style="background:rgba(255,255,255,.12);color:#fff;">${Icon('chevronLeft', 18)}</button>
        <h1 style="color:#fff;">Owner Panel</h1>
      </div>
      <div class="owner-tabs" style="display:flex;gap:6px;padding:14px 18px 12px;overflow-x:auto;">
        ${['settings', 'universities', 'ads', 'social', 'faq', 'admins', 'finance'].map(t => `
          <button class="small-btn ${this.activeTab === t ? 'btn-primary' : 'btn-ghost'}" data-owner-tab="${t}" style="padding:8px 14px;text-transform:capitalize;white-space:nowrap;">${t}</button>
        `).join('')}
      </div>
      <div id="owner-content"></div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.go('#admin'));
    el.querySelectorAll('[data-owner-tab]').forEach(btn => {
      btn.addEventListener('click', () => { this.activeTab = btn.dataset.ownerTab; this.render(el); });
    });

    this.renderTab();
  },

  renderTab() {
    const content = document.getElementById('owner-content');
    content.innerHTML = `<div class="spinner"></div>`;
    if (this.activeTab === 'settings') return this.renderSettings();
    if (this.activeTab === 'universities') return this.renderUniversities();
    if (this.activeTab === 'ads') return this.renderAds();
    if (this.activeTab === 'social') return this.renderSocial();
    if (this.activeTab === 'faq') return this.renderFaq();
    if (this.activeTab === 'admins') return this.renderAdmins();
    if (this.activeTab === 'finance') return this.renderFinance();
  },

  // ================= SETTINGS (the flexible toggles) =================
  async renderSettings() {
    const content = document.getElementById('owner-content');
    const { data: s } = await supabaseClient.from('app_settings').select('*').eq('id', 1).maybeSingle();
    const settings = s || AppSettings;

    content.innerHTML = `
      <div class="section-pad" style="padding-top:0;">
        <div class="admin-card">
          <div style="font-weight:800;font-size:14.5px;margin-bottom:2px;">Launch Mode</div>
          <p style="margin:0 0 8px;font-size:12.5px;color:var(--text-muted);">Show a "founding member" banner and treat fees as waived for early adopters — good for your first cohort of students.</p>
          <div class="toggle-row"><span>Launch mode active</span><label class="switch"><input type="checkbox" id="s-launch-mode" ${settings.launch_mode ? 'checked' : ''}><span class="slider"></span></label></div>
          <div class="field" style="margin-top:10px;"><label for="s-launch-text">Banner Text</label><input type="text" id="s-launch-text" value="${escapeAttr(settings.launch_banner_text || '')}" /></div>
        </div>

        <div class="admin-card">
          <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;">Core Systems</div>
          <div class="toggle-row"><span>Marketplace fees enabled</span><label class="switch"><input type="checkbox" id="s-fees" ${settings.fees_enabled ? 'checked' : ''}><span class="slider"></span></label></div>
          <div class="toggle-row"><span>Points &amp; rewards enabled</span><label class="switch"><input type="checkbox" id="s-rewards" ${settings.rewards_enabled ? 'checked' : ''}><span class="slider"></span></label></div>
          <div class="toggle-row"><span>Referral bonuses enabled</span><label class="switch"><input type="checkbox" id="s-referrals" ${settings.referrals_enabled ? 'checked' : ''}><span class="slider"></span></label></div>
        </div>

        <div class="admin-card">
          <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;">Fee Tiers (${CURRENCY})</div>
          <p style="margin:0 0 10px;font-size:12.5px;color:var(--text-muted);">Only used when fees are enabled above.</p>
          <div class="field"><label>Tier 1: items up to</label><div style="display:flex;gap:8px;"><input type="number" id="s-t1-max" value="${settings.fee_tier1_max}" placeholder="Max price"><input type="number" id="s-t1-fee" value="${settings.fee_tier1_fee}" placeholder="Fee"></div></div>
          <div class="field"><label>Tier 2: items up to</label><div style="display:flex;gap:8px;"><input type="number" id="s-t2-max" value="${settings.fee_tier2_max}" placeholder="Max price"><input type="number" id="s-t2-fee" value="${settings.fee_tier2_fee}" placeholder="Fee"></div></div>
          <div class="field"><label>Tier 3: anything above</label><input type="number" id="s-t3-fee" value="${settings.fee_tier3_fee}" placeholder="Fee"></div>
        </div>

        <div class="admin-card">
          <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;">Wallet &amp; Listings</div>
          <div class="field"><label>Wallet floor (${CURRENCY}, negative)</label><input type="number" id="s-floor" value="${settings.wallet_floor}"></div>
          <div class="field"><label>Free listings per new user</label><input type="number" id="s-free" value="${settings.free_listings_default}" min="0"></div>
        </div>

        <button class="btn btn-primary btn-block" id="save-settings" type="button">Save Settings</button>
      </div>
    `;

    document.getElementById('save-settings').addEventListener('click', async () => {
      const payload = {
        launch_mode: document.getElementById('s-launch-mode').checked,
        launch_banner_text: document.getElementById('s-launch-text').value.trim(),
        fees_enabled: document.getElementById('s-fees').checked,
        rewards_enabled: document.getElementById('s-rewards').checked,
        referrals_enabled: document.getElementById('s-referrals').checked,
        fee_tier1_max: parseFloat(document.getElementById('s-t1-max').value) || 0,
        fee_tier1_fee: parseFloat(document.getElementById('s-t1-fee').value) || 0,
        fee_tier2_max: parseFloat(document.getElementById('s-t2-max').value) || 0,
        fee_tier2_fee: parseFloat(document.getElementById('s-t2-fee').value) || 0,
        fee_tier3_fee: parseFloat(document.getElementById('s-t3-fee').value) || 0,
        wallet_floor: parseFloat(document.getElementById('s-floor').value) || 0,
        free_listings_default: parseInt(document.getElementById('s-free').value) || 0
      };
      const { error } = await supabaseClient.from('app_settings').update(payload).eq('id', 1);
      if (error) { showToast(error.message, 'error'); return; }
      await AppSettings.load();
      showToast('Settings saved — live across the app immediately.', 'success');
    });
  },

  // ================= UNIVERSITIES & CAMPUSES =================
  async renderUniversities() {
    const content = document.getElementById('owner-content');
    const { data: unis } = await supabaseClient.from('universities').select('*').order('name');
    const { data: campuses } = await supabaseClient.from('campuses').select('*').order('name');

    content.innerHTML = `
      <div class="section-pad" style="padding-top:0;">
        <form id="add-uni-form" style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="new-uni-name" placeholder="New university name" style="flex:1;padding:10px;border-radius:8px;border:1.5px solid var(--border);">
          <button class="btn btn-primary" type="submit">Add</button>
        </form>
        ${(unis || []).map(u => `
          <div class="admin-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:700;">${escapeHTML(u.name)}</span>
              <button class="small-btn btn-danger" data-del-uni="${u.id}">Delete</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${(campuses || []).filter(c => c.university_id === u.id).map(c => `
                <span style="background:var(--gray-bg);padding:5px 12px;border-radius:999px;font-size:12px;display:flex;align-items:center;gap:6px;">${escapeHTML(c.name)} <button data-del-campus="${c.id}" style="border:none;background:none;color:var(--danger);font-weight:800;cursor:pointer;">×</button></span>
              `).join('')}
              <form class="add-campus-form" data-uni-id="${u.id}" style="display:flex;gap:4px;">
                <input type="text" placeholder="Add campus…" style="padding:5px 8px;border-radius:999px;border:1.5px solid var(--border);font-size:12px;width:120px;">
                <button class="small-btn btn-ghost" type="submit">+</button>
              </form>
            </div>
          </div>
        `).join('')}
      </div>`;

    document.getElementById('add-uni-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-uni-name').value.trim();
      if (!name) return;
      const { error } = await supabaseClient.from('universities').insert({ name });
      if (error) { showToast(error.message, 'error'); return; }
      showToast('University added.', 'success'); this.renderUniversities();
    });
    content.querySelectorAll('.add-campus-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        const name = input.value.trim();
        if (!name) return;
        const { error } = await supabaseClient.from('campuses').insert({ university_id: parseInt(form.dataset.uniId), name });
        if (error) { showToast(error.message, 'error'); return; }
        this.renderUniversities();
      });
    });
    content.querySelectorAll('[data-del-uni]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this university and all its campuses?')) return;
      await supabaseClient.from('universities').delete().eq('id', btn.dataset.delUni);
      this.renderUniversities();
    }));
    content.querySelectorAll('[data-del-campus]').forEach(btn => btn.addEventListener('click', async () => {
      await supabaseClient.from('campuses').delete().eq('id', btn.dataset.delCampus);
      this.renderUniversities();
    }));
  },

  // ================= ADS =================
  async renderAds() {
    const content = document.getElementById('owner-content');
    const { data } = await supabaseClient.from('ads').select('*').order('id', { ascending: false });

    content.innerHTML = `
      <div class="section-pad" style="padding-top:0;">
        <form id="add-ad-form" class="admin-card">
          <div class="field"><label>Name</label><input type="text" id="ad-name" required></div>
          <div class="field"><label>Description</label><input type="text" id="ad-desc"></div>
          <div class="field"><label>Image URL</label><input type="text" id="ad-image"></div>
          <div class="field"><label>Link</label><input type="text" id="ad-link"></div>
          <button class="btn btn-primary btn-block" type="submit">Add Ad</button>
        </form>
        ${(data || []).map(ad => `
          <div class="admin-card">
            <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;display:flex;justify-content:space-between;">
              <span>${escapeHTML(ad.name)}</span><span class="status-tag ${ad.active ? 'active' : 'deleted'}">${ad.active ? 'active' : 'off'}</span>
            </div>
            <div class="admin-row"><span>Description</span><span>${escapeHTML(ad.description || '—')}</span></div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button class="small-btn btn-ghost" data-toggle-ad="${ad.id}" data-active="${ad.active}">${ad.active ? 'Turn Off' : 'Turn On'}</button>
              <button class="small-btn btn-danger" data-del-ad="${ad.id}">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>`;

    document.getElementById('add-ad-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await supabaseClient.from('ads').insert({
        name: document.getElementById('ad-name').value.trim(),
        description: document.getElementById('ad-desc').value.trim(),
        image_url: document.getElementById('ad-image').value.trim() || null,
        link: document.getElementById('ad-link').value.trim() || null
      });
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Ad added.', 'success'); this.renderAds();
    });
    content.querySelectorAll('[data-toggle-ad]').forEach(btn => btn.addEventListener('click', async () => {
      const active = btn.dataset.active === 'true';
      await supabaseClient.from('ads').update({ active: !active }).eq('id', btn.dataset.toggleAd);
      this.renderAds();
    }));
    content.querySelectorAll('[data-del-ad]').forEach(btn => btn.addEventListener('click', async () => {
      await supabaseClient.from('ads').delete().eq('id', btn.dataset.delAd);
      this.renderAds();
    }));
  },

  // ================= SOCIAL LINKS =================
  async renderSocial() {
    const content = document.getElementById('owner-content');
    const { data } = await supabaseClient.from('social_links').select('*').order('id');

    content.innerHTML = `
      <div class="section-pad" style="padding-top:0;">
        <form id="add-social-form" class="admin-card">
          <div class="field"><label>Platform</label><input type="text" id="social-platform" required placeholder="e.g. Telegram"></div>
          <div class="field"><label>URL</label><input type="text" id="social-url" required></div>
          <button class="btn btn-primary btn-block" type="submit">Add Link</button>
        </form>
        ${(data || []).map(s => `
          <div class="list-row">
            <div class="list-row-body"><div class="list-row-title">${escapeHTML(s.platform)}</div><div class="list-row-meta">${escapeHTML(s.url)}</div></div>
            <button class="small-btn btn-danger" data-del-social="${s.id}">Delete</button>
          </div>
        `).join('')}
      </div>`;

    document.getElementById('add-social-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await supabaseClient.from('social_links').insert({
        platform: document.getElementById('social-platform').value.trim(),
        url: document.getElementById('social-url').value.trim()
      });
      if (error) { showToast(error.message, 'error'); return; }
      this.renderSocial();
    });
    content.querySelectorAll('[data-del-social]').forEach(btn => btn.addEventListener('click', async () => {
      await supabaseClient.from('social_links').delete().eq('id', btn.dataset.delSocial);
      this.renderSocial();
    }));
  },

  // ================= FAQ =================
  async renderFaq() {
    const content = document.getElementById('owner-content');
    const { data } = await supabaseClient.from('faq').select('*').order('sort_order');

    content.innerHTML = `
      <div class="section-pad" style="padding-top:0;">
        <form id="add-faq-form" class="admin-card">
          <div class="field"><label>Question</label><input type="text" id="faq-q" required></div>
          <div class="field"><label>Answer</label><textarea id="faq-a" required></textarea></div>
          <button class="btn btn-primary btn-block" type="submit">Add FAQ</button>
        </form>
        ${(data || []).map(f => `
          <div class="list-row" style="align-items:flex-start;">
            <div class="list-row-body"><div class="list-row-title">${escapeHTML(f.question)}</div><div class="list-row-meta">${escapeHTML(f.answer)}</div></div>
            <button class="small-btn btn-danger" data-del-faq="${f.id}">Delete</button>
          </div>
        `).join('')}
      </div>`;

    document.getElementById('add-faq-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await supabaseClient.from('faq').insert({
        question: document.getElementById('faq-q').value.trim(),
        answer: document.getElementById('faq-a').value.trim(),
        sort_order: 999
      });
      if (error) { showToast(error.message, 'error'); return; }
      this.renderFaq();
    });
    content.querySelectorAll('[data-del-faq]').forEach(btn => btn.addEventListener('click', async () => {
      await supabaseClient.from('faq').delete().eq('id', btn.dataset.delFaq);
      this.renderFaq();
    }));
  },

  // ================= ADMIN PERMISSIONS =================
  async renderAdmins() {
    const content = document.getElementById('owner-content');
    const { data: profiles } = await supabaseClient.from('profiles').select('*').order('name');
    const { data: unis } = await supabaseClient.from('universities').select('*').order('name');
    const uniOptions = (unis || []).map(u => `<option value="${escapeAttr(u.name)}">${escapeHTML(u.name)}</option>`).join('');

    content.innerHTML = (profiles || []).filter(p => p.role !== 'banned').map(p => `
      <div class="admin-card">
        <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;display:flex;justify-content:space-between;">
          <span>${escapeHTML(p.name || 'Unnamed')}</span><span class="status-tag ${p.role === 'user' ? 'active' : 'completed'}">${p.role}</span>
        </div>
        <div class="admin-row"><span>Email</span><span>${escapeHTML(p.email || '—')}</span></div>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center;">
          <select data-uni-select="${p.id}" style="padding:6px;border-radius:6px;border:1.5px solid var(--border);font-size:12px;">
            <option value="">All universities</option>${uniOptions}
          </select>
          ${p.role === 'admin'
            ? `<button class="small-btn btn-danger" data-revoke="${p.id}">Revoke Admin</button>`
            : `<button class="small-btn btn-primary" data-promote="${p.id}">Make Admin</button>`}
        </div>
      </div>
    `).join('');

    content.querySelectorAll('[data-uni-select]').forEach(sel => {
      const p = (profiles || []).find(pr => pr.id === sel.dataset.uniSelect);
      if (p?.assigned_university) sel.value = p.assigned_university;
    });
    content.querySelectorAll('[data-promote]').forEach(btn => btn.addEventListener('click', async () => {
      const uni = document.querySelector(`[data-uni-select="${btn.dataset.promote}"]`).value || null;
      const { error } = await supabaseClient.from('profiles').update({ role: 'admin', assigned_university: uni }).eq('id', btn.dataset.promote);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Promoted to admin.', 'success'); this.renderAdmins();
    }));
    content.querySelectorAll('[data-revoke]').forEach(btn => btn.addEventListener('click', async () => {
      const { error } = await supabaseClient.from('profiles').update({ role: 'user', assigned_university: null, assigned_campus: null }).eq('id', btn.dataset.revoke);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Admin access revoked.', 'success'); this.renderAdmins();
    }));
  },

  // ================= FINANCE =================
  async renderFinance() {
    const content = document.getElementById('owner-content');
    const { data } = await supabaseClient.from('transactions').select('*').eq('type', 'fee').order('created_at', { ascending: false });

    const total = (data || []).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const last30 = (data || []).filter(t => (Date.now() - new Date(t.created_at).getTime()) < 30 * 24 * 3600 * 1000)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${total.toFixed(0)} ${CURRENCY}</div><div class="stat-label">All-Time Fees</div></div>
        <div class="stat-card"><div class="stat-value">${last30.toFixed(0)} ${CURRENCY}</div><div class="stat-label">Last 30 Days</div></div>
      </div>
      <div class="section-title">Recent Fee Transactions</div>
      <div class="section-pad" style="padding-top:0;">
        ${(data || []).slice(0, 30).map(t => `
          <div class="admin-card"><div class="admin-row"><span>${new Date(t.created_at).toLocaleDateString()}</span><span>${Math.abs(t.amount).toFixed(0)} ${CURRENCY}</span></div></div>
        `).join('') || `<div class="empty-state"><p>No fee transactions yet.</p></div>`}
      </div>`;
  }
};
