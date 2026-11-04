/* Palio archive - gallery / story viewer, drill-down helpers. Vanilla JS, no network, no dependencies.
   - one swipeable lightbox for EVERY image collection (postcards, horse photos, banners ...): tap, swipe/arrow to the next, close once
   - "today in history" as tap-through story slides
   - timeline filters set from a link (#contrada=OCA&decade=1950&era=1700) so every chart bar / table cell drills in
   - big search button, tab-bar search, next-Palio countdown */
(function () {
  'use strict';
  var root = document.documentElement.getAttribute('data-root') || '';
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function lang() { return document.documentElement.lang || 'it'; }
  function T(k, d) { return ((window.PALIO_I18N || {})[lang()] || {})[k] || d || k; }
  function abs(u) { return /^(https?:)?\/\//.test(u) ? u : root + u; }

  /* ---- an image that cannot load never shows a broken-image icon: it is hidden and the tile/frame behind it shows ---- */
  function brokenImg(im) { if (im && im.tagName === 'IMG' && !im.closest('.lb')) im.classList.add('imgbroken'); }
  document.addEventListener('error', function (e) { brokenImg(e.target); }, true);
  $$('img').forEach(function (im) { if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) brokenImg(im); });

  /* ---- search: Enter / the big button / the phone tab go to the best hit or focus the box ---- */
  var input = $('#q'), box = $('#results');
  function goFirst() { var a = box && $('a', box); if (a) location.href = a.href; }
  var goBtn = $('#go'); if (goBtn) goBtn.addEventListener('click', goFirst);
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') goFirst(); });
  var tabS = $('#tab-search');
  if (tabS) tabS.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo(0, 0); if (input) input.focus(); });

  /* ---- next Palio countdown (2 July / 16 August: derived from the archive's dates) ---- */
  var cd = $('#cd');
  if (cd) {
    var n = new Date(), y = n.getFullYear(), t0 = new Date(y, n.getMonth(), n.getDate());
    var nx = [new Date(y, 6, 2), new Date(y, 7, 16), new Date(y + 1, 6, 2)].filter(function (d) { return d >= t0; })[0];
    cd.textContent = Math.round((nx - t0) / 864e5);
    var cdd = $('#cdd');
    function fmt() { try { cdd.textContent = nx.toLocaleDateString(lang() === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { cdd.textContent = nx.toDateString(); } }
    if (cdd) { fmt(); var lt = $('#lang-toggle'); if (lt) lt.addEventListener('click', function () { setTimeout(fmt, 0); }); }
  }

  /* ---- swipeable lightbox / story viewer ---- */
  var lb = null, lbImg, lbYear, lbCap, lbDots, SL = [], li = 0, lastFocus = null;
  function lbBuild() {
    lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = '<button class="x" type="button">✕</button><button class="pv" type="button">‹</button><div class="stage"><div class="frame"><img alt=""><div class="ly" style="display:none"></div></div><div class="cp"></div></div><button class="nx" type="button">›</button><div class="dots"></div>';
    document.body.appendChild(lb);
    lbImg = $('img', lb); lbYear = $('.ly', lb); lbCap = $('.cp', lb); lbDots = $('.dots', lb);
    $('.x', lb).onclick = lbClose; $('.pv', lb).onclick = function () { lbShow(li - 1); }; $('.nx', lb).onclick = function () { lbShow(li + 1); };
    lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    var sx = null, sy = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx == null) return; var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) lbShow(li + (dx < 0 ? 1 : -1)); sx = null;
    });
  }
  function lbShow(k) {
    li = (k + SL.length) % SL.length; var sl = SL[li];
    lb.setAttribute('aria-label', T('gal.label', 'Galleria'));
    $('.x', lb).setAttribute('aria-label', T('gal.close', 'Chiudi')); $('.pv', lb).setAttribute('aria-label', T('gal.prev', 'Precedente')); $('.nx', lb).setAttribute('aria-label', T('gal.next', 'Successiva'));
    lbImg.style.opacity = 0; lbYear.style.opacity = 0;
    setTimeout(function () {
      if (sl.kind === 'year') {
        lbImg.style.display = 'none'; lbYear.style.display = 'block'; lbYear.innerHTML = '';
        var yy = document.createElement('div'); yy.className = 'yy'; yy.textContent = sl.y;
        var ww = document.createElement('div'); ww.className = 'ww'; ww.textContent = sl.w || '';
        lbYear.appendChild(yy); lbYear.appendChild(ww); lbYear.style.opacity = 1;
      } else { lbYear.style.display = 'none'; lbImg.style.display = 'block'; lbImg.src = sl.src; lbImg.alt = sl.cap || ''; lbImg.style.opacity = 1; }
      lbCap.innerHTML = '';
      var t = document.createElement('div'); t.className = 'ct'; t.textContent = (sl.cap || '') + (SL.length > 1 ? '  (' + (li + 1) + ' / ' + SL.length + ')' : ''); lbCap.appendChild(t);
      if (sl.page) { var a = document.createElement('a'); a.href = abs(sl.page); a.textContent = T(sl.kind === 'year' ? 'gal.open_race' : 'gal.open', 'Apri la pagina →'); lbCap.appendChild(a); }
    }, 90);
    lbDots.innerHTML = '';
    if (SL.length <= 24) SL.forEach(function (_, j) { var d = document.createElement('i'); if (j === li) d.className = 'on'; lbDots.appendChild(d); });
    [1, -1].forEach(function (s2) { var o = SL[(li + s2 + SL.length) % SL.length]; if (o && o.src) { var p = new Image(); p.src = o.src; } });
  }
  function lbOpen(list, k) {
    if (!list.length) return; if (!lb) lbBuild(); SL = list; lastFocus = document.activeElement;
    lb.classList.add('open'); document.body.style.overflow = 'hidden'; lbShow(k || 0); $('.x', lb).focus();
  }
  function lbClose() { if (!lb) return; lb.classList.remove('open'); document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('keydown', function (e) {
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') lbClose(); else if (e.key === 'ArrowRight') lbShow(li + 1); else if (e.key === 'ArrowLeft') lbShow(li - 1);
  });
  window.PALIO_LB = { open: lbOpen };

  /* every image collection: scope = .gallery-scope. A linked image keeps its link as "open the page";
     if the link points at an image file, that (larger) file is what the lightbox shows. */
  function eligible(im) {
    if (im.classList.contains('nolb') || im.closest('nav,header,footer,.nolb')) return false;
    var w = im.naturalWidth || parseInt(im.getAttribute('width') || '0', 10);
    if (w && w < 64) return false;
    if (im.complete && im.naturalWidth === 0 && !im.getAttribute('width')) return false;
    return true;
  }
  document.addEventListener('click', function (e) {
    var im = e.target.closest ? e.target.closest('img') : null; if (!im) return;
    var scope = im.closest('.gallery-scope'); if (!scope || !eligible(im)) return;
    var list = [], at = 0;
    $$('img', scope).filter(eligible).forEach(function (x) {
      var a = x.closest('a'), href = a && a.getAttribute('href');
      var big = href && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(href) ? a.href : null;
      var page = a && href && !big && !/^#|^javascript:/i.test(href) ? a.href : null;
      var cap = x.alt || x.title || (x.nextElementSibling && x.nextElementSibling.textContent) || '';
      if (x === im) at = list.length;
      list.push({ kind: 'img', src: big || x.currentSrc || x.src, cap: (cap || '').trim().slice(0, 140), page: page });
    });
    e.preventDefault(); lbOpen(list, at);
  });
  $$('[data-gallery="cards"]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault(); var d = document.getElementById('data-cards'); if (!d) return;
      lbOpen(JSON.parse(d.textContent).map(function (c) { return { kind: 'img', src: c.src, cap: c.cap, page: c.page }; }), 0);
    });
  });

  /* ---- "today in history" as a story (hits are published by app.js once calendar.js has loaded) ---- */
  var sb = $('#todaystory');
  if (sb) {
    var tmr = setInterval(function () {
      var hits = window.__todayHits; if (!hits) return; clearInterval(tmr);
      if (hits.length) {
        sb.hidden = false;
        sb.onclick = function () { lbOpen(hits.map(function (e) { return { kind: 'year', y: e.y, w: e.w, cap: e.d + '/' + e.m + '/' + e.y + (e.w ? ' · ' + e.w : ''), page: e.u }; }), 0); };
      }
    }, 150);
  }

  /* ---- timeline: filters from the link hash, so chart bars / stats cells drill into the filtered list ---- */
  var tl = $('#timeline');
  if (tl) {
    var H = {};
    (location.hash || '').replace(/^#/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) H[p[0]] = decodeURIComponent(p[1] || ''); });
    var fc = $('#f-contrada'), fe = $('#f-era');
    if (H.contrada && fc) fc.value = H.contrada;
    if (H.era && fe) fe.value = H.era;
    if (H.contrada || H.era) (fc || fe).dispatchEvent(new Event('input'));
    if (H.decade) {
      var dc = +H.decade, shown = 0;
      $$('li', tl).forEach(function (x) { var yr = +x.dataset.year; if (yr < dc || yr >= dc + 10) x.hidden = true; else if (!x.hidden) shown++; });
      var cnt = $('#f-count'); if (cnt) cnt.textContent = (T('timeline.count', '{n} Palii mostrati')).replace('{n}', shown);
      var hh = document.getElementById('d' + dc); if (hh) hh.scrollIntoView();
    }
  }
})();
