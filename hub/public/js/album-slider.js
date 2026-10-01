'use strict';

(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const rarityNames = { legendary: 'Legendaris', epic: 'Epik', rare: 'Langka', common: 'Umum' };
  const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    root: null, track: null, status: null, toggle: null, cards: [], signature: '',
    pausedByUser: false, hovered: false, focused: false, visible: false, timer: null
  };

  function reduced() {
    return motionMedia.matches || document.documentElement.dataset.motion === 'reduce';
  }

  function canAdvance() {
    return state.cards.length > 1 && state.visible && !document.hidden &&
      !reduced() && !state.pausedByUser && !state.hovered && !state.focused;
  }

  function updateToggle() {
    if (!state.toggle) return;
    const unavailable = reduced();
    state.toggle.disabled = unavailable;
    state.toggle.textContent = state.pausedByUser || unavailable ? 'Putar' : 'Jeda';
    state.toggle.setAttribute('aria-label', unavailable
      ? 'Putar otomatis tidak tersedia saat kurangi gerakan aktif'
      : state.pausedByUser ? 'Putar otomatis kartu album' : 'Jeda kartu album');
    state.toggle.setAttribute('aria-pressed', String(!state.pausedByUser && !unavailable));
  }

  function orderedCards(games) {
    const piles = games.map(game => ({
      game: String(game.title || 'Game'),
      cards: (Array.isArray(game.cards) ? game.cards : [])
        .filter(card => card && typeof card === 'object')
        .slice().sort((a, b) => Number(Boolean(b.owned)) - Number(Boolean(a.owned)))
    }));
    const cards = [];
    const longest = Math.max(0, ...piles.map(pile => pile.cards.length));
    for (let index = 0; index < longest; index++) {
      for (const pile of piles) {
        if (pile.cards[index]) cards.push({ ...pile.cards[index], game: pile.game });
      }
    }
    return cards;
  }

  function cardMarkup(card) {
    const owned = Boolean(card.owned);
    const rarity = Object.hasOwn(rarityNames, card.rarity) ? card.rarity : 'common';
    const game = escapeHtml(card.game);
    const name = owned ? escapeHtml(card.name) : '???';
    const image = owned && typeof card.image === 'string' && /^\/(?!\/)/.test(card.image)
      ? `<img src="${escapeHtml(card.image)}" alt="" loading="lazy">` : '';
    const count = owned && Number.isFinite(Number(card.count)) && Number(card.count) > 1
      ? `<span class="gmy-album-card-count">×${Math.floor(Number(card.count))}</span>` : '';
    return `<article class="gmy-album-card ${rarity}${owned ? ' owned' : ' locked'}" aria-label="${owned ? `${name}, ` : 'Kartu terkunci, '}${game}, ${rarityNames[rarity]}">
      <div class="gmy-album-card-art">${image}${owned ? '' : '<span class="gmy-album-question" aria-hidden="true">?</span>'}${count}</div>
      <div class="gmy-album-card-copy"><small>${game}</small><strong>${name}</strong></div>
    </article>`;
  }

  function cardStep() {
    const first = state.track?.querySelector('.gmy-album-card');
    if (!first) return 0;
    const gap = Number.parseFloat(getComputedStyle(state.track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  function currentIndex() {
    const step = cardStep();
    return step ? Math.max(0, Math.round(state.track.scrollLeft / step)) : 0;
  }

  function updateStatus() {
    if (!state.status || !state.track) return;
    const total = state.cards.length;
    if (!total) { state.status.textContent = 'Belum ada kartu'; return; }
    const step = cardStep();
    const visible = step ? Math.max(1, Math.round((state.track.clientWidth + 12) / step)) : 1;
    const start = Math.min(total, currentIndex() + 1);
    state.status.textContent = `${start}–${Math.min(total, start + visible - 1)} dari ${total} kartu`;
  }

  function move(direction, automatic = false) {
    if (!state.track || state.cards.length < 2) return;
    if (!automatic) { state.pausedByUser = true; updateToggle(); }
    const step = cardStep();
    if (!step) return;
    const max = Math.max(0, state.track.scrollWidth - state.track.clientWidth);
    const current = state.track.scrollLeft;
    const target = direction > 0
      ? current >= max - 2 ? 0 : Math.min(max, (currentIndex() + 1) * step)
      : current <= 2 ? max : Math.max(0, (currentIndex() - 1) * step);
    state.track.scrollTo({ left: target, behavior: reduced() ? 'auto' : 'smooth' });
  }

  function setup(root) {
    root.innerHTML = `<div class="gmy-album-slider-head">
      <div><span class="gmy-album-slider-kicker">DARI SEMUA ARENA</span><h3>Kartu yang menunggumu</h3></div>
      <div class="gmy-album-slider-actions" aria-label="Kontrol album">
        <span class="gmy-album-slider-status" aria-live="off"></span>
        <button type="button" data-album-action="prev" aria-label="Kartu sebelumnya">‹</button>
        <button type="button" data-album-action="next" aria-label="Kartu berikutnya">›</button>
        <button type="button" class="gmy-album-slider-toggle" data-album-action="toggle">Jeda</button>
      </div>
    </div><div class="gmy-album-slider-track" role="region" aria-roledescription="karusel" aria-label="Pratinjau kartu dari semua game" tabindex="0"></div>`;
    root.classList.add('gmy-album-slider');
    state.root = root;
    state.track = root.querySelector('.gmy-album-slider-track');
    state.status = root.querySelector('.gmy-album-slider-status');
    state.toggle = root.querySelector('.gmy-album-slider-toggle');
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-album-action]')?.dataset.albumAction;
      if (action === 'prev') move(-1);
      if (action === 'next') move(1);
      if (action === 'toggle') {
        state.pausedByUser = !state.pausedByUser;
        updateToggle();
      }
    });
    root.addEventListener('mouseenter', () => { state.hovered = true; });
    root.addEventListener('mouseleave', () => { state.hovered = false; });
    const updateFocus = () => {
      state.focused = root.contains(document.activeElement) && document.activeElement !== state.toggle;
    };
    root.addEventListener('focusin', updateFocus);
    root.addEventListener('focusout', () => { requestAnimationFrame(updateFocus); });
    state.track.addEventListener('pointerdown', () => { state.pausedByUser = true; updateToggle(); }, { passive: true });
    state.track.addEventListener('wheel', () => { state.pausedByUser = true; updateToggle(); }, { passive: true });
    state.track.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    });
    state.track.addEventListener('scroll', updateStatus, { passive: true });
    window.addEventListener('resize', updateStatus, { passive: true });
    motionMedia.addEventListener('change', updateToggle);
    new MutationObserver(updateToggle).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { state.visible = entries[0]?.isIntersecting ?? false; }, { threshold: 0.15 }).observe(root);
    } else {
      const checkVisible = () => { const box = root.getBoundingClientRect(); state.visible = box.bottom > 0 && box.top < innerHeight; };
      window.addEventListener('scroll', checkVisible, { passive: true });
      checkVisible();
    }
    state.timer = window.setInterval(() => { if (canAdvance()) move(1, true); }, 4200);
    updateToggle();
  }

  function render(album) {
    const root = document.getElementById('albumRows');
    if (!root || !album || !Array.isArray(album.games)) return false;
    if (state.root !== root) setup(root);
    const cards = orderedCards(album.games);
    const signature = JSON.stringify(cards.map(card => [card.key, card.game, card.owned, card.count, card.name, card.image, card.rarity]));
    if (signature === state.signature) return true;
    const previous = state.track.scrollLeft;
    state.cards = cards;
    state.signature = signature;
    state.track.innerHTML = cards.length
      ? cards.map(cardMarkup).join('')
      : '<p class="gmy-album-slider-empty">Kartu sedang disiapkan.</p>';
    state.track.scrollLeft = previous;
    updateStatus();
    updateToggle();
    return true;
  }

  window.GamysufAlbumSlider = { render };
})();
