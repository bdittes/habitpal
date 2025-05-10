/// <reference types="gapi" />
/// <reference types="gapi.drive" />

const DATA_FILENAME = "habitpal_data.json";
export const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
export const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let driveFileId: string | null = null;

function updateSyncStatus(message: string) {
  console.log("Sync Status:", message);
}

// Finds the file ID in the appDataFolder, or creates it if not found
export async function findOrCreateFileId(): Promise<string | null> {
  if (driveFileId) return driveFileId;

  updateSyncStatus("Searching for data file...");
  try {
    const response = await gapi.client.drive.files.list({
      q: `name='${DATA_FILENAME}' and trashed=false`,
      spaces: "appDataFolder",
    });

    if (response.result.items && response.result.items.length > 0) {
      driveFileId = response.result.items[0].id;
      updateSyncStatus("Data file found");
      return driveFileId;
    } else {
      updateSyncStatus("Data file not found.");
      return null;
    }
  } catch (err: any) {
    console.error("Error finding/creating file:", err);
    updateSyncStatus(`Error: ${err.message}`);
    return null;
  }
}

// Reads content from the Drive file
export async function readFileContent(fileId: string): Promise<any> {
  if (!fileId) return null;
  updateSyncStatus("Reading data from Drive...");
  try {
    const response = await gapi.client.drive.files.get({
      fileId: fileId,
      fields: "media",
    });
    updateSyncStatus("Data loaded from Drive");
    return response.result;
  } catch (err: any) {
    console.error("Error reading file:", err);
    if (err.status === 404) {
      driveFileId = null;
      updateSyncStatus("Data file not found on Drive.");
    } else {
      updateSyncStatus(`Read Error: ${err.message}`);
    }
    return null;
  }
}

// Saves data (from localStorage) to the Drive file
export async function saveFileContent(fileId: string | null, jsonData: string): Promise<boolean> {
  if (!fileId) return false;
  updateSyncStatus("Saving data to Drive...");
  try {
    const blob = new Blob([jsonData], { type: "application/json" });

    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${gapi.client.getToken().access_token}`,
          "Content-Type": "application/json",
        },
        body: blob,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    updateSyncStatus("Data saved to Drive");
    return true;
  } catch (err: any) {
    console.error("Error saving file:", err);
    updateSyncStatus(`Save Error: ${err.message}`);
    return false;
  }
}

// Loads data from Google Drive and updates localStorage
export async function loadDataFromDrive(): Promise<void> {
  const fileId = await findOrCreateFileId();
  if (fileId) {
    const driveData = await readFileContent(fileId);
    if (driveData) {
      console.log("Overwriting localStorage with Drive data.");
      localStorage.setItem("habitpalDataKey", JSON.stringify(driveData));
      updateSyncStatus("Data synced from Drive");
    } else {
      await saveDataToDrive();
    }
  }
}

// Saves localStorage data to Google Drive
export async function saveDataToDrive(): Promise<void> {
  const fileId = driveFileId || (await findOrCreateFileId());
  if (fileId && gapi.client.getToken()) {
    const currentLocalData = localStorage.getItem("repo") || "{}";
    await saveFileContent(fileId, currentLocalData);
  } else {
    console.log("Not signed in or no file ID, skipping Drive save.");
  }
}
