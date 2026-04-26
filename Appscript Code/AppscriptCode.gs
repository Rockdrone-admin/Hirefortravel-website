// ✅ CONFIG: Separate Sheet IDs
const COMPANY_SHEET_ID = "1gdIxGS9H80avxGqxYdtJziwFKwRkL4sPZfeU2rr4UVs";
const CANDIDATE_SHEET_ID = "1beR4ZgqfBTRIew2ekIj2iznjAbiWrgIUkUPmzzeWMmc";

// 🔍 BetterStack Config
const BETTERSTACK_TOKEN = "wBYGCzXtf9Q1hJ8V6KYzoWVe";
const BETTERSTACK_ENDPOINT = "https://s2392660.eu-fsn-3.betterstackdata.com";

// 🚀 Send log to BetterStack
function sendToBetterStack(step, message, data) {
  try {
    // Format: dt as "YYYY-MM-DD HH:MM:SS UTC"
    const now = new Date();
    const isoString = now.toISOString();
    const dtFormat = isoString.replace('T', ' ').replace('Z', ' UTC').substring(0, 19) + ' UTC';
    
    // Build message with step and data
    const fullMessage = "[" + step + "] " + message + (data ? " | Data: " + JSON.stringify(data).substring(0, 200) : "");
    
    const payload = {
      "dt": dtFormat,
      "message": fullMessage
    };

    Logger.log("📤 Sending to BetterStack: " + JSON.stringify(payload));

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
    
    Logger.log("✅ BetterStack response: " + responseCode);
    if (responseCode !== 200 && responseCode !== 201) {
      Logger.log("⚠️ BetterStack response: " + response.getContentText());
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
  
  // Send to BetterStack
  sendToBetterStack(step, message, data);
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

    // Step 6: Send internal email to team
    debugLog("handleCompanySubmission", "Step 6: Sending internal email to team");
    try {
      sendCompanyLeadInternalEmail(payload);
      debugLog("handleCompanySubmission", "  ✓ Internal email sent");
    } catch (emailError) {
      debugLog("handleCompanySubmission", "  ⚠️  Failed to send internal email, continuing", { error: emailError.toString() });
    }

    // Step 7: Send external acknowledgment email to client
    debugLog("handleCompanySubmission", "Step 7: Sending acknowledgment email to client");
    try {
      sendCompanyAcknowledgmentEmail(payload);
      debugLog("handleCompanySubmission", "  ✓ Acknowledgment email sent");
    } catch (emailError) {
      debugLog("handleCompanySubmission", "  ⚠️  Failed to send acknowledgment email, continuing", { error: emailError.toString() });
    }

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
    
    if (payload.cvFileData && payload.cvFileData !== "") {
      debugLog("handleCandidateSubmission", "  CV data found, size: " + payload.cvFileData.length + " bytes");
      try {
        debugLog("handleCandidateSubmission", "  Uploading CV to Google Drive...");
        driveLink = uploadCVToGoogleDrive(payload.cvFileData, payload.fullName, payload.cvFileName);
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
      payload.phoneNumber || "",
      payload.email || "",
      payload.location || "",
      payload.applyingFor || "",
      driveLink || "",
      payload.referredByCheckbox ? "Yes" : "No",
      payload.referrerName || "",
      payload.referrerContact || ""
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

    // Step 7: Send internal email to team
    debugLog("handleCandidateSubmission", "Step 7: Sending internal email to team");
    try {
      // Add CV link to payload for email
      const payloadWithCVLink = Object.assign({}, payload, { cvLink: driveLink });
      sendCandidateApplicationInternalEmail(payloadWithCVLink);
      debugLog("handleCandidateSubmission", "  ✓ Internal application email sent");
    } catch (emailError) {
      debugLog("handleCandidateSubmission", "  ⚠️  Failed to send internal email, continuing", { error: emailError.toString() });
    }

    // Step 8: Send external acknowledgment email to candidate
    debugLog("handleCandidateSubmission", "Step 8: Sending acknowledgment email to candidate");
    try {
      sendCandidateAcknowledgmentEmail(payload);
      debugLog("handleCandidateSubmission", "  ✓ Acknowledgment email sent to candidate");
    } catch (emailError) {
      debugLog("handleCandidateSubmission", "  ⚠️  Failed to send acknowledgment email, continuing", { error: emailError.toString() });
    }

    debugLog("handleCandidateSubmission", "🟡 END - Success");
    return createSuccessResponse();

  } catch (error) {
    debugLog("handleCandidateSubmission", "❌ ERROR", { error: error.toString(), stack: error.stack });
    return createErrorResponse(error.toString());
  }
}


// 📁 CV Upload
function uploadCVToGoogleDrive(fileData, candidateName, originalFileName) {
  debugLog("uploadCVToGoogleDrive", "📁 START - CV Upload", { candidateName: candidateName, originalFileName: originalFileName, fileDataLength: fileData ? fileData.length : 0 });
  
  try {
    // Step 1: Validate file data
    debugLog("uploadCVToGoogleDrive", "Step 1: Validating file data");
    if (!fileData || typeof fileData !== "string") {
      throw new Error("Invalid file data - expected base64 string");
    }
    debugLog("uploadCVToGoogleDrive", "  ✓ File data is valid string, size: " + fileData.length + " bytes");

    // Step 2: Get root folder
    debugLog("uploadCVToGoogleDrive", "Step 2: Accessing Google Drive");
    const rootFolder = DriveApp.getRootFolder();
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

    // Step 5: Determine file name with timestamp to avoid conflicts
    debugLog("uploadCVToGoogleDrive", "Step 5: Determining file name with timestamp");
    let fileName;
    const timestamp = new Date().getTime();
    
    if (originalFileName && originalFileName.trim() !== "") {
      // Use original file name with timestamp to avoid conflicts
      const lastDotIndex = originalFileName.lastIndexOf(".");
      let nameWithoutExt, extension;
      
      if (lastDotIndex > 0) {
        nameWithoutExt = originalFileName.substring(0, lastDotIndex);
        extension = originalFileName.substring(lastDotIndex);
      } else {
        nameWithoutExt = originalFileName;
        extension = ".pdf";
      }
      
      fileName = nameWithoutExt + "_" + timestamp + extension;
      debugLog("uploadCVToGoogleDrive", "  ✓ Using original file name with timestamp: " + fileName);
    } else {
      // Fall back to generated file name
      let extension = ".pdf";
      if (mimeType.includes("word") || mimeType.includes("officedocument")) {
        extension = mimeType.includes("spreadsheet") ? ".xlsx" : ".docx";
      } else if (mimeType.includes("pdf")) {
        extension = ".pdf";
      }
      fileName = "CV_" + (candidateName || "Candidate") + "_" + timestamp + extension;
      debugLog("uploadCVToGoogleDrive", "  ✓ Generated file name: " + fileName);
    }

    // Step 6: Create blob
    debugLog("uploadCVToGoogleDrive", "Step 6: Creating blob from base64");
    
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


// 📧 EMAIL CONFIG
const INTERNAL_EMAIL = "Contact@hirefortravel.com";
const WHATSAPP_NUMBER = "+919266788980"; // For creating WhatsApp links
const FOUNDER_PHONE = "+91 92667 88980";
const FOUNDER_EMAIL = "Contact@hirefortravel.com";
const FOUNDER_NAME = "Shwetambri Soni";

// 📧 Send Internal Email - Company Lead
function sendCompanyLeadInternalEmail(payload) {
  debugLog("sendCompanyLeadInternalEmail", "📧 START - Sending internal company lead email");
  
  try {
    const companyName = payload.companyName || "[No Company Name]";
    const contactName = payload.contactPersonName || "[No Contact Name]";
    const hiringFor = payload.hiringForRole || "[No Role Specified]";
    const openings = payload.numberOfOpenings || "[No Number Specified]";
    const designation = payload.designation || "[No Designation]";
    const phoneNumber = payload.phoneNumber || "[No Phone]";
    const email = payload.email || "[No Email]";
    const location = payload.location || "[No Location]";
    
    const whatsappLink = "https://wa.me/" + WHATSAPP_NUMBER.replace(/\D/g, "");
    const callLink = "tel:" + phoneNumber.replace(/\D/g, "");
    const whatsappChatLink = "https://wa.me/" + phoneNumber.replace(/\D/g, "");
    
    const subject = "New Client Lead – " + companyName + " | " + hiringFor + " | " + openings;
    
    const htmlBody = 
      "<div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; font-size: 14px;'>" +
      "<h2 style='color: #1a73e8; font-size: 18px;'>New Client Lead Received on Website</h2>" +
      "<hr style='border: none; border-top: 2px solid #1a73e8; margin: 20px 0;'>" +
      
      "<h3 style='font-size: 14px;'>Company Name:</h3>" +
      "<p style='font-weight: bold; font-size: 14px;'>" + escapeHtml(companyName) + "</p>" +
      
      "<h3 style='font-size: 14px;'>Contact Person</h3>" +
      "<p style='font-size: 14px;'><strong>Name:</strong> " + escapeHtml(contactName) + "</p>" +
      "<p style='font-size: 14px;'><strong>Designation:</strong> " + escapeHtml(designation) + "</p>" +
      "<p style='font-size: 14px;'><strong>Phone Number:</strong> " + escapeHtml(phoneNumber) + "</p>" +
      "<p style='font-size: 14px;'><strong>Email:</strong> " + escapeHtml(email) + "</p>" +
      "<p style='font-size: 14px;'><strong>Location:</strong> " + escapeHtml(location) + "</p>" +
      "<p style='font-size: 14px;'><strong>Number of Openings:</strong> " + escapeHtml(openings) + "</p>" +
      "<p style='font-size: 14px;'><strong>Hiring for Roles:</strong> " + escapeHtml(hiringFor) + "</p>" +
      
      "<h3 style='font-size: 14px;'>Quick Action Links:</h3>" +
      "<p style='font-size: 14px;'>" +
      "<a href='" + callLink + "' style='display: inline-block; padding: 8px 15px; margin-right: 10px; background-color: #34a853; color: white; text-decoration: none; border-radius: 4px;'>📞 Click to call</a>" +
      "<a href='" + whatsappChatLink + "' style='display: inline-block; padding: 8px 15px; background-color: #25d366; color: white; text-decoration: none; border-radius: 4px;'>💬 Click to WhatsApp</a>" +
      "</p>" +
            
      "<h3 style='font-size: 14px;'>Reference Links</h3>" +
      "<p style='font-size: 14px;'><a href='https://docs.google.com/spreadsheets/d/1gdIxGS9H80avxGqxYdtJziwFKwRkL4sPZfeU2rr4UVs/edit?gid=0#gid=0' style='color: #1a73e8;'>📊 Check in sheet</a></p>" +
      
      "<hr style='border: none; border-top: 1px solid #ccc; margin: 20px 0;'>" +
      "<p style='color: #666; font-size: 14px;'>" +
      "Best,<br>" +
      "<strong>Team HireForTravel</strong>" +
      "</p>" +
      "</div>";
    
    MailApp.sendEmail({
      to: INTERNAL_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    });
    
    debugLog("sendCompanyLeadInternalEmail", "✅ Internal email sent successfully", { to: INTERNAL_EMAIL, subject: subject });
    return true;
  } catch (error) {
    debugLog("sendCompanyLeadInternalEmail", "❌ ERROR sending internal email", { error: error.toString() });
    return false;
  }
}

// 📧 Send External Email - Company Acknowledgment
function sendCompanyAcknowledgmentEmail(payload) {
  debugLog("sendCompanyAcknowledgmentEmail", "📧 START - Sending company acknowledgment email");
  
  try {
    const fullName = payload.contactPersonName || "there";
    const recipientEmail = payload.email || "";
    
    if (!recipientEmail) {
      debugLog("sendCompanyAcknowledgmentEmail", "⚠️  No recipient email found, skipping");
      return false;
    }
    
    const whatsappLink = "https://wa.me/" + WHATSAPP_NUMBER.replace(/\D/g, "");
    
    const subject = "We've received your requirement – HireForTravel";
    
    const htmlBody = 
      "<div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; font-size: 14px;'>" +
      "<p>Hey " + escapeHtml(fullName) + ",</p>" +
      
      "<p>Thanks for sharing your hiring requirement with HireForTravel.</p>" +
      
      "<p>We've received the details and our team is currently reviewing them. We'll get back to you within the next 24–48 hours.</p>" +
      
      "<p>If your requirement is urgent, feel free to connect with us directly on WhatsApp: <a href='" + whatsappLink + "' style='color: #25d366; font-weight: bold;'>Click to Chat</a></p>" +
      
      "<p>We look forward to working together and supporting your hiring.</p>" +
      
      "<hr style='border: none; border-top: 1px solid #ccc; margin: 20px 0;'>" +
      
      "<p>Best regards,<br>" +
      "<strong>" + escapeHtml(FOUNDER_NAME) + "</strong><br>" +
      "Founder & CEO<br>" +
      "<strong>HireForTravel</strong><br>" +
      "📞 " + FOUNDER_PHONE + "<br>" +
      "📧 " + FOUNDER_EMAIL + "</p>" +
      "</div>";
    
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: "HireForTravel"
    });
    
    debugLog("sendCompanyAcknowledgmentEmail", "✅ Acknowledgment email sent successfully", { to: recipientEmail, subject: subject });
    return true;
  } catch (error) {
    debugLog("sendCompanyAcknowledgmentEmail", "❌ ERROR sending acknowledgment email", { error: error.toString() });
    return false;
  }
}

// 📧 Send Internal Email - Candidate Application
function sendCandidateApplicationInternalEmail(payload) {
  debugLog("sendCandidateApplicationInternalEmail", "📧 START - Sending internal candidate application email");
  
  try {
    const candidateName = payload.fullName || "[No Candidate Name]";
    const applyingFor = payload.applyingFor || "[No Role Specified]";
    const location = payload.location || "[No Location]";
    const phoneNumber = payload.phoneNumber || "[No Phone]";
    const email = payload.email || "[No Email]";
    const cvLink = payload.cvLink || "[No CV Link]";
    
    const callLink = "tel:" + phoneNumber.replace(/\D/g, "");
    const whatsappChatLink = "https://wa.me/" + phoneNumber.replace(/\D/g, "");
    
    const subject = "Application from Candidate – " + candidateName + " | " + applyingFor + " | " + location;
    
    const htmlBody = 
      "<div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; font-size: 14px;'>" +
      "<h2 style='color: #1a73e8; font-size: 18px;'>Candidate Application received on Website</h2>" +
      "<hr style='border: none; border-top: 2px solid #1a73e8; margin: 20px 0;'>" +
      
      "<p style='font-size: 14px;'><strong>Candidate Name:</strong> " + escapeHtml(candidateName) + "</p>" +
      "<p style='font-size: 14px;'><strong>Contact Number:</strong> " + escapeHtml(phoneNumber) + "</p>" +
      "<p style='font-size: 14px;'><strong>Email:</strong> " + escapeHtml(email) + "</p>" +
      "<p style='font-size: 14px;'><strong>Applying for:</strong> " + escapeHtml(applyingFor) + "</p>" +
      "<p style='font-size: 14px;'><strong>Location:</strong> " + escapeHtml(location) + "</p>" +
      "<p style='font-size: 14px;'><a href='" + escapeHtml(cvLink) + "' style='color: #1a73e8;'>📄 View CV</a></p>" +
      
      "<h3 style='font-size: 14px;'>Quick Action Links:</h3>" +
      "<p style='font-size: 14px;'>" +
      "<a href='" + callLink + "' style='display: inline-block; padding: 8px 15px; margin-right: 10px; background-color: #34a853; color: white; text-decoration: none; border-radius: 4px;'>📞 Click to call</a>" +
      "<a href='" + whatsappChatLink + "' style='display: inline-block; padding: 8px 15px; background-color: #25d366; color: white; text-decoration: none; border-radius: 4px;'>💬 Click to WhatsApp</a>" +
      "</p>" +
      
      "<h3 style='font-size: 14px;'>Reference Links</h3>" +
      "<p style='font-size: 14px;'><a href='https://docs.google.com/spreadsheets/d/1beR4ZgqfBTRIew2ekIj2iznjAbiWrgIUkUPmzzeWMmc/edit?gid=0#gid=0' style='color: #1a73e8;'>📊 Check in sheet</a></p>" +
      
      "<hr style='border: none; border-top: 1px solid #ccc; margin: 20px 0;'>" +
      "<p style='color: #666; font-size: 14px;'>" +
      "Best,<br>" +
      "<strong>Team HireForTravel</strong>" +
      "</p>" +
      "</div>";
    
    MailApp.sendEmail({
      to: INTERNAL_EMAIL,
      subject: subject,
      htmlBody: htmlBody
    });
    
    debugLog("sendCandidateApplicationInternalEmail", "✅ Internal candidate email sent successfully", { to: INTERNAL_EMAIL, subject: subject });
    return true;
  } catch (error) {
    debugLog("sendCandidateApplicationInternalEmail", "❌ ERROR sending internal candidate email", { error: error.toString() });
    return false;
  }
}

// 📧 Send External Email - Candidate Acknowledgment
function sendCandidateAcknowledgmentEmail(payload) {
  debugLog("sendCandidateAcknowledgmentEmail", "📧 START - Sending candidate acknowledgment email");
  
  try {
    const fullName = payload.fullName || "there";
    const recipientEmail = payload.email || "";
    
    if (!recipientEmail) {
      debugLog("sendCandidateAcknowledgmentEmail", "⚠️  No recipient email found, skipping");
      return false;
    }
    
    const subject = "We've received your application – HireForTravel";
    
    const htmlBody = 
      "<div style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; font-size: 14px;'>" +
      "<p>Hey " + escapeHtml(fullName) + ",</p>" +
      
      "<p>Thanks for sharing your profile with HireForTravel.</p>" +
      
      "<p>We've received your application and our team is currently reviewing it. If your profile matches any relevant opportunity, we'll reach out to you with the next steps.</p>" +
      
      "<p>Meanwhile, feel free to reply to this email if you'd like to share any additional details or preferences.</p>" +
      
      "<p>We appreciate your interest and look forward to connecting with you.</p>" +
      
      "<hr style='border: none; border-top: 1px solid #ccc; margin: 20px 0;'>" +
      
      "<p style='font-size: 14px;'>Best regards,<br>" +
      "<strong>" + escapeHtml(FOUNDER_NAME) + "</strong><br>" +
      "Founder & CEO<br>" +
      "<strong>HireForTravel</strong></p>" +
      "</div>";
    
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody,
      name: "HireForTravel"
    });
    
    debugLog("sendCandidateAcknowledgmentEmail", "✅ Acknowledgment email sent successfully", { to: recipientEmail, subject: subject });
    return true;
  } catch (error) {
    debugLog("sendCandidateAcknowledgmentEmail", "❌ ERROR sending candidate acknowledgment email", { error: error.toString() });
    return false;
  }
}

// 🛡️ HTML Escape Helper
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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


// 🧪 TEST FUNCTION - Run this to test logging before deploying
function testLog() {
  Logger.log("=====================================");
  Logger.log("🧪 TESTING LOGGING FUNCTIONALITY");
  Logger.log("=====================================");
  
  try {
    Logger.log("\n📝 Test 1: Basic log message");
    debugLog("testLog", "✓ This is a test message", null);
    
    Logger.log("\n📝 Test 2: Log with data");
    debugLog("testLog", "✓ Testing with data object", { testValue: "hello", number: 123 });
    
    Logger.log("\n📝 Test 3: Error log");
    debugLog("testLog", "❌ This is a test error message", { errorCode: 500 });
    
    Logger.log("\n📝 Test 4: Warning log");
    debugLog("testLog", "⚠️ This is a test warning", { warningType: "validation" });
    
    Logger.log("\n✅ All test logs sent to BetterStack!");
    Logger.log("📊 Check your BetterStack dashboard at: https://app.betterstack.com");
    Logger.log("=====================================\n");
    
  } catch (error) {
    Logger.log("❌ Test failed: " + error.toString());
  }
}