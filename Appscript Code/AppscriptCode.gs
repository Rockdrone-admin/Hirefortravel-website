// ✅ CONFIG: Separate Sheet IDs
const COMPANY_SHEET_ID = "1gdIxGS9H80avxGqxYdtJziwFKwRkL4sPZfeU2rr4UVs";
const CANDIDATE_SHEET_ID = "1beR4ZgqfBTRIew2ekIj2iznjAbiWrgIUkUPmzzeWMmc";


// ✅ Dynamic sheet selector
function getSheet(sheetName, type) {
  let ss;

  if (type === "Company") {
    ss = SpreadsheetApp.openById(COMPANY_SHEET_ID);
  } else if (type === "Candidate") {
    ss = SpreadsheetApp.openById(CANDIDATE_SHEET_ID);
  } else {
    throw new Error("Invalid type passed to getSheet()");
  }

  const sheet = ss.getSheetByName(sheetName);

  Logger.log("Opening sheet: " + sheetName + " | Type: " + type);
  Logger.log("Sheet found: " + (sheet !== null));

  if (!sheet) {
    throw new Error("Sheet not found: " + sheetName);
  }

  return sheet;
}


// ✅ Health check
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: "API is live"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ✅ Main entry
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No payload received");
    }

    const payload = JSON.parse(e.postData.contents);
    const source = payload.source || "";

    Logger.log("=== NEW REQUEST ===");
    Logger.log("Source: " + source);
    Logger.log("Payload: " + JSON.stringify(payload));

    if (source === "Company") {
      return handleCompanySubmission(payload);
    } else if (source === "Candidate") {
      return handleCandidateSubmission(payload);
    } else {
      throw new Error("Unknown source: " + source);
    }

  } catch (error) {
    Logger.log("doPost ERROR: " + error);
    return createErrorResponse(error.toString());
  }
}


// 🟢 Company form
function handleCompanySubmission(payload) {
  try {
    Logger.log("=== COMPANY SUBMISSION START ===");

    const sheet = getSheet("Website-Companies-Leads", "Company");

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

    Logger.log("Appending row: " + JSON.stringify(row));

    sheet.appendRow(row);

    Logger.log("Row appended successfully");
    Logger.log("=== COMPANY SUBMISSION END ===");

    return createSuccessResponse();

  } catch (error) {
    Logger.log("Company ERROR: " + error);
    return createErrorResponse(error.toString());
  }
}


// 🟡 Candidate form
function handleCandidateSubmission(payload) {
  try {
    Logger.log("=== CANDIDATE SUBMISSION START ===");

    const sheet = getSheet("Website-Candidates-Leads", "Candidate");

    let driveLink = "";

    if (payload.cvData && payload.cvData !== "") {
      Logger.log("Uploading CV...");
      driveLink = uploadCVToGoogleDrive(payload.cvData, payload.fullName);
      Logger.log("Drive link: " + driveLink);
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

    Logger.log("Appending row: " + JSON.stringify(row));

    sheet.appendRow(row);

    Logger.log("Row appended successfully");
    Logger.log("=== CANDIDATE SUBMISSION END ===");

    return createSuccessResponse();

  } catch (error) {
    Logger.log("Candidate ERROR: " + error);
    return createErrorResponse(error.toString());
  }
}


// 📁 CV Upload
function uploadCVToGoogleDrive(fileData, candidateName) {
  try {
    const rootFolder = DriveApp.getRootFolderForActiveUser();
    let cvFolder = null;

    const folders = rootFolder.getFoldersByName("HireForTravel CVs");

    if (folders.hasNext()) {
      cvFolder = folders.next();
    } else {
      cvFolder = rootFolder.createFolder("HireForTravel CVs");
    }

    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileData.split(',')[1]),
      "application/octet-stream",
      `CV_${candidateName || "Candidate"}_${new Date().getTime()}`
    );

    const file = cvFolder.createFile(blob);

    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );

    return file.getUrl();

  } catch (error) {
    Logger.log("File upload ERROR: " + error);
    return "";
  }
}


// ✅ Responses
function createSuccessResponse() {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(errorMessage) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: errorMessage
    }))
    .setMimeType(ContentService.MimeType.JSON);
}