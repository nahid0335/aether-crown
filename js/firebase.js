import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDGTPXellq4rlD2rtVp3xaVGAsgJC3JnEc",
  authDomain: "aether-crown.firebaseapp.com",
  projectId: "aether-crown",
  storageBucket: "aether-crown.firebasestorage.app",
  messagingSenderId: "193250783943",
  appId: "1:193250783943:web:e25417423f3cb9526cc4e2",
  measurementId: "G-J0TEN63JWZ"
};

export function initFirebaseSync({ getState, applyCloudState }) {
  const btnAuth = document.getElementById('btn-auth');
  const statusEl = document.getElementById('cloud-status');
  const loginGate = document.getElementById('login-gate');
  const splashPrompt = document.getElementById('splash-prompt');
  const authCard = document.getElementById('auth-card');
  const tabAuthSignIn = document.getElementById('tab-auth-signin');
  const tabAuthSignUp = document.getElementById('tab-auth-signup');
  const btnEmailSubmit = document.getElementById('btn-email-submit');
  const authEmail = document.getElementById('auth-email');
  const authPass = document.getElementById('auth-pass');
  const btnGateSignIn = document.getElementById('btn-gate-signin');
  const btnGateOffline = document.getElementById('btn-gate-offline');
  const gateMsg = document.getElementById('gate-msg');
  let authMode = 'signin';

  loginGate.addEventListener('click', () => {
    if (authCard.classList.contains('hidden')) {
      splashPrompt.classList.add('hidden');
      authCard.classList.remove('hidden');
      loginGate.classList.remove('cursor-pointer');
    }
  });
  authCard.addEventListener('click', (e) => e.stopPropagation());

  tabAuthSignIn.addEventListener('click', () => {
    authMode = 'signin';
    tabAuthSignIn.className = 'flex-1 py-1.5 rounded-md bg-indigo-600 text-white';
    tabAuthSignUp.className = 'flex-1 py-1.5 rounded-md text-slate-300';
    btnEmailSubmit.textContent = 'Sign In with Email';
    gateMsg.textContent = '';
  });
  tabAuthSignUp.addEventListener('click', () => {
    authMode = 'signup';
    tabAuthSignUp.className = 'flex-1 py-1.5 rounded-md bg-indigo-600 text-white';
    tabAuthSignIn.className = 'flex-1 py-1.5 rounded-md text-slate-300';
    btnEmailSubmit.textContent = 'Create Account';
    gateMsg.textContent = '';
  });

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    let currentUser = null;

    window.cloudSyncSave = async (stateObj) => {
      if (!currentUser) return;
      statusEl.textContent = '☁️ Saving...';
      try {
        await setDoc(doc(db, 'users', currentUser.uid), {
          state: JSON.parse(JSON.stringify(stateObj)),
          updatedAt: Date.now()
        }, { merge: true });
        statusEl.textContent = '☁️ Synced';
      } catch (err) {
        statusEl.textContent = '⚠️ Sync error';
      }
    };

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        loginGate.classList.add('hidden');
        gateMsg.textContent = '';
        btnAuth.textContent = 'Sign Out';
        btnAuth.className = 'btn-tap px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold';
        statusEl.textContent = '☁️ Loading...';
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data().state) applyCloudState(snap.data().state);
          else await window.cloudSyncSave(getState());
          statusEl.textContent = `☁️ ${user.displayName ? user.displayName.split(' ')[0] : 'Synced'}`;
        } catch (err) {
          statusEl.textContent = '⚠️ Rules/Load err';
        }
      } else {
        loginGate.classList.remove('hidden');
        btnAuth.textContent = '☁️ Sign In';
        btnAuth.className = 'btn-tap px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold';
        statusEl.textContent = 'Local only';
      }
    });

    getRedirectResult(auth).catch((err) => {
      if (err && err.code) gateMsg.textContent = `Auth error: ${err.code}`;
    });

    btnGateSignIn.addEventListener('click', async () => {
      gateMsg.textContent = 'Opening Google Sign-In...';
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        if (err && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
          gateMsg.textContent = 'Popup blocked — redirecting...';
          try { await signInWithRedirect(auth, provider); } catch (e2) { gateMsg.textContent = `Error: ${e2.code || e2.message}`; }
        } else if (err && err.code === 'auth/unauthorized-domain') {
          gateMsg.textContent = 'Preview domain cannot use Google Sign-In. Click "Continue Offline" below to test here, or use your live GitHub Pages link.';
        } else {
          gateMsg.textContent = `Error: ${err.code || err.message || 'Sign-in failed'}`;
        }
      }
    });

    btnEmailSubmit.addEventListener('click', async () => {
      const email = authEmail.value.trim();
      const pass = authPass.value;
      if (!email || pass.length < 6) {
        gateMsg.textContent = 'Enter a valid email and 6+ char password.';
        return;
      }
      gateMsg.textContent = authMode === 'signup' ? 'Creating account...' : 'Signing in...';
      try {
        if (authMode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
        else await signInWithEmailAndPassword(auth, email, pass);
      } catch (err) {
        gateMsg.textContent = `Error: ${err.code || err.message}`;
      }
    });

    btnGateOffline.addEventListener('click', () => {
      loginGate.classList.add('hidden');
      statusEl.textContent = 'Local only';
    });

    btnAuth.addEventListener('click', async () => {
      if (currentUser) await signOut(auth);
      else loginGate.classList.remove('hidden');
    });
  } catch (e) {
    statusEl.textContent = 'Local only';
  }
}
