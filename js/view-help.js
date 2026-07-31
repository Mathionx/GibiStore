/* js/view-help.js */
// ============================================================================
// GIBI STORE v3 — #help view
// Public FAQ (content editable from the Owner Panel) + a report-a-seller
// form for logged-in users.
// ============================================================================

const ViewHelp = {
  registerRoute() {
    Router.register('help', { render: (el) => this.render(el), title: 'Help & FAQ' });
  },

  async render(el) {
    el.innerHTML = `
      <div class="subpage-header">
        <button class="subpage-back" id="back-btn">${Icon('chevronLeft', 18)}</button>
        <h1>Help &amp; FAQ</h1>
      </div>
      <div class="section-title">Frequently Asked Questions</div>
      <div id="faq-list" class="section-pad" style="padding-top:0;"></div>

      <div class="section-title">Report a Seller</div>
      <div class="admin-card">
        <form id="report-form">
          <div class="field"><label for="report-email">Seller's Email</label><input type="email" id="report-email" required placeholder="seller@campus.edu" /></div>
          <div class="field"><label for="report-reason">Reason</label><select id="report-reason" required></select></div>
          <div class="field"><label for="report-details">Details</label><textarea id="report-details" placeholder="Tell us what happened…"></textarea></div>
          <button class="btn btn-primary btn-block" type="submit">Submit Report</button>
        </form>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => Router.back());

    const faqList = document.getElementById('faq-list');
    const { data: faqs } = await supabaseClient.from('faq').select('*').order('sort_order');
    if (!faqs || faqs.length === 0) {
      faqList.innerHTML = `<div class="empty-state"><div class="state-icon">${Icon('alert', 22)}</div><h3>No FAQ yet</h3></div>`;
    } else {
      faqList.innerHTML = faqs.map(f => `
        <div class="faq-item">
          <div class="faq-q">${escapeHTML(f.question)} <span class="chev icon-inline">${Icon('chevronLeft', 14)}</span></div>
          <div class="faq-a">${escapeHTML(f.answer)}</div>
        </div>`).join('');
      faqList.querySelectorAll('.faq-item').forEach(item => {
        item.querySelector('.faq-q').addEventListener('click', () => item.classList.toggle('open'));
      });
    }

    const { data: reasons } = await supabaseClient.from('report_reasons').select('*').order('id');
    document.getElementById('report-reason').innerHTML = (reasons || []).map(r => `<option value="${escapeAttr(r.reason)}">${escapeHTML(r.reason)}</option>`).join('');

    document.getElementById('report-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!Auth.isLoggedIn) { showToast('Please log in first to submit a report.', 'error'); Router.go('#login'); return; }
      const sellerEmail = document.getElementById('report-email').value.trim();
      const { data: seller } = await supabaseClient.from('profiles').select('id').eq('email', sellerEmail).maybeSingle();
      if (!seller) { showToast('No user found with that email.', 'error'); return; }

      const { error } = await supabaseClient.from('reports').insert({
        reporter_id: Auth.userId,
        reported_seller_id: seller.id,
        reason: document.getElementById('report-reason').value,
        details: document.getElementById('report-details').value.trim()
      });
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Report submitted — our team will review it.', 'success');
      e.target.reset();
    });
  }
};
