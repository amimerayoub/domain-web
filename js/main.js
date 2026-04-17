// main.js — App init + navigation + event wiring
import { $, $$, cap, sanitizeInput, extractKeywords, debounce } from './utils.js';
import { loadData } from './dataLoader.js';
import { genState, generateGeo, generateKeyword, generatePattern, generateBrandable, generateNumeric, generateSuggestor, generateWordlist } from './generators.js';
import { clearResults, showLoading, renderResults, renderBulkResults, renderExtractedResults, renderAnalyzerResults, showFilterControls, toast, copyText, setButtonState, uiState, applyFilterSort } from './ui.js';
import { initCustomSelects, getSelectValue } from '../components/dropdown.js';
import { closeAllActionMenus } from '../components/action-menu.js';
import { initFavorites, openFavoritesPanel, setFavoritesChangeListener, getFavoritesCount, isFavorite, toggleFavorite } from './favorites.js';
import { analyzeDomains, filterDomains, detectMode } from './domainAnalyzer.js';
import { emailState, parseCSVText, parsePastedEmails, cleanContacts, startCampaign, pauseCampaign, resumeCampaign, stopCampaign, resetCampaign, generatePreview, getDelay } from './emailTool.js';
import { generateDomainNews, clearCache } from '../services/newsGenOrchestrator.js';
import { loadAllApiKeys, saveAllApiKeys, loadAiProvider, saveAiProvider } from '../services/apiSettings.js';

// State
const state = {
  activeTool: 'home',
  domains: [],
  limit: 50,
  smartMode: true
};

// Gen Domain News state
const genNewsState = {
  mode: 'GEO',       // GEO | BRANDABLE | PATTERN | HYBRID
  aiProvider: 'auto' // gemini | grok | auto
};

const GEN_MODE_HINTS = {
  GEO:       '<strong>GEO:</strong> City + Keyword combinations — targeted local service domains',
  BRANDABLE: '<strong>BRANDABLE:</strong> Short startup-style names with creative prefixes/suffixes',
  PATTERN:   '<strong>PATTERN:</strong> Pronounceable CVC/CVVC letter patterns — unique invented names',
  HYBRID:    '<strong>HYBRID:</strong> Mix of brandable + pattern — e.g. ZentroHub, NexviaLabs'
};

const AI_PROVIDER_HINTS = {
  auto:   'Auto: tries Gemini first, switches to Grok automatically if unavailable',
  gemini: 'Gemini only: uses Google Gemini API exclusively for generation',
  grok:   'Grok only: uses xAI Grok API exclusively for generation'
};

const titles = {
  home: 'AI Domain Generator',
  geo: 'Geo Domain Generator', keyword: 'Keyword Domain Generator',
  pattern: 'Pattern Domain Generator', brandable: 'Brandable Name Generator',
  numeric: 'Numeric Domain Generator', suggestor: 'Domain Suggestor',
  wordlist: 'WordList Combiner', analyzer: 'Smart Domain Analyzer',
  emailtool: 'Smart Email Tool',
  bulkcheck: 'Bulk Domain Checker',
  extractor: 'Domain Extractor', texttools: 'Text Tools', emailextractor: 'Email Extractor',
  newsdomain: 'Gen Domain News'
};

// Tools that show filter controls
const toolsWithFilters = ['geo', 'keyword', 'pattern', 'brandable', 'numeric', 'suggestor', 'wordlist', 'newsdomain'];

// ==================== LETTER GRIDS ====================
function buildLetterGrid(container, letters, selected, type) {
  container.innerHTML = '';
  letters.forEach(l => {
    const btn = document.createElement('button');
    btn.className = 'letter-btn' + (selected.includes(l) ? ' selected' : '');
    btn.textContent = l.toUpperCase();
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      if (type === 'C') {
        if (btn.classList.contains('selected') && !genState.selectedConsonants.includes(l)) genState.selectedConsonants.push(l);
        else genState.selectedConsonants = genState.selectedConsonants.filter(x => x !== l);
      } else {
        if (btn.classList.contains('selected') && !genState.selectedVowels.includes(l)) genState.selectedVowels.push(l);
        else genState.selectedVowels = genState.selectedVowels.filter(x => x !== l);
      }
    });
    container.appendChild(btn);
  });
}

// ==================== NAVIGATION ====================
function switchTool(tool) {
  if (state.activeTool !== tool) clearResults();
  state.activeTool = tool;
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tool === tool));
  $$('.tool-panel').forEach(p => {
    const isActive = p.id === tool + '-panel';
    p.classList.toggle('active', isActive);
  });
  const nt = $('#navbarTitle');
  if (nt) nt.textContent = titles[tool] || 'AI Domain Generator';
  
  // Show/hide results section based on tool
  const resultsSection = $('#resultsSection');
  if (resultsSection) {
    if (tool === 'home') {
      resultsSection.classList.remove('visible');
    } else {
      resultsSection.classList.add('visible');
    }
  }
  
  // Update navbar title visibility for home
  const navbarTitle = $('#navbarTitle');
  if (navbarTitle) {
    if (tool === 'home') {
      navbarTitle.style.display = 'none';
    } else {
      navbarTitle.style.display = '';
    }
  }
  
  showFilterControls(toolsWithFilters.includes(tool));
}

// ==================== GENERATION HANDLERS ====================
function handleGenerate(type) {
  const btn = event.currentTarget;
  setButtonState(btn, true);
  showLoading(true);

  setTimeout(() => {
    try {
      let domains = [];
      switch (type) {
        case 'geo': {
          const kw = sanitizeInput($('#geoKeyword').value.trim());
          const custom = sanitizeInput($('#geoCustom').value.trim());
          domains = generateGeo({
            keyword: kw, custom,
            locationType: getSelectValue('geoLocationType') || 'us-cities',
            sortBy: getSelectValue('geoSortBy') || 'population',
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'keyword': {
          const input = sanitizeInput($('#kwInput').value.trim());
          if (!input) { toast('Enter at least one keyword'); setButtonState(btn, false); showLoading(false); return; }
          domains = generateKeyword({
            keywords: input.split(',').map(k => k.trim()).filter(k => k),
            category: getSelectValue('kwCategory') || 'all',
            usePrefix: $('#kwPrefix').checked,
            useSuffix: $('#kwSuffix').checked,
            useCategoryKws: $('#kwCategoryKws').checked,
            useCombine: $('#kwCombine').checked,
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'pattern': {
          const pattern = $('#patternInput').value.trim().toUpperCase();
          if (!pattern || !/^[CV]+$/.test(pattern)) { toast('Enter a valid pattern (C and V only)'); setButtonState(btn, false); showLoading(false); return; }
          domains = generatePattern({
            pattern,
            tld: getSelectValue('patternTld') || '.com',
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'brandable': {
          domains = generateBrandable({
            base: sanitizeInput($('#brandInput').value.trim()),
            maxLen: parseInt($('#brandLength').value) || 10,
            usePrefix: $('#brPrefix').checked,
            useSuffix: $('#brSuffix').checked,
            useBoth: $('#brBoth').checked,
            useRandom: $('#brRandom').checked,
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'numeric': {
          const lenBtn = $('.len-btn.active');
          domains = generateNumeric({
            keyword: sanitizeInput($('#numKeyword').value.trim()),
            numPattern: getSelectValue('numPattern') || 'random',
            numLen: lenBtn ? parseInt(lenBtn.dataset.len) : 4,
            pure: $('#numPure').checked,
            hybrid: $('#numHybrid').checked,
            reverse: $('#numReverse').checked,
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
        case 'suggestor': {
          const input = sanitizeInput($('#suggestInput').value.trim());
          if (!input) { toast('Describe your business'); setButtonState(btn, false); showLoading(false); return; }
          domains = generateSuggestor({
            input,
            limit: parseInt(getSelectValue('suggestMax') || state.limit),
            smartMode: state.smartMode
          });
          break;
        }
        case 'wordlist': {
          const listA = $('#wordListA').value.trim().split('\n').map(w => w.trim()).filter(w => w);
          const listB = $('#wordListB').value.trim().split('\n').map(w => w.trim()).filter(w => w);
          if (!listA.length || !listB.length) { toast('Enter words in both lists'); setButtonState(btn, false); showLoading(false); return; }
          domains = generateWordlist({
            listA, listB,
            separator: getSelectValue('wordlistSep') || '',
            limit: state.limit, smartMode: state.smartMode
          });
          break;
        }
      }

      state.domains = domains;
      renderResults(domains, titles[type] + ' Results', copyText);
    } catch (e) {
      console.error('Generation error:', e);
      toast('Generation failed — showing fallback');
      renderResults([], titles[type] + ' Results', copyText);
    } finally {
      setButtonState(btn, false);
      showLoading(false);
    }
  }, 300);
}

// ==================== GEN DOMAIN NEWS HANDLER ====================
async function handleGenDomains() {
  const btn = $('#btnGenDomains');
  setButtonState(btn, true);
  showLoading(true);

  try {
    // Always read from localStorage (centralized — set via Settings panel or quick-save)
    const apiKeys = loadAllApiKeys();

    // Also check gen-news panel inputs as real-time override (un-saved values)
    const overrides = {
      gemini:     $('#genNewsGeminiKey')?.value.trim(),
      mediastack: $('#genNewsMediastackKey')?.value.trim(),
      gnews:      $('#genNewsGnewsKey')?.value.trim(),
      newsapi:    $('#genNewsNewsapiKey')?.value.trim(),
      currents:   $('#genNewsCurrentsKey')?.value.trim()
    };
    Object.entries(overrides).forEach(([k, v]) => { if (v) apiKeys[k] = v; });

    if (!apiKeys.gemini && !apiKeys.grok) {
      toast('API key required — open Settings to add Gemini or Grok key');
      setButtonState(btn, false); showLoading(false); return;
    }

    clearCache();

    const result = await generateDomainNews({
      apiKeys,
      timeRange:  getSelectValue('genNewsTimeRange') || 'week',
      tld:        getSelectValue('genNewsTld') || '.com',
      maxWords:   parseInt(getSelectValue('genNewsMaxWords') || '2'),
      count:      parseInt(getSelectValue('genNewsCount') || '10'),
      query:      $('#genNewsQuery')?.value.trim() || '',
      mode:       genNewsState.mode,
      aiProvider: genNewsState.aiProvider,
      forceRefresh: true
    });

    const { domains, sources, errors, meta } = result;

    if (sources.length) toast('News from: ' + sources.join(', ') + ' — ' + domains.length + ' domains');
    else if (meta.articlesCount === 0) toast('No news APIs active — using keyword fallback');

    if (!domains.length) {
      const reason = errors[0]?.reason || 'No domains generated';
      toast(reason.length > 80 ? reason.slice(0, 80) + '...' : reason);
      showLoading(false); setButtonState(btn, false); return;
    }

    state.domains = domains;
    renderResults(domains, 'Gen Domain News (' + genNewsState.mode + ' / ' + genNewsState.aiProvider.toUpperCase() + ') Results', copyText);

  } catch (err) {
    console.error('Gen Domain News error:', err);
    const msg = err.message || '';
    let userMsg;
    if (msg.includes('daily') || msg.includes('tomorrow') || msg.includes('billing')) {
      userMsg = 'Daily quota exhausted — resets at midnight or add billing at ai.google.dev';
    } else if (msg.includes('rate limit') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      userMsg = 'Rate limit reached — please wait a minute and try again';
    } else if (msg.includes('Invalid') || msg.includes('API key')) {
      userMsg = msg;
    } else {
      userMsg = 'Generation failed: ' + (msg || 'unknown error');
    }
    toast(userMsg);
    renderResults([], 'Gen Domain News Results', copyText);
  } finally {
    setButtonState(btn, false);
    showLoading(false);
  }
}

// ==================== BULK CHECKER ====================
function handleBulkCheck() {
  const btn = $('#btnBulkCheck');
  setButtonState(btn, true);
  const input = $('#bulkInput').value.trim();
  if (!input) { toast('Enter domains to check'); setButtonState(btn, false); return; }

  const lines = input.split('\n').map(l => l.trim()).filter(l => l);
  if (!lines.length) { toast('No valid domains'); setButtonState(btn, false); return; }

  showLoading(true);
  setTimeout(() => {
    try {
      const results = lines.map(d => ({
        name: d.includes('.') ? d : d + '.com',
        available: Math.random() > 0.35
      }));
      state.domains = results;
      renderBulkResults(results);
    } catch (e) {
      console.error('Bulk check error:', e);
      toast('Check failed');
    } finally {
      setButtonState(btn, false);
      showLoading(false);
    }
  }, 600);
}

// ==================== DOMAIN EXTRACTOR ====================
function handleExtract() {
  const btn = $('#btnExtract');
  setButtonState(btn, true);
  const input = $('#extractInput').value.trim();
  if (!input) { toast('Paste text to extract from'); setButtonState(btn, false); return; }

  showLoading(true);
  setTimeout(() => {
    try {
      const regex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})/g;
      const found = new Set(); let m;
      while ((m = regex.exec(input)) !== null) found.add(m[1].toLowerCase());
      const domains = [...found];
      state.domains = domains;
      renderExtractedResults(domains, 'domain', function (btn) { copyText(domains.join('\n'), btn); });
    } catch (e) {
      console.error('Extract error:', e);
      toast('Extraction failed');
    } finally {
      setButtonState(btn, false);
      showLoading(false);
    }
  }, 400);
}

// ==================== SMART DOMAIN ANALYZER ====================
let analyzerData = { mode: 'basic', domains: [], rawInput: '', csvData: '' };

// Example CSV data for "Paste Example" button
const EXAMPLE_PASTE = `google.com
apple.com
microsoft.com
myawesomestartup.com
cloudplatform.io
airevolution.tech
smartdata.dev`;

const EXAMPLE_CSV = `Domain,LE,BL,DP,CPC,TF,CF,WBY,ABY,SG,dropped,acr
google.com,6,950000000,950000000,45,95,95,1997,1996,9900000,0,50000
apple.com,5,820000000,800000000,40,92,93,1987,1987,8500000,0,45000
microsoft.com,9,780000000,750000000,38,90,92,1991,1991,7200000,0,40000
cloudplatform.io,13,12000,8500,15,25,22,2018,2018,5400,1,150
airevolution.tech,12,5200,3800,22,18,15,2020,2020,2100,0,80
myawesomestartup.com,17,250,180,5,8,6,2023,2023,320,2,25`;

// Tab switching (only for domain analyzer, not email tool)
function initAnalyzerTabs() {
  $$('.analyzer-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.analyzer-tab[data-tab]').forEach(t => t.classList.remove('active'));
      $$('.analyzer-tab-content').forEach(c => {
        if (c.closest('#analyzer-panel')) c.classList.remove('active');
      });
      tab.classList.add('active');
      const target = $(`#tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

// CSV Upload handling
function initCSVUpload() {
  const dropZone = $('#csvDropZone');
  const fileInput = $('#csvFileInput');
  const fileInfo = $('#csvFileInfo');
  const fileNameEl = $('#csvFileName');
  const rowCountEl = $('#csvRowCount');

  if (!dropZone || !fileInput) return;

  // Click to browse
  dropZone.addEventListener('click', () => fileInput.click());

  // File selected
  fileInput.addEventListener('change', e => {
    if (e.target.files.length) handleCSVFile(e.target.files[0]);
  });

  // Drag & drop
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleCSVFile(e.dataTransfer.files[0]);
  });

  function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      analyzerData.csvData = text;
      analyzerData.rawInput = text;

      // Show file info
      const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
      dropZone.style.display = 'none';
      fileInfo.style.display = 'flex';
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (rowCountEl) rowCountEl.textContent = (lines.length - 1) + ' rows';

      // Auto-analyze
      handleAnalyze();
    };
    reader.readAsText(file);
  }
}

function handleAnalyze() {
  const btn = $('#btnAnalyze');
  let input = '';

  // Determine input source
  if (analyzerData.csvData) {
    input = analyzerData.csvData;
  } else {
    input = ($('#analyzerInput')?.value || '').trim();
  }

  if (!input) { toast('Paste domains or upload a CSV file to analyze'); return; }

  setButtonState(btn, true);
  analyzerData.rawInput = input;

  setTimeout(() => {
    try {
      const result = analyzeDomains(input);
      analyzerData.mode = result.mode;
      analyzerData.domains = result.domains;

      // Show cleaning stats if available
      const stats = result.parseStats;
      if (stats && stats.totalRows > 0) {
        if (stats.skippedRows > 0 && stats.totalRows > 1) {
          toast(`CSV cleaned: ${stats.validRows} domains from ${stats.totalRows} rows (${stats.skippedRows} skipped)`);
        } else if (stats.validRows === 0) {
          toast('No valid domains detected in the CSV');
        }
      }

      // Show mode indicator
      updateModeIndicator();

      // Show/hide advanced filters
      const filtersEl = $('#analyzerFilters');
      if (filtersEl) filtersEl.style.display = result.mode === 'advanced' ? 'flex' : 'none';

      applyAnalyzerFilters();
    } catch (e) {
      console.error('Analyze error:', e);
      toast('Analysis failed');
    } finally {
      setButtonState(btn, false);
    }
  }, 300);
}

function updateModeIndicator() {
  const indicator = $('#analyzerModeIndicator');
  const badge = $('#analyzerModeBadge');
  const count = $('#analyzerDomainCount');
  if (!indicator || !badge) return;

  indicator.style.display = 'flex';
  const isAdvanced = analyzerData.mode === 'advanced';
  badge.className = `mode-badge ${isAdvanced ? 'mode-badge-advanced' : 'mode-badge-basic'}`;
  badge.textContent = isAdvanced ? '🔴 Advanced Analysis' : '🟢 Basic Mode';
  if (count) count.textContent = analyzerData.domains.length + ' domains detected';
}

function applyAnalyzerFilters() {
  const filters = {
    availableOnly: $('#filterAvailable')?.checked || false,
    minCpc: parseFloat($('#filterMinCpc')?.value || 0),
    minAge: parseFloat($('#filterMinAge')?.value || 0),
    minScore: parseFloat($('#filterMinScore')?.value || 0),
    classification: getSelectValue('analyzerClassFilter') || 'all'
  };

  let filtered = filterDomains(analyzerData.domains, analyzerData.mode, filters);

  // Store total for filtered count display
  window._analyzerTotal = analyzerData.domains.length;

  // Apply sort
  const sort = getSelectValue('analyzerSort') || 'score';
  if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'cpc') filtered.sort((a, b) => (b.metrics?.cpc || 0) - (a.metrics?.cpc || 0));
  else if (sort === 'age') filtered.sort((a, b) => (b.metrics?.age || 0) - (a.metrics?.age || 0));
  else if (analyzerData.mode === 'advanced') filtered.sort((a, b) => (b.scores?.final || 0) - (a.scores?.final || 0));

  renderAnalyzerResults(filtered);
}

// ==================== TEXT TOOLS ====================
function initTextTools() {
  $$('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = $('#textInput').value;
      if (!input) return;
      const action = btn.dataset.action;
      let output = '';
      switch (action) {
        case 'lowercase': output = input.toLowerCase(); break;
        case 'uppercase': output = input.toUpperCase(); break;
        case 'titlecase': output = input.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase()); break;
        case 'nospace': output = input.replace(/\s+/g, ''); break;
        case 'slug': output = input.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, ''); break;
        case 'reverse': output = input.split('').reverse().join(''); break;
        case 'camelCase': output = input.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()); break;
        case 'kebab-case': output = input.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, ''); break;
      }
      $('#textOutput').value = output;
      const copyBtn = $('#btnCopyText');
      if (copyBtn) copyBtn.style.display = 'flex';
      toast('Transformed: ' + action);
    });
  });

  const copyBtn = $('#btnCopyText');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const out = $('#textOutput').value;
      if (out) copyText(out, copyBtn);
    });
  }
}

// ==================== EMAIL EXTRACTOR ====================
function handleExtractEmails() {
  const btn = $('#btnExtractEmail');
  setButtonState(btn, true);
  const input = $('#emailInput').value.trim();
  if (!input) { toast('Paste text containing emails'); setButtonState(btn, false); return; }

  showLoading(true);
  setTimeout(() => {
    try {
      const regex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const found = new Set(); let m;
      while ((m = regex.exec(input)) !== null) found.add(m[0].toLowerCase());
      const emails = [...found];
      state.domains = emails;
      renderExtractedResults(emails, 'email', function (b) { copyText(emails.join('\n'), b); });
    } catch (e) {
      console.error('Email extract error:', e);
      toast('Extraction failed');
    } finally {
      setButtonState(btn, false);
      showLoading(false);
    }
  }, 400);
}

// ==================== SMART EMAIL TOOL INIT ====================
let emailSubjectCount = 1;
let emailMsgCount = 1;

function initEmailTool() {
  // Tabs
  $$('.analyzer-tab[data-etab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const parent = tab.closest('.email-section') || tab.closest('.email-tabs');
      if (!parent) return;
      const section = tab.closest('.email-section');
      $$(section ? '.email-section .analyzer-tab' : '.analyzer-tab[data-etab]').forEach(t => {
        if (t.closest('.email-section') === section || (!section && t.dataset.etab)) t.classList.remove('active');
      });
      tab.classList.add('active');
      const targetId = 'tab-' + tab.dataset.etab;
      $$('.analyzer-tab-content').forEach(c => {
        if (c.id === targetId || (c.closest('.email-section') === section)) c.classList.remove('active');
      });
      const target = $(`#${targetId}`);
      if (target) target.classList.add('active');
    });
  });

  // CSV Upload for email
  const eDropZone = $('#emailDropZone');
  const eFileInput = $('#emailFileInput');
  const eFileInfo = $('#emailFileInfo');
  const eFileName = $('#emailFileName');
  const eRowCount = $('#emailRowCount');
  const eRemoveBtn = $('#emailRemoveBtn');

  if (eDropZone && eFileInput) {
    eDropZone.addEventListener('click', () => eFileInput.click());
    eFileInput.addEventListener('change', e => {
      if (e.target.files.length) handleEmailFile(e.target.files[0]);
    });
    eDropZone.addEventListener('dragover', ev => { ev.preventDefault(); eDropZone.classList.add('drag-over'); });
    eDropZone.addEventListener('dragleave', () => eDropZone.classList.remove('drag-over'));
    eDropZone.addEventListener('drop', ev => {
      ev.preventDefault();
      eDropZone.classList.remove('drag-over');
      if (ev.dataTransfer.files.length) handleEmailFile(ev.dataTransfer.files[0]);
    });
  }

  function handleEmailFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const contacts = parseCSVText(text);
      processEmailContacts(contacts);
      if (eFileInfo) {
        const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
        eDropZone.style.display = 'none';
        eFileInfo.style.display = 'flex';
        if (eFileName) eFileName.textContent = file.name;
        if (eRowCount) eRowCount.textContent = contacts.length + ' contacts';
      }
    };
    reader.readAsText(file);
  }

  if (eRemoveBtn) {
    eRemoveBtn.addEventListener('click', () => {
      emailState.contacts = [];
      emailState.campaign.pending = 0;
      if (eDropZone) eDropZone.style.display = '';
      if (eFileInfo) eFileInfo.style.display = 'none';
      if (eFileInput) eFileInput.value = '';
      updateEmailContactSummary();
      updateEmailTable();
      updateEmailStats();
    });
  }

  // Clear emails button
  const btnClearEmails = $('#btnClearEmails');
  if (btnClearEmails) btnClearEmails.addEventListener('click', () => {
    const ta = $('#emailPasteInput');
    if (ta) ta.value = '';
  });

  // Paste input — parse on change
  const emailPaste = $('#emailPasteInput');
  if (emailPaste) {
    emailPaste.addEventListener('input', debounce(() => {
      const text = emailPaste.value.trim();
      if (!text) {
        emailState.contacts = [];
        updateEmailContactSummary();
        updateEmailTable();
        updateEmailStats();
        return;
      }
      const contacts = parsePastedEmails(text);
      processEmailContacts(contacts);
    }, 500));
  }

  // Clear contacts
  const btnClearContacts = $('#btnClearContacts');
  if (btnClearContacts) btnClearContacts.addEventListener('click', () => {
    emailState.contacts = [];
    const ta = $('#emailPasteInput');
    if (ta) ta.value = '';
    if (eDropZone) eDropZone.style.display = '';
    if (eFileInfo) eFileInfo.style.display = 'none';
    updateEmailContactSummary();
    updateEmailTable();
    updateEmailStats();
  });

  // Add subject variation
  const btnAddSubject = $('#btnAddSubject');
  if (btnAddSubject) btnAddSubject.addEventListener('click', () => {
    emailSubjectCount++;
    const container = $('#subjectVariations');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'email-var-input';
    div.innerHTML = `<input type="text" class="email-var-field" id="subjectInput${emailSubjectCount}" placeholder="Subject variation ${emailSubjectCount}" />
      <button class="btn-action-sm email-remove-var" data-target="subjectInput${emailSubjectCount}" style="flex-shrink:0;margin-top:4px">
        <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>`;
    container.appendChild(div);
    div.querySelector('.email-remove-var').addEventListener('click', () => {
      div.remove();
      updatePreview();
    });
    div.querySelector('input').addEventListener('input', debounce(updatePreview, 300));
    updatePreview();
  });

  // Add message variation
  const btnAddMessage = $('#btnAddMessage');
  if (btnAddMessage) btnAddMessage.addEventListener('click', () => {
    emailMsgCount++;
    const container = $('#messageVariations');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'email-var-input';
    div.innerHTML = `<textarea class="email-msg-field" id="messageInput${emailMsgCount}" rows="4" placeholder="Message variation ${emailMsgCount}"></textarea>
      <button class="btn-action-sm email-remove-var" data-target="messageInput${emailMsgCount}" style="flex-shrink:0;margin-top:4px">
        <svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>`;
    container.appendChild(div);
    div.querySelector('.email-remove-var').addEventListener('click', () => {
      div.remove();
      updatePreview();
    });
    div.querySelector('textarea').addEventListener('input', debounce(updatePreview, 300));
    updatePreview();
  });

  // Variable chips — insert into active textarea
  $$('.var-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Find the focused or last active message textarea
      let ta = document.activeElement;
      if (!ta || !ta.classList.contains('email-msg-field')) {
        ta = $('#messageInput1') || $('.email-msg-field');
      }
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const text = ta.value;
        const variable = chip.dataset.var;
        ta.value = text.substring(0, start) + variable + text.substring(end);
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + variable.length;
        updatePreview();
      }
    });
  });

  // First subject/message input listeners
  const subj1 = $('#subjectInput1');
  if (subj1) subj1.addEventListener('input', debounce(updatePreview, 300));
  const msg1 = $('#messageInput1');
  if (msg1) msg1.addEventListener('input', debounce(updatePreview, 300));

  // Anti-spam toggle
  const antiSpam = $('#antiSpamToggle');
  if (antiSpam) antiSpam.addEventListener('change', () => {
    emailState.antiSpam = antiSpam.checked;
  });

  // Timing buttons
  $$('.timing-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.timing-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      emailState.timing = btn.dataset.speed;
    });
  });

  // Campaign buttons
  const btnStart = $('#btnStartCampaign');
  const btnPause = $('#btnPauseCampaign');
  const btnResume = $('#btnResumeCampaign');
  const btnStop = $('#btnStopCampaign');
  const extraBtns = $('.campaign-extra-btns');

  if (btnStart) btnStart.addEventListener('click', () => {
    // Collect subjects and messages
    collectEmailInputs();
    if (!emailState.subjects.length) { toast('Add at least one subject line'); return; }
    if (!emailState.messages.length) { toast('Add at least one message'); return; }
    if (!emailState.contacts.length) { toast('Add email contacts first'); return; }

    resetCampaign();
    emailState.contacts = cleanContacts(emailState.contacts);
    emailState.campaign.pending = emailState.contacts.length;

    btnStart.style.display = 'none';
    if (extraBtns) extraBtns.style.display = 'flex';
    if (btnPause) btnPause.style.display = '';
    if (btnResume) btnResume.style.display = 'none';

    updateEmailTable();
    updateEmailStats();

    startCampaign(
      (contact, subject, message) => {
        updateEmailTable();
        updateEmailStats();
        highlightSendingRow(contact.email);
      },
      () => {
        // Campaign complete
        btnStart.style.display = '';
        if (extraBtns) extraBtns.style.display = 'none';
        toast('Campaign complete! ' + emailState.campaign.sent + ' emails sent.');
      }
    );
  });

  if (btnPause) btnPause.addEventListener('click', () => {
    pauseCampaign();
    if (btnPause) btnPause.style.display = 'none';
    if (btnResume) btnResume.style.display = '';
    toast('Campaign paused');
  });

  if (btnResume) btnResume.addEventListener('click', () => {
    resumeCampaign(
      (contact, subject, message) => {
        updateEmailTable();
        updateEmailStats();
        highlightSendingRow(contact.email);
      },
      () => {
        btnStart.style.display = '';
        if (extraBtns) extraBtns.style.display = 'none';
        toast('Campaign complete!');
      }
    );
    if (btnPause) btnPause.style.display = '';
    if (btnResume) btnResume.style.display = 'none';
    toast('Campaign resumed');
  });

  if (btnStop) btnStop.addEventListener('click', () => {
    stopCampaign();
    btnStart.style.display = '';
    if (extraBtns) extraBtns.style.display = 'none';
    updateEmailStats();
    toast('Campaign stopped');
  });

  // Initial preview
  updatePreview();
  updateEmailContactSummary();
}

function collectEmailInputs() {
  emailState.subjects = [];
  emailState.messages = [];

  $$('.email-var-field').forEach(input => {
    const v = input.value.trim();
    if (v) emailState.subjects.push(v);
  });
  $$('.email-msg-field').forEach(input => {
    const v = input.value.trim();
    if (v) emailState.messages.push(v);
  });
}

function processEmailContacts(contacts) {
  emailState.contacts = cleanContacts(contacts);
  updateEmailContactSummary();
  updateEmailTable();
  updateEmailStats();
  updatePreview();
}

function updateEmailContactSummary() {
  const summary = $('#emailContactSummary');
  const count = $('#emailContactCount');
  if (!summary || !count) return;
  const n = emailState.contacts.length;
  if (n > 0) {
    summary.style.display = 'flex';
    count.textContent = n + ' valid contact' + (n !== 1 ? 's' : '') + ' detected';
  } else {
    summary.style.display = 'none';
  }
}

function updateEmailStats() {
  const bar = $('#emailStatsBar');
  if (!bar) return;
  const total = emailState.contacts.length;
  const sent = emailState.contacts.filter(c => c.status === 'sent').length;
  const pending = emailState.contacts.filter(c => c.status === 'pending').length;
  const failed = emailState.contacts.filter(c => c.status === 'failed').length;

  bar.style.display = total > 0 ? 'flex' : 'none';

  const elTotal = $('#emailStatTotal');
  const elSent = $('#emailStatSent');
  const elPending = $('#emailStatPending');
  const elFailed = $('#emailStatFailed');
  const elFill = $('#emailProgressFill');
  const elPct = $('#emailProgressPct');

  if (elTotal) elTotal.textContent = total;
  if (elSent) elSent.textContent = sent;
  if (elPending) elPending.textContent = pending;
  if (elFailed) elFailed.textContent = failed;
  if (elFill) elFill.style.width = (total > 0 ? Math.round(sent / total * 100) : 0) + '%';
  if (elPct) elPct.textContent = (total > 0 ? Math.round(sent / total * 100) : 0) + '%';
}

function updateEmailTable() {
  const wrap = $('#emailTableWrap');
  const body = $('#emailTableBody');
  if (!wrap || !body) return;

  if (!emailState.contacts.length) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = '';

  body.innerHTML = '';
  emailState.contacts.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.dataset.email = c.email;
    if (c.status === 'sent') tr.classList.add('sending');
    const statusCls = c.status === 'sent' ? 'email-status-sent' : c.status === 'failed' ? 'email-status-failed' : 'email-status-pending';
    const statusTxt = c.status === 'sent' ? '✅ Sent' : c.status === 'failed' ? '❌ Failed' : '⏳ Pending';
    tr.innerHTML = `
      <td class="td-email">${c.email}</td>
      <td class="td-domain">${c.domain || '-'}</td>
      <td>${c.name || '-'}</td>
      <td><span class="email-status ${statusCls}">${statusTxt}</span></td>
      <td style="font-size:.7rem;color:var(--text-tertiary)">${c.lastAction || '-'}</td>
      <td class="email-table-actions">
        ${c.status === 'failed' ? `<button class="email-tbl-btn retry-btn" data-idx="${i}" title="Retry">
          <svg viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>` : ''}
        <button class="email-tbl-btn remove-btn" data-idx="${i}" title="Remove">
          <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </td>`;
    body.appendChild(tr);
  });

  // Wire up buttons
  body.querySelectorAll('.retry-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      emailState.contacts[idx].status = 'pending';
      updateEmailTable();
      updateEmailStats();
    });
  });
  body.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      emailState.contacts.splice(idx, 1);
      updateEmailTable();
      updateEmailStats();
      updateEmailContactSummary();
    });
  });
}

function highlightSendingRow(email) {
  $$('#emailTableBody tr').forEach(tr => tr.classList.remove('sending'));
  const row = $(`#emailTableBody tr[data-email="${email}"]`);
  if (row) row.classList.add('sending');
}

function updatePreview() {
  collectEmailInputs();
  const preview = generatePreview();
  const subjEl = $('#previewSubject');
  const bodyEl = $('#previewBody');
  if (subjEl) subjEl.textContent = preview.subject || 'Add subjects above to preview';
  if (bodyEl) bodyEl.textContent = preview.message || 'Add a message above to see the preview here...';
}

// ==================== INIT ====================
export async function initApp() {
  const loading = $('#loadingOverlay');
  if (loading) loading.classList.add('active');

  await loadData();

  // Letter grids
  const cg = $('#consonantGrid');
  const vg = $('#vowelGrid');
  if (cg) buildLetterGrid(cg, 'bcdfghjklmnpqrstvwxyz'.split(''), genState.selectedConsonants, 'C');
  if (vg) buildLetterGrid(vg, 'aeiou'.split(''), genState.selectedVowels, 'V');

  // Custom selects
  initCustomSelects();

  // Favorites system
  initFavorites();

  // Text tools
  initTextTools();

  // Navigation
  $$('.nav-item').forEach(n => {
    if (n.dataset.tool) n.addEventListener('click', e => {
      e.preventDefault();
      switchTool(n.dataset.tool);
      $('#sidebar').classList.remove('open');
      $('#sidebarOverlay').classList.remove('active');
    });
  });

  // Mobile menu
  $('#menuToggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebarOverlay').classList.toggle('active');
  });
  $('#sidebarOverlay').addEventListener('click', () => {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('active');
    closeAllActionMenus();
  });

  // Close action menus on global click
  document.addEventListener('click', e => {
    if (!e.target.closest('.domain-action-menu') && !e.target.closest('.action-panel')) {
      closeAllActionMenus();
    }
  });

  // Handle favorite toggles from cards.js rendered results
  document.addEventListener('fav-toggle', e => {
    const { domain, btn } = e.detail;
    const added = toggleFavorite(domain);
    btn.classList.toggle('active', added);
  });

  // Theme toggle
  $('#themeToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(next);
  });

  // Favorites header button
  const favHeaderBtn = $('#btnFavHeader');
  if (favHeaderBtn) {
    favHeaderBtn.addEventListener('click', () => openFavoritesPanel());
  }

  // Listen for favorites changes to update header
  setFavoritesChangeListener(() => {
    const count = getFavoritesCount();
    if (favHeaderBtn) {
      favHeaderBtn.classList.toggle('active', count > 0);
    }
  });

  // Button click ripple effect for generate buttons
  $$('.btn-generate').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--rx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      btn.style.setProperty('--ry', ((e.clientY - rect.top) / rect.height * 100) + '%');
    });
  });

  // Mode toggle
  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.smartMode = btn.dataset.mode === 'smart';
    });
  });

  // Limit selector
  $$('.limit-select').forEach(sel => {
    sel.addEventListener('change', () => {
      state.limit = parseInt(getSelectValue('resultLimit') || '50');
    });
  });

  // Niche pills
  $$('.niche-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const g = $('#geoKeyword');
      if (g) g.value = pill.dataset.niche;
    });
  });

  // Generate buttons
  const genBtns = {
    btnGeoGenerate: 'geo', btnKwGenerate: 'keyword', btnPatternGenerate: 'pattern',
    btnBrandGenerate: 'brandable', btnNumGenerate: 'numeric',
    btnSuggestGenerate: 'suggestor', btnWordlistGenerate: 'wordlist'
  };
  Object.entries(genBtns).forEach(([id, type]) => {
    const btn = $('#' + id);
    if (btn) btn.addEventListener('click', () => handleGenerate(type));
  });

  // Gen Domain News button
  const btnGenDomains = $('#btnGenDomains');
  if (btnGenDomains) btnGenDomains.addEventListener('click', handleGenDomains);

  // Save API keys button (quick save in gen-news panel)
  const btnSaveKeys = $('#btnSaveNewsKeys');
  if (btnSaveKeys) btnSaveKeys.addEventListener('click', () => {
    saveAllApiKeys({
      gemini:     $('#genNewsGeminiKey')?.value.trim() || '',
      mediastack: $('#genNewsMediastackKey')?.value.trim() || '',
      gnews:      $('#genNewsGnewsKey')?.value.trim() || '',
      newsapi:    $('#genNewsNewsapiKey')?.value.trim() || '',
      currents:   $('#genNewsCurrentsKey')?.value.trim() || ''
    });
    toast('API keys saved');
  });

  // Generation Mode selector
  $$('.gen-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gen-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      genNewsState.mode = btn.dataset.mode;
      const hintEl = $('#genModeHint');
      if (hintEl) hintEl.innerHTML = GEN_MODE_HINTS[genNewsState.mode] || '';
    });
  });

  // AI Provider selector
  $$('.ai-provider-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.ai-provider-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      genNewsState.aiProvider = btn.dataset.provider;
      saveAiProvider(genNewsState.aiProvider);
      const hintEl = $('#aiProviderHint');
      if (hintEl) hintEl.textContent = AI_PROVIDER_HINTS[genNewsState.aiProvider] || '';
    });
  });

  // Settings panel open/close
  const settingsOverlay = $('#settingsOverlay');
  const btnSettings = $('#settingsBtn');
  const btnSettingsClose = $('#settingsClose');
  if (btnSettings) btnSettings.addEventListener('click', () => settingsOverlay?.classList.add('open'));
  if (btnSettingsClose) btnSettingsClose.addEventListener('click', () => settingsOverlay?.classList.remove('open'));
  if (settingsOverlay) settingsOverlay.addEventListener('click', e => {
    if (e.target === settingsOverlay) settingsOverlay.classList.remove('open');
  });

  // Save all settings
  const btnSaveSettings = $('#btnSaveSettings');
  if (btnSaveSettings) btnSaveSettings.addEventListener('click', () => {
    const keys = {
      gemini:     $('#settingsGeminiKey')?.value.trim() || '',
      grok:       $('#settingsGrokKey')?.value.trim() || '',
      mediastack: $('#settingsMediastackKey')?.value.trim() || '',
      gnews:      $('#settingsGnewsKey')?.value.trim() || '',
      newsapi:    $('#settingsNewsapiKey')?.value.trim() || '',
      currents:   $('#settingsCurrentsKey')?.value.trim() || ''
    };
    saveAllApiKeys(keys);
    // Sync to gen-news panel inputs
    if (keys.gemini     && $('#genNewsGeminiKey'))     $('#genNewsGeminiKey').value     = keys.gemini;
    if (keys.mediastack && $('#genNewsMediastackKey')) $('#genNewsMediastackKey').value = keys.mediastack;
    if (keys.gnews      && $('#genNewsGnewsKey'))      $('#genNewsGnewsKey').value      = keys.gnews;
    if (keys.newsapi    && $('#genNewsNewsapiKey'))    $('#genNewsNewsapiKey').value    = keys.newsapi;
    if (keys.currents   && $('#genNewsCurrentsKey'))   $('#genNewsCurrentsKey').value   = keys.currents;
    toast('All API keys saved');
    settingsOverlay?.classList.remove('open');
  });

  // Get API Keys dialog
  const getKeysOverlay = $('#getKeysOverlay');
  const btnGetApiKeys = $('#btnGetApiKeys');
  const btnGetKeysClose = $('#getKeysClose');
  if (btnGetApiKeys) btnGetApiKeys.addEventListener('click', () => getKeysOverlay?.classList.add('open'));
  if (btnGetKeysClose) btnGetKeysClose.addEventListener('click', () => getKeysOverlay?.classList.remove('open'));
  if (getKeysOverlay) getKeysOverlay.addEventListener('click', e => {
    if (e.target === getKeysOverlay) getKeysOverlay.classList.remove('open');
  });
  // Close dialog on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      settingsOverlay?.classList.remove('open');
      getKeysOverlay?.classList.remove('open');
    }
  });

  // Tool buttons
  const bb = $('#btnBulkCheck'); if (bb) bb.addEventListener('click', handleBulkCheck);
  const be = $('#btnExtract'); if (be) be.addEventListener('click', handleExtract);
  const ee = $('#btnExtractEmail'); if (ee) ee.addEventListener('click', handleExtractEmails);

  // ==================== SMART EMAIL TOOL ====================
  initEmailTool();

  // Analyzer button
  const ba = $('#btnAnalyze'); if (ba) ba.addEventListener('click', handleAnalyze);

  // Analyzer tabs
  initAnalyzerTabs();

  // CSV Upload
  initCSVUpload();

  // Paste Example button
  const btnExample = $('#btnPasteExample');
  if (btnExample) btnExample.addEventListener('click', () => {
    const ta = $('#analyzerInput');
    if (ta) { ta.value = EXAMPLE_PASTE; ta.focus(); toast('Example domains pasted'); }
  });

  // Clear Input button
  const btnClear = $('#btnClearInput');
  if (btnClear) btnClear.addEventListener('click', () => {
    const ta = $('#analyzerInput');
    if (ta) { ta.value = ''; ta.focus(); }
    // Also clear CSV data
    analyzerData.csvData = '';
    analyzerData.rawInput = '';
    analyzerData.domains = [];
    const dropZone = $('#csvDropZone');
    const fileInfo = $('#csvFileInfo');
    if (dropZone) dropZone.style.display = '';
    if (fileInfo) fileInfo.style.display = 'none';
    const indicator = $('#analyzerModeIndicator');
    if (indicator) indicator.style.display = 'none';
    const results = $('#analyzerResults');
    if (results) { results.style.display = 'none'; results.innerHTML = ''; }
    const filtersEl = $('#analyzerFilters');
    if (filtersEl) filtersEl.style.display = 'none';
  });

  // CSV Remove button
  const btnRemove = $('#csvRemoveBtn');
  if (btnRemove) btnRemove.addEventListener('click', () => {
    analyzerData.csvData = '';
    analyzerData.rawInput = '';
    const dropZone = $('#csvDropZone');
    const fileInfo = $('#csvFileInfo');
    const fileInput = $('#csvFileInput');
    if (dropZone) dropZone.style.display = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (fileInput) fileInput.value = '';
    const indicator = $('#analyzerModeIndicator');
    if (indicator) indicator.style.display = 'none';
    const results = $('#analyzerResults');
    if (results) { results.style.display = 'none'; results.innerHTML = ''; }
    const filtersEl = $('#analyzerFilters');
    if (filtersEl) filtersEl.style.display = 'none';
  });

  // Handle "Send to Smart Analyzer" from any domain card
  document.addEventListener('send-to-analyzer', e => {
    const { domain } = e.detail;
    if (!domain) return;

    // Switch to analyzer panel
    switchTool('analyzer');

    // Switch to paste tab
    $$('.analyzer-tab[data-tab]').forEach(t => t.classList.remove('active'));
    $$('.analyzer-tab-content').forEach(c => {
      if (c.closest('#analyzer-panel')) c.classList.remove('active');
    });
    const pasteTab = $('.analyzer-tab[data-tab="paste"]');
    const pasteContent = $('#tab-paste');
    if (pasteTab) pasteTab.classList.add('active');
    if (pasteContent) pasteContent.classList.add('active');

    // Clear CSV data so textarea is used
    analyzerData.csvData = '';

    // Fill textarea with domain
    const ta = $('#analyzerInput');
    if (ta) {
      ta.value = domain;
      ta.focus();
      ta.select();
      // Trigger highlight animation
      ta.classList.remove('imported');
      void ta.offsetWidth; // force reflow
      ta.classList.add('imported');
      setTimeout(() => ta.classList.remove('imported'), 1300);
    }

    // Reset previous results
    const results = $('#analyzerResults');
    if (results) { results.style.display = 'none'; results.innerHTML = ''; }
    const indicator = $('#analyzerModeIndicator');
    if (indicator) indicator.style.display = 'none';
    const filtersEl = $('#analyzerFilters');
    if (filtersEl) filtersEl.style.display = 'none';

    // Show import toast
    toast('Domain imported: ' + domain);

    // Auto-run analysis after a short delay
    setTimeout(() => handleAnalyze(), 400);
  });

  // Analyzer filters
  $('#filterAvailable')?.addEventListener('change', applyAnalyzerFilters);
  $('#filterMinCpc')?.addEventListener('input', debounce(() => applyAnalyzerFilters(), 300));
  $('#filterMinAge')?.addEventListener('input', debounce(() => applyAnalyzerFilters(), 300));
  $('#filterMinScore')?.addEventListener('input', debounce(() => applyAnalyzerFilters(), 300));

  // Analyzer sort & class filter
  const aSort = $('#analyzerSort');
  if (aSort) aSort.addEventListener('change', applyAnalyzerFilters);
  const aClass = $('#analyzerClassFilter');
  if (aClass) aClass.addEventListener('change', applyAnalyzerFilters);

  const sortSel = $('#resultsSort');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      uiState.sort = getSelectValue('resultsSort') || 'default';
      applyFilterSort(state.domains, copyText);
    });
  }

  // Brand range
  const range = $('#brandLength'), rangeVal = $('#brandLengthValue');
  if (range) range.addEventListener('input', () => { if (rangeVal) rangeVal.textContent = range.value + ' letters'; });

  // Length selector
  $$('.len-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.len-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (loading) loading.classList.remove('active');
  switchTool('home');

  // Auto-load all saved API keys into all inputs
  const savedKeys = loadAllApiKeys();
  // Gen Domain News panel inputs
  if (savedKeys.gemini     && $('#genNewsGeminiKey'))     $('#genNewsGeminiKey').value     = savedKeys.gemini;
  if (savedKeys.mediastack && $('#genNewsMediastackKey')) $('#genNewsMediastackKey').value = savedKeys.mediastack;
  if (savedKeys.gnews      && $('#genNewsGnewsKey'))      $('#genNewsGnewsKey').value      = savedKeys.gnews;
  if (savedKeys.newsapi    && $('#genNewsNewsapiKey'))    $('#genNewsNewsapiKey').value    = savedKeys.newsapi;
  if (savedKeys.currents   && $('#genNewsCurrentsKey'))   $('#genNewsCurrentsKey').value   = savedKeys.currents;
  // Settings panel inputs
  if (savedKeys.gemini     && $('#settingsGeminiKey'))     $('#settingsGeminiKey').value     = savedKeys.gemini;
  if (savedKeys.grok       && $('#settingsGrokKey'))       $('#settingsGrokKey').value       = savedKeys.grok;
  if (savedKeys.mediastack && $('#settingsMediastackKey')) $('#settingsMediastackKey').value = savedKeys.mediastack;
  if (savedKeys.gnews      && $('#settingsGnewsKey'))      $('#settingsGnewsKey').value      = savedKeys.gnews;
  if (savedKeys.newsapi    && $('#settingsNewsapiKey'))    $('#settingsNewsapiKey').value    = savedKeys.newsapi;
  if (savedKeys.currents   && $('#settingsCurrentsKey'))   $('#settingsCurrentsKey').value   = savedKeys.currents;

  // Restore saved AI provider preference
  const savedProvider = loadAiProvider();
  genNewsState.aiProvider = savedProvider;
  const savedProvBtn = $('[data-provider="' + savedProvider + '"]');
  if (savedProvBtn) {
    $$('.ai-provider-btn').forEach(b => b.classList.remove('active'));
    savedProvBtn.classList.add('active');
  }

  // Tools Overview - "Use Tool" buttons
  $$('.tool-overview-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (tool) switchTool(tool);
    });
  });

  // Tools Overview - CTA button
  const btnStartUsingTools = $('#btnStartUsingTools');
  if (btnStartUsingTools) {
    btnStartUsingTools.addEventListener('click', () => {
      switchTool('geo');
    });
  }

  // Home page - Start Generating button
  const btnHomeStartGenerating = $('#btnHomeStartGenerating');
  if (btnHomeStartGenerating) {
    btnHomeStartGenerating.addEventListener('click', () => {
      switchTool('geo');
    });
  }

  // Home page - View All Tools button
  const btnHomeViewTools = $('#btnHomeViewTools');
  if (btnHomeViewTools) {
    btnHomeViewTools.addEventListener('click', () => {
      // Navigate to generators section as overview was removed
      switchTool('geo');
    });
  }
}
