/* js/view-auth.js */
// ============================================================================
// GIBI STORE v3 — #login and #signup views
// These render into the router's view element as full-bleed "pages" (not
// modals), matching the rest of the app's page-like feel.
// ============================================================================

const ViewAuth = {
  registerRoutes() {
    Router.register('login', { render: (el) => this.renderLogin(el), title: 'Log In' });
    Router.register('signup', { render: (el) => this.renderSignup(el), title: 'Sign Up' });
  },

  renderLogin(el) {
    el.innerHTML = `
      <div class="auth-view">
        <button class="auth-back" id="auth-back-btn">${Icon('chevronLeft', 18)}</button>
        <div class="auth-card">
          <div class="auth-logo">
            <div class="brand-mark"><img src="icons/icon-192.png" alt="Gibi Store"></div>
            <h1>Welcome back</h1>
            <p>Log in to buy, sell &amp; trade on your campus.</p>
          </div>
          <div id="auth-error" class="auth-error hidden"></div>
          <form id="login-form">
            <div class="field">
              <label for="login-email">Email</label>
              <input type="email" id="login-email" required placeholder="you@campus.edu" />
            </div>
            <div class="field">
              <label for="login-password">Password</label>
              <div class="password-wrap">
                <input type="password" id="login-password" required placeholder="••••••••" />
                <button type="button" class="password-toggle" id="pw-toggle-login">Show</button>
              </div>
            </div>
            <button class="btn btn-primary btn-block" type="submit" id="login-submit">Log In</button>
            <div class="auth-switch" id="forgot-link" style="cursor:pointer;">Forgot password?</div>
          </form>
          <div class="auth-switch">Don't have an account? <a id="go-signup">Sign up</a></div>
        </div>
      </div>`;

    document.getElementById('auth-back-btn').addEventListener('click', () => Router.go('#home'));
    document.getElementById('go-signup').addEventListener('click', () => Router.go('#signup'));
    document.getElementById('pw-toggle-login').addEventListener('click', () => this.togglePw('login-password', 'pw-toggle-login'));

    document.getElementById('forgot-link').addEventListener('click', async () => {
      const email = prompt('Enter your account email to receive a reset link:');
      if (!email) return;
      try {
        await Auth.resetPassword(email);
        showToast('Password reset email sent — check your inbox.', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-submit');
      const errorBox = document.getElementById('auth-error');
      btn.disabled = true; btn.textContent = 'Logging in…';
      errorBox.classList.add('hidden');
      try {
        await Auth.signIn(
          document.getElementById('login-email').value.trim(),
          document.getElementById('login-password').value
        );
        showToast(`Welcome back${Auth.profile?.name ? ', ' + Auth.profile.name : ''}!`, 'success');
        Router.go('#home');
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'Log In';
      }
    });
  },

  async renderSignup(el) {
    el.innerHTML = `
      <div class="auth-view">
        <button class="auth-back" id="auth-back-btn">${Icon('chevronLeft', 18)}</button>
        <div class="auth-card">
          <div class="auth-logo">
            <div class="brand-mark"><img src="icons/icon-192.png" alt="Gibi Store"></div>
            <h1>Create your account</h1>
            <p>Join students buying &amp; selling on your campus.</p>
          </div>
          <div id="auth-error" class="auth-error hidden"></div>
          <form id="signup-form">
            <div class="field">
              <label for="signup-name">Full Name</label>
              <input type="text" id="signup-name" required placeholder="Jane Doe" />
            </div>
            <div class="field">
              <label for="signup-email">Email</label>
              <input type="email" id="signup-email" required placeholder="you@campus.edu" />
              <div class="hint">Use your .edu campus email to get a verified badge <span class="icon-inline">${Icon('check', 12)}</span></div>
            </div>
            <div class="field">
              <label for="signup-phone">Phone Number</label>
              <input type="tel" id="signup-phone" placeholder="e.g. 0912345678" />
            </div>
            <div class="field">
              <label for="signup-university">University</label>
              <select id="signup-university" required></select>
            </div>
            <div class="field">
              <label for="signup-campus">Campus</label>
              <select id="signup-campus" required></select>
            </div>
            <div class="field">
              <label for="signup-password">Password</label>
              <div class="password-wrap">
                <input type="password" id="signup-password" required minlength="6" placeholder="At least 6 characters" />
                <button type="button" class="password-toggle" id="pw-toggle-signup">Show</button>
              </div>
            </div>
            <div class="field">
              <label for="signup-referral">Referral Code <span style="font-weight:400;color:var(--text-muted)">(optional)</span></label>
              <input type="text" id="signup-referral" placeholder="e.g. GIBI-A1B2" />
            </div>
            <button class="btn btn-primary btn-block" type="submit" id="signup-submit">Create Account</button>
          </form>
          <div class="auth-switch">Already have an account? <a id="go-login">Log in</a></div>
        </div>
      </div>`;

    document.getElementById('auth-back-btn').addEventListener('click', () => Router.go('#home'));
    document.getElementById('go-login').addEventListener('click', () => Router.go('#login'));
    document.getElementById('pw-toggle-signup').addEventListener('click', () => this.togglePw('signup-password', 'pw-toggle-signup'));

    await this.loadUniversities();
    document.getElementById('signup-university').addEventListener('change', (e) => this.loadCampuses(e.target.value));

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('signup-submit');
      const errorBox = document.getElementById('auth-error');
      btn.disabled = true; btn.textContent = 'Creating account…';
      errorBox.classList.add('hidden');
      try {
        await Auth.signUp({
          name: document.getElementById('signup-name').value.trim(),
          email: document.getElementById('signup-email').value.trim(),
          password: document.getElementById('signup-password').value,
          phone: document.getElementById('signup-phone').value.trim(),
          university: document.getElementById('signup-university').value,
          campus: document.getElementById('signup-campus').value,
          referred_by: document.getElementById('signup-referral').value.trim().toUpperCase() || null
        });
        showToast('Account created! Check your email to confirm, then log in.', 'success', 6000);
        Router.go('#login');
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'Create Account';
      }
    });
  },

  togglePw(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Hide'; }
    else { input.type = 'password'; btn.textContent = 'Show'; }
  },

  async loadUniversities() {
    const select = document.getElementById('signup-university');
    const { data } = await supabaseClient.from('universities').select('*').order('name');
    select.innerHTML = '<option value="">Select university…</option>' +
      (data || []).map(u => `<option value="${escapeAttr(u.name)}">${escapeHTML(u.name)}</option>`).join('');
  },

  async loadCampuses(universityName) {
    const select = document.getElementById('signup-campus');
    if (!select) return;
    if (!universityName) { select.innerHTML = '<option value="">Select campus…</option>'; return; }
    const { data: uni } = await supabaseClient.from('universities').select('id').eq('name', universityName).maybeSingle();
    if (!uni) return;
    const { data: campuses } = await supabaseClient.from('campuses').select('*').eq('university_id', uni.id).order('name');
    select.innerHTML = '<option value="">Select campus…</option>' +
      (campuses || []).map(c => `<option value="${escapeAttr(c.name)}">${escapeHTML(c.name)}</option>`).join('');
  }
};
