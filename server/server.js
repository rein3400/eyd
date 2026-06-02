const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// Load environment variables from .env file
require('dotenv').config();

// Force reload environment variables
const dotenv = require('dotenv');

// Check if we're in the server directory
console.log('Current working directory:', process.cwd());
console.log('Server directory:', __dirname);

// Load .env from server directory
const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Log API key (masked for security)
console.log('Environment variables loaded. MiniMax API Key present:',
  process.env.MINIMAX_API_KEY ? 'Yes (key: ' + process.env.MINIMAX_API_KEY.substring(0, 8) + '...)' : 'No');

// If API key is not found, try to use it from the root directory .env file
if (!process.env.MINIMAX_API_KEY) {
  console.log('API key not found in server .env. Trying root directory...');
  const rootEnvPath = path.resolve(__dirname, '../.env');
  console.log('Loading .env from root:', rootEnvPath);
  dotenv.config({ path: rootEnvPath });

  console.log('Environment variables loaded from root. MiniMax API Key present:',
    process.env.MINIMAX_API_KEY ? 'Yes (key: ' + process.env.MINIMAX_API_KEY.substring(0, 8) + '...)' : 'No');
}

// Import text extraction utilities
const { extractTextFromDocx, extractTextFromPdf } = require('./utils/textExtraction');
const { correctIndonesianText, chunkText } = require('./utils/minimaxApi');
const { createGoogleDoc, getGoogleDocsUrl } = require('./utils/googleDocsExport');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (process.env.NODE_ENV === 'production') {
  // Serve static files from React app
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // DOCX
      file.mimetype === 'application/pdf' // PDF
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DOCX and PDF files are allowed.'));
    }
  }
});

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received'); // Log request
    console.log('Request headers:', req.headers); // Log headers
    console.log('Request files:', req.file); // Log file info
    
    if (!req.file) {
      console.log('No file in request'); // Log missing file
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, req.file.mimetype, 'Size:', req.file.size); // Log file info
    console.log('File buffer length:', req.file.buffer.length); // Log buffer length

    const fileType = req.file.mimetype;
    let text = '';

    // Extract text based on file type
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('Extracting from DOCX'); // Log DOCX extraction
      try {
        text = await extractTextFromDocx(req.file.buffer);
        console.log('DOCX text extracted, length:', text.length); // Log extraction result
      } catch (extractError) {
        console.error('Error extracting DOCX text:', extractError); // Log extraction error
        throw extractError;
      }
    } else if (fileType === 'application/pdf') {
      console.log('Extracting from PDF'); // Log PDF extraction
      try {
        text = await extractTextFromPdf(req.file.buffer);
        console.log('PDF text extracted, length:', text.length); // Log extraction result
      } catch (extractError) {
        console.error('Error extracting PDF text:', extractError); // Log extraction error
        throw extractError;
      }
    } else {
      console.log('Unsupported file type:', fileType); // Log unsupported type
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    console.log('Text extracted successfully, length:', text.length); // Log success
    console.log('Text preview (first 100 chars):', text.substring(0, 100)); // Log text preview

    res.json({ 
      success: true, 
      message: 'File processed successfully',
      originalText: text,
      fileName: req.file.originalname
    });
  } catch (error) {
    console.error('Error processing file:', error.message); // Log error message
    console.error('Error stack:', error.stack); // Log error stack
    res.status(500).json({ error: 'Error processing file: ' + error.message });
  }
});

app.post('/api/correct', async (req, res) => {
  try {
    const { text } = req.body;
    
    console.log('=== CORRECTION REQUEST RECEIVED ==='); // Log request
    console.log('Request body keys:', Object.keys(req.body)); // Log request structure
    console.log('Request method:', req.method); // Log request method
    console.log('Request URL:', req.originalUrl); // Log request URL
    
    if (!text) {
      console.log('No text provided for correction'); // Log missing text
      return res.status(400).json({ error: 'No text provided for correction' });
    }
    
    console.log('Text length for correction:', text.length); // Log text length
    console.log('Text preview (first 100 chars):', text.substring(0, 100)); // Log text preview
    
    // Check API key availability
    if (!process.env.MINIMAX_API_KEY) {
      console.error('MINIMAX_API_KEY not found in environment variables'); // Log missing API key
      console.log('Environment variables:', Object.keys(process.env)); // Log all env vars
      return res.status(500).json({ error: 'API key not configured' });
    }

    console.log('API key available (first 8 chars):', process.env.MINIMAX_API_KEY.substring(0, 8)); // Log partial API key
    console.log('Calling correctIndonesianText...'); // Log API call

    // Correct the text using the MiniMax API
    try {
      const startTime = Date.now();
      const correctedText = await correctIndonesianText(text, process.env.MINIMAX_API_KEY);
      const endTime = Date.now();
      
      console.log('Correction completed successfully. Sending response.'); // Log completion
      console.log('Processing time:', (endTime - startTime), 'ms'); // Log processing time
      console.log('Corrected text length:', correctedText.length); // Log corrected text length
      console.log('Corrected text preview (first 100 chars):', correctedText.substring(0, 100)); // Log corrected text preview
      
      // Additional validation
      if (!correctedText) {
        console.error('Corrected text is empty'); // Log empty result
        return res.status(500).json({ error: 'Correction resulted in empty text' });
      }
      
      res.json({ 
        success: true, 
        correctedText: correctedText,
        processingTime: (endTime - startTime)
      });
    } catch (innerError) {
      console.error('Inner error in correctIndonesianText:', innerError.message); // Log inner error
      console.error('Inner error stack:', innerError.stack); // Log error stack
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error correcting text:', error.message); // Log error message
    console.error('Error stack:', error.stack); // Log error stack
    console.error('Error type:', error.constructor.name); // Log error type
    res.status(500).json({ error: 'Error correcting text: ' + error.message });
  }
});

app.post('/api/export/google-docs', async (req, res) => {
  try {
    const { text, title, accessToken } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided for export' });
    }
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Google OAuth2 access token is required' });
    }

    // Create Google Doc
    const documentId = await createGoogleDoc(
      title || 'Indonesian Paper Correction', 
      text, 
      accessToken
    );
    
    // Get sharing URL
    const documentUrl = getGoogleDocsUrl(documentId);
    
    res.json({ 
      success: true, 
      documentId: documentId,
      documentUrl: documentUrl
    });
  } catch (error) {
    console.error('Error exporting to Google Docs:', error);
    res.status(500).json({ error: 'Error exporting to Google Docs: ' + error.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  // Serve React app for any other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});