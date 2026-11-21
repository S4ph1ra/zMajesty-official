/* Couche Firebase : Firestore (données partagées en temps réel, cache hors ligne) + Authentication (admin). */
const Cloud = (() => {
  const cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : {};
  const configured = !!cfg.apiKey && !/^VOTRE/.test(cfg.apiKey);
  if (!configured || !window.firebase) return { configured, on: false };   // SDK injoignable : le site affiche la dernière copie locale

  firebase.initializeApp(cfg);
  const db = firebase.firestore(), auth = firebase.auth();
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});           // cache hors ligne (ignoré si non supporté)
  const roleOf = email => Object.keys(ADMIN_EMAILS).find(r => ADMIN_EMAILS[r].toLowerCase() === (email || '').toLowerCase()) || null;

  return {
    configured, on: true,
    newId: col => db.collection(col).doc().id,
    watchList: (col, cb) => db.collection(col).onSnapshot(s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => cb(null, e)),
    watchDoc: (col, id, cb) => db.collection(col).doc(id).onSnapshot(s => cb(s.exists ? s.data() : {}), e => cb(null, e)),
    set: (col, id, data) => db.collection(col).doc(id).set(data),
    merge: (col, id, data) => db.collection(col).doc(id).set(data, { merge: true }),
    remove: (col, id) => db.collection(col).doc(id).delete(),
    del: () => firebase.firestore.FieldValue.delete(),
    async login(password) {
      for (const email of Object.values(ADMIN_EMAILS)) {
        try { const c = await auth.signInWithEmailAndPassword(email, password); return roleOf(c.user.email); } catch {}
      }
      return null;
    },
    logout: () => auth.signOut(),
    onAuth: cb => auth.onAuthStateChanged(u => cb(u ? roleOf(u.email) : null))
  };
})();
