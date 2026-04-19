// components/dropdown.js — Custom select dropdown logic with portal rendering
// Global dropdown root container (created on demand)
let dropdownRoot = null;

function getDropdownRoot() {
  if (!dropdownRoot) {
    dropdownRoot = document.getElementById('dropdown-root');
    if (!dropdownRoot) {
      dropdownRoot = document.createElement('div');
      dropdownRoot.id = 'dropdown-root';
      dropdownRoot.style.position = 'fixed';
      dropdownRoot.style.top = '0';
      dropdownRoot.style.left = '0';
      dropdownRoot.style.width = '100%';
      dropdownRoot.style.height = '100%';
      dropdownRoot.style.pointerEvents = 'none';
      dropdownRoot.style.zIndex = '9999';
      document.body.appendChild(dropdownRoot);
    }
  }
  return dropdownRoot;
}

// Track active dropdown for closing and repositioning
let activeDropdown = null;

function positionDropdown(dropdownEl, trigger) {
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Position below trigger
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 4;

  // Ensure not going off right edge
  const dropdownWidth = rect.width;
  if (left + dropdownWidth > vw - 10) {
    left = vw - dropdownWidth - 10;
  }
  if (left < 10) left = 10;

  dropdownEl.style.position = 'absolute';
  dropdownEl.style.top = top + 'px';
  dropdownEl.style.left = left + 'px';
  dropdownEl.style.width = rect.width + 'px';

  // Check if dropdown would go off bottom of viewport
  requestAnimationFrame(() => {
    const dropdownHeight = dropdownEl.scrollHeight;
    const spaceBelow = vh - rect.bottom - 10;
    
    // If not enough space below, position above
    if (dropdownHeight > spaceBelow && rect.top - dropdownHeight - 6 > 10) {
      dropdownEl.style.top = (rect.top + window.scrollY - dropdownHeight - 6) + 'px';
    }
  });
}

export function initCustomSelects() {
  document.querySelectorAll('.custom-select').forEach(sel => {
    const trigger = sel.querySelector('.custom-select-trigger');
    const dropdown = sel.querySelector('.custom-select-dropdown');
    if (!trigger || !dropdown) return;

    // Move dropdown to global root for proper stacking
    const dropdownRoot = getDropdownRoot();
    
    // Store original parent for cleanup
    dropdown.dataset.parentId = sel.id || sel.className;
    
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = sel.classList.contains('open');
      
      // Close any open dropdown first
      closeAllDropdowns();
      
      if (!wasOpen) {
        // Clone dropdown content to global root
        const portalDropdown = dropdown.cloneNode(true);
        portalDropdown.classList.add('dropdown-portal');
        portalDropdown.style.display = 'block';
        portalDropdown.dataset.targetSelector = '.' + sel.className.split(' ').join('.');
        
        // Remove ID to avoid duplicates
        portalDropdown.removeAttribute('id');
        
        dropdownRoot.appendChild(portalDropdown);
        
        // Position the portal dropdown
        positionDropdown(portalDropdown, trigger);
        
        // Open the original dropdown for styling
        sel.classList.add('open');
        
        // Store reference to portal dropdown
        activeDropdown = {
          original: dropdown,
          portal: portalDropdown,
          select: sel,
          trigger: trigger
        };
        
        // Click handler for portal dropdown options
        portalDropdown.querySelectorAll('.select-option').forEach(opt => {
          opt.addEventListener('click', () => {
            // Update original dropdown state
            sel.querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            const txt = sel.querySelector('.selected-text');
            if (txt) txt.textContent = opt.textContent;
            sel.dataset.value = opt.dataset.value;
            
            // Close dropdown
            closeAllDropdowns();
            
            // Dispatch change event
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          });
        });
      }
    });

    // Original option handlers (for non-portal fallback)
    dropdown.querySelectorAll('.select-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (!activeDropdown) {
          sel.querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          const txt = sel.querySelector('.selected-text');
          if (txt) txt.textContent = opt.textContent;
          sel.classList.remove('open');
          sel.dataset.value = opt.dataset.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (activeDropdown) {
      const { select, portal } = activeDropdown;
      if (!select.contains(e.target) && !portal.contains(e.target)) {
        closeAllDropdowns();
      }
    } else {
      document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
    }
  });
}

function closeAllDropdowns() {
  if (activeDropdown) {
    activeDropdown.select.classList.remove('open');
    if (activeDropdown.portal && activeDropdown.portal.parentNode) {
      activeDropdown.portal.remove();
    }
    activeDropdown = null;
  }
  document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
  const portalDropdowns = document.querySelectorAll('.dropdown-portal');
  portalDropdowns.forEach(pd => pd.remove());
}

// Close dropdown on scroll
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (activeDropdown) {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      closeAllDropdowns();
    }, 50);
  }
}, { passive: true });

// Close dropdown on resize
window.addEventListener('resize', () => {
  closeAllDropdowns();
});

export function getSelectValue(id) {
  const sel = document.getElementById(id);
  if (!sel) return '';
  const active = sel.querySelector('.select-option.active');
  return active ? active.dataset.value : '';
}

export function setSelectValue(id, value) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.querySelectorAll('.select-option').forEach(o => {
    const isActive = o.dataset.value === value;
    o.classList.toggle('active', isActive);
  });
  const txt = sel.querySelector('.selected-text');
  if (txt) {
    const active = sel.querySelector('.select-option.active');
    if (active) txt.textContent = active.textContent;
  }
  sel.dataset.value = value;
}
