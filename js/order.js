/* js/order.js */
// ============================================================================
// GIBI STORE v3 — Reserve & Contact + dual-confirmation orders
// Order.open(listing) injects a bottom-sheet modal into #modal-root (a
// single shared overlay slot in index.html, since modals live above any
// view rather than belonging to one). confirmAsBuyer/confirmAsSeller call
// the same RPCs as before so complete_order() settles fees/points server-side.
// ============================================================================

const Order = {
  currentListing: null,
  _lat: null,
  _lng: null,

  open(listing) {
    if (!listing) return;
    this.currentListing = listing;
    this._lat = null;
    this._lng = null;

    const images = (listing.images && listing.images.length) ? listing.images : [`https://picsum.photos/seed/${listing.id}/400`];
    const sellerName = listing.profiles?.name || 'Seller';
    const displayPrice = (listing.discount_price && listing.discount_price < listing.price) ? listing.discount_price : listing.price;
    const fee = feeForPrice(displayPrice);
    const freeLeft = Auth.profile ? Auth.profile.free_listings_left : 0;

    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" id="order-modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h2>Reserve Item</h2>
            <button class="modal-close" id="close-order-modal" type="button">${Icon('x', 16)}</button>
          </div>
          <div style="display:flex;gap:12px;align-items:center;background:var(--gray-bg);border-radius:var(--radius);padding:11px;margin-bottom:12px;">
            <img src="${escapeAttr(images[0])}" alt="" style="width:56px;height:56px;border-radius:10px;object-fit:cover;">
            <div>
              <div style="font-weight:700;font-size:14px;">${escapeHTML(listing.title)}</div>
              <div style="color:var(--primary);font-weight:800;">${Number(displayPrice).toFixed(0)} ${CURRENCY}</div>
              <div style="font-size:12.5px;color:var(--text-muted);">Sold by ${escapeHTML(sellerName)}</div>
            </div>
          </div>
          <div class="field hint" style="margin:-4px 0 14px;">
            ${!AppSettings.fees_enabled
              ? 'No marketplace fee applies right now.'
              : (freeLeft > 0
                  ? 'This is a free listing trade for the seller — no marketplace fee.'
                  : `Marketplace fee for this price range: ${fee} ${CURRENCY} (charged to the seller's wallet on completion).`)}
          </div>
          <form id="order-form">
            <div class="field">
              <label>Pickup Details</label>
              <div class="pill-group" style="margin-bottom:10px;">
                <label class="pill-option selected" style="display:flex;align-items:center;gap:6px;">
                  <input type="radio" name="pickup-type" value="dorm" checked style="margin:0;"> Dorm / Block
                </label>
                <label class="pill-option" style="display:flex;align-items:center;gap:6px;">
                  <input type="radio" name="pickup-type" value="other" style="margin:0;"> Other location
                </label>
              </div>
            </div>
            <div id="dorm-fields">
              <div class="field"><label for="order-dorm">Your Dorm Number</label><input type="text" id="order-dorm" placeholder="e.g. Room 214" /></div>
              <div class="field"><label for="order-block">Block</label><input type="text" id="order-block" placeholder="e.g. Block C" /></div>
            </div>
            <div id="other-fields" class="hidden">
              <div class="field"><label for="order-other-location">Meeting Location</label><input type="text" id="order-other-location" placeholder="e.g. Library entrance" /></div>
            </div>
            <div class="field"><label for="order-campus">Campus</label><input type="text" id="order-campus" required placeholder="e.g. Main Campus" /></div>
            <div class="field"><label for="order-phone">Your Phone Number</label><input type="tel" id="order-phone" required placeholder="e.g. 0912345678" /></div>
            <div class="toggle-row">
              <span style="font-size:13px;">Share my current location with the seller</span>
              <label class="switch"><input type="checkbox" id="order-share-location"><span class="slider"></span></label>
            </div>
            <div class="field hint">Your phone number will be shared with the seller and admin so they can arrange pickup.</div>
            <button class="btn btn-accent btn-block" type="submit" id="order-submit">Confirm Reservation</button>
          </form>
        </div>
      </div>`;

    document.getElementById('close-order-modal').addEventListener('click', () => this.close());
    document.getElementById('order-modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'order-modal-backdrop') this.close();
    });

    document.querySelectorAll('input[name="pickup-type"]').forEach(r => r.addEventListener('change', () => this.togglePickupFields()));
    document.getElementById('order-share-location').addEventListener('change', (e) => {
      if (e.target.checked) this.captureLocation();
    });
    document.getElementById('order-form').addEventListener('submit', (e) => this.submit(e));
  },

  togglePickupFields() {
    const type = document.querySelector('input[name="pickup-type"]:checked')?.value || 'dorm';
    document.getElementById('dorm-fields')?.classList.toggle('hidden', type !== 'dorm');
    document.getElementById('other-fields')?.classList.toggle('hidden', type !== 'other');
  },

  captureLocation() {
    if (!navigator.geolocation) { showToast('Location sharing is not supported on this device.', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { this._lat = pos.coords.latitude; this._lng = pos.coords.longitude; showToast('Location captured — it will be shared with the seller.', 'success'); },
      () => showToast('Could not access your location.', 'error')
    );
  },

  close() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  },

  async submit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('order-submit');
    const listing = this.currentListing;
    if (!listing) return;

    const pickupType = document.querySelector('input[name="pickup-type"]:checked')?.value || 'dorm';
    const buyer_dorm = document.getElementById('order-dorm')?.value.trim() || '';
    const buyer_block = document.getElementById('order-block')?.value.trim() || '';
    const buyer_campus = document.getElementById('order-campus')?.value.trim() || '';
    const pickup_location_other = document.getElementById('order-other-location')?.value.trim() || '';
    const buyer_phone = document.getElementById('order-phone').value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Reserving…';

    try {
      const { data: sellerProfile } = await supabaseClient
        .from('profiles').select('phone, name').eq('id', listing.seller_id).maybeSingle();

      const { error } = await supabaseClient.from('orders').insert({
        listing_id: listing.id,
        buyer_id: Auth.userId,
        seller_id: listing.seller_id,
        buyer_phone, buyer_dorm, buyer_block, buyer_campus,
        pickup_location_type: pickupType,
        pickup_location_other: pickupType === 'other' ? pickup_location_other : null,
        buyer_lat: this._lat, buyer_lng: this._lng,
        status: 'pending'
      });

      if (error) throw error;

      this.close();

      const sellerPhone = sellerProfile?.phone;
      if (sellerPhone) showToast(`Reserved. The seller's phone number is ${sellerPhone} — contact them now.`, 'success', 7000);
      else showToast(`Reserved. The seller hasn't added a phone number yet — check your Orders tab for updates.`, 'success', 7000);
    } catch (err) {
      showToast(err.message || 'Could not complete reservation.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Reservation';
    }
  },

  async confirmAsBuyer(orderId) {
    const { error } = await supabaseClient.rpc('confirm_order_as_buyer', { p_order_id: orderId });
    if (error) throw error;
  },

  async confirmAsSeller(orderId) {
    const { error } = await supabaseClient.rpc('confirm_order_as_seller', { p_order_id: orderId });
    if (error) throw error;
  }
};
