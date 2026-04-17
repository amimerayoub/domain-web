// services/aiGenerator.js — Gemini AI domain name generation with generation modes
import { canUseAPI, incrementQuota } from './quotaManager.js';

// ─── Compact fallback keywords (kept short to save tokens) ────────────────────
const FALLBACK_KEYWORDS = 'AI fintech SaaS legaltech insurtech healthtech proptech edtech cybersecurity cloud data crypto B2B HR logistics e-commerce';

// ─── Models to try in order (most capable → lightest) ────────────────────────
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
];

// ─── Compact mode instructions (token-efficient) ──────────────────────────────
const MODE_INSTRUCTIONS = {
  GEO:       'Combine trend keywords with major US/Canada cities (pop>500k). Patterns: CityKeyword or KeywordCity.',
  BRANDABLE: 'Startup-style names. Prefixes: Zen Neo Vex Flux Nex Lumi. Suffixes: Hub Labs AI Flow Ly Era. 6-12 chars.',
  PATTERN:   'Pronounceable CVC/CVCVC patterns only. Examples: Nexova Kalino Tarevo Bivona. Easy to say.',
  HYBRID:    'Mix brandable + pattern. Examples: ZentroHub NexviaLabs KovaFlow AxiNova. 8-14 chars.'
};

// ─── Build a compact, token-efficient prompt ──────────────────────────────────
function buildPrompt(newsText, options = {}) {
  const { tld = '.com', count = 10, mode = 'GEO' } = options;
  const modeText = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.GEO;

  // Hard-cap news text at 1200 chars to stay within free-tier token budget
  const news = (newsText || FALLBACK_KEYWORDS).slice(0, 1200);

  return `Generate ${count} premium domain names based on news trends below.
Mode: ${mode} — ${modeText}
TLD: ${tld}. No hyphens. No numbers. Commercially valuable.

NEWS:
${news}

Reply ONLY with JSON array:
[{"domain":"example${tld}","reason":"short reason"}]`;
}

// ─── Domain validation ────────────────────────────────────────────────────────
function validateDomain(d, tld) {
  if (!d || typeof d.domain !== 'string') return null;
  const dom = d.domain.toLowerCase().trim();
  const reason = (d.reason || d.reasoning || '').trim();
  if (!dom.includes('.')) return null;
  const namePart = dom.split('.')[0];
  if (/[-_\d]/.test(namePart)) return null;
  if (namePart.length < 3) return null;
  return { domain: dom, reason };
}

// ─── Rank: shorter first, then high-value keyword bonus ──────────────────────
const HV_KEYWORDS = ['finance','fintech','legal','law','insure','ai','tech','data','cloud','saas','crypto','invest','pay','bank','hub','labs','flow','pro'];

function rankDomains(domains) {
  return domains.sort((a, b) => {
    const an = a.domain.split('.')[0], bn = b.domain.split('.')[0];
    const lenDiff = an.length - bn.length;
    if (lenDiff !== 0) return lenDiff;
    const aHV = HV_KEYWORDS.some(k => an.toLowerCase().includes(k)) ? 0 : 1;
    const bHV = HV_KEYWORDS.some(k => bn.toLowerCase().includes(k)) ? 0 : 1;
    return aHV - bHV;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Classify a 429 error: 'daily' | 'perminute'
 * If any violation has a daily quota ID → treat as daily exhausted.
 */
function classify429(errData) {
  const violations = errData?.error?.details
    ?.find(d => d['@type']?.includes('QuotaFailure'))?.violations || [];
  const isDaily = violations.some(v =>
    v.quotaId?.toLowerCase().includes('perday') ||
    v.quotaId?.toLowerCase().includes('per_day')
  );
  return isDaily ? 'daily' : 'perminute';
}

/**
 * Extract retry delay in ms from API error response
 */
function extractRetryMs(errData, fallback = 20000) {
  const retryInfo = errData?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
  if (retryInfo?.retryDelay) {
    const sec = parseFloat(retryInfo.retryDelay.replace(/[^0-9.]/g, ''));
    if (!isNaN(sec)) return Math.ceil(sec * 1000) + 2000;
  }
  return fallback;
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Generate domain names using Gemini AI.
 * Tries multiple models and auto-retries on per-minute rate limits.
 * @param {string} geminiKey
 * @param {string} newsText
 * @param {Object} options - { maxWords, tld, count, mode }
 */
export async function generateDomainsWithAI(geminiKey, newsText, options = {}) {
  const { tld = '.com', count = 10, mode = 'GEO' } = options;

  if (!geminiKey?.trim()) throw new Error('Gemini API key is required');
  if (!canUseAPI('gemini')) throw new Error('Gemini daily quota reached — resets tomorrow');

  // Use fallback if news is too short
  const effectiveNews = (newsText && newsText.length >= 100)
    ? newsText : FALLBACK_KEYWORDS;

  const prompt = buildPrompt(effectiveNews, { tld, count, mode });

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 800 }
  };

  // Try each model in order
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const MAX_RETRIES = 1; // one retry per model on per-minute limits

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let resp, errData;

      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      } catch (networkErr) {
        throw new Error('Network error: ' + networkErr.message);
      }

      // ── 429 handling ──────────────────────────────────────────────────────
      if (resp.status === 429) {
        errData = await resp.json().catch(() => ({}));
        const kind = classify429(errData);

        if (kind === 'daily') {
          // Daily limit hit on this model → try next model
          console.warn(`Daily quota exhausted for ${model}, trying next model...`);
          break; // break inner loop → continue to next model
        }

        // Per-minute limit → wait and retry (once)
        if (attempt < MAX_RETRIES) {
          const waitMs = extractRetryMs(errData, 20000);
          console.warn(`Rate limit on ${model}, waiting ${Math.ceil(waitMs/1000)}s...`);
          await sleep(waitMs);
          continue;
        }

        // Per-minute limit, retries exhausted → try next model
        console.warn(`Per-minute limit persists on ${model}, trying next model...`);
        break;
      }

      // ── Other HTTP errors ─────────────────────────────────────────────────
      if (!resp.ok) {
        errData = await resp.json().catch(() => ({}));
        const msg = errData?.error?.message || `Gemini error ${resp.status}`;
        // Don't retry auth errors
        if (resp.status === 401 || resp.status === 403) {
          throw new Error('Invalid Gemini API key — please check your key');
        }
        throw new Error(msg);
      }

      // ── Success ───────────────────────────────────────────────────────────
      const data = await resp.json();
      incrementQuota('gemini');

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let jsonStr = text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      let raw;
      try { raw = JSON.parse(jsonStr); } catch {
        throw new Error('AI returned invalid JSON. Please try again.');
      }
      if (!Array.isArray(raw)) throw new Error('Unexpected AI response format');

      const validated = raw.map(d => validateDomain(d, tld)).filter(Boolean);
      const seen = new Set();
      const unique = validated.filter(d => {
        if (seen.has(d.domain)) return false;
        seen.add(d.domain);
        return true;
      });

      return rankDomains(unique).slice(0, count).map(d => ({
        domain: d.domain,
        name: d.domain,
        reason: d.reason,
        available: null
      }));
    }
    // end inner retry loop — continue to next model
  }

  // All models exhausted
  throw new Error(
    'Free tier daily quota exhausted for all Gemini models. ' +
    'Please wait until tomorrow or add billing at https://ai.google.dev'
  );
}
