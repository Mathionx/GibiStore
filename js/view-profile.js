/* js/view-profile.js */
// ============================================================================
// GIBI STORE v3 — #profile view
// Wallet/points/referral header, tab strip for My Listings vs Settings,
// discount/mark-sold/delete on own listings, dark mode + notification
// toggles + change password + delete account + install-PWA button.
// ============================================================================

const ViewProfile = {
  tab: 'listings',
  deferredInstallPrompt: null,

  registerRoute() {
    Router.register('profile', { render: (el) => this.render(el), auth: true, tab: true, title: 'Profile' });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      document.getElementById('btn-install-pwa')?.classList.remove('hidden');
    });
  },

  render(el) {
    const p = Auth.profile;
    if (!p) { el.innerHTML = `<div class="spinner"></div>`; return; }

    el.innerHTML = `
      <div class="subpage-header">
        <h1>Profile</h1>
      </div>

      <div class="section-pad" style="padding-top:0;display:flex;align-items:center;gap:14px;">
              
        <div style="position:relative;" id="avatar-wrap">
            <div class="avatar-circle" style="cursor:pointer;">
                ${p.avatar_url ? `<img src="${escapeAttr(p.avatar_url)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : (p.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="avatar-edit-badge"
              style="position:absolute; bottom:-2px; right:-2px; cursor:pointer;"
              >${Icon('camera', 12)}</div>
        </div>
           
        <input type="file" id="avatar-input" accept="image/*" class="hidden" />
        <div>
          <div style="font-size:17px;font-weight:700;display:flex;align-items:center;gap:6px;">
            ${escapeHTML(p.name || 'Unnamed')} ${p.campus_verified ? `<span class="verified-shield icon-inline">${Icon('shield', 14)}</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--text-muted);">${escapeHTML(p.email || '')}</div>
        </div>
      </div>

      <div class="wallet-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:0 18px 16px;">
        <div class="value-card" style="padding:14px;"><div style="font-size:18px;font-weight:800;color:${p.wallet_balance < 0 ? 'var(--danger)' : 'var(--primary)'};">${Number(p.wallet_balance).toFixed(0)}</div><div style="font-size:11px;color:var(--text-muted);">Wallet (${CURRENCY})</div></div>
        <div class="value-card" style="padding:14px;"><div style="font-size:18px;font-weight:800;color:var(--primary);">${p.points}</div><div style="font-size:11px;color:var(--text-muted);">Points</div></div>
        <div class="value-card" style="padding:14px;"><div style="font-size:18px;font-weight:800;color:var(--primary);">${p.completed_trades}</div><div style="font-size:11px;color:var(--text-muted);">Trades</div></div>
      </div>

      <div class="section-pad" style="padding-top:0;margin-top:-8px;">
        <div class="hint">Free listings left: <strong>${p.free_listings_left}</strong> · <a href="#rewards" id="go-rewards" style="color:var(--primary);font-weight:700;">Go to Rewards</a></div>
      </div>

      <div class="referral-box" style="margin:0 18px 16px;background:var(--surface);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow-sm);">
        <div style="font-weight:800;font-size:14px;">Invite Friends</div>
        <p style="margin:4px 0 0;font-size:12.5px;color:var(--text-muted);">Share your code — you both get 20 points when they join.</p>
        <div style="display:flex;align-items:center;gap:8px;background:var(--gray-bg);border-radius:var(--radius-sm);padding:10px 12px;margin-top:10px;">
          <code style="font-weight:800;letter-spacing:.05em;flex:1;">${escapeHTML(p.referral_code || '—')}</code>
          <button class="small-btn btn-primary" id="btn-copy-referral">Copy</button>
        </div>
      </div>

      <div class="section-pad" style="padding-top:0;display:flex;gap:8px;">
        <button class="btn ${this.tab === 'listings' ? 'btn-primary' : 'btn-ghost'}" style="flex:1;" data-tab="listings" type="button">My Listings</button>
        <button class="btn ${this.tab === 'settings' ? 'btn-primary' : 'btn-ghost'}" style="flex:1;" data-tab="settings" type="button">Settings</button>
      </div>

      <div id="tab-content"></div>
    `;

    document.getElementById('go-rewards').addEventListener('click', (e) => { e.preventDefault(); Router.go('#rewards'); });
    document.getElementById('btn-copy-referral').addEventListener('click', () => {
      navigator.clipboard.writeText(p.referral_code || '').then(() => showToast('Referral code copied!', 'success'));
    });
    document.getElementById('avatar-wrap').addEventListener('click', () => document.getElementById('avatar-input').click());
    document.getElementById('avatar-input').addEventListener('change', (e) => this.uploadAvatar(e.target.files[0]));
    el.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { this.tab = btn.dataset.tab; this.render(el); });
    });

    if (this.tab === 'listings') this.renderListingsTab();
    else this.renderSettingsTab();
  },

  async uploadAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please choose an image file.', 'error'); return; }

    showToast('Uploading photo…', '');
    try {
      const ext = file.name.split('.').pop();
      const path = `${Auth.userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabaseClient.storage.from('avatars').getPublicUrl(path);
      await Auth.updateProfile({ avatar_url: publicData.publicUrl });

      showToast('Profile photo updated.', 'success');
      this.render(document.getElementById('view-profile'));
    } catch (err) {
      showToast(err.message || 'Could not upload photo.', 'error');
    }
  },

  async renderListingsTab() {
    const content = document.getElementById('tab-content');
    content.innerHTML = `<div class="spinner"></div>`;

    const { data, error } = await supabaseClient.from('listings').select('*').eq('seller_id', Auth.userId).order('created_at', { ascending: false });

    if (error) { content.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(error.message)}</p></div>`; return; }
    if (!data || data.length === 0) {
      content.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('box', 24)}</div><h3>Nothing listed yet</h3><p>Tap Sell to post your first item.</p></div>`;
      return;
    }

    content.innerHTML = data.map(l => `
      <div class="list-row">
        <img src="${escapeAttr((l.images && l.images[0]) || `https://picsum.photos/seed/${l.id}/200`)}" alt="">
        <div class="list-row-body">
          <div class="list-row-title">${escapeHTML(l.title)}</div>
          <div class="list-row-meta">
            ${l.discount_price ? `<span style="text-decoration:line-through;">${Number(l.price).toFixed(0)}</span> ${Number(l.discount_price).toFixed(0)}` : Number(l.price).toFixed(0)} ${CURRENCY}
            · <span class="status-tag ${l.status}">${l.status}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${l.status === 'active' ? `<button class="small-btn btn-primary" data-mark-sold="${l.id}">Mark Sold</button>` : ''}
          ${l.status === 'active' ? `<button class="small-btn btn-ghost" data-discount="${l.id}" data-price="${l.price}">Discount</button>` : ''}
          <button class="small-btn btn-danger" data-delete="${l.id}">Delete</button>
        </div>
      </div>
    `).join('');

    content.querySelectorAll('[data-mark-sold]').forEach(btn => btn.addEventListener('click', async () => {
      const { error } = await supabaseClient.from('listings').update({ status: 'sold' }).eq('id', btn.dataset.markSold);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Marked as sold.', 'success'); this.renderListingsTab();
    }));
    content.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this listing permanently?')) return;
      const { error } = await supabaseClient.from('listings').update({ status: 'deleted' }).eq('id', btn.dataset.delete);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Listing deleted.', 'success'); this.renderListingsTab();
    }));
    content.querySelectorAll('[data-discount]').forEach(btn => btn.addEventListener('click', async () => {
      const original = parseFloat(btn.dataset.price);
      const input = prompt(`Set a discounted price (${CURRENCY}), original is ${original}:`);
      if (input === null) return;
      const discount = parseFloat(input);
      if (isNaN(discount) || discount <= 0 || discount >= original) { showToast('Discount must be a positive number less than the original price.', 'error'); return; }
      const { error } = await supabaseClient.from('listings').update({ discount_price: discount }).eq('id', btn.dataset.discount);
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Discount applied.', 'success'); this.renderListingsTab();
    }));
  },

  async renderSettingsTab() {
    const content = document.getElementById('tab-content');
    const { data: settings } = await supabaseClient.from('notification_settings').select('*').eq('user_id', Auth.userId).maybeSingle();
    const s = settings || { points: true, rating: true, trade: true, ads: true };

    content.innerHTML = `
      <div class="section-pad" style="padding-top:0;">
        <div class="admin-card">
          <div class="toggle-row"><span>Dark Mode</span><label class="switch"><input type="checkbox" id="dark-mode-toggle"><span class="slider"></span></label></div>
          <div class="toggle-row"><span>Points notifications</span><label class="switch"><input type="checkbox" id="notif-points"><span class="slider"></span></label></div>
          <div class="toggle-row"><span>Rating notifications</span><label class="switch"><input type="checkbox" id="notif-rating"><span class="slider"></span></label></div>
          <div class="toggle-row"><span>Trade notifications</span><label class="switch"><input type="checkbox" id="notif-trade"><span class="slider"></span></label></div>
          <div class="toggle-row"><span>Ads &amp; promotions</span><label class="switch"><input type="checkbox" id="notif-ads"><span class="slider"></span></label></div>
        </div>

        <button class="btn btn-outline btn-block hidden" id="btn-install-pwa" style="margin-top:14px;" type="button">Install Gibi Store App</button>

        <form id="profile-edit-form" style="margin-top:16px;">
          <div class="field"><label for="profile-name-input">Name</label><input type="text" id="profile-name-input" value="${escapeAttr(Auth.profile.name || '')}" required /></div>
          <div class="field"><label for="profile-phone-input">Phone Number</label><input type="tel" id="profile-phone-input" value="${escapeAttr(Auth.profile.phone || '')}" placeholder="e.g. 0912345678" /></div>
          <button class="btn btn-primary btn-block" type="submit">Save Changes</button>
        </form>

        <form id="change-password-form" style="margin-top:16px;">
          <div class="field"><label for="new-password">New Password</label><input type="password" id="new-password" minlength="6" required placeholder="At least 6 characters" /></div>
          <button class="btn btn-outline btn-block" type="submit">Change Password</button>
        </form>

        <button class="btn btn-outline btn-block" id="btn-logout" style="margin-top:14px;" type="button">Log Out</button>
        <button class="btn btn-danger btn-block" id="btn-delete-account" style="margin-top:10px;" type="button">Delete Account</button>
        <div style="text-align:center;margin-top:18px;">
          <a href="#help" id="go-help" style="color:var(--text-muted);font-size:13px;">Help &amp; FAQ</a>
        </div>
      </div>
    `;

    const darkToggle = document.getElementById('dark-mode-toggle');
    darkToggle.checked = localStorage.getItem('gibi-theme') === 'dark';
    darkToggle.addEventListener('change', () => {
      const theme = darkToggle.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('gibi-theme', theme);
    });

    ['points', 'rating', 'trade', 'ads'].forEach(key => {
      const el = document.getElementById(`notif-${key}`);
      el.checked = !!s[key];
      el.addEventListener('change', async (e) => {
        await supabaseClient.from('notification_settings').upsert({ user_id: Auth.userId, [key]: e.target.checked });
        showToast('Preference saved.', 'success');
      });
    });

    if (this.deferredInstallPrompt) document.getElementById('btn-install-pwa').classList.remove('hidden');
    document.getElementById('btn-install-pwa').addEventListener('click', async () => {
      if (!this.deferredInstallPrompt) { showToast('Your browser already shows an install option in its menu.', ''); return; }
      this.deferredInstallPrompt.prompt();
      await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      document.getElementById('btn-install-pwa').classList.add('hidden');
    });

    document.getElementById('profile-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await Auth.updateProfile({
          name: document.getElementById('profile-name-input').value.trim(),
          phone: document.getElementById('profile-phone-input').value.trim()
        });
        showToast('Profile updated.', 'success');
        this.render(document.getElementById('view-profile'));
      } catch (err) { showToast(err.message, 'error'); }
    });

    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await Auth.updatePassword(document.getElementById('new-password').value);
        showToast('Password updated.', 'success');
        e.target.reset();
      } catch (err) { showToast(err.message, 'error'); }
    });

    document.getElementById('btn-logout').addEventListener('click', () => Auth.signOut());
    document.getElementById('go-help').addEventListener('click', (e) => { e.preventDefault(); Router.go('#help'); });
    document.getElementById('btn-delete-account').addEventListener('click', async () => {
      if (!confirm('This will permanently remove your profile data. Continue?')) return;
      await Auth.deleteAccount();
      Router.go('#home');
    });
  }
};
