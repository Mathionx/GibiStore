/* js/view-listing.js */
// ============================================================================
// GIBI STORE v3 — #listing/:id view
// The full-page detail screen a card tap opens: photo gallery, description,
// seller mini-card (links to their public page), wishlist heart, share,
// report, and the Reserve & Contact action.
// ============================================================================

const ViewListing = {
  registerRoute() {
    Router.register('listing', { render: (el, params) => this.render(el, params[0]), title: 'Listing' });
  },

  async render(el, id) {
    el.innerHTML = `<div class="spinner"></div>`;

    const { data: listing, error } = await supabaseClient
      .from('listings')
      .select('*, profiles:seller_id ( id, name, phone, campus_verified, total_rating, rating_count, university, campus, avatar_url )')
      .eq('id', id)
      .maybeSingle();

    if (error || !listing) {
      el.innerHTML = `<div class="subpage-header"><button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button><h1>Listing</h1></div>
        <div class="empty-state"><div class="state-icon">${Icon('alert', 24)}</div><h3>Listing not found</h3><p>It may have been removed or sold.</p></div>`;
      document.getElementById('back-btn').addEventListener('click', () => Router.back());
      return;
    }

    const images = (listing.images && listing.images.length) ? listing.images : [`https://picsum.photos/seed/${listing.id}/600`];
    const seller = listing.profiles || {};
    const hasDiscount = listing.discount_price != null && listing.discount_price < listing.price;
    const displayPrice = hasDiscount ? listing.discount_price : listing.price;
    const isOwn = Auth.userId === listing.seller_id;
    const isWishlisted = Auth.isLoggedIn ? await this.isWishlisted(listing.id) : false;

    el.innerHTML = `
      <div class="subpage-header" style="position:sticky;top:0;z-index:15;background:var(--bg);">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1 style="flex:1;">Item Details</h1>
        <button class="icon-btn" id="share-btn" style="background:var(--gray-bg);color:var(--text);">${Icon('bag', 16)}</button>
      </div>

      <div class="detail-gallery" id="detail-gallery">
        ${images.map((img, i) => `<img src="${escapeAttr(img)}" data-idx="${i}" alt="${escapeAttr(listing.title)}" onerror="this.src='https://picsum.photos/seed/fallback${listing.id}/600'">`).join('')}
        ${Auth.isLoggedIn && !isOwn ? `<button class="fav-btn" id="wishlist-btn" style="position:absolute;top:14px;right:14px;width:38px;height:38px;">${Icon('star', 18)}</button>` : ''}
        ${images.length > 1 ? `<div class="gallery-dots" id="gallery-dots">${images.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('')}</div>` : ''}
      </div>

      <div class="section-pad">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
          <h2 style="margin:0;font-size:20px;flex:1;">${escapeHTML(listing.title)}</h2>
          <span class="badge ${this.conditionClass(listing.condition)}" style="position:static;">${escapeHTML(listing.condition)}</span>
        </div>
        <div class="card-price-row" style="margin-top:8px;">
          <span class="card-price" style="font-size:24px;">${Number(displayPrice).toFixed(0)} ${CURRENCY}</span>
          ${hasDiscount ? `<span class="card-price strike">${Number(listing.price).toFixed(0)} ${CURRENCY}</span>` : ''}
        </div>
        <div class="card-location" style="margin-top:10px;font-size:13.5px;">
          <span class="icon-inline">${Icon('pin', 15)}</span> ${escapeHTML(listing.pickup_location || 'Campus')}
        </div>

        ${listing.description ? `
          <div style="margin-top:20px;">
            <h3 style="font-size:14.5px;margin:0 0 6px;">Description</h3>
            <p style="margin:0;color:var(--text-muted);font-size:14px;line-height:1.6;">${escapeHTML(listing.description)}</p>
          </div>` : ''}

        <div class="seller-card" id="seller-card">
          <div class="avatar-circle-sm">${seller.avatar_url ? `<img src="${escapeAttr(seller.avatar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : (seller.name || 'S').charAt(0).toUpperCase()}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:5px;">
              ${escapeHTML(seller.name || 'Student')}
              ${seller.campus_verified ? `<span class="verified-shield icon-inline">${Icon('shield', 13)}</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--text-muted);">${this.starsInline(seller.total_rating, seller.rating_count)}</div>
          </div>
          <span class="icon-inline" style="color:var(--text-muted);">${Icon('chevronLeft', 16)}</span>
        </div>

        ${isOwn ? `
          <div class="field hint" style="margin-top:18px;">This is your own listing — manage it from your Profile.</div>
        ` : `
          <button class="btn btn-accent btn-block" id="reserve-btn" style="margin-top:20px;">Reserve &amp; Contact</button>
          <button class="btn btn-ghost btn-block" id="report-btn" style="margin-top:10px;">Report this listing</button>
        `}
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.back());
    document.getElementById('share-btn').addEventListener('click', () => this.share(listing));

    document.getElementById('seller-card').addEventListener('click', () => Router.go(`#seller/${listing.seller_id}`));

    document.querySelectorAll('#detail-gallery img').forEach(img => {
      img.addEventListener('click', () => Lightbox.open(images, parseInt(img.dataset.idx)));
    });

    const gallery = document.getElementById('detail-gallery');
    const dots = document.getElementById('gallery-dots');
    if (gallery && dots) {
      gallery.addEventListener('scroll', () => {
        const idx = Math.round(gallery.scrollLeft / gallery.clientWidth);
        dots.querySelectorAll('span').forEach((d, i) => d.classList.toggle('active', i === idx));
      });
    }

    const wishlistBtn = document.getElementById('wishlist-btn');
    if (wishlistBtn) {
      wishlistBtn.classList.toggle('active-fav', isWishlisted);
      wishlistBtn.addEventListener('click', () => this.toggleWishlist(listing.id, wishlistBtn));
    }

    document.getElementById('reserve-btn')?.addEventListener('click', () => {
      if (!Auth.isLoggedIn) { Router.go('#login'); return; }
      Order.open(listing);
    });

    document.getElementById('report-btn')?.addEventListener('click', () => this.openReport(listing));
  },

  conditionClass(c) { return c === 'Like New' ? 'like-new' : c === 'Good' ? 'good' : 'fair'; },

  starsInline(rating, count) {
    if (!count) return 'No ratings yet';
    const r = Math.round(rating || 0);
    let s = '';
    for (let i = 0; i < 5; i++) s += StarIcon(i < r, 11);
    return `<span class="icon-inline">${s}</span> (${count})`;
  },

  async isWishlisted(listingId) {
    const { data } = await supabaseClient.from('wishlists').select('listing_id').eq('user_id', Auth.userId).eq('listing_id', listingId).maybeSingle();
    return !!data;
  },

  async toggleWishlist(listingId, btn) {
    const active = btn.classList.contains('active-fav');
    if (active) {
      await supabaseClient.from('wishlists').delete().eq('user_id', Auth.userId).eq('listing_id', listingId);
      btn.classList.remove('active-fav');
      showToast('Removed from saved items.', '');
    } else {
      const { error } = await supabaseClient.from('wishlists').insert({ user_id: Auth.userId, listing_id: listingId });
      if (!error) { btn.classList.add('active-fav'); showToast('Saved to your wishlist.', 'success'); }
    }
  },

  share(listing) {
    const url = `${window.location.origin}${window.location.pathname}#listing/${listing.id}`;
    if (navigator.share) {
      navigator.share({ title: listing.title, text: `Check out "${listing.title}" on Gibi Store`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied to clipboard.', 'success'));
    }
  },

  async openReport(listing) {
    if (!Auth.isLoggedIn) { Router.go('#login'); return; }
    const { data: reasons } = await supabaseClient.from('report_reasons').select('*').order('id');
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" id="report-backdrop">
        <div class="modal">
          <div class="modal-header"><h2>Report Listing</h2><button class="modal-close" id="report-close" type="button">${Icon('x', 16)}</button></div>
          <form id="report-form">
            <div class="field"><label for="report-reason">Reason</label>
              <select id="report-reason" required>${(reasons || []).map(r => `<option value="${escapeAttr(r.reason)}">${escapeHTML(r.reason)}</option>`).join('')}</select>
            </div>
            <div class="field"><label for="report-details">Details</label><textarea id="report-details" placeholder="Tell us what happened…"></textarea></div>
            <button class="btn btn-primary btn-block" type="submit">Submit Report</button>
          </form>
        </div>
      </div>`;
    document.getElementById('report-close').addEventListener('click', () => root.innerHTML = '');
    document.getElementById('report-backdrop').addEventListener('click', (e) => { if (e.target.id === 'report-backdrop') root.innerHTML = ''; });
    document.getElementById('report-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await supabaseClient.from('reports').insert({
        reporter_id: Auth.userId,
        reported_seller_id: listing.seller_id,
        reason: document.getElementById('report-reason').value,
        details: document.getElementById('report-details').value.trim()
      });
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Report submitted — our team will review it.', 'success');
      root.innerHTML = '';
    });
  }
};
