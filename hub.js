import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";


const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

const app = document.getElementById('app');
const authGuard = document.getElementById('auth-guard');
const logoutBtn = document.getElementById('logout-btn');
const userDisplayName = document.getElementById('user-display-name');
const userAvatar = document.getElementById('user-avatar');
const roleBadge = document.getElementById('role-badge');

const ROLE_CONFIG = {
  adm_l1: { label: 'ADM N1', color: '#EB7025', bg: 'rgba(235, 112, 37, 0.1)' },
  adm_l2: { label: 'ADM N2', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  ti: { label: 'T.I.', color: '#9d5ff5', bg: 'rgba(157, 95, 245, 0.1)' },
  visitante: { label: 'VISITANTE', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' }
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, 'users', user.uid));
    let role = 'ti';
    if (snap.exists()) role = snap.data().role || 'ti';

    // AUTO-PROMOÇÃO PARA ADM NÍVEL 1 (Migração)
    if (user.uid === 'rSw36LAa8fPI94aYFoVv7JggB6w2' && role !== 'adm_l1') {
      await updateDoc(doc(db, 'users', user.uid), { role: 'adm_l1' });
      role = 'adm_l1';
    }

    // BUSCAR PERMISSÕES GLOBAIS
    let permissions = {};
    try {
      const permSnap = await getDoc(doc(db, 'config', 'permissions'));
      if (permSnap.exists()) {
        const allPerms = permSnap.data();
        permissions = allPerms[role] || {};
      }
    } catch (err) {
      console.error("Erro ao buscar permissões globais:", err);
    }

    initHub(user, role, permissions);
  } else {
    // Se não estiver logado, redireciona para a página de login
    window.location.href = '/login';
  }
});

function initHub(user, role, permissions) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.ti;
  
  // Exibe o Hub e remove o bloqueio
  if (authGuard) authGuard.style.display = 'none';
  app.classList.remove('hidden');

  const name = user.displayName || user.email.split('@')[0];
  userDisplayName.textContent = name;
  userAvatar.textContent = name.charAt(0).toUpperCase();
  
  roleBadge.textContent = cfg.label;
  roleBadge.style.color = cfg.color;
  roleBadge.style.background = cfg.bg;
  roleBadge.style.borderColor = cfg.color;

  // Controle de Acesso aos Módulos baseados em Permissões Granulares
  const modules = ['emprestimo', 'usuarios', 'ensalamento', 'patrimonio'];
  
  modules.forEach(modId => {
    const el = document.getElementById(`mod-${modId}`);
    if (!el) return;

    // ADM N1 sempre vê tudo
    if (role === 'adm_l1') {
      el.style.display = 'flex';
    } else {
      // Outros dependem da flag 'view' no objeto permissions
      const canView = permissions[modId] && permissions[modId].view;
      el.style.display = canView ? 'flex' : 'none';
    }
  });
}

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/login';
});
