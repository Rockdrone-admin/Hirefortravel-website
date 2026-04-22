I'll provide you with an updated Google Apps Script that routes form submissions to separate sheets based on whether it's a company or candidate submission.

## Step 1: Setup Google Sheet with Two Sheets
1. In your Google Sheet, create two sheets:
   - Rename first sheet to: **Companies**
   - Create another sheet: **Candidates**

## Step 2: Add Headers to Each Sheet

**Companies Sheet** (Row 1):
- A: timestamp
- B: cta
- C: pageUrl
- D: contactPersonName
- E: companyName
- F: designation
- G: hiringForRole
- H: numberOfOpenings
- I: location
- J: phoneNumber
- K: email

**Candidates Sheet** (Row 1):
- A: timestamp
- B: cta
- C: pageUrl
- D: fullName
- E: currentRole
- F: experience
- G: preferredRole
- H: location
- I: phoneNumber
- J: email
- K: cvDriveLink

## Step 3: Create Google Apps Script
In your Google Sheet, click Extensions → Apps Script
Delete any existing code
Paste this script:

```javascript
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const source = payload.source || "";
    
    // Route to appropriate sheet
    if (source === "Company") {
      return handleCompanySubmission(payload);
    } else if (source === "Candidate") {
      return handleCandidateSubmission(payload, e);
    } else {
      return createErrorResponse("Unknown source");
    }
  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

function handleCompanySubmission(payload) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Website-Companies-Leads");
    
    const row = [
      payload.timestamp || new Date().toISOString(),
      payload.cta || "",
      payload.pageUrl || "",
      payload.contactPersonName || "",
      payload.companyName || "",
      payload.designation || "",
      payload.hiringForRole || "",
      payload.numberOfOpenings || "",
      payload.location || "",
      payload.phoneNumber || "",
      payload.email || ""
    ];
    
    sheet.appendRow(row);
    return createSuccessResponse();
  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

function handleCandidateSubmission(payload, e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Website-Candidates-Leads");
    let driveLink = "";
    
    // Handle file upload if present
    if (e.parameter.cvFile && e.parameter.cvFile !== "") {
      driveLink = uploadCVToGoogleDrive(e.parameter.cvFile, payload.fullName);
    }
    
    const row = [
      payload.timestamp || new Date().toISOString(),
      payload.cta || "",
      payload.pageUrl || "",
      payload.fullName || "",
      payload.currentRole || "",
      payload.experience || "",
      payload.preferredRole || "",
      payload.location || "",
      payload.phoneNumber || "",
      payload.email || "",
      driveLink || ""
    ];
    
    sheet.appendRow(row);
    return createSuccessResponse();
  } catch (error) {
    return createErrorResponse(error.toString());
  }
}

function uploadCVToGoogleDrive(fileData, candidateName) {
  try {
    // Create a folder for CVs if it doesn't exist
    const rootFolder = DriveApp.getRootFolderForActiveUser();
    let cvFolder = null;
    
    // Search for existing CV folder
    const folders = rootFolder.getFoldersByName("HireForTravel CVs");
    if (folders.hasNext()) {
      cvFolder = folders.next();
    } else {
      // Create new CV folder
      cvFolder = rootFolder.createFolder("HireForTravel CVs");
    }
    
    // Parse file data (base64 encoded file)
    const blob = Utilities.newBlob(Utilities.base64Decode(fileData.split(',')[1]), 
                                   "application/octet-stream", 
                                   `CV_${candidateName}_${new Date().getTime()}`);
    
    // Upload file to Drive
    const file = cvFolder.createFile(blob);
    
    // Make file viewable and return shareable link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (error) {
    Logger.log("File upload error: " + error);
    return ""; // Return empty string if upload fails
  }
}

function createSuccessResponse() {
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(errorMessage) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: errorMessage }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Step 3: Update Website JavaScript
Update the formDataToObject function in site.js to send file data as base64:

```javascript
function formDataToObject(form) {
    const formData = new FormData(form);
    const values = {};
    let filePromises = [];

    formData.forEach((value, key) => {
      if (value instanceof File) {
        if (value.name && value.size > 0) {
          // Read file as base64 for upload
          const filePromise = new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              values[`${key}Data`] = e.target.result; // base64 encoded file
              resolve();
            };
            reader.readAsDataURL(value);
          });
          filePromises.push(filePromise);
        }
        return;
      }
      values[key] = typeof value === "string" ? value.trim() : value;
    });

    // Return a promise that resolves when all files are processed
    return Promise.all(filePromises).then(() => values);
}
```

## Step 4: Update Form Submission Handler
Update the handleLeadSubmit function to handle async file processing:

```javascript
async function handleLeadSubmit(form, statusNode, submitButton, whatsappIntent) {
    clearStatus(statusNode);
    const payload = await formDataToObject(form);
    payload.timestamp = new Date().toISOString();
    payload.pageUrl = window.location.href;
    payload.cta = form.dataset.triggerLabel || "";
    payload.source = form.dataset.source || payload.source || "Lead";

    if (!payload.source) {
      payload.source = "Lead";
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
      await submitPayload(payload);
      setStatus(statusNode, "<strong>Submitted successfully</strong><br>We'll reach out in 24-48 hrs", "success");
      form.reset();
    } catch (error) {
      const whatsappUrl = getWhatsAppUrl(whatsappIntent);
      setStatus(statusNode, "<strong>Something went wrong</strong><br>Please connect with us directly on WhatsApp", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = form === modalForm ? forms[activeModal || "company"].submit : `Send Inquiry ${iconArrow}`;
    }
}
```

## Step 4: Deploy/Update

1. Click **Deploy** → **New deployment** (or update existing)
2. Copy the new deployment URL
3. Update config.js with the webhook URL (same URL works for both)

## How It Works

- Company form submissions → **Companies sheet**
- Candidate form submissions → **Candidates sheet**
- Each sheet has columns specific to that form type
- Timestamps and page tracking are captured for both

Now your form data will be neatly organized in separate sheets!


