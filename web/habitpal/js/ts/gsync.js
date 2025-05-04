/// <reference types="gapi" /> 
/// <reference types="gapi.drive" />
/// <reference types="google.accounts" />
const CLIENT_ID = '132207894386-u17rn6vjeufljnpsksib5qid7a6l1uar.apps.googleusercontent.com';
// const API_KEY = 'YOUR_API_KEY'; // Optional: Create and add an API Key in Cloud Console for quota, etc. Not strictly needed for OAuth calls.
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DATA_FILENAME = 'habitpal_data.json';
let tokenClient = null;
let gapiInited = false;
let gisInited = false;
let driveFileId = null; // To store the ID of our data file
// --- UI Elements (Get references in your code) ---
const signInButton = document.getElementById('signin-button');
const signOutButton = document.getElementById('signout-button');
// let syncStatus = document.getElementById('sync-status');
// Called when Google API client library loads
export function GapiLoaded() {
    gapi.load('client', initializeGapiClient);
}
// Called when Google Identity Services library loads
export function GisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: tokenResponseCallback, // Function to handle the access token response
        error_callback: (error) => {
            console.error('GIS Error:', error);
            updateSyncStatus('Auth Error');
        }
    });
    gisInited = true;
    console.log(tokenClient);
    maybeEnableButtons(); // Enable buttons if both libraries are ready
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
// Enable buttons once both libraries are loaded
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        signInButton?.classList.remove('disabled');
        signOutButton?.classList.remove('disabled');
    }
}
// Initial UI state update, event listeners, etc.
window.addEventListener('load', () => {
    // Setup Sign In/Out button listeners, etc.
    if (signInButton)
        signInButton.onclick = handleAuthClick;
    if (signOutButton)
        signOutButton.onclick = handleSignOutClick;
    updateUIBasedOnSignInStatus(false /* check initial status? */);
    console.log(signInButton);
});
function updateSyncStatus(message) {
    // Update your UI element showing sync status
    console.log("Sync Status:", message);
    // syncStatus.textContent = message;
}
function updateUIBasedOnSignInStatus(isSignedIn) {
    // Show/hide sign-in/sign-out buttons, user info, etc.
    console.log("Sign In Status:", isSignedIn);
    if (isSignedIn) {
        // Show sign-out button, user info, sync functions
        // Hide sign-in button
    }
    else {
        // Show sign-in button
        // Hide sign-out button, user info, sync functions
        driveFileId = null; // Reset file ID on sign out
    }
}
// --- Authentication ---
function handleAuthClick() {
    // Prompt user to select account and grant access
    console.log(tokenClient?.requestAccessToken);
    tokenClient?.requestAccessToken();
    console.log("B");
}
function handleSignOutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(null); // Clear gapi token
            updateSyncStatus('Signed Out');
            updateUIBasedOnSignInStatus(false);
        });
    }
}
// Callback after user authorizes or denies
async function tokenResponseCallback(tokenResponse) {
    if (tokenResponse.error) {
        console.error("Token Error:", tokenResponse.error);
        updateSyncStatus('Auth Failed');
        return;
    }
    // Pass the received token to the gapi client
    gapi.client.setToken(tokenResponse);
    updateSyncStatus('Authenticated');
    updateUIBasedOnSignInStatus(true);
    // --- IMPORTANT: Load data from Drive after successful sign-in ---
    await loadDataFromDrive();
}
// --- Drive File Operations ---
// Finds the file ID in the appDataFolder, or creates it if not found
async function findOrCreateFileId() {
    if (driveFileId)
        return driveFileId; // Return cached ID if we have it
    updateSyncStatus('Searching for data file...');
    try {
        // Search in appDataFolder for the file
        const response = await gapi.client.drive.files.list({
            q: `name='${DATA_FILENAME}' and trashed=false`,
            spaces: 'appDataFolder' // Search specifically here
            // fields: 'files(id, name)'
        });
        if (response.result.items && response.result.items.length > 0) {
            driveFileId = response.result.items[0].id;
            console.log(`File found with ID: ${driveFileId}`);
            updateSyncStatus('Data file found');
            return driveFileId;
        }
        else {
            // File not found, create it
            updateSyncStatus('Data file not found.');
            // const fileMetadata = {
            //   name: DATA_FILENAME,
            //   parents: ['appDataFolder'], // Store in appDataFolder
            //   mimeType: 'application/json'
            // };
            // const createResponse = await gapi.client.drive.files.create({
            //   resource: fileMetadata,
            //   fields: 'id'
            // });
            // driveFileId = createResponse.result.id;
            // console.log(`File created with ID: ${driveFileId}`);
            // // Save initial empty/current state?
            // // await saveDataToDrive(); // Save current localStorage state to the new file
            // updateSyncStatus('Data file created');
            // return driveFileId;
            return null;
        }
    }
    catch (err) {
        console.error("Error finding/creating file:", err);
        updateSyncStatus(`Error: ${err.message}`);
        return null;
    }
}
// Reads content from the Drive file
async function readFileContent(fileId) {
    if (!fileId)
        return null;
    updateSyncStatus('Reading data from Drive...');
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'media' // Download the file content
        });
        updateSyncStatus('Data loaded from Drive');
        return response.result; // This should be your JSON data object
    }
    catch (err) {
        // Handle errors, e.g., file not found (404) might mean it was deleted externally
        console.error("Error reading file:", err);
        if (err.status === 404) {
            driveFileId = null; // Reset ID if file is gone
            updateSyncStatus('Data file not found on Drive.');
        }
        else {
            updateSyncStatus(`Read Error: ${err.message}`);
        }
        return null;
    }
}
// Saves data (from localStorage) to the Drive file
async function saveFileContent(fileId, jsonData) {
    if (!fileId)
        return false;
    updateSyncStatus('Saving data to Drive...');
    try {
        const blob = new Blob([jsonData], { type: 'application/json' });
        // Use multipart upload for metadata + content
        // Need to use XMLHttpRequest or fetch with specific handling for multipart upload
        // gapi.client.request({path: `/upload/drive/v3/files/${fileId}`, method: 'PATCH', params: { uploadType: 'media' }, body: jsonData}); // Simpler way
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'application/json'
            },
            body: blob
        });
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('File updated:', result);
        updateSyncStatus('Data saved to Drive');
        return true;
    }
    catch (err) {
        console.error("Error saving file:", err);
        updateSyncStatus(`Save Error: ${err.message}`);
        return false;
    }
}
// --- Sync Logic ---
// Call this after successful sign-in
async function loadDataFromDrive() {
    const fileId = await findOrCreateFileId();
    if (fileId) {
        const driveData = await readFileContent(fileId);
        if (driveData) {
            // --- CONFLICT RESOLUTION (Simple: Drive Wins) ---
            // You might want more complex logic here (e.g., compare timestamps)
            // For now, data from Drive overrides local data.
            console.log("Overwriting localStorage with Drive data.");
            // Assuming your app uses a specific localStorage key
            localStorage.setItem('habitpalDataKey', JSON.stringify(driveData));
            // --- IMPORTANT: Reload your app's UI from the new localStorage data ---
            // e.g., call the function that renders habits from localStorage
            // renderHabitsFromStorage();
            updateSyncStatus('Data synced from Drive');
        }
        else {
            // File exists but couldn't read, or was just created.
            // Maybe save current local state to Drive now?
            await saveDataToDrive();
        }
    }
}
// Call this whenever local data changes that needs to be synced
async function saveDataToDrive() {
    const fileId = driveFileId || await findOrCreateFileId(); // Get ID if we don't have it
    if (fileId && gapi.client.getToken()) { // Check if signed in
        // Get your current data object from localStorage
        const currentLocalData = localStorage.getItem('repo') || '{}';
        await saveFileContent(fileId, currentLocalData);
    }
    else {
        console.log("Not signed in or no file ID, skipping Drive save.");
    }
}
// --- Debounce saving to avoid too many API calls ---
let debounceTimer = undefined;
export function TriggerDebouncedSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        await saveDataToDrive();
    }, 2000); // Save 2 seconds after the last change
}
// --- Modify your existing code ---
// Whenever you update localStorage (e.g., adding/completing/deleting habits):
// localStorage.setItem('habitpalDataKey', JSON.stringify(newData));
// triggerDebouncedSave(); // Call this after updating localStorage
//# sourceMappingURL=gsync.js.map