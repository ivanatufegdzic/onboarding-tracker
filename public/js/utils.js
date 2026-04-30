// Shared utilities for frontend pages

// ============================================================================
// Navigation Injection
// ============================================================================

function injectNav() {
  const navRoot = document.getElementById('nav-root');
  if (!navRoot) return;

  const currentPath = window.location.pathname;
  const isActive = (path) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.includes(path)) return true;
    return false;
  };

  const navHtml = `
    <nav>
      <div class="logo">🌿 GreenerField Onboarding</div>
      <ul>
        <li><a href="/" class="${isActive('/') ? 'active' : ''}">Dashboard</a></li>
        <li><a href="/new-cohort.html" class="${isActive('new-cohort') ? 'active' : ''}">+ New Cohort</a></li>
        <li><a href="/new-hire.html" class="${isActive('new-hire') ? 'active' : ''}">+ New Hire</a></li>
        <li><a href="/settings.html" class="${isActive('settings') ? 'active' : ''}">Settings</a></li>
      </ul>
    </nav>
  `;

  navRoot.innerHTML = navHtml;
}

// ============================================================================
// API Fetch Helper
// ============================================================================

async function apiFetch(path, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const merged = {
    ...defaults,
    ...options,
    headers: {
      ...defaults.headers,
      ...(options.headers || {}),
    },
  };

  const url = `/api${path}`;
  const response = await fetch(url, merged);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Date & Time Utilities
// ============================================================================

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function daysSince(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = today - date;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isOverdue(startDate, daysFromStart) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + daysFromStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return today > date;
}

function calculateDueDate(startDate, daysFromStart) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + daysFromStart);
  return formatDate(date.toISOString());
}

// ============================================================================
// String Utilities
// ============================================================================

function getInitials(name) {
  const parts = name.trim().split(' ');
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarVariant(index) {
  const variants = ['variant-1', 'variant-2', 'variant-3', 'variant-4'];
  return variants[index % variants.length];
}

// ============================================================================
// Color & Styling Utilities
// ============================================================================

function getOwnerColor(ownerId) {
  const colors = {
    hr: 'hr',
    operations: 'operations',
    managers: 'managers',
  };
  return colors[ownerId] || 'variant-4';
}

function getOwnerInitial(ownerId) {
  const map = {
    hr: 'H',
    operations: 'O',
    managers: 'M',
  };
  return map[ownerId] || '?';
}

// ============================================================================
// Progress Bar Builder
// ============================================================================

function buildProgressBar(segments) {
  const container = document.createElement('div');
  container.className = 'progress-bar-container';

  let totalCompleted = 0;
  let totalTasks = 0;

  segments.forEach((seg) => {
    totalCompleted += seg.completed;
    totalTasks += seg.total;
  });

  if (totalTasks === 0) {
    const emptySegment = document.createElement('div');
    emptySegment.className = 'progress-segment';
    emptySegment.style.width = '100%';
    emptySegment.style.backgroundColor = '#e0e0e0';
    emptySegment.textContent = 'No tasks';
    container.appendChild(emptySegment);
    return container;
  }

  segments.forEach((seg) => {
    if (seg.total === 0) return;

    const percentage = (seg.total / totalTasks) * 100;
    const segment = document.createElement('div');
    segment.className = `progress-segment ${seg.ownerId}`;
    segment.style.width = percentage + '%';

    const completed = seg.completed;
    const total = seg.total;
    segment.textContent = total > 0 ? `${completed}/${total}` : '';

    container.appendChild(segment);
  });

  return container;
}

// ============================================================================
// UI Builders
// ============================================================================

function buildOwnerTag(ownerId, ownerName) {
  const tag = document.createElement('span');
  tag.className = `owner-tag ${getOwnerColor(ownerId)}`;
  tag.textContent = ownerName;
  return tag;
}

function buildAvatar(name, index) {
  const avatar = document.createElement('div');
  avatar.className = `avatar ${getAvatarVariant(index)}`;
  avatar.textContent = getInitials(name);
  avatar.title = name;
  return avatar;
}

function buildStatusPill(isOverdue, isOnTrack) {
  const pill = document.createElement('span');
  pill.className = 'pill';

  if (isOverdue) {
    pill.classList.add('pill-overdue');
    pill.textContent = 'Overdue';
  } else if (isOnTrack) {
    pill.classList.add('pill-on-track');
    pill.textContent = 'On Track';
  } else {
    pill.classList.add('pill-on-track');
    pill.textContent = 'In Progress';
  }

  return pill;
}

// ============================================================================
// Form Helpers
// ============================================================================

function createFormGroup(label, inputType = 'text', name = '', placeholder = '', required = true) {
  const group = document.createElement('div');
  group.className = 'form-group';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  group.appendChild(labelEl);

  let inputEl;
  if (inputType === 'textarea') {
    inputEl = document.createElement('textarea');
    inputEl.placeholder = placeholder;
  } else if (inputType === 'select') {
    inputEl = document.createElement('select');
  } else {
    inputEl = document.createElement('input');
    inputEl.type = inputType;
    inputEl.placeholder = placeholder;
  }

  inputEl.name = name;
  inputEl.required = required;
  group.appendChild(inputEl);

  return { group, input: inputEl };
}

function showToast(message, type = 'success') {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: ${type === 'success' ? '#2d6a4f' : '#dc2626'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease-in-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================================
// DOM Helpers
// ============================================================================

function ce(tag, className = '', innerHTML = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return document.querySelectorAll(selector);
}

// Call this at the top of every page
document.addEventListener('DOMContentLoaded', injectNav);
