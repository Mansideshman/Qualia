/**
 * fileExtractor.js
 * Extracts readable text from PDF, DOCX, plain-text, and image files.
 * Images are handled via the Groq vision model at generation time.
 */

const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const BASE_URL     = 'https://api.groq.com/openai/v1';

/* ── File type detection ───────────────────────────────── */
export function fileCategory(file) {
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image';
  if (type === 'application/pdf' || name.endsWith('.pdf'))  return 'pdf';
  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx') || name.endsWith('.doc')
  ) return 'docx';
  return 'text';
}

/* ── Read image as base64 + dataURL ────────────────────── */
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64  = dataUrl.split(',')[1];
      resolve({ dataUrl, base64, mimeType: file.type || 'image/png' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Extract text from plain-text file ─────────────────── */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/* ── Extract text from PDF using pdfjs-dist ────────────── */
export async function extractPdfText(file) {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  // Use CDN worker to avoid CRA webpack worker issues
  if (!GlobalWorkerOptions.workerSrc) {
    const { version } = await import('pdfjs-dist/package.json');
    GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(' '));
  }
  return pages.join('\n\n');
}

/* ── Extract text from DOCX using mammoth ──────────────── */
export async function extractDocxText(file) {
  const mammoth     = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result      = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/* ── Describe image via Groq vision API ─────────────────── */
export async function describeImageViaVision(base64, mimeType, apiKey) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'This image is attached to a QA generator. Extract and describe ALL visible content: requirements, user stories, feature specs, acceptance criteria, UI elements, error messages, flows, or any text. Be thorough and specific — your description will be used as the requirements context for generating test plans, test cases, or test strategies.',
          },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });
  if (!res.ok) throw new Error(`Vision API error ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

/* ── Master extractor — returns { text, preview, category } */
export async function extractFileContent(file) {
  const cat = fileCategory(file);

  if (cat === 'image') {
    const { dataUrl, base64, mimeType } = await readImageFile(file);
    return { category: 'image', text: null, dataUrl, base64, mimeType };
  }
  if (cat === 'pdf') {
    const text = await extractPdfText(file);
    return { category: 'pdf', text: text.trim() || '[PDF had no extractable text]' };
  }
  if (cat === 'docx') {
    const text = await extractDocxText(file);
    return { category: 'docx', text: text.trim() || '[Document had no extractable text]' };
  }
  // Plain text
  const text = await readTextFile(file);
  return { category: 'text', text };
}
