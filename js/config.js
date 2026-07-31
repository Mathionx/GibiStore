/* js/config.js */
// ============================================================================
// GIBI STORE v3 — Supabase configuration & shared settings
// Paste your project URL and anon public key from:
// Supabase Dashboard → Settings → API
// ============================================================================

const SUPABASE_URL = 'https://bwuasjjkukakbonxasla.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3dWFzamprdWtha2Jvbnhhc2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDkyMjYsImV4cCI6MjEwMDcyNTIyNn0.hq87ttfuJoeLU7asrliMPjPzygBq2YtRu_LRJxK2tm8';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Currency
const CURRENCY = 'ETB';

// Max photos per listing
const MAX_LISTING_IMAGES = 5;

// Pickup location autocomplete suggestions
const PICKUP_SUGGESTIONS = [
  'Block A', 'Block B', 'Block C', 'Block D',
  'Library', 'Student Center', 'Gym', 'Main Gate', 'Cafeteria'
];

// ============================================================================
// AppSettings — owner-controlled flexible toggles (fees/rewards/referrals
// on-off, fee tiers, wallet floor, free-listings default, launch mode).
// Loaded once at boot from the `app_settings` singleton row so the owner
// can change these from the Owner Panel UI without ever touching code.
// Falls back to sensible defaults if the row hasn't loaded yet.
// ============================================================================
const AppSettings = {
  fees_enabled: true,
  rewards_enabled: true,
  referrals_enabled: true,
  launch_mode: false,
  fee_tier1_max: 200,
  fee_tier1_fee: 5,
  fee_tier2_max: 1000,
  fee_tier2_fee: 10,
  fee_tier3_fee: 25,
  wallet_floor: -30,
  free_listings_default: 3,
  launch_banner_text: 'Founding member period — all fees waived while we grow!',
  _loaded: false,

  async load() {
    const { data, error } = await supabaseClient.from('app_settings').select('*').eq('id', 1).maybeSingle();
    if (!error && data) {
      Object.assign(this, data);
      this._loaded = true;
    }
    return this;
  }
};

function feeForPrice(price) {
  if (!AppSettings.fees_enabled) return 0;
  if (price <= AppSettings.fee_tier1_max) return AppSettings.fee_tier1_fee;
  if (price <= AppSettings.fee_tier2_max) return AppSettings.fee_tier2_fee;
  return AppSettings.fee_tier3_fee;
}
