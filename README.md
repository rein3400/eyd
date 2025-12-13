# Indonesian Scientific Paper Corrector

A full-stack Micro-SaaS web application that corrects Indonesian scientific papers using the google/gemini-2.5-flash model via OpenRouter.

## Features

- Upload DOCX or PDF scientific papers in Indonesian
- Automatic text extraction from documents
- Grammar and spelling correction using google/gemini-2.5-flash
- Download corrected text as TXT file
- Export corrected text to Google Docs
- Responsive React frontend with Express.js backend

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express.js
- **Text Processing**: mammoth (DOCX), pdf-parse (PDF)
- **AI Integration**: OpenRouter API with google/gemini-2.5-flash model
- **File Handling**: Multer for multipart form data

## Prerequisites

- Node.js 14+
- An OpenRouter API key

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
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

## Usage

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open your browser to http://localhost:3000

3. Upload your Indonesian scientific paper (DOCX or PDF)

4. Click the ".correct Text with Grok-4.1-Fast" button

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
│   │   ├── textExtraction.js # Text extraction from DOCX/PDF
│   │   ├── openRouterApi.js # OpenRouter API integration
│   │   └── googleDocsExport.js # Google Docs export functionality
│   ├── server.js           # Main server file
│   ├── package.json        # Server dependencies
│   └── .env                # Environment variables
├── package.json            # Root package.json
└── README.md               # This file
```

## How It Works

1. **Document Processing**: The app extracts text from uploaded DOCX or PDF files using specialized libraries
2. **Text Chunking**: Large documents are split into chunks to optimize token usage
3. **Correction**: Each chunk is sent to the google/gemini-2.5-flash model via OpenRouter for correction
4. **Assembly**: Corrected chunks are reassembled into a complete document
5. **Export**: Users can download the corrected text as a TXT file

## API Endpoints

- `POST /api/upload` - Upload and extract text from DOCX/PDF files
- `POST /api/correct` - Correct Indonesian text using OpenRouter API
- `POST /api/export/google-docs` - Export corrected text to Google Docs

## Optimization

- Text chunking to minimize token usage and reduce costs
- Efficient API calls to OpenRouter
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