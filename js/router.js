/* js/router.js */
// ============================================================================
// GIBI STORE v3 — Router
// One index.html, many "views". Each view is registered here with a render
// function; the router swaps #view-root's content and plays a transition
// so navigating feels like moving between real pages (Instagram-style),
// even though nothing ever reloads.
//
// Hash format: #name or #name/param  e.g.  #listing/42   #seller/uuid
// ============================================================================

const Router = {
  routes: {},          // name -> { render, auth, role, tab, title }
  stack: ['home'],      // our own back-stack (independent of browser history)
  current: null,
  _pendingAnim: null,

  /**
   * Register a view.
   * name: route name matching the hash (without params)
   * config: {
   *   render(params): async fn that fills #view-root's innerHTML and wires it up
   *   auth: true if login is required
   *   role: 'admin' | 'super_admin' | null
   *   tab: true if this is one of the bottom-nav tabs (uses a fade transition
   *        and resets the back-stack, since tabs are "top level")
   * }
   */
  register(name, config) {
    this.routes[name] = config;
  },

  init() {
    window.addEventListener('hashchange', () => this._handleHashChange());
    this._handleHashChange(); // initial load
  },

  parseHash() {
    const raw = (window.location.hash || '#home').slice(1);
    const [name, ...params] = raw.split('/');
    return { name: name || 'home', params };
  },

  /** Navigate forward (e.g. tapping a card, a nav item, a button). */
  go(hash) {
    const { name } = this._parse(hash);
    const route = this.routes[name];
    this._pendingAnim = route && route.tab ? 'fade' : 'forward';
    if (route && route.tab) this.stack = [hash.replace('#', '')];
    else this.stack.push(hash.replace('#', ''));
    if (window.location.hash === hash) this._handleHashChange(); // same hash, force re-render
    else window.location.hash = hash;
  },

  /** Navigate back to the previous view in our own stack. */
  back() {
    if (this.stack.length > 1) {
      this.stack.pop();
      const prev = this.stack[this.stack.length - 1];
      this._pendingAnim = 'back';
      window.location.hash = '#' + prev;
    } else {
      this._pendingAnim = 'fade';
      window.location.hash = '#home';
    }
  },

  _parse(hash) {
    const raw = hash.replace('#', '');
    const [name, ...params] = raw.split('/');
    return { name: name || 'home', params };
  },

  async _handleHashChange() {
    const { name, params } = this.parseHash();
    const route = this.routes[name];
    const anim = this._pendingAnim || 'fade';
    this._pendingAnim = null;

    if (!route) { this.go('#home'); return; }

    // ---- guards ----
    if (route.auth && !Auth.isLoggedIn) {
      showToast('Please log in to continue.', '');
      this.go('#login');
      return;
    }
    if (route.role === 'admin' && !Auth.isAdmin) { this.go('#home'); return; }
    if (route.role === 'super_admin' && !Auth.isSuperAdmin) { this.go('#home'); return; }
    if ((name === 'login' || name === 'signup') && Auth.isLoggedIn) { this.go('#home'); return; }

    this.current = name;
    document.title = route.title ? `${route.title} — Gibi Store` : 'Gibi Store';

    const root = document.getElementById('view-root');
    const el = document.createElement('div');
    el.className = `view enter-${anim}`;
    el.id = `view-${name}`;
    root.innerHTML = '';
    root.appendChild(el);

    Chrome.update(name);

    try {
      await route.render(el, params);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('alert', 24)}</div><h3>Something went wrong</h3><p>${escapeHTML(err.message || '')}</p></div>`;
      console.error(err);
    }

    el.classList.add('active');
    window.scrollTo(0, 0);
  }
};
