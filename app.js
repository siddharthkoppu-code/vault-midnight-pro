// ── Firebase init ──────────────────────────────────────────────
firebase.initializeApp({
  apiKey:            "AIzaSyCS8TjvO6OWZT93BQCbEESCSxA1_F1GiY4",
  authDomain:        "dpp-track.firebaseapp.com",
  projectId:         "dpp-track",
  storageBucket:     "dpp-track.firebasestorage.app",
  messagingSenderId: "263840362934",
  appId:             "1:263840362934:web:1d5980deea34cce0391117"
});

const auth    = firebase.auth();
const db      = firebase.firestore();
const storage = firebase.storage();

// ── State ──────────────────────────────────────────────────────
let currentUser   = null;
let activeSubject = "Physics";
let isEditMode    = false;
let unsubFn       = null;
let selectedFile  = null;
let allEntries    = [];

// ── Helpers ────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function toast(msg, type) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "show " + (type || "ok");
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.className = ""; }, 3000);
}

function saveBtnReset() {
  $("submitBtn").innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#080D18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg> Save to Vault`;
  $("submitBtn").disabled = false;
}

// ── Auth ───────────────────────────────────────────────────────
$("signInBtn").addEventListener("click", async () => {
  const btn = $("signInBtn");
  btn.innerHTML = '<span class="spin"></span> Entering vault...';
  btn.disabled = true;
  try {
    await auth.signInAnonymously();
  } catch (e) {
    console.error(e);
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="#080D18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg> Enter as Guest`;
    btn.disabled = false;
    toast("Error: " + e.message, "err");
  }
});

// Sign out on avatar click
$("avatarBtn").addEventListener("click", async () => {
  if (!confirm("Sign out of your vault?")) return;
  if (unsubFn) { unsubFn(); unsubFn = null; }
  await auth.signOut();
  toast("Signed out.");
});

// Auth state listener
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    $("authScreen").style.display = "none";
    $("mainApp").style.display    = "flex";
    loadFeed();
  } else {
    currentUser = null;
    $("authScreen").style.display = "flex";
    $("mainApp").style.display    = "none";
    allEntries = [];
  }
});

// ── Subject pills ──────────────────────────────────────────────
document.querySelectorAll(".pill").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    activeSubject = btn.dataset.subject;
    $("subjectLabel").textContent = activeSubject;
    if (unsubFn) { unsubFn(); unsubFn = null; }
    loadFeed();
  });
});

// ── Edit mode ──────────────────────────────────────────────────
$("editBtn").addEventListener("click", () => {
  isEditMode = !isEditMode;
  if (isEditMode) {
    $("editBtn").textContent = "Done";
    $("editBtn").classList.add("active");
    $("fab").style.display = "block";
    $("feedContainer").classList.add("edit-mode");
  } else {
    $("editBtn").textContent = "Edit";
    $("editBtn").classList.remove("active");
    $("fab").style.display = "none";
    $("feedContainer").classList.remove("edit-mode");
  }
});

// ── FAB ────────────────────────────────────────────────────────
$("fabBtn").addEventListener("click", openModal);
