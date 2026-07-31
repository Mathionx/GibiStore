/* js/view-sell.js */
// ============================================================================
// GIBI STORE v3 — #sell view
// Full-page "create listing" form. Multi-photo upload to Supabase Storage,
// pickup-location autocomplete, condition pills, free-listings-left banner.
// ============================================================================

const ViewSell = {
  selectedCondition: null,
  selectedFiles: [],

  registerRoute() {
    Router.register('sell', { render: (el) => this.render(el), auth: true, tab: true, title: 'Sell an Item' });
  },

  render(el) {
    this.selectedCondition = null;
    this.selectedFiles = [];

    const freeLeft = Auth.profile?.free_listings_left ?? 0;
    const bannerText = !AppSettings.fees_enabled
      ? (AppSettings.launch_mode ? AppSettings.launch_banner_text : 'Selling is completely free right now — no marketplace fees.')
      : (freeLeft > 0
          ? `You have ${freeLeft} free listing${freeLeft === 1 ? '' : 's'} left — no marketplace fee.`
          : `A small fee (based on item price) applies once your item sells.`);

    el.innerHTML = `
      <div class="subpage-header">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1>Sell an Item</h1>
      </div>
      <div class="section-pad" style="padding-top:0;">
        <div class="field hint" style="background:var(--primary-soft);color:var(--primary);padding:12px 14px;border-radius:var(--radius);margin-bottom:16px;">
          ${bannerText}
        </div>

        <form id="listing-form">
          <div class="field"><label for="listing-title">Title</label><input type="text" id="listing-title" required placeholder="e.g. Calculus Textbook 8th Ed" /></div>
          <div class="field"><label for="listing-price">Price (${CURRENCY})</label><input type="number" id="listing-price" min="0" step="1" required placeholder="0" /></div>
          <div class="field"><label for="listing-category">Category</label>
            <select id="listing-category" required>
              <option value="">Select category…</option>
              <option>Textbooks</option><option>Electronics</option><option>DormGear</option>
              <option>Snacks</option><option>Services</option><option>Clothes</option><option>Shoes</option>
            </select>
          </div>
          <div class="field">
            <label>Condition</label>
            <div class="pill-group" id="condition-pills">
              <div class="pill-option" data-value="Like New">Like New</div>
              <div class="pill-option" data-value="Good">Good</div>
              <div class="pill-option" data-value="Fair">Fair</div>
            </div>
          </div>
          <div class="field"><label for="listing-description">Description <span style="font-weight:400;color:var(--text-muted)">(optional)</span></label>
            <textarea id="listing-description" placeholder="Any extra details buyers should know…"></textarea></div>
          <div class="field" style="position:relative;">
            <label for="listing-pickup">Pickup Location</label>
            <input type="text" id="listing-pickup" required placeholder="e.g. Block A" autocomplete="off" />
            <div id="pickup-autocomplete" class="autocomplete-list hidden"></div>
          </div>
          <div class="field">
            <label>Photos <span style="font-weight:400;color:var(--text-muted)">(up to ${MAX_LISTING_IMAGES})</span></label>
            <div class="image-drop" id="image-drop">Tap to choose photos</div>
            <input type="file" id="listing-image" accept="image/*" multiple class="hidden" />
            <div id="image-preview-grid" class="image-preview-grid"></div>
          </div>
          <button class="btn btn-accent btn-block" type="submit" id="listing-submit">Post Listing</button>
        </form>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.back());

    document.getElementById('condition-pills').addEventListener('click', (e) => {
      const pill = e.target.closest('.pill-option');
      if (!pill) return;
      document.querySelectorAll('#condition-pills .pill-option').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      this.selectedCondition = pill.dataset.value;
    });

    const pickupInput = document.getElementById('listing-pickup');
    const acList = document.getElementById('pickup-autocomplete');
    pickupInput.addEventListener('input', () => {
      const val = pickupInput.value.trim().toLowerCase();
      if (!val) { acList.classList.add('hidden'); return; }
      const matches = PICKUP_SUGGESTIONS.filter(s => s.toLowerCase().includes(val));
      if (!matches.length) { acList.classList.add('hidden'); return; }
      acList.innerHTML = matches.map(m => `<div class="autocomplete-item" data-val="${m}">${m}</div>`).join('');
      acList.classList.remove('hidden');
    });
    acList.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (!item) return;
      pickupInput.value = item.dataset.val;
      acList.classList.add('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!pickupInput.contains(e.target) && !acList.contains(e.target)) acList.classList.add('hidden');
    });

    const imageDrop = document.getElementById('image-drop');
    const imageInput = document.getElementById('listing-image');
    imageDrop.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => {
      const files = Array.from(imageInput.files);
      for (const file of files) {
        if (this.selectedFiles.length >= MAX_LISTING_IMAGES) { showToast(`You can upload up to ${MAX_LISTING_IMAGES} photos.`, 'error'); break; }
        this.selectedFiles.push(file);
      }
      imageInput.value = '';
      this.renderPreviews();
    });

    document.getElementById('listing-form').addEventListener('submit', (e) => this.submit(e));
  },

  renderPreviews() {
    const grid = document.getElementById('image-preview-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.selectedFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `<img src="${e.target.result}"><button type="button" class="remove-img" data-idx="${idx}">${Icon('x', 11)}</button>`;
        grid.appendChild(item);
        item.querySelector('.remove-img').addEventListener('click', () => { this.selectedFiles.splice(idx, 1); this.renderPreviews(); });
      };
      reader.readAsDataURL(file);
    });
  },

  async submit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('listing-submit');

    const title = document.getElementById('listing-title').value.trim();
    const price = parseFloat(document.getElementById('listing-price').value);
    const category = document.getElementById('listing-category').value;
    const description = document.getElementById('listing-description').value.trim();
    const pickup_location = document.getElementById('listing-pickup').value.trim();

    if (!this.selectedCondition) { showToast('Please choose a condition.', 'error'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting…';

    try {
      const imageUrls = [];
      for (const file of this.selectedFiles) {
        const ext = file.name.split('.').pop();
        const path = `${Auth.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabaseClient.storage.from('product-images').getPublicUrl(path);
        imageUrls.push(publicData.publicUrl);
      }

      const { data: inserted, error: insertError } = await supabaseClient.from('listings').insert({
        title, price, category, condition: this.selectedCondition,
        description: description || null, images: imageUrls, pickup_location,
        seller_id: Auth.userId
      }).select().single();

      if (insertError) throw insertError;

      showToast('Listing posted!', 'success');
      Router.go(`#listing/${inserted.id}`);
    } catch (err) {
      showToast(err.message || 'Something went wrong.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Listing';
    }
  }
};
