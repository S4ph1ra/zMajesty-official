'use strict';

/* ===== Constantes ===== */
const SPOKEN = ['Français','English','Español','Deutsch','Italiano','Português','Русский','日本語','中文','한국어','العربية','Türkçe','Nederlands','Polski'];
const STATUS = { 'Très actif':['st-very','statusVeryActive'], 'Activité moyenne':['st-medium','statusMedium'], 'Actif':['st-active','statusActive'], 'Inactif':['st-inactive','statusInactive'], 'Absent':['st-absent','statusAbsent'] };
const RANKS = { 'Leader':'rankLeader', 'Co-Leader':'rankCoLeader', 'Aîné':'rankElder', 'Membre':'rankMember' };
const TITLES = { accueil:'welcome', membres:'membersTitle', galerie:'galleryTitle', regles:'rulesTitle', evenements:'eventsTitle', contact:'contactTitle' };
// texte modifiable : [clé de traduction par défaut, clé du libellé]
const TEXTS = { introTop:['introTop','home'], introBottom:['introBottom','home'], rules:['rulesText','rules'], events:['eventsText','events'], contact:['contactText','contact'] };
const MAX_MEMBERS = 100, DEFAULT_POINTS = 67105, DEFAULT_MAX = 300000;
const LOCALE = { br:'pt-BR', jp:'ja' }, RTL = ['ar'];

/* ===== Utilitaires ===== */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ===== État ===== */
let lang = (() => { try { return localStorage.getItem('zMajestyLanguage'); } catch { return null; } })();
if (!TRANSLATIONS[lang]) lang = 'fr';
let role = null, current = 'accueil', editId = null, editTextKey = null, statusFilter = '';
// copie locale = affichage instantané et hors ligne ; Firestore la met à jour en temps réel
let members = store.get('zm_members', []), gallery = store.get('zm_gallery', []), content = store.get('zm_content', {});
const loc = () => LOCALE[lang] || lang;
const t = k => TRANSLATIONS[lang]?.[k] ?? TRANSLATIONS.fr[k] ?? k;
const pageText = key => {
  const m = content.texts?.[key] || {};
  return m[lang] || m.fr || Object.values(m).find(Boolean) || t(TEXTS[key][0]);
};

function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => el.classList.remove('show'), 2800);
}
function openModal(id) { $(id).classList.add('open'); document.body.classList.add('no-scroll'); }
function closeModals() { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); document.body.classList.remove('no-scroll'); }
function setMenu(open) { document.body.classList.toggle('menu-open', open); $('menuBtn').setAttribute('aria-expanded', open); }
// Écriture Firestore (réservée aux admins connectés ; les règles de sécurité vérifient aussi côté serveur)
function write(fn, okKey) {
  if (!Cloud.on || !role) return Promise.resolve();
  return fn().then(() => okKey && toast(t(okKey))).catch(e => toast('⚠️ ' + (e.code || e.message)));
}

/* ===== Langue ===== */
function fillSelect(id, map, labelKey) {
  const sel = $(id), keep = sel.value;
  sel.innerHTML = Object.keys(map).map(k => `<option value="${esc(k)}">${esc(t(labelKey(k)))}</option>`).join('');
  if (keep && map[keep]) sel.value = keep;
}
function applyLanguage() {
  document.documentElement.lang = loc();
  document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
  document.querySelectorAll('[data-ph]').forEach(e => e.placeholder = t(e.dataset.ph));
  fillSelect('memberStatus', STATUS, k => STATUS[k][1]);
  fillSelect('memberClanRank', RANKS, k => RANKS[k]);
  document.querySelectorAll('.flag').forEach(f => f.classList.toggle('on', f.dataset.lang === lang));
  if ($('memberModal').classList.contains('open')) $('memberModalTitle').textContent = t(editId === null ? 'addMemberTitle' : 'editMemberTitle');
  renderAll();
}

/* ===== Affichage ===== */
function renderAll() { renderTitle(); renderAdmin(); renderTexts(); renderProgress(); renderMembers(); renderGallery(); }
function renderTitle() { $('pageTitle').textContent = t(TITLES[current]); }
function renderTexts() { document.querySelectorAll('[data-text]').forEach(e => e.textContent = pageText(e.dataset.text)); }
function renderAdmin() {
  const label = role ? `👑 ${role}` : t('visitor');
  $('statusText').textContent = label; $('galleryStatusText').textContent = label;
  $('loginBtn').hidden = !!role; $('logoutBtn').hidden = !role;
  document.body.classList.toggle('admin', !!role);
}
function renderProgress() {
  const pts = Number(content.points ?? DEFAULT_POINTS) || 0, max = Number(content.maxPoints ?? DEFAULT_MAX) || DEFAULT_MAX;
  const pct = Math.min(100, Math.max(0, pts / max * 100));
  $('progressBar').style.width = pct + '%';
  $('progressInfo').textContent = `${pts.toLocaleString(loc())} / ${max.toLocaleString(loc())}`;
  $('progressText').textContent = pct.toFixed(2) + '%';
}
function sortedMembers() {
  const rk = Object.keys(RANKS), st = Object.keys(STATUS);
  return [...members].sort((a, b) => (rk.indexOf(a.clanRank) + 1 || 9) - (rk.indexOf(b.clanRank) + 1 || 9)
    || (st.indexOf(a.status) + 1 || 9) - (st.indexOf(b.status) + 1 || 9) || String(a.pseudo).localeCompare(String(b.pseudo)));
}
function renderMembers() {
  const q = $('search').value.trim().toLowerCase(), base = sortedMembers(), counts = {};
  base.forEach(m => counts[m.status] = (counts[m.status] || 0) + 1);
  $('statusFilters').innerHTML = [['', t('statusAll'), base.length], ...Object.keys(STATUS).map(k => [k, t(STATUS[k][1]), counts[k] || 0])]
    .map(([k, l, n]) => `<button class="chip-btn${k === statusFilter ? ' on' : ''}" data-status="${esc(k)}">${esc(l)} (${n})</button>`).join('');
  const list = base.filter(m => (!statusFilter || m.status === statusFilter) && (!q || [m.pseudo, m.gameRank, m.clanRank, t(RANKS[m.clanRank] || ''),
    m.status, t(STATUS[m.status]?.[1] || ''), m.social, m.languages].join(' ').toLowerCase().includes(q)));
  $('membersGrid').innerHTML = list.map(m => {
    const [cls, key] = STATUS[m.status] || STATUS['Actif'];
    const acts = role ? `<button class="icon-btn" data-edit="${esc(m.id)}" title="${esc(t('edit'))}" aria-label="${esc(t('edit'))}">✏️</button>
      <button class="icon-btn" data-del="${esc(m.id)}" title="${esc(t('del'))}" aria-label="${esc(t('del'))}">🗑️</button>` : '';
    return `<article class="card">
      <div class="card-head"><div class="name">${esc(m.pseudo)}</div><div>${acts}</div></div>
      <div class="info"><strong>${t('gameRank')}:</strong> ${esc(m.gameRank)}</div>
      <div class="info"><strong>${t('clanRank')}:</strong> ${esc(t(RANKS[m.clanRank] || 'rankMember'))}${m.clanRank === 'Aîné' && m.canBeCoLeader ? ` (✅ ${esc(t('canCo'))})` : ''}</div>
      <div class="info"><strong>${t('languages')}:</strong> ${esc(m.languages || t('notSpecified'))}</div>
      <div class="info"><strong>${t('social')}:</strong> ${esc(m.social || t('notSpecified'))}</div>
      <div class="info"><strong>${t('status')}:</strong> <span class="badge ${cls}">${esc(t(key))}</span></div></article>`;
  }).join('');
  $('noResults').hidden = list.length > 0;
  $('memberCount').textContent = `${members.length} / ${MAX_MEMBERS} ${t('membersWord')}`;
}
function embedUrl(url) {
  try {
    const u = new URL(url); let id = null;
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') || (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
    if (id) return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0`;
    return /^https?:$/.test(u.protocol) ? u.href : null;
  } catch { return null; }
}
function renderGallery() {
  const items = [...gallery].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  $('galleryGrid').innerHTML = items.map(it => {
    const media = it.type === 'video'
      ? `<iframe src="${esc(embedUrl(it.url) || '')}" loading="lazy" allowfullscreen title="${esc(it.description || 'video')}"></iframe>`
      : `<img src="${esc(it.url)}" alt="${esc(it.description || t('typeImage'))}" loading="lazy">`;
    const del = role ? `<div class="gal-actions"><button class="icon-btn" data-delitem="${esc(it.id)}" aria-label="${esc(t('del'))}">🗑️</button></div>` : '';
    return `<article class="card">${media}<p>${esc(it.description || t('noDescription'))}</p>${del}</article>`;
  }).join('');
  $('galleryGrid').querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    const d = document.createElement('div'); d.className = 'img-fail'; d.textContent = t('imageNA'); img.replaceWith(d);
  }, { once: true }));
  $('noGallery').hidden = gallery.length > 0;
}

/* ===== Navigation ===== */
function showSection(id) {
  current = id;
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === id));
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('on', b.dataset.nav === id));
  renderTitle(); setMenu(false); window.scrollTo({ top: 0 });
}
document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => showSection(b.dataset.nav)));
$('menuBtn').addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
$('overlay').addEventListener('click', () => setMenu(false));
document.querySelectorAll('.flag').forEach(f => f.addEventListener('click', () => {
  lang = f.dataset.lang; try { localStorage.setItem('zMajestyLanguage', lang); } catch {} applyLanguage();
}));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModals(); setMenu(false); } });
document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) closeModals(); }));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
$('lightbox').addEventListener('click', closeModals);

/* ===== Connexion admin (Firebase Authentication) ===== */
$('loginBtn').addEventListener('click', () => { $('loginForm').reset(); openModal('loginModal'); $('loginPassword').focus(); });
$('logoutBtn').addEventListener('click', () => { role = null; if (Cloud.on) Cloud.logout(); renderAll(); });
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!Cloud.on) return toast('⚠️ Firebase');
  const r = await Cloud.login($('loginPassword').value);
  if (!r) return toast(t('loginErr'));
  role = r; closeModals(); renderAll(); toast(t(r === 'Leader' ? 'loginOkLeader' : 'loginOkCo'));
});

/* ===== Membres ===== */
const langBox = $('memberLanguages');
langBox.innerHTML = SPOKEN.map(l => `<label><input type="checkbox" value="${l}">${l}</label>`).join('');
const toggleCo = () => { $('coLeaderGroup').hidden = $('memberClanRank').value !== 'Aîné'; };
$('memberClanRank').addEventListener('change', toggleCo);
$('search').addEventListener('input', renderMembers);
$('statusFilters').addEventListener('click', e => {
  const b = e.target.closest('[data-status]'); if (b) { statusFilter = b.dataset.status; renderMembers(); }
});

function openMember(id = null) {
  if (!role) return;
  const m = members.find(x => x.id === id);
  if (!m && members.length >= MAX_MEMBERS) return toast(t('memberLimit'));
  editId = m ? id : null; $('memberForm').reset();
  $('memberModalTitle').textContent = t(m ? 'editMemberTitle' : 'addMemberTitle');
  const chosen = (m?.languages || '').split(', ');
  langBox.querySelectorAll('input').forEach(c => c.checked = chosen.includes(c.value));
  if (m) {
    $('memberPseudo').value = m.pseudo; $('memberGameRank').value = m.gameRank; $('memberClanRank').value = m.clanRank;
    $('memberSocial').value = m.social || ''; $('memberStatus').value = m.status; $('canBeCoLeader').checked = !!m.canBeCoLeader;
  }
  toggleCo(); openModal('memberModal');
}
$('addMemberBtn').addEventListener('click', () => openMember());
$('memberForm').addEventListener('submit', e => {
  e.preventDefault();
  const clanRank = $('memberClanRank').value, adding = editId === null;
  const data = {
    pseudo: $('memberPseudo').value.trim(), gameRank: $('memberGameRank').value, clanRank,
    languages: [...langBox.querySelectorAll('input:checked')].map(c => c.value).join(', '),
    social: $('memberSocial').value.trim(), status: $('memberStatus').value,
    canBeCoLeader: clanRank === 'Aîné' && $('canBeCoLeader').checked
  };
  const id = adding ? Cloud.newId('members') : editId;
  closeModals();
  write(() => Cloud.set('members', id, data), adding ? 'memberAdded' : 'memberEdited');
});
$('membersGrid').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
  if (ed) openMember(ed.dataset.edit);
  if (dl && role && confirm(t('confirmDelMember'))) write(() => Cloud.remove('members', dl.dataset.del), 'memberDeleted');
});

/* ===== Galerie ===== */
$('addItemBtn').addEventListener('click', () => { if (role) { $('galleryForm').reset(); openModal('galleryModal'); } });
$('galleryForm').addEventListener('submit', e => {
  e.preventDefault();
  const url = $('itemUrl').value.trim();
  if (!embedUrl(url)) return toast(t('invalidUrl'));
  const data = { type: $('itemType').value, url, description: $('itemDesc').value.trim(), createdAt: Date.now() };
  closeModals();
  write(() => Cloud.set('gallery', Cloud.newId('gallery'), data), 'itemAdded');
});
$('galleryGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-delitem]');
  if (b && role && confirm(t('confirmDelItem'))) return write(() => Cloud.remove('gallery', b.dataset.delitem), 'itemDeleted');
  if (e.target.tagName === 'IMG') { $('lightboxImg').src = e.target.src; $('lightboxImg').alt = e.target.alt; openModal('lightbox'); }
});

/* ===== Textes du site et points du clan (modifiables par les admins) ===== */
document.addEventListener('click', e => {
  const tx = e.target.closest('[data-edit-text]');
  if (tx && role) {
    editTextKey = tx.dataset.editText;
    $('textTitle').textContent = '✏️ ' + t(TEXTS[editTextKey][1]);
    $('textValue').value = pageText(editTextKey); openModal('textModal'); $('textValue').focus();
  }
  if (e.target.closest('[data-edit-points]') && role) {
    $('pointsValue').value = content.points ?? DEFAULT_POINTS; $('maxPointsValue').value = content.maxPoints ?? DEFAULT_MAX; openModal('pointsModal');
  }
});
$('textForm').addEventListener('submit', e => {
  e.preventDefault();
  const key = editTextKey, val = $('textValue').value.trim();
  closeModals();
  write(() => Cloud.merge('site', 'content', { texts: { [key]: { [lang]: val || Cloud.del() } } }), 'saved');   // vide = retour au texte par défaut
});
$('pointsForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = { points: Math.max(0, Math.round(+$('pointsValue').value)), maxPoints: Math.max(1, Math.round(+$('maxPointsValue').value)) };
  closeModals();
  write(() => Cloud.merge('site', 'content', data), 'saved');
});

/* ===== Particules ===== */
(function particles() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = $('particles'), n = innerWidth < 700 ? 15 : 40;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 15 + 's';
    p.style.animationDuration = 10 + Math.random() * 15 + 's';
    box.appendChild(p);
  }
})();

/* ===== Appli installable (PWA) ===== */
let installEvent = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; $('installBtn').hidden = false; });
window.addEventListener('appinstalled', () => { $('installBtn').hidden = true; });
$('installBtn').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt(); await installEvent.userChoice; installEvent = null; $('installBtn').hidden = true;
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

/* ===== Démarrage ===== */
showSection('accueil');
applyLanguage();
if (Cloud.on) {   // données partagées en temps réel + session admin restaurée au rechargement
  const fail = e => { if (e && e.code !== 'unavailable') toast('⚠️ ' + e.code); };
  Cloud.watchList('members', (l, e) => { if (!l) return fail(e); members = l; store.set('zm_members', l); renderMembers(); });
  Cloud.watchList('gallery', (l, e) => { if (!l) return fail(e); gallery = l; store.set('zm_gallery', l); renderGallery(); });
  Cloud.watchDoc('site', 'content', (d, e) => { if (!d) return fail(e); content = d; store.set('zm_content', d); renderTexts(); renderProgress(); });
  Cloud.onAuth(r => { role = r; renderAll(); });
}
