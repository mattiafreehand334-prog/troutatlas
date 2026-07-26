'use strict';

const profileParams = new URLSearchParams(window.location.search);
const shopId = profileParams.get('id');
const profileRoot = document.getElementById('shop-profile');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function mapSearchUrl(shop) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.coordinates.lat},${shop.coordinates.lng}`)}`;
}

function directionsUrl(shop) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${shop.coordinates.lat},${shop.coordinates.lng}`)}`;
}

function imageMarkup(image) {
  const src = escapeHtml(image && image.src ? image.src : image);
  const alt = escapeHtml(image && image.alt ? image.alt : 'Fishing Time');
  return `<img src="${src}" alt="${alt}" loading="lazy" onerror="this.parentElement.classList.add('image-missing');this.remove()">`;
}

function renderProfile(shop) {
  const gallery = Array.isArray(shop.gallery) ? shop.gallery : [];
  const specialties = Array.isArray(shop.specialties) ? shop.specialties : [];
  const services = Array.isArray(shop.services) ? shop.services : [];
  const brands = Array.isArray(shop.brands) ? shop.brands : [];
  const social = shop.socials || {};
  const cover = shop.coverImage
    ? `<div class="shop-profile-cover">${imageMarkup(shop.coverImage)}<div class="shop-profile-cover-fallback">🎣</div></div>`
    : '<div class="shop-profile-cover-fallback">🎣</div>';
  const galleryCaption = gallery.length && gallery[0].alt && gallery[0].alt.toLowerCase().includes('street view')
    ? '<p class="shop-gallery-caption">Immagine 1: ingresso reale su Google Street View</p>'
    : '';
  const galleryMarkup = gallery.length
    ? `<div class="shop-gallery-wrapper">
         <button class="shop-gallery-nav shop-gallery-prev" type="button" aria-label="Immagine precedente">‹</button>
         <div class="shop-gallery">${gallery.map(image => `<div class="shop-gallery-item">${imageMarkup(image)}</div>`).join('')}</div>
         <button class="shop-gallery-nav shop-gallery-next" type="button" aria-label="Immagine successiva">›</button>
       </div>${galleryCaption}`
    : '<div class="shop-gallery-empty">Le immagini del negozio saranno aggiunte qui.</div>';
  const specialtyMarkup = specialties.length
    ? specialties.map(item => `<span class="shop-specialty">${escapeHtml(item)}</span>`).join('')
    : '<span class="shop-social-placeholder">Specialità in aggiornamento</span>';
  const serviceMarkup = services.length
    ? services.map(item => `<div class="shop-service"><span class="shop-service-icon">✓</span><span>${escapeHtml(item)}</span></div>`).join('')
    : '<div class="shop-social-placeholder">Servizi in aggiornamento</div>';
  const brandMarkup = brands.length
    ? brands.map(item => `<span class="shop-specialty">${escapeHtml(item)}</span>`).join('')
    : '<span class="shop-social-placeholder">Brand in aggiornamento</span>';
  const socialMarkup = [
    social.instagramUrl ? `<a class="btn-sm btn-sm-blue" href="${escapeHtml(social.instagramUrl)}" target="_blank" rel="noopener">Instagram</a>` : '<span class="shop-social-placeholder">Instagram — in aggiornamento</span>',
    social.facebookUrl ? `<a class="btn-sm btn-sm-blue" href="${escapeHtml(social.facebookUrl)}" target="_blank" rel="noopener">Facebook</a>` : '<span class="shop-social-placeholder">Facebook — in aggiornamento</span>',
    social.youtubeUrl ? `<a class="btn-sm btn-sm-blue" href="${escapeHtml(social.youtubeUrl)}" target="_blank" rel="noopener">YouTube</a>` : '',
    social.pinterestUrl ? `<a class="btn-sm btn-sm-blue" href="${escapeHtml(social.pinterestUrl)}" target="_blank" rel="noopener">Pinterest</a>` : ''
  ].filter(Boolean).join('');

  document.title = `${shop.name} — TroutAtlas`;
  profileRoot.innerHTML = `
    <article class="shop-profile-hero">
      ${cover}
      <div class="shop-profile-hero-copy">
        ${shop.partner && shop.partner.official ? '<span class="shop-profile-badge">🤝 PARTNERSHIP</span>' : ''}
        <h1 class="shop-profile-title">${escapeHtml(shop.name)}</h1>
        <p class="shop-profile-location">📍 ${escapeHtml(shop.address)}</p>
      </div>
      <div class="shop-profile-body">
        <p class="shop-profile-intro">${escapeHtml(shop.description || shop.speciality)}</p>

        <section class="shop-profile-section">
          <h2>📞 Contatti</h2>
          ${shop.phone ? `<div class="shop-detail-card"><div class="shop-detail-label">Telefono</div><div class="shop-detail-value">${escapeHtml(shop.phone)}</div></div>` : ''}
          ${shop.email ? `<div class="shop-detail-card"><div class="shop-detail-label">Email</div><div class="shop-detail-value"><a href="mailto:${escapeHtml(shop.email)}">${escapeHtml(shop.email)}</a></div></div>` : ''}
          ${shop.hours ? `<div class="shop-detail-card"><div class="shop-detail-label">Orari</div><div class="shop-detail-value">${escapeHtml(shop.hours)}</div></div>` : ''}
        </section>

        <section class="shop-profile-section">
          <h2>🎣 Specialità</h2>
          <div class="shop-specialty-list">${specialtyMarkup}</div>
        </section>

        <section class="shop-profile-section">
          <h2>✓ Servizi</h2>
          <div class="shop-service-list">${serviceMarkup}</div>
        </section>

        <section class="shop-profile-section">
          <h2>🏷️ Brand principali</h2>
          <div class="shop-specialty-list">${brandMarkup}</div>
        </section>

        <section class="shop-profile-section">
          <h2>📸 Gallery</h2>
          ${galleryMarkup}
        </section>

        <div class="shop-profile-actions">
          <a class="btn btn-maps" href="${directionsUrl(shop)}" target="_blank" rel="noopener">🧭 Portami qui</a>
          <a class="btn btn-outline" href="${mapSearchUrl(shop)}" target="_blank" rel="noopener">🗺️ Apri sulla mappa</a>
          ${shop.phone ? `<a class="btn btn-primary" href="tel:${escapeHtml(shop.phone)}">📞 Chiama ${escapeHtml(shop.phone)}</a>` : '<span class="shop-social-placeholder">Telefono in aggiornamento</span>'}
          ${shop.websiteUrl ? `<a class="btn btn-outline" href="${escapeHtml(shop.websiteUrl)}" target="_blank" rel="noopener">🌐 Visita il sito</a>` : '<span class="shop-social-placeholder">Sito web in aggiornamento</span>'}
        </div>

        <section class="shop-profile-section">
          <h2>📱 Social</h2>
          <div class="shop-social-row">${socialMarkup || '<span class="shop-social-placeholder">Social in aggiornamento</span>'}</div>
        </section>
      </div>
    </article>`;

  const gallerySlider = profileRoot.querySelector('.shop-gallery');
  const prevBtn = profileRoot.querySelector('.shop-gallery-prev');
  const nextBtn = profileRoot.querySelector('.shop-gallery-next');
  if (gallerySlider && prevBtn && nextBtn) {
    const scrollAmount = Math.max(gallerySlider.offsetWidth * 0.9, 260);
    const updateArrows = () => {
      prevBtn.disabled = gallerySlider.scrollLeft <= 10;
      nextBtn.disabled = gallerySlider.scrollLeft + gallerySlider.clientWidth >= gallerySlider.scrollWidth - 10;
    };
    prevBtn.addEventListener('click', () => { gallerySlider.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); });
    nextBtn.addEventListener('click', () => { gallerySlider.scrollBy({ left: scrollAmount, behavior: 'smooth' }); });
    gallerySlider.addEventListener('scroll', updateArrows, { passive: true });
    setTimeout(updateArrows, 50);
  }
}

fetch('negozi.json')
  .then(response => {
    if (!response.ok) throw new Error('Shop data unavailable');
    return response.json();
  })
  .then(shops => {
    const shop = shops.find(item => item.id === shopId && item.partner && item.partner.profileEnabled);
    if (!shop) {
      profileRoot.innerHTML = '<div class="empty-state"><div class="icon">🏪</div><p>Negozio partner non trovato.</p><a class="btn btn-primary" href="negozi.html">Torna ai negozi</a></div>';
      return;
    }
    renderProfile(shop);
  })
  .catch(() => {
    profileRoot.innerHTML = '<div class="empty-state"><div class="icon">📡</div><p>Dati non disponibili offline.<br>Connettiti a Internet almeno una volta per scaricarli.</p></div>';
  });
