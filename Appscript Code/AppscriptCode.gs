// ✅ CONFIG: Separate Sheet IDs
const COMPANY_SHEET_ID = "1gdIxGS9H80avxGqxYdtJziwFKwRkL4sPZfeU2rr4UVs";
const CANDIDATE_SHEET_ID = "1beR4ZgqfBTRIew2ekIj2iznjAbiWrgIUkUPmzzeWMmc";

// 🔍 BetterStack Config
const BETTERSTACK_TOKEN = "wBYGCzXtf9Q1hJ8V6KYzoWVe";
const BETTERSTACK_ENDPOINT = "https://in.logs.betterstack.com/v1/logs";

// 🚀 Send log to BetterStack
function sendToBetterStack(level, step, message, data) {
  try {
    const payload = {
      "level": level,
      "dt": new Date().toISOString(),
      "step": step,
      "message": message,
      "data": data || {}
    };

    const options = {
      method: "post",
      headers: {
        "Authorization": "Bearer " + BETTERSTACK_TOKEN,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(BETTERSTACK_ENDPOINT, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200 && responseCode !== 201) {
      Logger.log("⚠️ BetterStack log failed: " + responseCode);
    }
  } catch (error) {
    Logger.log("❌ BetterStack error: " + error.toString());
  }
}

// 🔍 Debug Helper - Logs to both AppScript and BetterStack
function debugLog(step, message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = "[" + timestamp + "] " + step + ": " + message;
  
  // Log to AppScript console
  Logger.log(logEntry);
  if (data !== undefined) {
    Logger.log("  📦 Data: " + JSON.stringify(data));
  }
  
  // Determine log level from message
  let level = "info";
  if (message.includes("ERROR") || message.includes("❌")) {
    level = "error";
  } else if (message.includes("⚠️")) {
    level = "warning";
  } else if (message.includes("✅")) {
    level = "info";
  }
  
  // Send to BetterStack
  sendToBetterStack(level, step, message, data);
}

// ✅ Dynamic sheet selector
function getSheet(sheetName, type) {
  debugLog("getSheet", "START | Requesting sheet", { sheetName: sheetName, type: type });
  
  let ss;
  try {
    if (type === "Company") {
      debugLog("getSheet", "Opening Company spreadsheet", { COMPANY_SHEET_ID: COMPANY_SHEET_ID });
      ss = SpreadsheetApp.openById(COMPANY_SHEET_ID);
    } else if (type === "Candidate") {
      debugLog("getSheet", "Opening Candidate spreadsheet", { CANDIDATE_SHEET_ID: CANDIDATE_SHEET_ID });
      ss = SpreadsheetApp.openById(CANDIDATE_SHEET_ID);
    } else {
      throw new Error("Invalid type passed to getSheet(): " + type);
    }
    
    debugLog("getSheet", "Spreadsheet opened successfully");

    debugLog("getSheet", "Fetching sheet by name", { sheetName: sheetName });
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      debugLog("getSheet", "❌ Sheet not found", { sheetName: sheetName, type: type });
      throw new Error("Sheet not found: " + sheetName);
    }
    
    debugLog("getSheet", "✅ Sheet retrieved successfully", { sheetName: sheetName, lastRow: sheet.getLastRow() });
    return sheet;
  } catch (error) {
    debugLog("getSheet", "❌ ERROR", { error: error.toString() });
    throw error;
  }
}


// ✅ Health check
function doGet(e) {
  debugLog("doGet", "✅ API Health Check");
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: "API is live"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ✅ Main entry
function doPost(e) {
  debugLog("doPost", "🔄 NEW REQUEST RECEIVED");
  
  try {
    // Step 1: Validate request
    debugLog("doPost", "Step 1: Validating request object");
    if (!e) {
      throw new Error("Request object is null/undefined");
    }
    debugLog("doPost", "  ✓ Request object exists");
    
    if (!e.postData) {
      throw new Error("Request postData is missing");
    }
    debugLog("doPost", "  ✓ postData exists");
    
    if (!e.postData.contents) {
      throw new Error("Request postData.contents is missing");
    }
    debugLog("doPost", "  ✓ postData.contents exists", { length: e.postData.contents.length });

    // Step 2: Parse JSON
    debugLog("doPost", "Step 2: Parsing JSON payload");
    let payload;
    try {
      debugLog("doPost", "  Raw payload (first 500 chars): " + e.postData.contents.substring(0, 500));
      payload = JSON.parse(e.postData.contents);
      debugLog("doPost", "  ✓ JSON parsed successfully");
    } catch (parseError) {
      throw new Error("Invalid JSON: " + parseError.toString());
    }

    // Step 3: Extract source
    debugLog("doPost", "Step 3: Extracting source field");
    const source = payload.source || "";
    debugLog("doPost", "  Source value: '" + source + "'");
    debugLog("doPost", "  Payload contains keys: " + Object.keys(payload).join(", "));

    // Step 4: Validate source
    if (!source) {
      throw new Error("Missing 'source' field in payload. Received payload: " + JSON.stringify(payload));
    }
    debugLog("doPost", "  ✓ Source is valid");

    // Step 5: Determine form type
    debugLog("doPost", "Step 5: Determining form type from source");
    let formType = "Company"; // default
    
    if (source.toLowerCase().includes("candidate") || source === "Candidate") {
      formType = "Candidate";
      debugLog("doPost", "  → Detected: Candidate form");
    } else if (source.toLowerCase().includes("company") || source === "Company") {
      formType = "Company";
      debugLog("doPost", "  → Detected: Company form");
    } else if (source === "Contact" || source === "Lead") {
      debugLog("doPost", "  → Generic source detected, analyzing payload");
      if (payload.fullName && !payload.companyName) {
        formType = "Candidate";
        debugLog("doPost", "    → Identified as Candidate (has fullName, no companyName)");
      } else if (payload.companyName && !payload.fullName) {
        formType = "Company";
        debugLog("doPost", "    → Identified as Company (has companyName, no fullName)");
      } else {
        formType = "Company";
        debugLog("doPost", "    ⚠️  Ambiguous source, defaulting to Company");
      }
    } else {
      formType = "Company";
      debugLog("doPost", "  ⚠️  Unknown source '" + source + "', defaulting to Company");
    }
    debugLog("doPost", "  Final form type: " + formType);

    // Step 6: Route to handler
    debugLog("doPost", "Step 6: Routing to appropriate handler");
    if (formType === "Company") {
      debugLog("doPost", "  → Calling handleCompanySubmission");
      return handleCompanySubmission(payload);
    } else {
      debugLog("doPost", "  → Calling handleCandidateSubmission");
      return handleCandidateSubmission(payload);
    }

  } catch (error) {
    debugLog("doPost", "❌ FATAL ERROR", { error: error.toString() });
    return createErrorResponse(error.toString());
  }
}


// 🟢 Company form
function handleCompanySubmission(payload) {
  debugLog("handleCompanySubmission", "🟢 START - Company form submission");
  
  try {
    // Step 1: Validate payload
    debugLog("handleCompanySubmission", "Step 1: Validating payload");
    if (!payload) {
      throw new Error("Payload is null or undefined");
    }
    debugLog("handleCompanySubmission", "  ✓ Payload exists");
    debugLog("handleCompanySubmission", "  Payload keys: " + Object.keys(payload).join(", "));

    // Step 2: Get sheet
    debugLog("handleCompanySubmission", "Step 2: Retrieving Company sheet");
    const sheet = getSheet("Website-Companies-Leads", "Company");
    debugLog("handleCompanySubmission", "  ✓ Sheet retrieved");

    // Step 3: Build row data
    debugLog("handleCompanySubmission", "Step 3: Building row data");
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
    debugLog("handleCompanySubmission", "  ✓ Row built with " + row.length + " columns", { sample: row.slice(0, 3) });

    // Step 4: Append row to sheet
    debugLog("handleCompanySubmission", "Step 4: Appending row to sheet");
    sheet.appendRow(row);
    debugLog("handleCompanySubmission", "  ✓ Row appended successfully");

    // Step 5: Verify
    debugLog("handleCompanySubmission", "Step 5: Verifying submission");
    const updatedLastRow = sheet.getLastRow();
    debugLog("handleCompanySubmission", "  ✓ Sheet now has " + updatedLastRow + " rows");

    debugLog("handleCompanySubmission", "🟢 END - Success");
    return createSuccessResponse();

  } catch (error) {
    debugLog("handleCompanySubmission", "❌ ERROR", { error: error.toString(), stack: error.stack });
    return createErrorResponse(error.toString());
  }
}


// 🟡 Candidate form
function handleCandidateSubmission(payload) {
  debugLog("handleCandidateSubmission", "🟡 START - Candidate form submission");
  
  try {
    // Step 1: Validate payload
    debugLog("handleCandidateSubmission", "Step 1: Validating payload");
    if (!payload) {
      throw new Error("Payload is null or undefined");
    }
    debugLog("handleCandidateSubmission", "  ✓ Payload exists");
    debugLog("handleCandidateSubmission", "  Payload keys: " + Object.keys(payload).join(", "));

    // Step 2: Get sheet
    debugLog("handleCandidateSubmission", "Step 2: Retrieving Candidate sheet");
    const sheet = getSheet("Website-Candidates-Leads", "Candidate");
    debugLog("handleCandidateSubmission", "  ✓ Sheet retrieved");

    // Step 3: Handle CV upload
    debugLog("handleCandidateSubmission", "Step 3: Processing CV file");
    let driveLink = "";
    
    if (payload.cvData && payload.cvData !== "") {
      debugLog("handleCandidateSubmission", "  CV data found, size: " + payload.cvData.length + " bytes");
      try {
        debugLog("handleCandidateSubmission", "  Uploading CV to Google Drive...");
        driveLink = uploadCVToGoogleDrive(payload.cvData, payload.fullName);
        debugLog("handleCandidateSubmission", "  ✓ CV uploaded successfully", { link: driveLink });
      } catch (cvError) {
        debugLog("handleCandidateSubmission", "  ⚠️  CV upload failed, continuing without CV", { error: cvError.toString() });
      }
    } else {
      debugLog("handleCandidateSubmission", "  No CV data provided (optional)");
    }

    // Step 4: Build row data
    debugLog("handleCandidateSubmission", "Step 4: Building row data");
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
    debugLog("handleCandidateSubmission", "  ✓ Row built with " + row.length + " columns", { sample: row.slice(0, 3) });

    // Step 5: Append row to sheet
    debugLog("handleCandidateSubmission", "Step 5: Appending row to sheet");
    sheet.appendRow(row);
    debugLog("handleCandidateSubmission", "  ✓ Row appended successfully");

    // Step 6: Verify
    debugLog("handleCandidateSubmission", "Step 6: Verifying submission");
    const updatedLastRow = sheet.getLastRow();
    debugLog("handleCandidateSubmission", "  ✓ Sheet now has " + updatedLastRow + " rows");

    debugLog("handleCandidateSubmission", "🟡 END - Success");
    return createSuccessResponse();

  } catch (error) {
    debugLog("handleCandidateSubmission", "❌ ERROR", { error: error.toString(), stack: error.stack });
    return createErrorResponse(error.toString());
  }
}


// 📁 CV Upload
function uploadCVToGoogleDrive(fileData, candidateName) {
  debugLog("uploadCVToGoogleDrive", "📁 START - CV Upload", { candidateName: candidateName, fileDataLength: fileData ? fileData.length : 0 });
  
  try {
    // Step 1: Validate file data
    debugLog("uploadCVToGoogleDrive", "Step 1: Validating file data");
    if (!fileData || typeof fileData !== "string") {
      throw new Error("Invalid file data - expected base64 string");
    }
    debugLog("uploadCVToGoogleDrive", "  ✓ File data is valid string, size: " + fileData.length + " bytes");

    // Step 2: Get root folder
    debugLog("uploadCVToGoogleDrive", "Step 2: Accessing Google Drive");
    const rootFolder = DriveApp.getRootFolderForActiveUser();
    debugLog("uploadCVToGoogleDrive", "  ✓ Root folder accessed");

    // Step 3: Find or create CV folder
    debugLog("uploadCVToGoogleDrive", "Step 3: Looking for 'HireForTravel CVs' folder");
    let cvFolder = null;
    const folders = rootFolder.getFoldersByName("HireForTravel CVs");
    
    if (folders.hasNext()) {
      cvFolder = folders.next();
      debugLog("uploadCVToGoogleDrive", "  ✓ Found existing 'HireForTravel CVs' folder");
    } else {
      debugLog("uploadCVToGoogleDrive", "  Folder not found, creating new folder");
      cvFolder = rootFolder.createFolder("HireForTravel CVs");
      debugLog("uploadCVToGoogleDrive", "  ✓ Created new 'HireForTravel CVs' folder");
    }

    // Step 4: Parse base64 data
    debugLog("uploadCVToGoogleDrive", "Step 4: Parsing base64 data");
    const parts = fileData.split(",");
    if (parts.length !== 2) {
      throw new Error("Invalid base64 format - expected data URL with comma separator");
    }
    debugLog("uploadCVToGoogleDrive", "  ✓ Base64 format validated");
    
    const mimeMatch = parts[0].match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    debugLog("uploadCVToGoogleDrive", "  ✓ MIME type detected: " + mimeType);

    // Step 5: Determine file extension
    debugLog("uploadCVToGoogleDrive", "Step 5: Determining file extension");
    let extension = ".pdf";
    if (mimeType.includes("word") || mimeType.includes("officedocument")) {
      extension = mimeType.includes("spreadsheet") ? ".xlsx" : ".docx";
    } else if (mimeType.includes("pdf")) {
      extension = ".pdf";
    }
    debugLog("uploadCVToGoogleDrive", "  ✓ Extension determined: " + extension);

    // Step 6: Create blob
    debugLog("uploadCVToGoogleDrive", "Step 6: Creating blob from base64");
    const timestamp = new Date().getTime();
    const fileName = "CV_" + (candidateName || "Candidate") + "_" + timestamp + extension;
    
    try {
      const decodedBytes = Utilities.base64Decode(parts[1]);
      debugLog("uploadCVToGoogleDrive", "  ✓ Base64 decoded, byte size: " + decodedBytes.length);
      
      const blob = Utilities.newBlob(
        decodedBytes,
        mimeType,
        fileName
      );
      debugLog("uploadCVToGoogleDrive", "  ✓ Blob created successfully", { fileName: fileName });

      // Step 7: Upload to Drive
      debugLog("uploadCVToGoogleDrive", "Step 7: Uploading to Google Drive");
      const file = cvFolder.createFile(blob);
      debugLog("uploadCVToGoogleDrive", "  ✓ File uploaded to Drive", { fileId: file.getId() });

      // Step 8: Set sharing
      debugLog("uploadCVToGoogleDrive", "Step 8: Setting file permissions");
      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
      debugLog("uploadCVToGoogleDrive", "  ✓ File is now viewable by anyone with link");

      // Step 9: Get and return URL
      const fileUrl = file.getUrl();
      debugLog("uploadCVToGoogleDrive", "Step 9: Retrieving file URL", { url: fileUrl });
      debugLog("uploadCVToGoogleDrive", "📁 END - Success");
      
      return fileUrl;
    } catch (decodeError) {
      throw new Error("Failed to decode/upload file: " + decodeError.toString());
    }

  } catch (error) {
    debugLog("uploadCVToGoogleDrive", "❌ ERROR", { error: error.toString() });
    throw error;
  }
}


// ✅ Responses
function createSuccessResponse(customResponse) {
  debugLog("createSuccessResponse", "Creating success response");
  const response = customResponse ? JSON.parse(customResponse) : { success: true };
  debugLog("createSuccessResponse", "Response:", response);
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(errorMessage) {
  debugLog("createErrorResponse", "Creating error response", { error: errorMessage });
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: errorMessage
    }))
    .setMimeType(ContentService.MimeType.JSON);
}