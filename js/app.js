/* js/app.js */
// ============================================================================
// GIBI STORE v3 — Bootstrap
// Applies dark mode instantly, registers all views with the Router, wires
// the persistent chrome (bottom nav + FAB) that lives outside #view-root,
// registers the service worker, and handles password-recovery links.
// ============================================================================

// Apply saved theme immediately to avoid a flash of the wrong theme
(function applyStoredTheme() {
  if (localStorage.getItem('gibi-theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

const Chrome = {
  /** Called by the router after every navigation to sync persistent UI. */
  update(routeName) {
    const nav = document.getElementById('bottom-nav');
    const fab = document.getElementById('fab-sell');
    if (!nav || !fab) return;

    const isAuthView = routeName === 'login' || routeName === 'signup';
    nav.classList.toggle('hidden', isAuthView || !Auth.isLoggedIn);
    fab.classList.toggle('hidden', isAuthView || !Auth.isLoggedIn);

    nav.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === routeName);
    });

    const adminNav = document.getElementById('nav-admin');
    if (adminNav) adminNav.classList.toggle('hidden', !Auth.isAdmin);
  },

  onLogin() {
    this.update(Router.current);
  },

  onLogout() {
    const route = Router.routes[Router.current];
    if (route && route.auth) Router.go('#home');
    else this.update(Router.current);
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(console.error);
      });
    }
  },

  bindOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (!banner) return;
    const update = () => banner.classList.toggle('hidden', navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  },

  bindBottomNav() {
    document.getElementById('bottom-nav')?.addEventListener('click', (e) => {
      const item = e.target.closest('.nav-item');
      if (!item) return;
      Router.go('#' + item.dataset.page);
    });
    document.getElementById('fab-sell')?.addEventListener('click', () => Router.go('#sell'));
  }
};

/**
 * Handles a Supabase password-recovery link landing on this page. Supabase
 * puts #access_token=...&type=recovery in the URL and auto-establishes a
 * session from it; we just need to prompt for a new password once.
 */
async function handlePasswordRecoveryIfPresent() {
  if (!isPasswordRecoveryLink()) return false;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return false;

  const newPassword = prompt('Enter your new password (min 6 characters):');
  if (!newPassword || newPassword.length < 6) {
    showToast('Password not changed — too short.', 'error');
  } else {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) showToast(error.message, 'error');
    else showToast('Password updated! You can now log in with it.', 'success', 6000);
  }
  history.replaceState(null, '', window.location.pathname);
  return true;
}

// ============================================================================
// Boot
// ============================================================================
(async function boot() {
  Chrome.bindBottomNav();
  Chrome.bindOfflineBanner();
  Chrome.registerServiceWorker();

  await Auth.init();
  await AppSettings.load();
  await handlePasswordRecoveryIfPresent();

  ViewHome.registerRoute();
  ViewAuth.registerRoutes();
  ViewListing.registerRoute();
  ViewSell.registerRoute();
  ViewOrders.registerRoute();
  ViewProfile.registerRoute();
  ViewSeller.registerRoute();
  ViewRewards.registerRoute();
  ViewSearch.registerRoute();
  ViewAdmin.registerRoute();
  ViewOwner.registerRoute();
  ViewHelp.registerRoute();

  Router.init();
  Chrome.update(Router.current);
})();
