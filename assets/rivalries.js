/* Rivalries & alliances map. Data = page JSON (#rv-data), built ONLY from the archive's own pages; every story links to its source.
   Layout: two rings (outer 10 / inner 7) so crests never touch or overlap, on phone or computer. */
(function () {
  'use strict';
  var raw = document.getElementById('rv-data'); if (!raw) return;
  var D = JSON.parse(raw.textContent), DATA = D.riv, NODES = D.nodes;
  var root = document.documentElement.getAttribute('data-root') || '';
  function lang() { return document.documentElement.lang || 'it'; }
  function T(k) { return ((window.PALIO_I18N || {})[lang()] || {})[k] || k; }
  var map = document.getElementById('map'), svg = document.getElementById('svg'), panel = document.getElementById('panel'), all = document.getElementById('all');
  var on = { in: true, es: true, sp: true, al: true }, sel = null, pos = {}, built = false;
  var RINGS = [['AQUILA', 'PANTERA', 'SELVA', 'TARTUCA', 'CHIOCCIOLA', 'TORRE', 'ONDA', 'OCA', 'NICCHIO', 'VALDIMONTONE'], ['BRUCO', 'GIRAFFA', 'CIVETTA', 'LEOCORNO', 'DRAGO', 'LUPA', 'ISTRICE']];
  var OFF = [-90, -90 + 360 / 14];
  var mq = window.matchMedia ? window.matchMedia('(max-width: 55.99rem)') : { matches: false };
  function rad() { return mq.matches ? [39, 22] : [38, 19.5]; }   // phone: tighter rings keep every crest clear of the card edge and of its neighbours
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function N(k) { return NODES.filter(function (n) { return n.k === k; })[0]; }
  function tcls(r) { return r.type === 'alliance' ? 'al' : ({ 'in essere': 'in', 'estinta': 'es', 'sporadica': 'sp' })[r.status]; }
  function members(r) { return r.type === 'alliance' ? (Array.isArray(r.members) ? r.members : []) : [r.a, r.b]; }
  var TN = { in: 'rv.t_in', es: 'rv.t_es', sp: 'rv.t_sp', al: 'rv.t_al' };
  function ns(t, a) { var e = document.createElementNS('http://www.w3.org/2000/svg', t); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function srcHref(u, local) { return local ? root + local : u; }

  function place() {
    var R = rad();
    RINGS.forEach(function (ring, ri) {
      ring.forEach(function (k, i) {
        var a = (OFF[ri] + i * 360 / ring.length) * Math.PI / 180;
        pos[k] = { x: 50 + R[ri] * Math.cos(a), y: 50 + R[ri] * Math.sin(a) };
      });
    });
  }
  place();
  NODES.forEach(function (n) {
    var b = el('button', 'nd'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', n.name); b.dataset.k = n.k;
    b.style.left = pos[n.k].x + '%'; b.style.top = pos[n.k].y + '%';
    b.style.setProperty('--c1', n.c[0]); b.style.setProperty('--c2', n.c[1]); b.style.setProperty('--c3', n.c[2]); b.title = n.name + ': ' + n.words;
    var f = el('span', 'fr'), im = new Image(); im.src = n.img; im.alt = ''; im.width = 74; im.referrerPolicy = 'no-referrer'; f.appendChild(im);
    b.appendChild(f); b.appendChild(el('b', null, n.name));
    b.onclick = function () { select(sel === n.k ? null : n.k); }; map.appendChild(b);
  });
  function edgePath(a, b, k) { var A = pos[a], B = pos[b], cx = 50 + (A.x + B.x - 100) * .18 * k, cy = 50 + (A.y + B.y - 100) * .18 * k; return 'M' + A.x + ' ' + A.y + ' Q' + cx + ' ' + cy + ' ' + B.x + ' ' + B.y; }
  var edges = [];
  DATA.rels.forEach(function (r) {
    var m = members(r), t = tcls(r);
    function mk(a, b, k) { var e = { r: r, t: t, ms: m, d: edgePath(a, b, k) }; e.d2 = function () { return edgePath(a, b, k); }; edges.push(e); }
    if (m.length === 2) mk(m[0], m[1], t === 'al' ? .55 : 1);
    else if (m.length > 2) {
      var order = RINGS[0].concat(RINGS[1]), idx = m.map(function (k) { return order.indexOf(k); }).sort(function (a, b) { return a - b; });
      for (var i = 0; i < idx.length; i++) mk(order[idx[i]], order[idx[(i + 1) % idx.length]], .7);
    }
  });
  edges.sort(function (a, b) { return (a.t === 'al' ? 0 : 1) - (b.t === 'al' ? 0 : 1); });
  edges.forEach(function (e) {
    var p = ns('path', { d: e.d, class: 'e ' + e.t }), h = ns('path', { d: e.d, class: 'e hit' });
    e.p = p; e.h = h; h.addEventListener('click', function () { showRel(e.r); }); svg.appendChild(p); svg.appendChild(h);
  });
  svg.setAttribute('aria-hidden', 'false');
  function relayout() {
    place();
    [].forEach.call(map.querySelectorAll('.nd'), function (b) { b.style.left = pos[b.dataset.k].x + '%'; b.style.top = pos[b.dataset.k].y + '%'; });
    edges.forEach(function (e) { var m = e.r.type === 'alliance' && !Array.isArray(e.r.members) ? [] : e.ms; e.p.setAttribute('d', e.d2 ? e.d2() : e.p.getAttribute('d')); e.h.setAttribute('d', e.p.getAttribute('d')); });
  }
  if (mq.addEventListener) mq.addEventListener('change', relayout);
  function redraw() {
    edges.forEach(function (e) { var vis = on[e.t], inv = !sel || e.ms.indexOf(sel) >= 0; e.p.style.display = e.h.style.display = vis ? '' : 'none'; e.p.classList.toggle('dim', !inv); });
    [].forEach.call(map.querySelectorAll('.nd'), function (b) {
      var k = b.dataset.k; b.setAttribute('aria-pressed', String(k === sel));
      var rel = !sel || k === sel || DATA.rels.some(function (r) { var m = members(r); return on[tcls(r)] && m.indexOf(sel) >= 0 && m.indexOf(k) >= 0; });
      b.classList.toggle('dim', !rel);
    });
  }
  function srcLinks(s) {
    var d = el('div', 'src'), a = el('a', null, T('rv.read')); a.href = s.url; a.rel = 'noopener'; d.appendChild(a);
    if (s.preview) { var b = el('a', null, T('rv.preview')); b.href = root + s.preview; d.appendChild(b); }
    return d;
  }
  function relCard(r) {
    var c = el('div', 'rel'), t = tcls(r); c.appendChild(el('span', 'tag ' + t, T(TN[t])));
    c.appendChild(el('h3', null, r.type === 'rivalry' ? (N(r.a).name + ' – ' + N(r.b).name) : r.title));
    if (r.type === 'rivalry') c.appendChild(el('p', null, r.why + (r.truncated ? ' …' : '')));
    (r.quotes || []).forEach(function (q) { var b = el('blockquote', null, '«' + q.t + '»'); b.appendChild(el('cite', null, '— ' + T('rv.from_page') + ' «' + q.src.file + '»')); c.appendChild(b); });
    c.appendChild(srcLinks(r.src)); return c;
  }
  function showRel(r) {
    sel = null; redraw(); panel.innerHTML = ''; panel.appendChild(el('div', 'eyebrow', T('rv.story'))); panel.appendChild(relCard(r));
    var m = members(r);
    if (m.length === 2) DATA.rels.forEach(function (o) { var mo = members(o); if (o !== r && mo.length === 2 && mo.indexOf(m[0]) >= 0 && mo.indexOf(m[1]) >= 0) panel.appendChild(relCard(o)); });
    if (built) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function select(k) {
    sel = k; redraw(); panel.innerHTML = '';
    if (!k) { panel.appendChild(el('div', 'eyebrow', T('rv.how'))); panel.appendChild(el('h2', null, T('rv.pick'))); panel.appendChild(el('p', null, DATA.hubintro)); panel.appendChild(srcLinks(DATA.hub)); return; }
    var n = N(k); panel.appendChild(el('div', 'eyebrow', T('rv.contrada'))); panel.appendChild(el('h2', null, n.name));
    panel.appendChild(el('p', 'note2', T('rv.flag') + ' ' + n.words + '.'));
    var rs = DATA.rels.filter(function (r) { return on[tcls(r)] && members(r).indexOf(k) >= 0; });
    if (!rs.length) panel.appendChild(el('p', null, T('rv.none')));
    rs.forEach(function (r) { panel.appendChild(relCard(r)); });
    var a = el('a', 'go', T('rv.go')); a.href = root + n.url; panel.appendChild(a);
  }
  [].forEach.call(document.querySelectorAll('.legend button'), function (b) {
    b.onclick = function () { var t = b.dataset.t; on[t] = !on[t]; b.setAttribute('aria-pressed', String(on[t])); redraw(); if (sel) select(sel); };
  });
  DATA.rels.forEach(function (r) {
    var t = tcls(r), b = el('button', 'pair ' + t); b.type = 'button';
    b.appendChild(el('span', null, r.type === 'rivalry' ? (N(r.a).name + ' – ' + N(r.b).name) : r.title)); b.appendChild(el('small', null, T(TN[t])));
    b.onclick = function () { showRel(r); }; all.appendChild(b);
  });
  var ul = document.getElementById('others');
  DATA.others.forEach(function (o) { var li = el('li'), a = el('a', null, o.title); a.href = o.url; a.rel = 'noopener'; li.appendChild(a); ul.appendChild(li); });
  redraw(); select(null); built = true;
  var lt = document.getElementById('lang-toggle'); if (lt) lt.addEventListener('click', function () { setTimeout(function () { select(sel); }, 0); });
})();
