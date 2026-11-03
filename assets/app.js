(function () {
  'use strict';
  var D = window.DONNEES, C = window.CARTE;
  var SITES = D.SITES, MARQUES = D.MARQUES, SEM = D.SEMAINES;
  var MOTO = {}; D.MODELES.forEach(function (m) { MOTO[m[0]] = m[1]; });
  var etat = { w: SEM[SEM.length - 1], site: null };
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var COUL_SITE = { 'Abidjan': '#00438D', 'Yamoussoukro': '#3E3D5C', 'Bouaké': '#3E3D5C', 'San Pedro': '#3E3D5C' };

  function lundi(w) { var d = new Date(Date.UTC(2025, 11, 29)); d.setUTCDate(d.getUTCDate() + (w - 1) * 7); return d; }
  function jour(d) { return d.getUTCDate() + (d.getUTCDate() === 1 ? 'er' : '') + ' ' + MOIS[d.getUTCMonth()]; }
  function semIso(s) { var d = new Date(s + 'T00:00:00Z'); var t = new Date(d); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); var y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 864e5 + 1) / 7); }
  function jours(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }
  function fmt(n) { return Math.round(n).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' '); }
  function pct(x) { return Math.round(x * 100) + ' %'; }
  function sgn(x) { var v = Math.round(x * 100); return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' %'; }
  function sgnN(x) { var v = Math.round(x); return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v); }
  function okSite(s) { return !etat.site || s === etat.site; }
  D.cmds.forEach(function (c) { c.wc = semIso(c.date_cmd); c.wl = c.date_liv ? semIso(c.date_liv) : null; c.delai = c.date_liv ? jours(c.date_cmd, c.date_liv) : null; });

  function tot(k, o) {
    o = o || {}; var s = 0;
    D.rows.forEach(function (r) {
      if (o.w != null && r.semaine !== o.w) return;
      if (o.wmin != null && r.semaine < o.wmin) return;
      if (o.wmax != null && r.semaine > o.wmax) return;
      if (o.site && r.site !== o.site) return;
      if (o.m && r.marque !== o.m) return;
      s += r[k];
    });
    return s;
  }
  function obj(kind, o) {
    o = o || {}; var O = kind === 'liv' ? D.OBJ_LIV : D.OBJ_CMD, s = 0;
    SITES.forEach(function (st) { MARQUES.forEach(function (m) { if ((!o.site || o.site === st) && (!o.m || o.m === m)) s += O[st][m]; }); });
    return s;
  }
  function carnet(w, o) {
    o = o || {}; var s = 0;
    SITES.forEach(function (st) { MARQUES.forEach(function (m) { if ((!o.site || o.site === st) && (!o.m || o.m === m)) s += D.CARNET_INIT[st][m]; }); });
    var q = { wmax: w, site: o.site, m: o.m };
    return s + tot('commandes', q) - tot('livraisons', q) - tot('annulations', q);
  }
  function essais(o) {
    var e = 0, c = 0;
    D.essais.forEach(function (x) {
      if (o.w != null && x.semaine !== o.w) return;
      if (o.wmin != null && x.semaine < o.wmin) return;
      if (o.wmax != null && x.semaine > o.wmax) return;
      if (o.site && x.site !== o.site) return;
      e += x.essais; c += x.cmd_essai;
    });
    return { e: e, c: c, t: e ? c / e : null };
  }
  function calc(w, site) {
    var r = { w: w, site: site, rapport: lundi(w + 1) };
    var finW = new Date(lundi(w + 1)); var dr = finW.toISOString().slice(0, 10);
    r.cmd = tot('commandes', { w: w, site: site }); r.cmdObj = obj('cmd', { site: site });
    r.liv = tot('livraisons', { w: w, site: site }); r.livObj = obj('liv', { site: site });
    r.carnet = carnet(w, { site: site }); r.carnetPrec = carnet(w - 1, { site: site });
    r.marques = MARQUES.map(function (m) {
      var liv4 = tot('livraisons', { wmin: w - 3, wmax: w, site: site, m: m }) / 4, cn = carnet(w, { site: site, m: m });
      var x = { m: m, cmd: tot('commandes', { w: w, site: site, m: m }), cmdObj: obj('cmd', { site: site, m: m }), liv: tot('livraisons', { w: w, site: site, m: m }), livObj: obj('liv', { site: site, m: m }),
        carnet: cn, carnet4: carnet(w - 4, { site: site, m: m }), sem: liv4 ? cn / liv4 : null };
      x.eCmd = x.cmdObj ? x.cmd / x.cmdObj - 1 : null; x.eLiv = x.livObj ? x.liv / x.livObj - 1 : null;
      x.statut = (x.eCmd !== null && x.eCmd <= -0.15) || (x.eLiv !== null && x.eLiv <= -0.15) || x.sem > 6 ? 'rouge' : ((x.eCmd < 0) || (x.eLiv < 0) ? 'orange' : 'vert');
      return x;
    });
    r.sites = SITES.map(function (s) {
      var x = { s: s, cmd: tot('commandes', { w: w, site: s }), cmdObj: obj('cmd', { site: s }), liv: tot('livraisons', { w: w, site: s }), livObj: obj('liv', { site: s }),
        liv4: tot('livraisons', { wmin: w - 3, wmax: w, site: s }), carnet: carnet(w, { site: s }), carnet4: carnet(w - 4, { site: s }) };
      x.taux4 = x.liv4 / (4 * x.livObj); x.statut = x.taux4 < 0.8 ? 'rouge' : x.taux4 < 0.95 ? 'orange' : 'vert';
      return x;
    });
    r.histo = []; for (var k = w - 7; k <= w; k++) { var ek = essais({ w: k, site: site }); r.histo.push({ w: k, cmd: tot('commandes', { w: k, site: site }), liv: tot('livraisons', { w: k, site: site }), carnet: carnet(k, { site: site }), e: ek.e, c: ek.c, t: ek.t }); }
    var b = {}; var es = essais({ w: w, site: site }), ref = essais({ wmin: w - 6, wmax: w - 1, site: site });
    b.e = es.e; b.c = es.c; b.t = es.t; b.tRef = ref.t; b.eRef = ref.e / 6;
    var cc = D.cmds.filter(function (c) { return okSiteX(c.site, site); });
    var liv4 = cc.filter(function (c) { return c.wl !== null && c.wl >= w - 3 && c.wl <= w; });
    var att = cc.filter(function (c) { return c.wc <= w && (c.wl === null || c.wl > w); });
    var c4 = cc.filter(function (c) { return c.wc >= w - 3 && c.wc <= w; });
    b.delai = liv4.length ? liv4.reduce(function (a, c) { return a + c.delai; }, 0) / liv4.length : null;
    b.attente = att.length; b.att30 = att.filter(function (c) { return jours(c.date_cmd, dr) > 30; }).length;
    b.hyb = c4.length ? c4.filter(function (c) { return MOTO[c.modele] === 'Hybride'; }).length / c4.length : null; b.c4 = c4.length;
    b.modeles = D.MODELES.map(function (md) {
      var l = liv4.filter(function (c) { return c.modele === md[0]; }), a = att.filter(function (c) { return c.modele === md[0]; });
      return { m: md[0], moto: md[1], liv: l.length, delai: l.length ? l.reduce(function (s, c) { return s + c.delai; }, 0) / l.length : null,
        att: a.length, vieux: a.length ? Math.max.apply(null, a.map(function (c) { return jours(c.date_cmd, dr); })) : null };
    });
    var autres = liv4.filter(function (c) { return c.modele !== 'Song Plus DM-i'; });
    b.delaiAutres = autres.length ? autres.reduce(function (a, c) { return a + c.delai; }, 0) / autres.length : null;
    b.sites = SITES.map(function (s) { var x = essais({ w: w, site: s }); return { s: s, e: x.e, c: x.c }; });
    r.byd = b;
    return r;
  }
  function okSiteX(s, site) { return !site || s === site; }

  // ---------- alertes : candidates classées, les trois plus graves ----------
  function alertes(r) {
    var A = [], b = r.byd, lieu = r.site ? ' à ' + r.site : '';
    if (b.e >= 5 && b.t !== null && b.tRef && b.t < b.tRef * 0.8) {
      A.push({ g: 3 + (b.tRef - b.t) * 10, tag: 'BYD, essais', coul: 'rouge',
        txt: fmt(b.e) + ' essais BYD' + lieu + ' cette semaine contre ' + fmt(b.eRef) + ' d\'habitude, mais seulement ' + fmt(b.c) + ' commandes. Le taux de transformation tombe à ' + pct(b.t) + ' contre ' + pct(b.tRef) + '.',
        faire: 'Rappeler avant jeudi les ' + fmt(b.e - b.c) + ' personnes venues essayer sans commander.' });
    }
    var pire = b.modeles.filter(function (m) { return m.delai !== null && m.att > 0; }).sort(function (x, y) { return (y.delai || 0) - (x.delai || 0); })[0];
    if (pire && pire.delai > 40) {
      A.push({ g: 2.5 + pire.delai / 40, tag: 'BYD, délais', coul: 'rouge',
        txt: pire.m + ' : ' + pire.att + ' client' + (pire.att > 1 ? 's attendent leur' : ' attend son') + ' véhicule, le plus ancien depuis ' + pire.vieux + ' jours. Les clients livrés ces 4 dernières semaines ont attendu ' + fmt(pire.delai) + ' jours en moyenne' + (b.delaiAutres ? ', contre ' + fmt(b.delaiAutres) + ' pour les autres modèles BYD.' : '.'),
        faire: 'Obtenir la date du prochain arrivage et appeler chaque client avant mercredi.' });
    }
    r.marques.forEach(function (m) {
      if (m.m === 'BYD') return;
      if (m.sem > 6 && m.carnet > m.carnet4 * 1.3) {
        A.push({ g: 2 + m.sem / 6, tag: m.m + ', carnet', coul: 'orange',
          txt: m.m + lieu + ' : ' + m.cmd + ' commandes pour ' + m.cmdObj + ' visées, mais ' + m.liv + ' livraisons seulement. Le carnet passe de ' + fmt(m.carnet4) + ' à ' + fmt(m.carnet) + ' véhicules en 4 semaines, soit ' + m.sem.toFixed(1).replace('.', ',') + ' semaines de livraisons au rythme actuel.',
          faire: 'Vérifier les arrivages avant de promettre une date aux nouveaux clients.' });
      } else if (m.eLiv !== null && m.eLiv <= -0.15 && m.livObj >= 5) {
        A.push({ g: 1.5 - m.eLiv, tag: m.m + ', livraisons', coul: 'orange',
          txt: m.m + lieu + ' : ' + m.liv + ' livraisons pour ' + m.livObj + ' visées (' + sgn(m.eLiv) + '). Le carnet est à ' + fmt(m.carnet) + ' véhicules.',
          faire: 'Faire le point avec la logistique sur les véhicules prêts à livrer.' });
      }
    });
    if (!r.site) r.sites.forEach(function (s) {
      if (s.taux4 < 0.8) A.push({ g: 1.8 + (0.8 - s.taux4) * 5, tag: s.s + ', livraisons', coul: 'orange',
        txt: s.s + ' : ' + fmt(s.liv4) + ' livraisons en 4 semaines pour ' + fmt(4 * s.livObj) + ' visées (' + pct(s.taux4) + ' de l\'objectif). Le carnet du site est passé de ' + fmt(s.carnet4) + ' à ' + fmt(s.carnet) + '.',
        faire: 'Vérifier les délais de transport depuis Abidjan avec l\'agent.' });
    });
    A.sort(function (x, y) { return y.g - x.g; });
    // compléments, du plus utile au moins utile, si moins de trois alertes fortes
    var compl = [];
    var mc = r.marques.filter(function (m) { return m.cmdObj >= 3 && m.eCmd !== null; }).sort(function (x, y) { return x.eCmd - y.eCmd; })[0];
    if (mc && mc.eCmd < -0.05) compl.push({ tag: mc.m + ', commandes', coul: 'orange', txt: mc.m + lieu + ' : ' + mc.cmd + ' commandes pour ' + mc.cmdObj + ' visées (' + sgn(mc.eCmd) + ').', faire: 'Regarder avec l\'équipe de vente les devis en cours de la marque.' });
    if (b.att30 > 0) compl.push({ tag: 'BYD, attente', coul: 'orange', txt: b.att30 + ' client' + (b.att30 > 1 ? 's BYD attendent' : ' BYD attend') + ' leur véhicule depuis plus de 30 jours, sur ' + b.attente + ' commandes en attente' + lieu + '.', faire: 'Donner à chacun une date de livraison écrite cette semaine.' });
    var e = r.cmd / r.cmdObj - 1, el = r.liv / r.livObj - 1;
    compl.push({ tag: 'Semaine', coul: 'orange', txt: 'Commandes ' + (e >= 0 ? 'au-dessus' : 'en dessous') + ' de l\'objectif : ' + fmt(r.cmd) + ' pour ' + fmt(r.cmdObj) + ' (' + sgn(e) + '). Livraisons : ' + fmt(r.liv) + ' pour ' + fmt(r.livObj) + ' (' + sgn(el) + ').', faire: e >= 0 ? 'Vérifier que les livraisons suivront le rythme des commandes.' : 'Faire le point sur les devis en attente de signature.' });
    var deja = {}; A.forEach(function (a) { deja[a.tag.split(',')[0]] = 1; });
    compl.forEach(function (c) { if (A.length < 3 && !(deja[c.tag.split(',')[0]] && c.tag.split(',')[0] !== 'BYD')) { A.push(c); deja[c.tag.split(',')[0]] = 1; } });
    return A.slice(0, 3);
  }

  // ---------- rendu ----------
  var ICO = {
    cmd: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>',
    liv: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h-2v-6l2-5h9l4 5h3v6h-2"/><circle cx="7.5" cy="17.5" r="2"/><circle cx="16.5" cy="17.5" r="2"/></svg>',
    car: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v6"/></svg>',
    byd: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>'
  };
  function badge(c, t) { return '<span class="badge b-' + c + '">' + t + '</span>'; }
  function coulEcart(e, seuil) { return e === null ? 'vert' : e <= -(seuil || 0.1) ? 'rouge' : e < 0 ? 'orange' : 'vert'; }

  function chips() {
    var fs = document.getElementById('f-semaine'), fsi = document.getElementById('f-site');
    fs.innerHTML = SEM.slice(-6).map(function (w) { var d = lundi(w); return '<button class="chip' + (w === etat.w ? ' on' : '') + '" data-w="' + w + '">S' + w + ', ' + d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '</button>'; }).join('');
    fsi.innerHTML = ['Tous les sites'].concat(SITES).map(function (s) { var v = s === 'Tous les sites' ? '' : s; return '<button class="chip' + ((etat.site || '') === v ? ' on' : '') + '" data-s="' + v + '">' + s + '</button>'; }).join('');
    fs.querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { etat.w = +b.dataset.w; rendu(); }; });
    fsi.querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { etat.site = b.dataset.s || null; rendu(); }; });
    var on = fs.querySelector('.on'); if (on && on.scrollIntoView) fs.scrollLeft = on.offsetLeft - 40;
  }

  function rendu() {
    chips();
    var r = calc(etat.w, etat.site), b = r.byd;
    var dl = lundi(etat.w), df = lundi(etat.w); df.setUTCDate(df.getUTCDate() + 6);
    document.getElementById('sous-titre').textContent = 'Semaine ' + etat.w + ', du ' + jour(dl) + ' au ' + jour(df) + ' 2026, ' + (etat.site || 'tous les sites') + ', toutes marques, BYD à part';
    document.getElementById('sous-titre').textContent = document.getElementById('sous-titre').textContent;
    document.getElementById('pret').textContent = 'Prêt lundi ' + jour(r.rapport) + ' à 8 h';
    document.getElementById('alertes-note').textContent = 'Écrites par l\'Expert, lundi ' + jour(r.rapport) + ' à 8 h';
    var eC = r.cmd / r.cmdObj - 1, eL = r.liv / r.livObj - 1, dCar = r.carnet - r.carnetPrec;
    document.getElementById('kpis').innerHTML = [
      '<div class="kpi"><div class="k-lib">' + ICO.cmd + 'Commandes</div><div class="k-val">' + fmt(r.cmd) + '</div><div class="k-ref">objectif ' + fmt(r.cmdObj) + ' ' + badge(coulEcart(eC), sgn(eC)) + '</div></div>',
      '<div class="kpi"><div class="k-lib">' + ICO.liv + 'Livraisons</div><div class="k-val">' + fmt(r.liv) + '</div><div class="k-ref">objectif ' + fmt(r.livObj) + ' ' + badge(coulEcart(eL), sgn(eL)) + '</div></div>',
      '<div class="kpi"><div class="k-lib">' + ICO.car + 'Carnet de commandes</div><div class="k-val">' + fmt(r.carnet) + '</div><div class="k-ref">véhicules à livrer ' + badge(dCar > 0 ? 'orange' : 'vert', sgnN(dCar) + ' sur la semaine') + '</div></div>',
      '<div class="kpi noir"><div class="k-lib">' + ICO.byd + 'BYD, essai vers commande</div><div class="k-val">' + (b.t === null ? 'aucun essai' : pct(b.t)) + '</div><div class="k-ref">' + (b.tRef ? 'contre ' + pct(b.tRef) + ' d\'habitude ' + (b.t !== null ? badge(b.t < b.tRef * 0.8 ? 'rouge' : b.t < b.tRef ? 'orange' : 'vert', sgnN((b.t - b.tRef) * 100) + ' pts') : '') : '') + '</div></div>'
    ].join('');
    document.getElementById('alertes').innerHTML = alertes(r).map(function (a, i) {
      return '<li class="alerte ' + (a.coul === 'orange' ? 'orange' : '') + '"><span class="num">' + (i + 1) + '</span><div><span class="a-tag">' + a.tag + '</span><p>' + a.txt + '</p><span class="faire">→ ' + a.faire + '</span></div></li>';
    }).join('');
    // marques
    var LIB = { rouge: 'À traiter', orange: 'À surveiller', vert: 'Dans l\'objectif' };
    document.getElementById('marques').innerHTML = r.marques.map(function (m) {
      var max = Math.max(m.liv, m.livObj, 1) * 1.15;
      return '<div class="ligne-m"><div class="m-nom">' + m.m + '<small>carnet ' + fmt(m.carnet) + (m.sem ? ', ' + m.sem.toFixed(1).replace('.', ',') + ' sem.' : '') + '</small></div>' +
        '<div><div class="barre' + (m.m === 'BYD' ? ' noir' : '') + '"><i style="width:' + (m.liv / max * 100) + '%"></i><b style="left:' + (m.livObj / max * 100) + '%"></b></div>' +
        '<div class="m-chiffres">' + m.liv + ' livrées / ' + m.livObj + ' visées, ' + m.cmd + ' commandes / ' + m.cmdObj + '</div></div>' +
        '<div class="m-statut">' + badge(m.statut, LIB[m.statut]) + '</div></div>';
    }).join('');
    // carte + sites
    var col = { rouge: '#B42318', orange: '#B54708', vert: '#067647' };
    var svg = '<g>' + C.paths.map(function (p) { return '<path d="' + p + '"/>'; }).join('') + '</g>';
    r.sites.forEach(function (s) {
      var v = C.villes[s.s], rad = 6 + Math.sqrt(s.liv4) * 0.9, sel = etat.site === s.s;
      svg += '<circle class="pt" cx="' + v[0] + '" cy="' + v[1] + '" r="' + rad.toFixed(1) + '" fill="' + col[s.statut] + '" fill-opacity="' + (etat.site && !sel ? .35 : .9) + '"/>';
    });
    var cv = document.getElementById('carte'); cv.setAttribute('viewBox', '0 0 ' + C.w + ' ' + C.h); cv.innerHTML = svg;
    document.getElementById('sites').innerHTML = r.sites.map(function (s) {
      return '<div class="site"><span class="s-nom"><span class="point" style="background:' + col[s.statut] + '"></span>' + s.s + '</span>' + badge(s.statut, pct(s.taux4) + ' de l\'objectif') +
        '<span class="s-det">' + fmt(s.liv4) + ' livraisons en 4 semaines pour ' + fmt(4 * s.livObj) + ' visées, carnet ' + fmt(s.carnet) + ' (' + sgnN(s.carnet - s.carnet4) + ' en 4 semaines)</span></div>';
    }).join('');
    // BYD
    document.getElementById('byd-kpis').innerHTML = [
      ['Essais', fmt(b.e), 'contre ' + fmt(b.eRef) + ' d\'habitude'],
      ['Commandes issues d\'essai', fmt(b.c), (b.t !== null ? pct(b.t) + ' des essais' : 'aucun essai')],
      ['Délai moyen de livraison', b.delai !== null ? fmt(b.delai) + ' jours' : 'aucune livraison', 'clients livrés ces 4 semaines'],
      ['Clients en attente', fmt(b.attente), b.att30 + ' depuis plus de 30 jours']
    ].map(function (k) { return '<div class="bk"><div class="k-lib">' + k[0] + '</div><div class="k-val">' + k[1] + '</div><div class="k-ref">' + k[2] + '</div></div>'; }).join('');
    var mxd = Math.max.apply(null, b.modeles.map(function (m) { return m.delai || 0; }).concat([30]));
    document.getElementById('modeles').innerHTML = b.modeles.map(function (m) {
      var al = m.delai !== null && m.delai > 40;
      return '<div class="mod' + (al ? ' alerte-mod' : '') + '"><div class="nom">' + m.m + '<small>' + m.moto + (m.att ? ', ' + m.att + ' en attente' : '') + '</small></div>' +
        '<div class="barre"><i style="width:' + ((m.delai || 0) / mxd * 100) + '%"></i></div><div class="val">' + (m.delai !== null ? fmt(m.delai) + ' j' : '–') + '</div></div>';
    }).join('');
    var h = b.hyb || 0, e = 1 - h, R = 52, P = 2 * Math.PI * R;
    document.getElementById('mix').innerHTML = '<svg class="donut" viewBox="0 0 140 140"><circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#111" stroke-width="20"/>' +
      '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#9A9A9A" stroke-width="20" stroke-dasharray="' + (h * P) + ' ' + P + '" transform="rotate(-90 70 70)"/>' +
      '<text x="70" y="66" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="22" fill="#111">' + b.c4 + '</text><text x="70" y="86" text-anchor="middle" font-size="11" fill="#666">commandes</text></svg>' +
      '<div class="mix-leg"><div><span class="carre" style="background:#111"></span><b>' + pct(e) + '</b>&nbsp;électrique</div><div><span class="carre" style="background:#9A9A9A"></span><b>' + pct(h) + '</b>&nbsp;hybride</div><div class="note">Commandes des 4 dernières semaines</div></div>';
    var mxe = Math.max.apply(null, b.sites.map(function (s) { return s.e; }).concat([1]));
    document.getElementById('byd-sites').innerHTML = b.sites.map(function (s) {
      return '<div class="bs"><span>' + s.s + '</span><div class="barre"><i style="width:' + (s.e / mxe * 100) + '%"></i><em style="width:' + (s.c / mxe * 100) + '%"></em></div><span class="v">' + s.c + ' / ' + s.e + '</span></div>';
    }).join('') + '<div class="note" style="margin-top:6px">En noir : commandes issues d\'essai. En gris : essais.</div>';
    graphiques(r);
  }

  var gE, gH;
  function graphiques(r) {
    if (!window.Chart) return;
    Chart.defaults.font.family = 'Inter, sans-serif'; Chart.defaults.color = '#555';
    var lab = r.histo.map(function (x) { return 'S' + x.w; });
    var opt = { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } } };
    if (gE) gE.destroy();
    gE = new Chart(document.getElementById('c-essais'), { type: 'bar', data: { labels: lab, datasets: [
      { type: 'bar', label: 'Essais', data: r.histo.map(function (x) { return x.e; }), backgroundColor: '#C9C9C9', yAxisID: 'y', borderRadius: 4, order: 2 },
      { type: 'line', label: 'Taux de transformation', data: r.histo.map(function (x) { return x.t === null ? null : Math.round(x.t * 100); }), borderColor: '#111', backgroundColor: '#111', yAxisID: 'y1', tension: .3, pointRadius: 3, order: 1 }] },
      options: Object.assign({}, opt, { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eee' } }, y1: { position: 'right', beginAtZero: true, suggestedMax: 40, grid: { display: false }, ticks: { callback: function (v) { return v + ' %'; } } } } }) });
    if (gH) gH.destroy();
    gH = new Chart(document.getElementById('c-histo'), { type: 'bar', data: { labels: lab, datasets: [
      { label: 'Commandes', data: r.histo.map(function (x) { return x.cmd; }), backgroundColor: '#00438D', borderRadius: 4, yAxisID: 'y' },
      { label: 'Livraisons', data: r.histo.map(function (x) { return x.liv; }), backgroundColor: '#8FB0D8', borderRadius: 4, yAxisID: 'y' },
      { type: 'line', label: 'Carnet', data: r.histo.map(function (x) { return x.carnet; }), borderColor: '#3E3D5C', backgroundColor: '#3E3D5C', yAxisID: 'y1', tension: .3, pointRadius: 3 }] },
      options: Object.assign({}, opt, { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#eee' } }, y1: { position: 'right', beginAtZero: false, grid: { display: false } } } }) });
  }
  window.CFAO_CALC = calc;
  rendu();
})();
