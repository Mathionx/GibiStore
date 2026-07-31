/* js/auth.js */
// ============================================================================
// GIBI STORE v3 — Authentication
// Same signup/login/session logic as before, but no more guardPage()/page
// redirects — the Router's route guards (see router.js) handle that now.
// ============================================================================

const Auth = {
  session: null,
  profile: null,

  async init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    this.session = session;
    if (session) await this.loadProfile();

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      const wasLoggedIn = !!this.session;
      this.session = session;
      if (session) {
        await this.loadProfile();
        if (!wasLoggedIn && typeof Chrome !== 'undefined') Chrome.onLogin();
      } else if (wasLoggedIn) {
        this.profile = null;
        if (typeof Chrome !== 'undefined') Chrome.onLogout();
      }
    });

    return this.session;
  },

  async loadProfile() {
    if (!this.session) return;
    const { data } = await supabaseClient
      .from('profiles').select('*').eq('id', this.session.user.id).maybeSingle();
    this.profile = data;
  },

  async signUp({ name, email, password, phone, university, campus, referred_by }) {
    const { data, error } = await supabaseClient.auth.signUp({
      email, password,
      options: { data: { name, phone, university, campus, referred_by: referred_by || null } }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabaseClient.auth.signOut();
  },

  async resetPassword(email) {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async updateProfile(fields) {
    if (!this.session) return;
    const { error } = await supabaseClient.from('profiles').update(fields).eq('id', this.session.user.id);
    if (error) throw error;
    await this.loadProfile();
  },

  async deleteAccount() {
    if (!this.session) return;
    await supabaseClient.from('profiles').delete().eq('id', this.session.user.id);
    await this.signOut();
  },

  get userId() { return this.session ? this.session.user.id : null; },
  get isLoggedIn() { return !!this.session; },
  get role() { return this.profile ? this.profile.role : 'user'; },
  get isAdmin() { return this.role === 'admin' || this.role === 'super_admin'; },
  get isSuperAdmin() { return this.role === 'super_admin'; },
  get isBanned() { return this.role === 'banned'; }
};

/**
 * Detects a Supabase password-recovery link landing on this page
 * (#access_token=...&type=recovery). Returns true if we handled a recovery
 * flow so the caller can skip normal boot.
 */
function isPasswordRecoveryLink() {
  return window.location.hash.includes('type=recovery') || window.location.href.includes('type=recovery');
}
