/* js/view-rewards.js */
// ============================================================================
// GIBI STORE v3 — #rewards view
// Redeem points for wallet credit via the redeem_reward() RPC (atomic,
// server-side — can't be gamed from the client).
// ============================================================================

const ViewRewards = {
  registerRoute() {
    Router.register('rewards', { render: (el) => this.render(el), auth: true, title: 'Rewards' });
  },

  render(el) {
    el.innerHTML = `
      <div class="subpage-header">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1>Rewards</h1>
        <div class="pill-stat" style="background:var(--primary-soft);color:var(--primary);">${StarIcon(true, 13)} <span id="rewards-points">${Auth.profile?.points ?? 0}</span></div>
      </div>
      <div class="section-title">Redeem Your Points</div>
      <div class="section-pad" style="padding-top:0;display:grid;gap:10px;" id="rewards-grid"></div>
    `;
    document.getElementById('back-btn').addEventListener('click', () => Router.back());
    this.loadItems();
  },

  async loadItems() {
    const grid = document.getElementById('rewards-grid');
    grid.innerHTML = `<div class="spinner"></div>`;

    if (!AppSettings.rewards_enabled) {
      grid.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('gift', 24)}</div><h3>Rewards are paused</h3><p>The points &amp; rewards program isn't active right now — check back soon.</p></div>`;
      return;
    }

    const { data, error } = await supabaseClient.from('reward_items').select('*').eq('active', true).order('points_cost');

    if (error) { grid.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHTML(error.message)}</p></div>`; return; }
    if (!data || data.length === 0) { grid.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('gift', 24)}</div><h3>No rewards available yet</h3></div>`; return; }

    const myPoints = Auth.profile?.points || 0;

    grid.innerHTML = data.map(r => `
      <div class="admin-card">
        <div style="font-weight:800;font-size:14.5px;margin-bottom:6px;">${escapeHTML(r.name)}</div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);"><span>Cost</span><span>${r.points_cost} pts</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted);"><span>Value</span><span>${Number(r.value_etb).toFixed(0)} ${CURRENCY}</span></div>
        <button class="btn btn-accent btn-block" style="margin-top:10px;" data-redeem="${r.id}" ${myPoints < r.points_cost ? 'disabled' : ''}>
          ${myPoints < r.points_cost ? 'Not Enough Points' : 'Redeem'}
        </button>
      </div>
    `).join('');

    grid.querySelectorAll('[data-redeem]').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Redeeming…';
        try {
          const { error } = await supabaseClient.rpc('redeem_reward', { p_reward_id: parseInt(btn.dataset.redeem) });
          if (error) throw error;
          showToast('Reward redeemed! Check your wallet.', 'success');
          await Auth.loadProfile();
          document.getElementById('rewards-points').textContent = Auth.profile.points;
          this.loadItems();
        } catch (err) {
          showToast(err.message || 'Could not redeem reward.', 'error');
          btn.disabled = false; btn.textContent = 'Redeem';
        }
      });
    });
  }
};
