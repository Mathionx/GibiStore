/* js/lightbox.js */
// ============================================================================
// GIBI STORE v3 — Image lightbox / carousel
// Used from the listing detail page's photo gallery.
// ============================================================================

const Lightbox = {
  images: [],
  index: 0,

  open(images, startIndex = 0) {
    this.images = images && images.length ? images : ['https://picsum.photos/seed/fallback/600'];
    this.index = startIndex;
    this.render();
  },

  render() {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="lightbox-backdrop" id="lightbox-backdrop">
        <button class="lightbox-close" id="lb-close">${Icon('x', 17)}</button>
        ${this.images.length > 1 ? `<button class="lightbox-nav prev" id="lb-prev">${Icon('chevronLeft', 18)}</button>` : ''}
        <img class="lightbox-img" id="lb-img" src="${escapeAttr(this.images[this.index])}">
        ${this.images.length > 1 ? `<button class="lightbox-nav next" id="lb-next" style="transform:translateY(-50%) scaleX(-1);">${Icon('chevronLeft', 18)}</button>` : ''}
        <div class="lightbox-dots" id="lb-dots"></div>
      </div>`;
    this.updateDots();

    document.getElementById('lightbox-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox-backdrop') this.close();
    });
    document.getElementById('lb-close').addEventListener('click', () => this.close());
    document.getElementById('lb-prev')?.addEventListener('click', () => this.nav(-1));
    document.getElementById('lb-next')?.addEventListener('click', () => this.nav(1));
  },

  nav(dir) {
    this.index = (this.index + dir + this.images.length) % this.images.length;
    document.getElementById('lb-img').src = this.images[this.index];
    this.updateDots();
  },

  updateDots() {
    const dots = document.getElementById('lb-dots');
    if (!dots) return;
    dots.innerHTML = this.images.map((_, i) => `<span class="${i === this.index ? 'active' : ''}"></span>`).join('');
  },

  close() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }
};
