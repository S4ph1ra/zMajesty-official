/* =====================================================================
   CONFIGURATION FIREBASE  (le seul fichier à adapter)
   =====================================================================
   À faire une seule fois dans la console Firebase (projet zmajesty-df503) :

   1. Build → Authentication → Sign-in method → « E-mail/Mot de passe » → Activer.
      Onglet « Users » → « Ajouter un utilisateur » ×2 : les e-mails de ADMIN_EMAILS
      ci-dessous + les mots de passe de ton choix (ce sont tes mots de passe admin).
   2. Build → Firestore Database → « Créer une base de données ».
   3. Firestore → onglet « Règles » → REMPLACE tout par :

      rules_version = '2';
      service cloud.firestore {
        match /databases/{db}/documents {
          function isAdmin() {
            return request.auth != null
              && request.auth.token.email in ['leader@zmajesty.com', 'coleader@zmajesty.com'];
          }
          match /members/{id} {
            allow read: if true;
            allow create, update: if isAdmin() && request.resource.data.pseudo is string
                                  && request.resource.data.pseudo.size() <= 40;
            allow delete: if isAdmin();
          }
          match /gallery/{id} {
            allow read: if true;
            allow create, update: if isAdmin() && request.resource.data.url is string
                                  && request.resource.data.url.size() <= 1000;
            allow delete: if isAdmin();
          }
          match /site/{id} {
            allow read: if true;
            allow write: if isAdmin();
          }
        }
      }

      (mêmes e-mails que dans ADMIN_EMAILS)
   4. Authentication → Settings → « Domaines autorisés » : ajoute le domaine du site.
   ===================================================================== */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDGLoGWFjVSjPTt5hB2fxvY-SPLven5Fdw",
  authDomain: "zmajesty-df503.firebaseapp.com",
  projectId: "zmajesty-df503",
  storageBucket: "zmajesty-df503.firebasestorage.app",
  messagingSenderId: "481633858957",
  appId: "1:481633858957:web:96ab3ac11029b47b19b9c4",
  measurementId: "G-2H69VJ8NQ1"
};

// E-mails des 2 comptes admin (le site ne demande que le mot de passe).
const ADMIN_EMAILS = {
  'Leader': 'theodorik153@gmail.com',
  'Co-Leader': 'loumig59@gmail.com'
};
