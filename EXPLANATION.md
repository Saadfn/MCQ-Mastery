
# MCQ Vision Splitter: Technical Documentation

## 1. System Architecture Overview
The application is a full-stack digitization platform. It uses a **Multimodal AI (Gemini 3 Pro)** to perform layout analysis and content extraction.

---

## 2. Background Processing Pipeline
To prevent the application from slowing down during heavy tasks (like processing multi-page PDFs), we implement a **Client-Side Background Worker** located in `services/backgroundProcessor.ts`.

### How it works:
1.  **PDF-to-Image Conversion**: Using `pdfjs-dist`, PDFs are rendered to high-resolution PNG canvases. This ensures Gemini gets a clean visual representation of the paper.
2.  **Sequential Queue**: Tasks are processed one by one. This prevents "locking up" the user's main thread and avoids overwhelming the Gemini API with concurrent requests.
3.  **Automatic Ingestion**:
    - **Step A**: The worker sends a page to `analyzeImage`.
    - **Step B**: It uses `extractCrops` to slice the image into separate question blocks.
    - **Step C**: Each question is uploaded to **Firebase Storage** and indexed in **Firestore**.
4.  **UI Decoupling**: Admins can navigate to other parts of the site (like the Dashboard) while the worker continues to run in the background. Note: Since this is a client-side worker, the browser tab must remain open until tasks reach the "STORED" state.

---

## 3. Firestore Security Rules (IMPORTANT FOR DELETION)
If you see **"Missing or insufficient permissions"** when trying to delete or view the bank, ensure your rules allow `delete` and `read` for authenticated users.

**Admin-Friendly Setup:**
Navigate to **Firebase Console > Firestore Database > Rules** and use this configuration:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allows full access to all collections for any logged-in user
    match /{document=**} {
      allow read, write, delete: if request.auth != null;
    }
  }
}
```

---

## 4. Troubleshooting common errors

### `Delete failed` or `Buttons don't react`
- Check your internet connection.
- Verify your **Firestore Rules** (see Section 3).
- Open **Browser Console (F12)**. If you see "403 Forbidden", your rules are blocking the action.

### `Failed Precondition (Index required)`
- The Admin Dashboard sorts sessions by `createdAt`. If this fails, click the unique link in your Browser Console to automatically generate the required composite index in Firebase.

### `Login failed (auth/invalid-credential)`
- Grouped error for security. Ensure the account exists in **Firebase Auth** and the "Email/Password" provider is enabled.
