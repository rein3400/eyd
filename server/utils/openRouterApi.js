const axios = require('axios');

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

async function correctIndonesianTextChunk(textChunk, apiKey) {
  try {
    if (!apiKey) {
      console.error('API key validation failed: API key not found'); // Log API key error
      throw new Error("API key not found. Please provide OPENROUTER_API_KEY.");
    }

    console.log('Starting text correction...'); // Log start
    console.log('Text chunk length:', textChunk.length); // Log chunk size
    console.log('API key available (first 8 chars):', apiKey.substring(0, 8)); // Log partial API key
    
    // Validate input
    if (!textChunk || textChunk.trim() === '') {
      console.error('Text validation failed: empty or whitespace text'); // Log empty text
      throw new Error('Text cannot be empty');
    }
    
    // Prepare the prompt for correction with specific instructions for Indonesian
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

    console.log('Sending request to OpenRouter API...'); // Log API request
    console.log('System prompt:', systemPrompt.substring(0, 100) + '...'); // Log partial prompt
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.1, // Reduced temperature for more deterministic output
      top_p: 0.9, // Added top_p sampling for better quality
      frequency_penalty: 0.2, // Slight penalty for repetition
      presence_penalty: 0.2, // Slight penalty for new topics
      max_tokens: 4000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('OpenRouter API response received'); // Log response
    console.log('Response status:', response.status); // Log response status
    console.log('Response data keys:', Object.keys(response.data)); // Log response structure
    
    // Check if response has valid data
    if (!response.data) {
      console.error('Invalid API response format: no data'); // Log response error
      throw new Error('Invalid API response: no data');
    }
    
    if (!response.data.choices) {
      console.error('Invalid API response format: no choices array'); // Log response error
      throw new Error('Invalid API response: no choices array');
    }
    
    if (!response.data.choices[0]) {
      console.error('Invalid API response format: no first choice'); // Log response error
      throw new Error('Invalid API response: no first choice');
    }
    
    if (!response.data.choices[0].message) {
      console.error('Invalid API response format: no message in first choice'); // Log response error
      throw new Error('Invalid API response: no message in first choice');
    }
    
    const content = response.data.choices[0].message.content;
    console.log('Corrected text length:', content.length); // Log corrected text length
    console.log('Original text length:', textChunk.length); // Log original text length
    
    // Evaluate correction quality
    const qualityEvaluation = evaluateCorrectionQuality(textChunk, content);
    console.log('Quality evaluation:', qualityEvaluation); // Log quality evaluation
    
    // If quality is poor, attempt with explicit prompt
    if (qualityEvaluation.quality === 'poor') {
      console.warn('Initial correction quality is poor. Attempting with more explicit prompt.'); // Log warning
      
      // Try again with a more explicit prompt
      const explicitUserPrompt = `SEBAGAI EDITOR JURNAL ILMIAH INDONESIA PROFESIONAL, LAKUKAN PERUBAHAN SUBSTANSIAL PADA TEKS BERIKUT:
 1. Perbaiki kesalahan ejaan berdasarkan EYD terbaru
 2. Perbaiki tata bahasa Indonesia baku
 3. Tingkatkan struktur kalimat menjadi lebih akademis dan formal
 4. JANGAN mempertahankan teks asli jika ada kesalahan
 5. HANYA output teks yang sudah diperbaiki TANPA komentar tambahan

 TEKS ASLI YANG WAJIB DIUBAH:
${textChunk}

 TEKS YANG SUDAH DIPERBAIKI:`;
      
      const explicitResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: explicitUserPrompt
          }
        ],
        temperature: 0.7, // Higher temperature for more creative changes
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (explicitResponse.data && explicitResponse.data.choices && explicitResponse.data.choices[0] && explicitResponse.data.choices[0].message) {
        const explicitContent = explicitResponse.data.choices[0].message.content;
        const explicitQuality = evaluateCorrectionQuality(textChunk, explicitContent);
        console.log('Explicit correction quality:', explicitQuality); // Log quality
        
        // Check if explicit correction is better
        if (explicitQuality.quality !== 'poor') {
          console.log('Using explicit correction result'); // Log success
          console.log('Explicit correction length:', explicitContent.length); // Log length
          return explicitContent;
        } else {
          console.warn('Explicit correction also resulted in poor quality'); // Log warning
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
    throw new Error('Error calling OpenRouter API: ' + error.message);
  }
  
}

async function correctIndonesianText(text, apiKey) {
  console.log('Starting text correction process for text length:', text.length); // Log start
  
  // Split text into chunks to optimize token usage
  const chunks = chunkText(text);
  console.log('Text split into', chunks.length, 'chunks'); // Log chunks count
  
  const correctedChunks = [];

  // Process chunks with progress tracking
  let successfulCorrections = 0;
  let failedCorrections = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.trim()) { // Only process non-empty chunks
      try {
        console.log(`Correcting chunk ${i+1}/${chunks.length}...`); // Log chunk number
        const correctedChunk = await correctIndonesianTextChunk(chunk, apiKey);
        
        // Additional validation for chunk quality
        if (correctedChunk && correctedChunk.trim() !== chunk.trim()) {
          correctedChunks.push(correctedChunk);
          successfulCorrections++;
          console.log(`Chunk ${i+1} corrected successfully`); // Log success
        } else {
          // If correction didn't improve the text, keep original
          correctedChunks.push(chunk);
          console.warn(`Chunk ${i+1} correction was not improved, keeping original`);
        }
      } catch (error) {
        // If there's an error with one chunk, return the original for that chunk
        console.error(`Error correcting chunk ${i+1}: ${error.message}`);
        correctedChunks.push(chunk);
        failedCorrections++;
      }
    }
  }

  // Join all corrected chunks
  const correctedText = correctedChunks.join("\n\n");
  console.log('Correction complete. Original text length:', text.length, 'Corrected text length:', correctedText.length); // Log completion
  console.log('Successful corrections:', successfulCorrections, 'Failed corrections:', failedCorrections); // Log statistics
  
  // Final quality check
  if (correctedText.trim() === text.trim()) {
    console.warn('Final text is identical to original. This may indicate issues with the correction process.');
  }
  
  return correctedText;
}

module.exports = {
  correctIndonesianText,
  chunkText
};