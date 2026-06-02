const axios = require('axios');

// MiniMax base URL differs by region. Default to global; allow override via env
// (MINIMAX_BASE_URL) for CN region or local testing.
const MINIMAX_CHAT_URL =
  (process.env.MINIMAX_BASE_URL || 'https://api.minimax.io') + '/v1/text/chatcompletion_v2';
const MINIMAX_MODEL = 'MiniMax-M3';

function chunkText(text, maxChunkSize = 2500) {
  // Split by paragraphs first
  const paragraphs = text.split('\n\n');
  const chunks = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the chunk size, save current chunk
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph + "\n\n";
    } else {
      currentChunk += paragraph + "\n\n";
    }
  }

  // Add the last chunk if it exists
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  // If we still have very large chunks, split them further by sentences
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length > maxChunkSize) {
      // Split by sentences
      const sentences = chunk.split(/(?<=[.!?])\s+/);
      let subChunk = "";

      for (const sentence of sentences) {
        if (subChunk.length + sentence.length > maxChunkSize && subChunk) {
          finalChunks.push(subChunk.trim());
          subChunk = sentence + " ";
        } else {
          subChunk += sentence + " ";
        }
      }

      if (subChunk) {
        finalChunks.push(subChunk.trim());
      }
    } else {
      finalChunks.push(chunk);
    }
  }

  return finalChunks;
}

// Helper function to evaluate correction quality
function evaluateCorrectionQuality(original, corrected) {
  const orig = original.trim();
  const corr = corrected.trim();

  // Basic checks
  if (!corr) return { quality: 'poor', reason: 'Empty correction' };
  if (orig === corr) return { quality: 'poor', reason: 'No changes made' };

  // Length-based checks
  const lengthDiff = Math.abs(orig.length - corr.length);
  if (lengthDiff < 5) return { quality: 'fair', reason: 'Minimal changes' };

  // Content-based checks (simple heuristics)
  const origWords = orig.split(/\s+/).length;
  const corrWords = corr.split(/\s+/).length;

  // Check if word count changed significantly
  const wordDiffRatio = Math.abs(origWords - corrWords) / origWords;
  if (wordDiffRatio < 0.05) {
    return { quality: 'fair', reason: 'Minimal word count changes' };
  }

  // Check for common improvement patterns
  const improvements = {
    hasCapitalization: /[A-Z][a-z]/.test(corr) && !/[A-Z][a-z]/.test(orig),
    hasPunctuation: /[.!?]$/.test(corr.trim()) && !/[.!?]$/.test(orig.trim()),
    hasFormalTerms: /\b(Oleh\s+karena\s+itu|Selanjutnya|Namun|Sebaliknya)\b/i.test(corr),
    hasProperSpacing: !/\s{3,}/.test(corr) && /\s{2,}/.test(orig)
  };

  const improvementCount = Object.values(improvements).filter(Boolean).length;
  if (improvementCount >= 2) {
    return { quality: 'excellent', reason: 'Multiple improvements detected' };
  } else if (improvementCount >= 1) {
    return { quality: 'good', reason: 'Some improvements detected' };
  }

  return { quality: 'fair', reason: 'Changes detected but quality uncertain' };
}

// Extract plain text from a MiniMax chat-completions response.
// Observed shapes:
//   { choices: [{ message: { content: "string" } }] }            -- simple
//   { choices: [{ message: { content: "json-encoded string" } }] } -- some surfaces
//   { choices: [{ message: { content: [{type:"text", text:"..."}, {type:"thinking", ...}] } }] }
//      -- MiniMax-M3 with reasoning blocks; we want the first text block.
function extractContent(responseData) {
  if (!responseData) return null;

  const choice = responseData.choices && responseData.choices[0];
  if (!choice) return null;

  const message = choice.message || choice;
  let raw = message.content;
  if (raw == null) return null;

  // Array of typed blocks (M3 reasoning models): pick the first text block.
  if (Array.isArray(raw)) {
    const textBlock = raw.find((b) => b && (b.type === 'text' || typeof b.text === 'string'));
    if (textBlock && typeof textBlock.text === 'string') {
      return textBlock.text;
    }
    return null;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
        if (parsed && typeof parsed.content === 'string') return parsed.content;
        if (Array.isArray(parsed)) {
          const tb = parsed.find((b) => b && (b.type === 'text' || typeof b.text === 'string'));
          if (tb && typeof tb.text === 'string') return tb.text;
        }
      } catch (_) {
        // Not JSON — return as-is.
      }
    }
    return raw;
  }

  return null;
}

async function callMinimax(systemPrompt, userPrompt, apiKey, opts = {}) {
  const temperature = opts.temperature ?? 0.1;
  const topP = opts.topP ?? 0.9;
  const frequencyPenalty = opts.frequencyPenalty ?? 0.2;
  const presencePenalty = opts.presencePenalty ?? 0.2;
  const maxTokens = opts.maxTokens ?? 4000;

  const response = await axios.post(
    MINIMAX_CHAT_URL,
    {
      model: MINIMAX_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      max_tokens: maxTokens
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }
  );

  // Surface MiniMax base_resp errors as proper exceptions so the outer catch logs them.
  const data = response.data || {};
  const base = data.base_resp;
  if (base && base.status_code != null && base.status_code !== 0) {
    const err = new Error(`MiniMax API error: ${base.status_code} ${base.status_msg || ''}`.trim());
    err.response = response;
    throw err;
  }

  // Validate response shape — must have a non-empty choices[0].message.content.
  // MiniMax returns HTTP 200 even for some error states (e.g. invalid key) and
  // can echo the input or return an empty body. Without this check, callers
  // would silently store the original text and report a "successful" correction.
  if (!Array.isArray(data.choices) || data.choices.length === 0) {
    const err = new Error('MiniMax API returned no choices');
    err.response = response;
    throw err;
  }
  const content = extractContent(data);
  if (!content || !content.trim()) {
    const err = new Error('MiniMax API returned empty content');
    err.response = response;
    throw err;
  }

  return response;
}

async function correctIndonesianTextChunk(textChunk, apiKey) {
  try {
    if (!apiKey) {
      console.error('API key validation failed: API key not found');
      throw new Error("API key not found. Please provide MINIMAX_API_KEY.");
    }

    console.log('Starting text correction...');
    console.log('Text chunk length:', textChunk.length);
    console.log('API key available (first 8 chars):', apiKey.substring(0, 8));

    if (!textChunk || textChunk.trim() === '') {
      console.error('Text validation failed: empty or whitespace text');
      throw new Error('Text cannot be empty');
    }

    // System prompt: Indonesian EYD editor persona.
    const systemPrompt = "Anda adalah editor jurnal ilmiah profesional Indonesia dengan keahlian khusus dalam EYD (Ejaan Yang Disempurnakan). Tugas Anda adalah: 1. Memperbaiki kesalahan ejaan berdasarkan EYD terbaru; 2. Memperbaiki tata bahasa Indonesia baku; 3. Memperbaiki struktur kalimat agar lebih akademis dan formal; 4. Menjaga konsistensi istilah ilmiah; 5. Mempertahankan format dan struktur dokumen asli; 6. HANYA mengoutput teks yang sudah diperbaiki TANPA komentar tambahan; 7. JANGAN mempertahankan teks asli jika ada kesalahan; 8. FOKUS pada perbaikan substansial, bukan hanya perubahan kosmetik. Contoh perbaikan yang diharapkan: - 'teori' → 'teori' (ejaan); - 'di lihat' → 'dilihat' (tata bahasa); - 'karena itu' → 'Oleh karena itu' (formalitas); - 'dll' → 'dan lain-lain' (akademis)";

    const userPrompt = `Sebagai editor jurnal ilmiah profesional Indonesia, perbaiki teks ilmiah berbahasa Indonesia berikut dengan ketentuan:
 1. Perbaiki semua kesalahan ejaan berdasarkan EYD terbaru
 2. Perbaiki tata bahasa Indonesia baku
 3. Tingkatkan struktur kalimat agar lebih akademis dan formal
 4. Pertahankan format dan struktur dokumen asli
 5. JANGAN menambahkan komentar atau penjelasan tambahan
 6. HANYA output teks yang sudah diperbaiki

 Teks asli:
${textChunk}

 Teks yang sudah diperbaiki:`;

    console.log('Sending request to MiniMax API...');
    console.log('Model:', MINIMAX_MODEL);

    const response = await callMinimax(systemPrompt, userPrompt, apiKey, {
      temperature: 0.1,
      topP: 0.9,
      frequencyPenalty: 0.2,
      presencePenalty: 0.2,
      maxTokens: 4000
    });

    console.log('MiniMax API response received');
    console.log('Response status:', response.status);

    if (!response.data) {
      throw new Error('Invalid API response: no data');
    }

    const content = extractContent(response.data);
    if (!content) {
      console.error('Invalid API response format: no extractable content. Keys:', Object.keys(response.data));
      throw new Error('Invalid API response: no message content');
    }

    console.log('Corrected text length:', content.length);
    console.log('Original text length:', textChunk.length);

    const qualityEvaluation = evaluateCorrectionQuality(textChunk, content);
    console.log('Quality evaluation:', qualityEvaluation);

    if (qualityEvaluation.quality === 'poor') {
      console.warn('Initial correction quality is poor. Attempting with more explicit prompt.');

      const explicitUserPrompt = `SEBAGAI EDITOR JURNAL ILMIAH INDONESIA PROFESIONAL, LAKUKAN PERUBAHAN SUBSTANSIAL PADA TEKS BERIKUT:
 1. Perbaiki kesalahan ejaan berdasarkan EYD terbaru
 2. Perbaiki tata bahasa Indonesia baku
 3. Tingkatkan struktur kalimat menjadi lebih akademis dan formal
 4. JANGAN mempertahankan teks asli jika ada kesalahan
 5. HANYA output teks yang sudah diperbaiki TANPA komentar tambahan

 TEKS ASLI YANG WAJIB DIUBAH:
${textChunk}

 TEKS YANG SUDAH DIPERBAIKI:`;

      const explicitResponse = await callMinimax(systemPrompt, explicitUserPrompt, apiKey, {
        temperature: 0.7,
        topP: 0.9,
        frequencyPenalty: 0.3,
        presencePenalty: 0.3,
        maxTokens: 4000
      });

      const explicitContent = extractContent(explicitResponse.data);
      if (explicitContent) {
        const explicitQuality = evaluateCorrectionQuality(textChunk, explicitContent);
        console.log('Explicit correction quality:', explicitQuality);

        if (explicitQuality.quality !== 'poor') {
          console.log('Using explicit correction result');
          console.log('Explicit correction length:', explicitContent.length);
          return explicitContent;
        } else {
          console.warn('Explicit correction also resulted in poor quality');
        }
      }
    }

    return content;
  } catch (error) {
    console.error('Error in correctIndonesianTextChunk:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Error response data:', JSON.stringify(error.response.data));
      console.error('Error response status:', error.response.status);
    }
    throw new Error('Error calling MiniMax API: ' + error.message);
  }
}

async function correctIndonesianText(text, apiKey) {
  console.log('Starting text correction process for text length:', text.length);

  const chunks = chunkText(text);
  console.log('Text split into', chunks.length, 'chunks');

  const correctedChunks = [];
  let successfulCorrections = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.trim()) {
      try {
        console.log(`Correcting chunk ${i+1}/${chunks.length}...`);
        const correctedChunk = await correctIndonesianTextChunk(chunk, apiKey);

        if (correctedChunk && correctedChunk.trim() !== chunk.trim()) {
          correctedChunks.push(correctedChunk);
          successfulCorrections++;
          console.log(`Chunk ${i+1} corrected successfully`);
        } else {
          // AI returned identical or near-identical text — not a useful correction.
          // Don't silently swap in the original; surface the issue and abort so
          // the caller knows nothing was actually fixed.
          console.warn(`Chunk ${i+1} correction was not improved, aborting`);
          throw new Error(`Chunk ${i+1} correction produced no changes`);
        }
      } catch (error) {
        console.error(`Error correcting chunk ${i+1}: ${error.message}`);
        // Re-throw so /api/correct returns 500 with a real error message
        // instead of returning the original text pretending it's "corrected".
        throw error;
      }
    }
  }

  const correctedText = correctedChunks.join("\n\n");
  console.log('Correction complete. Original text length:', text.length, 'Corrected text length:', correctedText.length);
  console.log('Successful corrections:', successfulCorrections);

  if (correctedText.trim() === text.trim()) {
    console.warn('Final text is identical to original. This may indicate issues with the correction process.');
  }

  return correctedText;
}

module.exports = {
  correctIndonesianText,
  chunkText,
  extractContent,
  MINIMAX_MODEL
};
