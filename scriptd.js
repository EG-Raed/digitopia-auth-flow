// Simple in-browser state (no backend)
const state = {
  registeredUser: null,
  registeredPass: null,
  otp: null,
  attemptsLeft: 3,
  timeLeft: 30,
  timerId: null
};

// Grab elements
const registrationSection = document.getElementById('registrationSection');
const loginSection = document.getElementById('loginSection');
const mfaSection = document.getElementById('mfaSection');

const regForm = document.getElementById('registrationForm');
const regUsername = document.getElementById('regUsername');
const regPassword = document.getElementById('regPassword');
const regBanner = document.getElementById('regBanner');
const proceedToLoginBtn = document.getElementById('proceedToLogin');

const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBanner = document.getElementById('loginBanner');

const mfaBanner = document.getElementById('mfaBanner');
const visibleOtp = document.getElementById('visibleOtp');
const countdownEl = document.getElementById('countdown');
const attemptsLeftEl = document.getElementById('attemptsLeft');
const otpForm = document.getElementById('otpForm');
const otpInput = document.getElementById('otpInput');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const resendOtpBtn = document.getElementById('resendOtpBtn');

// Ensure username inputs are always lowercase (visual + value)
[regUsername, loginUsername].forEach(inp => {
  inp.addEventListener('input', () => {
    const caret = inp.selectionStart;
    inp.value = inp.value.toLowerCase();
    // restore caret position
    try { inp.setSelectionRange(caret, caret); } catch(e){}
  });
});

function showBanner(el, type, message) {
  el.className = 'banner show ' + (type || '');
  el.textContent = message;
}

function clearBanner(el){
  el.className = 'banner';
  el.textContent = '';
}

function showSection(sectionToShow){
  // Hide all
  [registrationSection, loginSection, mfaSection].forEach(sec => {
    sec.classList.add('hidden');
    sec.classList.remove('show', 'fade-in');
  });
  // Show the target
  sectionToShow.classList.remove('hidden');
  // force reflow for animation
  // eslint-disable-next-line no-unused-expressions
  sectionToShow.offsetHeight;
  sectionToShow.classList.add('show', 'fade-in');
}

function pad2(n){ return String(n).padStart(2,'0'); }

function formatTimeLeft(sec){
  return `00:${pad2(Math.max(0, sec))}`;
}

function generateOTP(){
  const n = Math.floor(Math.random() * 1000000);
  return n.toString().padStart(6, '0');
}

function resetMfa(){
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.attemptsLeft = 3;
  state.timeLeft = 30;
  state.otp = generateOTP();
  visibleOtp.textContent = state.otp; // visible on purpose for mock
  attemptsLeftEl.textContent = state.attemptsLeft;
  countdownEl.textContent = formatTimeLeft(state.timeLeft);
  otpInput.value = '';
  otpInput.disabled = false;
  verifyOtpBtn.disabled = false;
  resendOtpBtn.disabled = false;
  clearBanner(mfaBanner);

  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    countdownEl.textContent = formatTimeLeft(state.timeLeft);
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      state.timerId = null;
      otpInput.disabled = true;
      verifyOtpBtn.disabled = true;
      showBanner(mfaBanner, 'error', 'Access Denied. Expired OTP.');
    }
  }, 1000);
}

// Registration flow
regForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = regUsername.value.trim().toLowerCase();
  const pass = regPassword.value;

  if (!user || !pass) {
    showBanner(regBanner, 'warning', 'Please enter a username and password to register.');
    return;
  }

  state.registeredUser = user;
  state.registeredPass = pass;

  // Lock inputs after success
  regUsername.disabled = true;
  regPassword.disabled = true;

  showBanner(regBanner, 'success', 'Successful Registration');
  proceedToLoginBtn.classList.remove('hidden');
  proceedToLoginBtn.classList.add('fade-in');
});

proceedToLoginBtn.addEventListener('click', () => {
  clearBanner(loginBanner);
  loginUsername.value = state.registeredUser || '';
  loginPassword.value = '';
  showSection(loginSection);
});

// Login flow
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = loginUsername.value.trim().toLowerCase();
  const pass = loginPassword.value;

  if (!user || !pass) {
    showBanner(loginBanner, 'warning', 'Please enter both username and password.');
    return;
  }

  if (user === state.registeredUser && pass === state.registeredPass) {
    showBanner(loginBanner, 'success', 'Credentials are successfully found! Proceed to MFA...');
    // transition to MFA after a short, smooth delay
    setTimeout(() => {
      resetMfa();
      showSection(mfaSection);
    }, 700);
  } else {
    showBanner(loginBanner, 'error', 'Invalid username or password.');
  }
});

// MFA flow
otpForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (otpInput.disabled) return; // expired or locked

  const code = (otpInput.value || '').trim();
  if (!/^\d{6}$/.test(code)) {
    showBanner(mfaBanner, 'warning', 'Please enter a valid 6-digit code.');
    return;
  }

  if (state.timeLeft <= 0) {
    showBanner(mfaBanner, 'error', 'Access Denied. Expired OTP.');
    otpInput.disabled = true;
    verifyOtpBtn.disabled = true;
    return;
  }

  if (code === state.otp) {
    // Success
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
    showBanner(mfaBanner, 'success', 'Logged in successfully!');
    otpInput.disabled = true;
    verifyOtpBtn.disabled = true;
    resendOtpBtn.disabled = true;
  } else {
    state.attemptsLeft -= 1;
    attemptsLeftEl.textContent = Math.max(0, state.attemptsLeft);
    showBanner(mfaBanner, 'error', 'Access Denied. Incorrect OTP.');
    if (state.attemptsLeft <= 0) {
      otpInput.disabled = true;
      verifyOtpBtn.disabled = true;
    }
  }
});

// Resend OTP (resets timer and attempts)
resendOtpBtn.addEventListener('click', () => {
  resetMfa();
});