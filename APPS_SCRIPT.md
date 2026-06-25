# ✉️ Google Apps Script Configuration Guide

This guide walks you through setting up a free Google Apps Script web app to deliver password reset OTPs to your users via email.

---

## 🚀 1. The Apps Script Code

Create a new Google Apps Script project at [script.google.com](https://script.google.com) and replace the editor's contents with the following JavaScript code:

```javascript
/**
 * Google Apps Script - Secure OTP Dispatcher
 * Allows the Life Saver application to securely send actual password reset emails.
 */

function doPost(e) {
  try {
    // Parse incoming request payload
    var payload = JSON.parse(e.postData.contents);
    var email = payload.email;
    var otp = payload.otp;
    
    if (!email || !otp) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: "Missing required parameters (email or otp)." 
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Send email using GmailApp / MailApp
    var subject = "🔒 OTP Security Code - The Last-Minute Life Saver";
    
    var htmlBody = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">The Last-Minute Life Saver</h2>
          <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">Your Autonomous Productivity Companion</p>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #111827; font-size: 18px;">Password Reset Request</h3>
          <p style="font-size: 14px; line-height: 1.5; color: #4b5563;">
            We received a request to reset your password. Use the verification code below to authorize this change:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; padding: 12px 24px; background-color: #e0e7ff; border-radius: 8px;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #ef4444; margin-bottom: 0;">
            * This one-time passcode (OTP) expires in 10 minutes.
          </p>
        </div>
        
        <p style="font-size: 13px; line-height: 1.5; color: #6b7280;">
          If you did not make this request, you can safely ignore this email. Your account remains fully secure.
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 11px; text-align: center; color: #9ca3af; margin: 0;">
          Automated System Notification • Do not reply directly to this email.
        </p>
      </div>
    `;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      htmlBody: htmlBody
    });
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      message: "Security code successfully dispatched via GmailApp." 
    }))
    .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 🌍 2. Deploying as a Web App

1. Click **Deploy** (top right) ➔ **New deployment**.
2. Select type: **Web app**.
3. Configure the following parameters:
   - **Description**: `Life Saver OTP Dispatcher`
   - **Execute as**: `Me` (your active email)
   - **Who has access**: `Anyone` (this allows your server backend to communicate with the Apps Script endpoint securely)
4. Click **Deploy**.
5. Copy the generated **Web App URL** (ends with `/exec`).

---

## ⚙️ 3. Integrating with the Applet

To activate this integration, configure your copied Web App URL in your environmental variables:

1. Locate the `.env` file in the project.
2. Update the `APPS_SCRIPT_URL` variable:
   ```env
   APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"
   ```
3. Restart your dev server to load the new config.

---

### 🛡️ Secure Verification
The system retains dual modes: if no URL is provided, it operates safely in **Developer Simulator mode** where codes print to the server console and the web UI for easy local testing. Once the URL is added, it switches fully to real Gmail delivery.
