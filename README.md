# Indonesian Scientific Paper Corrector

A full-stack Micro-SaaS web application that corrects Indonesian scientific papers using the MiniMax-M3.0-highspeed model via the MiniMax API.

## Features

- Upload DOCX or PDF scientific papers in Indonesian
- Automatic text extraction from documents
- Grammar and spelling correction using MiniMax-M3.0-highspeed
- Download corrected text as TXT file
- Export corrected text to Google Docs
- Responsive React frontend with Express.js backend

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express.js
- **Text Processing**: mammoth (DOCX), pdf-parse (PDF)
- **AI Integration**: MiniMax API with MiniMax-M3.0-highspeed model
- **File Handling**: Multer for multipart form data

## Prerequisites

- Node.js 14+
- A MiniMax API key (`sk-cp-...`)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd indonesian-paper-corrector
   ```

2. Install dependencies for both client and server:
   ```bash
   # Install root dependencies
   npm install

   # Install server dependencies
   cd server
   npm install
   cd ..

   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. Set up environment variables:
   Create a `.env` file in the `server` directory with:
   ```
   PORT=5000
   MINIMAX_API_KEY=your_minimax_api_key_here
   ```

   > ⚠ The `MINIMAX_API_KEY` must live **server-side only**. Never expose it via `REACT_APP_*` (those get bundled into the client and become public). Set it as a Cloudflare Pages / Render env var on the backend, never on the static-site build.

## Usage

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to http://localhost:3000

3. Upload your Indonesian scientific paper (DOCX or PDF)

4. Click the "Perbaiki Teks dengan MiniMax" button

5. Download the corrected text or export to Google Docs

## Project Structure

```
indonesian-paper-corrector/
├── client/                 # React frontend
│   ├── public/             # Public assets
│   └── src/                # React components
│       ├── App.js          # Main App component
│       ├── App.css         # App styles
│       ├── index.js        # Entry point
│       └── index.css       # Global styles
├── server/                 # Express backend
│   ├── utils/              # Utility functions
│   │   ├── textExtraction.js   # Text extraction from DOCX/PDF
│   │   ├── minimaxApi.js       # MiniMax API integration
│   │   └── googleDocsExport.js # Google Docs export functionality
│   ├── server.js           # Main server file
│   ├── package.json        # Server dependencies
│   └── .env                # Environment variables (server-only)
├── package.json            # Root package.json
└── README.md               # This file
```

## How It Works

1. **Document Processing**: The app extracts text from uploaded DOCX or PDF files using specialized libraries
2. **Text Chunking**: Large documents are split into chunks to optimize token usage
3. **Correction**: Each chunk is sent to the MiniMax-M3.0-highspeed model via the MiniMax API for correction
4. **Assembly**: Corrected chunks are reassembled into a complete document
5. **Export**: Users can download the corrected text as a TXT file

## API Endpoints

- `POST /api/upload` - Upload and extract text from DOCX/PDF files
- `POST /api/correct` - Correct Indonesian text using the MiniMax API
- `POST /api/export/google-docs` - Export corrected text to Google Docs

## Security Notes

- `MINIMAX_API_KEY` is read by the Express server only. It is **never** read or referenced by any file under `client/`.
- Do not add `MINIMAX_API_KEY` to Cloudflare Pages' build environment — that env is shipped to the static-site build. Add it on the backend host (Render, Railway, Fly, etc.) where the Express server actually runs.
- Client-side env vars (`REACT_APP_API_URL`, `REACT_APP_GOOGLE_CLIENT_ID`) are public by design and OK to expose.

## Optimization

- Text chunking to minimize token usage and reduce costs
- Efficient API calls to MiniMax
- Client-side caching of processed text
- Responsive UI for all device sizes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License.
