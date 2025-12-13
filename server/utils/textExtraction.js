const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

async function extractTextFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error('Error extracting text from DOCX: ' + error.message);
  }
}

async function extractTextFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error('Error extracting text from PDF: ' + error.message);
  }
}

module.exports = {
  extractTextFromDocx,
  extractTextFromPdf
};