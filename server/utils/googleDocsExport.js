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
    // Initialize Google Docs API client
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const docs = google.docs({
      version: 'v1',
      auth: auth
    });
    
    // Create a new document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: title
      }
    });
    
    const documentId = createResponse.data.documentId;
    
    // Insert content into the document
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [{
          insertText: {
            location: {
              index: 1
            },
            text: content
          }
        }]
      }
    });
    
    return documentId;
  } catch (error) {
    throw new Error(`Failed to create Google Doc: ${error.message}`);
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