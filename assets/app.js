/* Palio archive - small vanilla JS: language toggle, instant search, "this day", timeline filters. No network. */
(function () {
  'use strict';
  var root = document.documentElement.getAttribute('data-root') || '';
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function load(src, cb) { var s = document.createElement('script'); s.src = root + src; s.onload = cb; document.head.appendChild(s); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---- i18n (UI strings only; source content stays in Italian) ---- */
  var lang = store('palio-lang') || 'it';
  function applyLang(l) {
    lang = l; store('palio-lang', l);
    document.documentElement.lang = l;
    var D = (window.PALIO_I18N || {})[l]; if (!D) return;
    $$('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n'), t = D[k]; if (t == null) return;
      var author = el.getAttribute('data-author'), n = el.getAttribute('data-n');
      if (author != null) t = t.replace('{author}', author);
      if (n != null) t = t.replace('{n}', n);
      el.textContent = t;
    });
    $$('[data-i18n-attr]').forEach(function (el) {
      var p = el.getAttribute('data-i18n-attr').split(':'); if (D[p[1]]) el.setAttribute(p[0], D[p[1]]);
    });
    var b = $('#lang-toggle'); if (b) b.textContent = D['lang.switch'];
  }
  var tg = $('#lang-toggle');
  if (tg) tg.addEventListener('click', function () { applyLang(lang === 'it' ? 'en' : 'it'); });
  if (lang !== 'it') applyLang(lang);

  /* ---- instant search over a prebuilt index ---- */
  var input = $('#q'), box = $('#results'), idx = null, loading = false;
  function search(q) {
    var toks = norm(q).split(/\s+/).filter(Boolean); if (!toks.length || !idx) return [];
    var out = [];
    for (var i = 0; i < idx.length; i++) {
      var d = idx[i], hay = d.n, score = 0, ok = true;
      for (var j = 0; j < toks.length; j++) {
        var p = hay.indexOf(toks[j]); if (p < 0) { ok = false; break; }
        score += (p === 0 || hay.charAt(p - 1) === ' ') ? 3 : 1;
      }
      if (ok) out.push([score + d.w, d]);
    }
    out.sort(function (a, b) { return b[0] - a[0] || (a[1].t < b[1].t ? -1 : 1); });
    return out.slice(0, 12).map(function (x) { return x[1]; });
  }
  function render(res) {
    box.innerHTML = '';
    if (!input.value.trim()) { box.hidden = true; return; }
    if (!res.length) { var d = document.createElement('div'); d.style.padding = '.6rem .8rem'; d.className = 'muted';
      d.textContent = ((window.PALIO_I18N || {})[lang] || {})['search.none'] || 'Nessun risultato'; box.appendChild(d); box.hidden = false; return; }
    res.forEach(function (r) {
      var a = document.createElement('a'); a.href = root + r.u;
      var t = document.createElement('span'); t.textContent = r.t; var k = document.createElement('span'); k.className = 'kind'; k.textContent = r.k;
      a.appendChild(t); a.appendChild(k); box.appendChild(a);
    });
    box.hidden = false;
  }
  if (input && box) {
    var go = function () { render(search(input.value)); };
    input.addEventListener('input', function () {
      if (idx) return go();
      if (!loading) { loading = true; load('assets/search-index.js', function () { idx = window.PALIO_INDEX; go(); }); }
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { box.hidden = true; }
      if (e.key === 'ArrowDown') { var a = $('a', box); if (a) { a.focus(); e.preventDefault(); } }
    });
    box.addEventListener('keydown', function (e) {
      var cur = document.activeElement;
      if (e.key === 'ArrowDown' && cur.nextElementSibling) { cur.nextElementSibling.focus(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { (cur.previousElementSibling || input).focus(); e.preventDefault(); }
      if (e.key === 'Escape') { box.hidden = true; input.focus(); }
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.search')) box.hidden = true; });
  }

  /* ---- this day in Palio history ---- */
  var today = $('#today-list');
  if (today) {
    load('assets/calendar.js', function () {
      var cal = window.PALIO_CAL || [], now = new Date(), m = now.getMonth() + 1, d = now.getDate();
      var hits = cal.filter(function (e) { return e.m === m && e.d === d; });
      var note = $('#today-note'); today.innerHTML = '';
      if (!hits.length) {
        var doy = function (mm, dd) { return mm * 31 + dd; }, me = doy(m, d);
        var near = cal.filter(function (e) { return e.m && e.d; }).map(function (e) { return [Math.abs(doy(e.m, e.d) - me), e]; });
        near.sort(function (a, b) { return a[0] - b[0]; });
        var seen = {}; hits = [];
        near.forEach(function (x) { var k = x[1].m + '-' + x[1].d; if (!seen[k] && Object.keys(seen).length < 2) { seen[k] = 1; } if (seen[k]) hits.push(x[1]); });
        hits = hits.slice(0, 8); if (note) note.hidden = false;
      }
      hits.sort(function (a, b) { return a.y - b.y; });
      window.__todayHits = hits;
      var th = $('#todayh');
      if (th && hits[0]) {
        var MN = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
          ME = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        th.textContent = hits[0].d + ' ' + (lang === 'en' ? ME : MN)[hits[0].m - 1];
      }
      hits.forEach(function (e) {
        var li = document.createElement('li'); var a = document.createElement(e.u ? 'a' : 'span'); if (e.u) a.href = root + e.u;
        a.textContent = e.d + '/' + e.m + '/' + e.y + (e.w ? ' - ' + e.w : ''); li.appendChild(a); today.appendChild(li);
      });
    });
  }

  /* ---- timeline filters ---- */
  var tl = $('#timeline');
  if (tl) {
    var items = $$('li', tl), fe = $('#f-era'), fc = $('#f-contrada'), fj = $('#f-jockey'), ft = $('#f-type'), cnt = $('#f-count');
    var run = function () {
      var era = fe.value, c = fc.value, j = norm(fj.value), t = ft.value, n = 0;
      items.forEach(function (li) {
        var y = +li.dataset.year, ok = (!era || (y >= +era && y < +era + 100)) && (!c || li.dataset.contrada === c) &&
          (!j || norm(li.dataset.jockey).indexOf(j) >= 0) && (!t || li.dataset.type === t);
        li.hidden = !ok; if (ok) n++;
      });
      cnt.setAttribute('data-n', n); var D = (window.PALIO_I18N || {})[lang] || {};
      cnt.textContent = (D['timeline.count'] || '{n} Palii mostrati').replace('{n}', n);
    };
    [fe, fc, fj, ft].forEach(function (el) { el.addEventListener('input', run); });
    run();
  }
})();
