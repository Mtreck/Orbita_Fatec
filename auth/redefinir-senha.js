import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
  getAuth, 
  verifyPasswordResetCode, 
  confirmPasswordReset 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { firebaseConfig } from "../core/firebase-config.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM Elements
const stateVerifying = document.getElementById('state-verifying');
const stateError     = document.getElementById('state-error');
const stateForm      = document.getElementById('state-form');
const stateSuccess   = document.getElementById('state-success');
const errorMsg       = document.getElementById('error-msg');
const resetForm      = document.getElementById('reset-form');
const formError      = document.getElementById('form-error');
const btnSubmit      = document.getElementById('btn-submit');
const btnText        = document.getElementById('btn-text');

// URL Parsing
const urlParams = new URLSearchParams(window.location.search);
const mode      = urlParams.get('mode');
const oobCode   = urlParams.get('oobCode');

// Init
async function init() {
  if (mode !== 'resetPassword' || !oobCode) {
    showState('error', "Link de redefinição inválido ou malformado.");
    return;
  }

  try {
    // Verificar se o código de redefinição é válido
    const email = await verifyPasswordResetCode(auth, oobCode);
    console.log("Valid code for:", email);
    showState('form');
  } catch (err) {
    console.error("Verification error:", err);
    let msg = "Este link de redefinição expirou ou já foi utilizado.";
    if (err.code === 'auth/expired-action-code') msg = "Este link expirou. Por favor, solicite um novo.";
    if (err.code === 'auth/invalid-action-code') msg = "O código de segurança é inválido.";
    
    showState('error', msg);
  }
}

function showState(state, customMsg = '') {
  stateVerifying.classList.add('hidden');
  stateError.classList.add('hidden');
  stateForm.classList.add('hidden');
  stateSuccess.classList.add('hidden');

  if (state === 'error') {
    stateError.classList.remove('hidden');
    if (customMsg) errorMsg.textContent = customMsg;
  } else if (state === 'form') {
    stateForm.classList.remove('hidden');
  } else if (state === 'success') {
    stateSuccess.classList.remove('hidden');
  }
}

// Handle Form Submit
resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword     = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  formError.classList.add('hidden');

  if (newPassword !== confirmPassword) {
    formError.textContent = "As senhas não coincidem.";
    formError.classList.remove('hidden');
    return;
  }

  btnSubmit.disabled = true;
  btnText.textContent = "PROCESSANDO...";

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    showState('success');
  } catch (err) {
    console.error("Reset error:", err);
    formError.textContent = "Erro ao alterar senha: " + (err.message || "Tente novamente.");
    formError.classList.remove('hidden');
    btnSubmit.disabled = false;
    btnText.textContent = "ALTERAR SENHA";
  }
});

// Run
init();
