// campaignManager.js - Campaign Management System with localStorage Persistence
import { $, $$ } from './utils.js';

// ============================================================
// STATE & CONSTANTS
// ============================================================
const STORAGE_KEY = 'email_campaigns';
let campaigns = [];
let currentCampaignId = null;

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
    messages: data.messages !== undefined ? data.messages : campaign.messages
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
  
  // Generate email preview
  const subject = EMAIL_TEMPLATE.subject.replace('{{domain}}', campaign.domain);
  const body = EMAIL_TEMPLATE.body
    .replace('{{domain}}', campaign.domain)
    .replace('{{price}}', campaign.price || 'N/A');
  
  $('#previewSubjectLine').textContent = subject;
  $('#previewEmailBody').textContent = body;
  
  // Close list modal and open details modal
  closeModal('#campaignsListModal');
  openModal('#campaignDetailsModal');
}

export function openEditCampaign(id) {
  const campaign = getCampaignById(id);
  if (!campaign) return;
  
  currentCampaignId = id;
  
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
  
  $('#campaignModalTitle').textContent = 'Edit Campaign';
  
  closeModal('#campaignDetailsModal');
  openModal('#campaignModalOverlay');
}

export function generateGmailLink(campaign) {
  const subject = encodeURIComponent(EMAIL_TEMPLATE.subject.replace('{{domain}}', campaign.domain));
  const body = encodeURIComponent(EMAIL_TEMPLATE.body
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
    
    const data = {
      name: $('#campaignName').value.trim(),
      domain: $('#campaignDomain').value.trim(),
      email: $('#campaignEmail').value.trim(),
      price: $('#campaignPrice').value.trim(),
      backlinks: $('#campaignBacklinks').value.trim(),
      cpc: $('#campaignCpc').value.trim(),
      status: $('#campaignStatus').value,
      notes: $('#campaignNotes').value.trim()
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
      const url = generateGmailLink(campaign);
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
  fillCampaignFromDomain: window.fillCampaignFromDomain
};
