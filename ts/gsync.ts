/// <reference types="gapi" />
/// <reference types="gapi.drive" />
/// <reference types="gapi.client.tasks" />
/// <reference types="google.accounts" />

import { ItemConfig, Event, Item, Repo, NormalizeRepo } from "./types.js";

const CLIENT_ID =
  "132207894386-u17rn6vjeufljnpsksib5qid7a6l1uar.apps.googleusercontent.com";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest";
const SCOPES = "https://www.googleapis.com/auth/tasks";

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let loggedIn = false;

// --- UI Elements (Get references in your code) ---
const signInButton = document.getElementById("signin-button");
const signOutButton = document.getElementById("signout-button");

// --- Debounce saving to avoid too many API calls ---
let debounceTimer: number | undefined = undefined;
export function TriggerDebouncedSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    // await saveDataToDrive();
  }, 2000); // Save 2 seconds after the last change
}

// Called when Google API client library loads
export function GapiLoaded() {
  gapi.load("client", initializeGapiClient);
}

// Called when Google Identity Services library loads
export function GisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: tokenResponseCallback, // Function to handle the access token response
    error_callback: (error) => {
      console.error("GIS Error:", error);
      updateSyncStatus("Auth Error");
    },
  });
  gisInited = true;
  maybeEnableButtons(); // Enable buttons if both libraries are ready
}

function loadScript(src: string, onLoadCallback: () => void) {
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.defer = true; // Still good practice
  script.onload = onLoadCallback;
  script.onerror = () => console.error(`Failed to load script: ${src}`);
  document.body.appendChild(script);
}

// Initialize the gapi client
async function initializeGapiClient() {
  await gapi.client.init({
    // apiKey: API_KEY, // Include if you have one
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  console.log(gapiInited);
  maybeEnableButtons(); // Enable buttons if both libraries are ready
}

// Initial UI state update, event listeners, etc.
window.addEventListener("load", () => {
  loadScript("https://apis.google.com/js/api.js", GapiLoaded);
  loadScript("https://accounts.google.com/gsi/client", GisLoaded);
  // Setup Sign In/Out button listeners, etc.
  console.log(signInButton);
  if (signInButton) signInButton.onclick = handleAuthClick;
  if (signOutButton) signOutButton.onclick = handleSignOutClick;
  updateUIBasedOnSignInStatus(false /* check initial status? */);
});

// Enable buttons once both libraries are loaded
function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    signInButton?.classList.remove("disabled");
    signOutButton?.classList.remove("disabled");
  }
}

function updateSyncStatus(message: string) {
  // Update your UI element showing sync status
  console.log("Sync Status:", message);
  // syncStatus.textContent = message;
}

function updateUIBasedOnSignInStatus(isSignedIn: boolean) {
  // Show/hide sign-in/sign-out buttons, user info, etc.
  console.log("Sign In Status:", isSignedIn);
  if (isSignedIn) {
    loggedIn = true;
    // Show sign-out button, user info, sync functions
    // Hide sign-in button
  } else {
    loggedIn = false;
    // Show sign-in button
    // Hide sign-out button, user info, sync functions
  }
}

// --- Authentication ---

function handleAuthClick() {
  if (loggedIn) {
    handleSignOutClick();
    return;
  }
  // Prompt user to select account and grant access
  console.log("requestAccess");
  if (localStorage.getItem("habitpalAuthorized") === "true") {
    tokenClient?.requestAccessToken({ prompt: "none" });
  } else {
    tokenClient?.requestAccessToken();
  }
}

function handleSignOutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken(null); // Clear gapi token
      updateSyncStatus("Signed Out");
      updateUIBasedOnSignInStatus(false);
      localStorage.removeItem("habitpalAuthorized");
    });
  }
}

// Callback after user authorizes or denies
async function tokenResponseCallback(
  tokenResponse: google.accounts.oauth2.TokenResponse
) {
  if (tokenResponse.error) {
    localStorage.removeItem("habitpalAuthorized");
    console.error("Token Error:", tokenResponse.error);
    updateSyncStatus("Auth Failed");
    return;
  }
  // Pass the received token to the gapi client
  gapi.client.setToken(tokenResponse);
  updateSyncStatus("Authenticated");
  updateUIBasedOnSignInStatus(true);
  localStorage.setItem("habitpalAuthorized", "true");

  // --- IMPORTANT: Load data from Drive after successful sign-in ---
  // await loadDataFromDrive();
  await readTasks();
}

// --- Tasks Operations ---
async function readTasks() {
  try {
    const response = await gapi.client.tasks.tasklists.list();
    console.log(response);
  } catch (err: any) {
    console.error("Error reading tasks:", err);
    updateSyncStatus(`Error: ${err.message}`);
    return null;
  }
}

