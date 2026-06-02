import React, { useState } from 'react';
import axios from 'axios';
import GoogleSignIn from './components/GoogleSignIn';
import './App.css';

// Use environment variable for API URL or fallback to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [file, setFile] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleDocsUrl, setGoogleDocsUrl] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : '');
    setError('');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    console.log('Starting file upload for:', file.name, file.type, file.size); // Log file info

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError('');

    try {
      console.log('Sending upload request...'); // Log request start
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Upload response received:', response.status, response.data); // Log response

      if (response.data.success) {
        console.log('File processed successfully, text length:', response.data.originalText?.length); // Log success
        setOriginalText(response.data.originalText);
        setCorrectedText('');
      } else {
        console.error('Server error processing file:', response.data.error); // Log server error
        setError(response.data.error || 'Error processing file');
      }
    } catch (err) {
      console.error('Upload error:', err.message); // Log error
      console.error('Error response:', err.response); // Log error response
      setError(err.response?.data?.error || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const handleCorrect = async () => {
    if (!originalText) {
      setError('No text to correct');
      return;
    }

    setLoading(true);
    setError('');

    console.log('Sending correction request with text length:', originalText.length); // Log request
    
    try {
      const startTime = Date.now();
      const response = await axios.post('/api/correct', { text: originalText });
      const endTime = Date.now();
      
      console.log('Correction response received:', response.data); // Log response

      if (response.data.success) {
        if (response.data.correctedText) {
          console.log('Corrected text length:', response.data.correctedText.length); // Log corrected text
          setCorrectedText(response.data.correctedText);
          
          // Show processing time if available
          if (response.data.processingTime) {
            console.log('Server processing time:', response.data.processingTime, 'ms');
          }
        } else {
          console.error('No correctedText in response'); // Log missing correctedText
          setError('No corrected text received');
        }
      } else {
        setError(response.data.error || 'Error correcting text');
      }
    } catch (err) {
      console.error('Correction error:', err); // Log error details
      setError(err.response?.data?.error || 'Error correcting text');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!correctedText) return;

    const blob = new Blob([correctedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.[^/.]+$/, '') + '_corrected.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Google Sign-In success
  const handleGoogleSignInSuccess = (authData) => {
    console.log('Google Sign-In successful:', authData);
    setIsAuthenticated(true);
    setUser(authData.user);
    setGoogleAccessToken(authData.token);
    setError('');
  };

  // Handle Google Sign-In error
  const handleGoogleSignInError = (error) => {
    console.error('Google Sign-In error:', error);
    setError('Google Sign-In failed: ' + error);
  };

  const handleExportToGoogleDocs = async () => {
    if (!correctedText) {
      setError('No corrected text to export');
      return;
    }

    if (!isAuthenticated || !googleAccessToken) {
      setError('Please sign in with Google first');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      console.log('Exporting to Google Docs with text length:', correctedText.length);
      const response = await axios.post('/api/export/google-docs', {
        text: correctedText,
        title: fileName.replace(/\.[^/.]+$/, '') + ' - Corrected',
        accessToken: googleAccessToken
      });

      if (response.data.success) {
        setGoogleDocsUrl(response.data.documentUrl);
        // Open the Google Doc in a new tab
        window.open(response.data.documentUrl, '_blank');
        console.log('Successfully exported to Google Docs:', response.data.documentUrl);
      } else {
        setError(response.data.error || 'Error exporting to Google Docs');
        console.error('Error exporting to Google Docs:', response.data.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error exporting to Google Docs');
      console.error('Error exporting to Google Docs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📚 Indonesian Scientific Paper Corrector</h1>
        <p>Upload your Indonesian scientific paper in DOCX or PDF format for grammar and spelling correction.</p>
        <p>Powered by MiniMax-M3.0-highspeed.</p>
      </header>

      <main className="App-main">
        {/* Authentication Section */}
        {!isAuthenticated && (
          <div className="auth-section">
            <h2>Sign in with Google</h2>
            <p>Please sign in with your Google account to export documents to Google Docs</p>
            <GoogleSignIn 
              onSuccess={handleGoogleSignInSuccess}
              onError={handleGoogleSignInError}
            />
          </div>
        )}

        {isAuthenticated && user && (
          <div className="user-info">
            <p>Signed in as: {user.name} ({user.email})</p>
          </div>
        )}

        <div className="upload-section">
          <div className="file-input-container">
            <input
              type="file"
              id="file-upload"
              accept=".docx,.pdf"
              onChange={handleFileChange}
              disabled={loading || !isAuthenticated}
            />
            <label htmlFor="file-upload" className="file-label">
              {fileName || 'Choose a DOCX or PDF file'}
            </label>
            <button 
              onClick={handleUpload} 
              disabled={loading || !file || !isAuthenticated}
              className="upload-button"
            >
              {loading ? 'Processing...' : 'Upload and Extract Text'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        {originalText && (
          <div className="text-section">
            <h2>Original Text</h2>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              rows={10}
              className="text-area"
            />

            <button 
              onClick={handleCorrect} 
              disabled={loading}
              className="correct-button"
            >
              {loading ? (
                <div className="button-content">
                  <div className="loading-spinner"></div>
                  Memperbaiki teks dengan MiniMax...
                </div>
              ) : (
                'Perbaiki Teks dengan MiniMax'
              )}
            </button>
          </div>
        )}

        {correctedText && (
          <div className="text-section">
            <h2>Corrected Text</h2>
            <textarea
              value={correctedText}
              readOnly
              rows={10}
              className="text-area corrected"
            />

            <div className="button-group">
              <button 
                onClick={handleDownload}
                disabled={!correctedText || loading}
                className="download-button"
              >
                {loading ? (
                  <div className="button-content">
                    <div className="loading-spinner"></div>
                    Generating PDF...
                  </div>
                ) : (
                  'Download as PDF'
                )}
              </button>
              
              <button 
                onClick={handleExportToGoogleDocs}
                disabled={loading || !isAuthenticated}
                className="export-google-docs-button"
              >
                {loading ? (
                  <div className="button-content">
                    <div className="loading-spinner"></div>
                    Exporting to Google Docs...
                  </div>
                ) : (
                  'Export to Google Docs'
                )}
              </button>
            </div>
            
            {googleDocsUrl && (
              <div className="success-message">
                <p>Successfully exported to Google Docs!</p>
                <a href={googleDocsUrl} target="_blank" rel="noopener noreferrer">
                  Open in Google Docs
                </a>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="App-footer">
        <p>Indonesian Scientific Paper Corrector &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;