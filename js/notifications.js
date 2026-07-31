/* js/notifications.js */
// ============================================================================
// GIBI STORE v3 — Toasts & in-app notification bell
// ============================================================================

function showToast(message, type = '', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

const Notifications = {
  channel: null,
  _bound: false,

  init() {
    const bell = document.getElementById('notif-bell');
    const dropdown = document.getElementById('notif-dropdown');
    if (!bell || !dropdown) return;

    // The bell/dropdown DOM nodes get recreated every time the Home view
    // re-renders, so this listener must be re-attached every call — no
    // "already bound" guard here, or the button goes dead after one visit.
    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      const willShow = dropdown.classList.contains('hidden');
      dropdown.classList.toggle('hidden');
      if (willShow) { await this.load(); await this.markAllRead(); }
    });

    // `document` itself is never recreated, so this only needs binding once
    // ever — it re-looks-up the current bell/dropdown by id on every click
    // so it always operates on whichever ones are live right now.
    if (!this._docListenerBound) {
      this._docListenerBound = true;
      document.addEventListener('click', (e) => {
        const curDropdown = document.getElementById('notif-dropdown');
        const curBell = document.getElementById('notif-bell');
        if (curDropdown && !curDropdown.contains(e.target) && e.target !== curBell) {
          curDropdown.classList.add('hidden');
        }
      });
    }

    this.subscribeRealtime();
    this.refreshDot();
  },

  async load() {
    const dropdown = document.getElementById('notif-dropdown');
    if (!Auth.userId || !dropdown) return;
    const { data, error } = await supabaseClient
      .from('notifications').select('*').eq('user_id', Auth.userId)
      .order('created_at', { ascending: false }).limit(20);

    if (error) {
      dropdown.innerHTML = `<div style="padding:22px;text-align:center;color:var(--danger);font-size:13px;">Couldn't load notifications: ${escapeHTML(error.message)}</div>`;
      return;
    }

    if (!data || data.length === 0) {
      dropdown.innerHTML = `<div style="padding:22px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications yet</div>`;
      return;
    }
    dropdown.innerHTML = data.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <div class="t">${escapeHTML(n.title || 'Notification')}</div>
        <div class="b">${escapeHTML(n.body || '')}</div>
      </div>`).join('');
  },

  async markAllRead() {
    if (!Auth.userId) return;
    await supabaseClient.from('notifications').update({ read: true }).eq('user_id', Auth.userId).eq('read', false);
    this.refreshDot();
  },

  async refreshDot() {
    const dot = document.getElementById('notif-dot');
    if (!dot || !Auth.userId) return;
    const { count } = await supabaseClient
      .from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', Auth.userId).eq('read', false);
    dot.classList.toggle('hidden', !count);
  },

  subscribeRealtime() {
    if (this.channel || !Auth.userId) return;
    this.channel = supabaseClient
      .channel('public:notifications:' + Auth.userId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${Auth.userId}`
      }, (payload) => {
        showToast(payload.new.body || payload.new.title || 'New notification', 'success');
        this.refreshDot();
      })
      .subscribe();
  }
};

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(str) {
  return escapeHTML(str).replace(/"/g, '&quot;');
}