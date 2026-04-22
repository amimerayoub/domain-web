// campaignManager.js - Campaign Management System with localStorage Persistence
import { $, $$ } from './utils.js';

// ============================================================
// STATE & CONSTANTS
// ============================================================
const STORAGE_KEY = 'email_campaigns';
let campaigns = [];
let currentCampaignId = null;

// Global reference for email tool synchronization
export let currentCampaign = null;

// Email template with multiple variants support
const EMAIL_TEMPLATE = {
  subjects: [
    'Domain available for your business',
    'Quick question about {{domain}}'
  ],
  messages: [
    `Hello,

I own the domain {{domain}} which could be a strong fit for your business.

Price: {{price}}

Let me know if you're interested.`
  ]
};

// ============================================================
// LOCAL STORAGE FUNCTIONS
// ============================================================

export function loadCampaigns() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    campaigns = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading campaigns:', e);
    campaigns = [];
  }
  return campaigns;
}

export function saveCampaigns() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
    return true;
  } catch (e) {
    console.error('Error saving campaigns:', e);
    return false;
  }
}

export function getCampaignById(id) {
  return campaigns.find(c => c.id === id);
}

export function deleteCampaignById(id) {
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx >= 0) {
    campaigns.splice(idx, 1);
    saveCampaigns();
    return true;
  }
  return false;
}

// ============================================================
// CAMPAIGN CRUD
// ============================================================

export function createCampaign(data) {
  const campaign = {
    id: Date.now().toString(),
    name: data.name || '',
    domain: data.domain || '',
    email: data.email || '',
    price: data.price || '',
    backlinks: data.backlinks || '',
    cpc: data.cpc || '',
    status: data.status || 'draft',
    notes: data.notes || '',
    subjects: data.subjects || [...EMAIL_TEMPLATE.subjects],
    messages: data.messages || [...EMAIL_TEMPLATE.messages],
    emails: data.emails || [],
    createdAt: new Date().toISOString()
  };
  
  campaigns.unshift(campaign);
  saveCampaigns();
  return campaign;
}

export function updateCampaign(id, data) {
  const campaign = getCampaignById(id);
  if (!campaign) return null;
  
  Object.assign(campaign, {
    name: data.name !== undefined ? data.name : campaign.name,
    domain: data.domain !== undefined ? data.domain : campaign.domain,
    email: data.email !== undefined ? data.email : campaign.email,
    price: data.price !== undefined ? data.price : campaign.price,
    backlinks: data.backlinks !== undefined ? data.backlinks : campaign.backlinks,
    cpc: data.cpc !== undefined ? data.cpc : campaign.cpc,
    status: data.status !== undefined ? data.status : campaign.status,
    notes: data.notes !== undefined ? data.notes : campaign.notes,
    subjects: data.subjects !== undefined ? data.subjects : campaign.subjects,
    messages: data.messages !== undefined ? data.messages : campaign.messages,
    emails: data.emails !== undefined ? data.emails : campaign.emails
  });
  
  saveCampaigns();
  return campaign;
}

// ============================================================
// UI FUNCTIONS
// ============================================================

export function openModal(modalId) {
  const modal = $(modalId);
  if (modal) {
    modal.style.display = 'flex';
    // Trigger reflow for animation
    modal.offsetHeight;
    modal.classList.add('open');
  }
}

export function closeModal(modalId) {
  const modal = $(modalId);
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 200);
  }
}

export function showSaveNotification() {
  const notif = $('#saveNotification');
  if (notif) {
    notif.style.display = 'block';
    setTimeout(() => {
      notif.style.display = 'none';
    }, 2000);
  }
}

export function renderCampaignQuickList() {
  const preview = $('#campaignListPreview');
  const quickList = $('#campaignQuickList');
  const countBadge = $('#campaignCountBadge');
  
  if (!preview || !quickList || !countBadge) return;
  
  if (campaigns.length === 0) {
    preview.style.display = 'none';
    return;
  }
  
  preview.style.display = 'block';
  countBadge.textContent = campaigns.length;
  
  // Show last 3 campaigns
  const recent = campaigns.slice(0, 3);
  quickList.innerHTML = recent.map(c => `
    <div class="campaign-item-card" data-campaign-id="${c.id}">
      <div class="campaign-item-info">
        <div class="campaign-item-name">${escapeHtml(c.name)}</div>
        <div class="campaign-item-domain">${escapeHtml(c.domain)}</div>
      </div>
      <span class="campaign-status-badge campaign-status-${c.status}">${c.status}</span>
    </div>
  `).join('');
  
  // Add click handlers
  $$('#campaignQuickList .campaign-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-campaign-id');
      openCampaignDetails(id);
    });
  });
}

export function renderCampaignsList() {
  const content = $('#campaignsListContent');
  const noMsg = $('#noCampaignsMsg');
  
  if (!content) return;
  
  if (campaigns.length === 0) {
    content.style.display = 'none';
    if (noMsg) noMsg.style.display = 'block';
    return;
  }
  
  if (noMsg) noMsg.style.display = 'none';
  content.style.display = 'flex';
  
  content.innerHTML = campaigns.map(c => `
    <div class="campaign-item-card" data-campaign-id="${c.id}">
      <div class="campaign-item-info">
        <div class="campaign-item-name">${escapeHtml(c.name)}</div>
        <div class="campaign-item-domain">${escapeHtml(c.domain)} • ${escapeHtml(c.email)}</div>
      </div>
      <div class="campaign-item-meta">
        ${c.price ? `<span style="font-size:.75rem;font-weight:600;color:var(--accent)">${escapeHtml(c.price)}</span>` : ''}
        <span class="campaign-status-badge campaign-status-${c.status}">${c.status}</span>
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  $$('#campaignsListContent .campaign-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-campaign-id');
      openCampaignDetails(id);
    });
  });
}

export function openCampaignDetails(id) {
  const campaign = getCampaignById(id);
  if (!campaign) return;
  
  currentCampaignId = id;
  currentCampaign = campaign; // Set global reference
  
  // Fill details
  $('#detailCampaignName').textContent = campaign.name;
  $('#detailDomain').textContent = campaign.domain;
  $('#detailEmail').textContent = campaign.email;
  $('#detailPrice').textContent = campaign.price || '-';
  
  const statusEl = $('#detailStatus');
  statusEl.textContent = campaign.status;
  statusEl.className = `campaign-status-badge campaign-status-${campaign.status}`;
  
  $('#detailBacklinks').textContent = campaign.backlinks || '-';
  $('#detailCpc').textContent = campaign.cpc || '-';
  
  // Notes
  const notesWrap = $('#detailNotesWrap');
  const notesEl = $('#detailNotes');
  if (campaign.notes) {
    notesWrap.style.display = 'block';
    notesEl.textContent = campaign.notes;
  } else {
    notesWrap.style.display = 'none';
  }
  
  // Generate email preview using first subject/message or defaults
  const subjects = campaign.subjects && campaign.subjects.length ? campaign.subjects : EMAIL_TEMPLATE.subjects;
  const messages = campaign.messages && campaign.messages.length ? campaign.messages : EMAIL_TEMPLATE.messages;
  
  const subject = (subjects[0] || '').replace('{{domain}}', campaign.domain).replace('{{price}}', campaign.price || 'N/A');
  const body = (messages[0] || '')
    .replace('{{domain}}', campaign.domain)
    .replace('{{price}}', campaign.price || 'N/A');
  
  $('#previewSubjectLine').textContent = subject;
  $('#previewEmailBody').textContent = body;
  
  // Close list modal and open details modal
  closeModal('#campaignsListModal');
  openModal('#campaignDetailsModal');
}

// Load campaign data into email tool UI
export function loadCampaignIntoEmailTool(id) {
  const campaign = getCampaignById(id);
  if (!campaign) return null;
  
  currentCampaignId = id;
  currentCampaign = campaign;
  
  // Load emails into contacts
  const emailState = window.emailState || {};
  if (emailState.contacts && Array.isArray(campaign.emails)) {
    emailState.contacts = [...campaign.emails];
  }
  
  // Load subjects
  if (campaign.subjects && campaign.subjects.length) {
    const subjectsInput = $('#multipleSubjectsInput');
    if (subjectsInput) {
      subjectsInput.value = campaign.subjects.join('\n');
    }
  }
  
  // Load messages
  if (campaign.messages && campaign.messages.length) {
    const messagesInput = $('#multipleMessagesInput');
    if (messagesInput) {
      messagesInput.value = campaign.messages.join('\n\n---\n\n');
    }
  }
  
  // Trigger UI updates for email tool
  if (window.updateEmailToolUI) {
    window.updateEmailToolUI();
  }
  
  return campaign;
}

export function openEditCampaign(id) {
  const campaign = getCampaignById(id);
  if (!campaign) return;
  
  currentCampaignId = id;
  currentCampaign = campaign;
  
  // Fill form
  $('#campaignId').value = campaign.id;
  $('#campaignName').value = campaign.name;
  $('#campaignDomain').value = campaign.domain;
  $('#campaignEmail').value = campaign.email;
  $('#campaignPrice').value = campaign.price;
  $('#campaignBacklinks').value = campaign.backlinks;
  $('#campaignCpc').value = campaign.cpc;
  $('#campaignStatus').value = campaign.status;
  $('#campaignNotes').value = campaign.notes;
  
  // Load subjects and messages into form (as joined text for textarea)
  if (campaign.subjects && campaign.subjects.length) {
    // Store in a hidden field or data attribute for later use
    $('#campaignForm').dataset.subjects = JSON.stringify(campaign.subjects);
  }
  if (campaign.messages && campaign.messages.length) {
    $('#campaignForm').dataset.messages = JSON.stringify(campaign.messages);
  }
  
  $('#campaignModalTitle').textContent = 'Edit Campaign';
  
  closeModal('#campaignDetailsModal');
  openModal('#campaignModalOverlay');
}

export function generateGmailLink(campaign, subjectIdx = 0, messageIdx = 0) {
  const subjects = campaign.subjects && campaign.subjects.length ? campaign.subjects : EMAIL_TEMPLATE.subjects;
  const messages = campaign.messages && campaign.messages.length ? campaign.messages : EMAIL_TEMPLATE.messages;
  
  const subjectTemplate = subjects[subjectIdx % subjects.length] || subjects[0];
  const messageTemplate = messages[messageIdx % messages.length] || messages[0];
  
  const subject = encodeURIComponent(subjectTemplate.replace('{{domain}}', campaign.domain).replace('{{price}}', campaign.price || 'N/A'));
  const body = encodeURIComponent(messageTemplate
    .replace('{{domain}}', campaign.domain)
    .replace('{{price}}', campaign.price || 'N/A'));
  
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(campaign.email)}&su=${subject}&body=${body}`;
}

// ============================================================
// UTILS
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// INITIALIZATION
// ============================================================

export function initCampaignManager() {
  loadCampaigns();
  
  // Create Campaign button
  const btnCreate = $('#btnCreateCampaign');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      currentCampaignId = null;
      $('#campaignForm').reset();
      $('#campaignId').value = '';
      $('#campaignModalTitle').textContent = 'Create Campaign';
      openModal('#campaignModalOverlay');
    });
  }
  
  // View Campaigns button
  const btnView = $('#btnViewCampaigns');
  if (btnView) {
    btnView.addEventListener('click', () => {
      renderCampaignsList();
      openModal('#campaignsListModal');
    });
  }
  
  // Close modal buttons
  $('#btnCloseCampaignModal')?.addEventListener('click', () => closeModal('#campaignModalOverlay'));
  $('#btnCancelCampaign')?.addEventListener('click', () => closeModal('#campaignModalOverlay'));
  $('#btnCloseDetailsModal')?.addEventListener('click', () => closeModal('#campaignDetailsModal'));
  $('#btnCloseListModal')?.addEventListener('click', () => closeModal('#campaignsListModal'));
  
  // Create first campaign button
  $('#btnCreateFirstCampaign')?.addEventListener('click', () => {
    closeModal('#campaignsListModal');
    currentCampaignId = null;
    $('#campaignForm').reset();
    $('#campaignId').value = '';
    $('#campaignModalTitle').textContent = 'Create Campaign';
    openModal('#campaignModalOverlay');
  });
  
  // Form submit
  $('#campaignForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Parse subjects from textarea if in email tool context, or use stored data
    let subjects = [];
    let messages = [];
    
    // Try to get subjects/messages from form dataset (when editing)
    if ($('#campaignForm').dataset.subjects) {
      try {
        subjects = JSON.parse($('#campaignForm').dataset.subjects);
      } catch (err) { subjects = []; }
    }
    if ($('#campaignForm').dataset.messages) {
      try {
        messages = JSON.parse($('#campaignForm').dataset.messages);
      } catch (err) { messages = []; }
    }
    
    const data = {
      name: $('#campaignName').value.trim(),
      domain: $('#campaignDomain').value.trim(),
      email: $('#campaignEmail').value.trim(),
      price: $('#campaignPrice').value.trim(),
      backlinks: $('#campaignBacklinks').value.trim(),
      cpc: $('#campaignCpc').value.trim(),
      status: $('#campaignStatus').value,
      notes: $('#campaignNotes').value.trim(),
      subjects: subjects.length ? subjects : undefined,
      messages: messages.length ? messages : undefined
    };
    
    if (currentCampaignId) {
      updateCampaign(currentCampaignId, data);
    } else {
      createCampaign(data);
    }
    
    showSaveNotification();
    renderCampaignQuickList();
    
    setTimeout(() => {
      closeModal('#campaignModalOverlay');
    }, 500);
  });
  
  // Edit campaign button
  $('#btnEditCampaign')?.addEventListener('click', () => {
    if (currentCampaignId) {
      openEditCampaign(currentCampaignId);
    }
  });
  
  // Delete campaign button
  $('#btnDeleteCampaign')?.addEventListener('click', () => {
    if (currentCampaignId && confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaignById(currentCampaignId);
      closeModal('#campaignDetailsModal');
      renderCampaignQuickList();
      renderCampaignsList();
    }
  });
  
  // Send via Gmail button
  $('#btnSendGmail')?.addEventListener('click', () => {
    const campaign = getCampaignById(currentCampaignId);
    if (campaign) {
      const url = generateGmailLink(campaign, 0, 0);
      window.open(url, '_blank');
    }
  });
  
  // Auto-fill from domain data (if available from generator)
  window.fillCampaignFromDomain = function(domainData) {
    currentCampaignId = null;
    $('#campaignForm').reset();
    
    if (domainData.domain) $('#campaignDomain').value = domainData.domain;
    if (domainData.cpc) $('#campaignCpc').value = domainData.cpc;
    if (domainData.backlinks) $('#campaignBacklinks').value = domainData.backlinks;
    
    $('#campaignModalTitle').textContent = 'Create Campaign';
    openModal('#campaignModalOverlay');
  };
  
  // Export loadCampaignIntoEmailTool for use by email tool
  window.loadCampaignIntoEmailTool = loadCampaignIntoEmailTool;
  window.getCurrentCampaign = () => currentCampaign;
  
  // Initial render
  renderCampaignQuickList();
}

// Export for external use
window.campaignManager = {
  loadCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaignById,
  getCampaignById,
  openCampaignDetails,
  openEditCampaign,
  loadCampaignIntoEmailTool,
  fillCampaignFromDomain: window.fillCampaignFromDomain,
  getCurrentCampaign: () => currentCampaign
};
