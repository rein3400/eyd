const { google } = require('googleapis');
const fs = require('fs').promises;

/**
 * Create a Google Doc with the provided content
 * @param {string} title - Title of the document
 * @param {string} content - Content to be added to the document
 * @param {string} accessToken - Google OAuth2 access token
 * @returns {Promise<string>} - Document ID
 */
async function createGoogleDoc(title, content, accessToken) {
  try {
    if (!accessToken) {
      throw new Error('Missing access token');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const docs = google.docs({ version: 'v1', auth });

    // Create a new document
    const createResponse = await docs.documents.create({
      requestBody: { title }
    });

    const documentId = createResponse.data.documentId;

    // Insert content into the document
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: 1 },
            text: content
          }
        }]
      }
    });

    return documentId;
  } catch (error) {
    // Surface the underlying Google API error message verbatim so the
    // frontend can show "invalid_grant" / "insufficient scope" / etc.
    const detail =
      error.response?.data?.error?.message ||
      error.message ||
      'unknown Google API error';
    const status = error.response?.status || error.code;
    console.error('createGoogleDoc failed:', status, detail);
    throw new Error(`Failed to create Google Doc: ${detail}`);
  }
}

/**
 * Get Google Docs sharing URL
 * @param {string} documentId - Google Docs document ID
 * @returns {string} - Sharing URL
 */
function getGoogleDocsUrl(documentId) {
  return `https://docs.google.com/document/d/${documentId}/edit`;
}

module.exports = {
  createGoogleDoc,
  getGoogleDocsUrl
};