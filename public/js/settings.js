// Settings admin page

let tasks = [];
let owners = [];
let rules = [];
let reminderSettings = {
  enabled: true,
  time: '09:00',
  lastRun: null,
};

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Show selected tab
  qs(`#tab-${tabName}`).classList.add('active');
  event.target.classList.add('active');
}

async function loadSettings() {
  try {
    const tasksRes = await apiFetch('/settings/tasks');
    tasks = tasksRes.tasks;

    const ownersRes = await apiFetch('/settings/owners');
    owners = ownersRes.owners;

    const rulesRes = await apiFetch('/settings/deadline-rules');
    rules = rulesRes.rules;

    populateOwnerDropdowns();
    renderTasks();
    renderOwners();
    renderRules();
  } catch (error) {
    console.error('Error loading settings:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

function populateOwnerDropdowns() {
  const selects = ['task-owner'];
  selects.forEach((selectId) => {
    const select = qs(`#${selectId}`);
    select.innerHTML = '';
    owners.forEach((owner) => {
      const option = ce('option');
      option.value = owner.id;
      option.textContent = owner.name;
      select.appendChild(option);
    });
  });
}

// ============================================================================
// TASKS
// ============================================================================

qs('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const title = qs('#task-title').value;
    const phase = qs('#task-phase').value;
    const ownerId = qs('#task-owner').value;

    const res = await apiFetch('/settings/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, phase, ownerId }),
    });

    showToast('Task added successfully');
    qs('#task-form').reset();
    await loadSettings();
  } catch (error) {
    console.error('Error adding task:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
});

function renderTasks() {
  const list = qs('#tasks-list');
  list.innerHTML = '';

  // Group tasks by phase, then by owner
  const phases = [
    { id: 'pre_onboarding', label: 'Pre-Onboarding' },
    { id: 'onboarding', label: 'Onboarding' },
  ];

  phases.forEach((phase) => {
    // Phase section wrapper
    const phaseSection = ce('div');
    phaseSection.style.marginBottom = '32px';

    // Phase header
    const phaseHeader = ce('div');
    phaseHeader.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 3px solid #d1d5db;
    `;
    phaseHeader.textContent = phase.label;
    phaseSection.appendChild(phaseHeader);

    // Group by owner within this phase
    const tasksByOwner = {};
    tasks
      .filter((t) => t.phase === phase.id)
      .forEach((task) => {
        if (!tasksByOwner[task.ownerId]) {
          tasksByOwner[task.ownerId] = [];
        }
        tasksByOwner[task.ownerId].push(task);
      });

    // Render each owner's section within this phase
    owners.forEach((owner) => {
      const ownerTasks = tasksByOwner[owner.id] || [];
      if (ownerTasks.length === 0) return;

      // Sort by order
      ownerTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Owner section
      const section = ce('div');
      section.style.marginBottom = '20px';

      // Owner header
      const header = ce('div');
      header.style.cssText = `
        padding: 12px;
        margin-bottom: 12px;
        background-color: #f9fafb;
        border-left: 4px solid #e5e7eb;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        user-select: none;
      `;

      const headerColor = getOwnerColor(owner.id);
      const colorMap = {
        'hr': '#2d6a4f',
        'operations': '#1d4ed8',
        'managers': '#d97706',
      };
      const ownerColor = colorMap[headerColor] || '#6b7280';

      header.innerHTML = `
        <span style="font-size: 16px; color: ${ownerColor};">▼</span>
        <div class="text-bold" style="font-size: 14px; flex: 1;">${owner.name}</div>
        <span class="text-small text-muted">${ownerTasks.length}</span>
      `;

      // Update border color
      header.style.borderLeftColor = ownerColor + '40';

      // Tasks container (collapsible)
      const tasksContainer = ce('div');
      tasksContainer.style.display = 'block';
      tasksContainer.style.cssText = 'display: block; transition: max-height 0.3s;';
      tasksContainer.className = 'owner-tasks-container';

      // Collapse/expand
      let isExpanded = true;
      header.onclick = () => {
        isExpanded = !isExpanded;
        tasksContainer.style.display = isExpanded ? 'block' : 'none';
        header.querySelector('span').textContent = isExpanded ? '▼' : '▶';
      };

      // Render tasks for this owner
      ownerTasks.forEach((task) => {
        const item = ce('div');
        item.className = 'task-item-sortable';
        item.draggable = true;
        item.dataset.taskId = task.id;
        item.dataset.ownerId = owner.id;
        item.style.cssText = `
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: white;
          cursor: grab;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
          margin-bottom: 8px;
          margin-left: 16px;
        `;

        item.onmouseenter = () => {
          item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          item.style.cursor = 'grab';
        };

        item.onmouseleave = () => {
          item.style.boxShadow = '';
        };

        item.ondragstart = (e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', task.id);
          e.dataTransfer.setData('ownerId', owner.id);
          item.style.opacity = '0.5';
          item.style.cursor = 'grabbing';
        };

        item.ondragend = () => {
          item.style.opacity = '1';
          item.style.cursor = 'grab';
        };

        item.ondragover = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          item.style.borderTop = '3px solid #2d6a4f';
        };

        item.ondragleave = () => {
          item.style.borderTop = '1px solid #e5e7eb';
        };

        item.ondrop = async (e) => {
          e.preventDefault();
          item.style.borderTop = '1px solid #e5e7eb';
          const draggedTaskId = e.dataTransfer.getData('text/plain');
          if (draggedTaskId !== task.id) {
            await reorderTasks(draggedTaskId, task.id);
          }
        };

        const content = ce('div');
        content.style.flex = '1';
        content.innerHTML = `
          <div style="display: flex; align-items: center; gap: 16px;">
            <span style="color: #9ca3af; font-size: 18px;">⋮⋮</span>
            <div>
              <div class="text-bold">${task.title}</div>
            </div>
          </div>
        `;

        const actions = ce('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.alignItems = 'center';

        const activeStatus = ce('span');
        activeStatus.className = 'text-small text-muted';
        activeStatus.textContent = task.active ? '✓ Active' : '✗ Inactive';
        actions.appendChild(activeStatus);

        const btn = ce('button');
        btn.className = 'button button-small button-ghost';
        btn.textContent = task.active ? 'Deactivate' : 'Activate';
        btn.onclick = () => toggleTaskActive(task.id, task.active);
        actions.appendChild(btn);

        item.appendChild(content);
        item.appendChild(actions);
        tasksContainer.appendChild(item);
      });

      section.appendChild(header);
      section.appendChild(tasksContainer);
      phaseSection.appendChild(section);
    });

    list.appendChild(phaseSection);
  });
}

async function reorderTasks(draggedTaskId, targetTaskId) {
  try {
    const draggedIdx = tasks.findIndex((t) => t.id === draggedTaskId);
    const targetIdx = tasks.findIndex((t) => t.id === targetTaskId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    // Swap orders
    const draggedTask = tasks[draggedIdx];
    const targetTask = tasks[targetIdx];

    const tempOrder = draggedTask.order;
    draggedTask.order = targetTask.order;
    targetTask.order = tempOrder;

    // Update both tasks
    await apiFetch(`/settings/tasks/${draggedTaskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order: draggedTask.order }),
    });

    await apiFetch(`/settings/tasks/${targetTaskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ order: targetTask.order }),
    });

    await loadSettings();
  } catch (error) {
    console.error('Error reordering tasks:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function toggleTaskActive(taskId, isActive) {
  try {
    await apiFetch(`/settings/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !isActive }),
    });

    showToast('Task updated');
    await loadSettings();
  } catch (error) {
    console.error('Error updating task:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// ============================================================================
// OWNERS
// ============================================================================

qs('#owner-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const name = qs('#owner-name').value;
    const email = qs('#owner-email').value;

    const res = await apiFetch('/settings/owners', {
      method: 'POST',
      body: JSON.stringify({ name, email: email || undefined }),
    });

    showToast('Owner added successfully');
    qs('#owner-form').reset();
    await loadSettings();
  } catch (error) {
    console.error('Error adding owner:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
});

function renderOwners() {
  const tbody = qs('#owners-tbody');
  tbody.innerHTML = '';

  owners.forEach((owner) => {
    const row = ce('tr');

    const ownerTasks = tasks.filter((t) => t.ownerId === owner.id);
    const canDelete = ownerTasks.length === 0;

    row.innerHTML = `
      <td><strong>${owner.name}</strong></td>
      <td style="font-family: monospace; font-size: 0.9em;">${owner.email || '—'}</td>
      <td>
        <button class="button button-small button-ghost" onclick="deleteOwner('${owner.id}')" ${!canDelete ? 'disabled' : ''}>
          Delete
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

async function deleteOwner(ownerId) {
  if (!confirm('Are you sure? This owner will be deleted.')) return;

  try {
    await apiFetch(`/settings/owners/${ownerId}`, {
      method: 'DELETE',
    });

    showToast('Owner deleted');
    await loadSettings();
  } catch (error) {
    if (error.message.includes('409')) {
      showToast('Cannot delete owner: they have assigned tasks', 'error');
    } else {
      showToast(`Error: ${error.message}`, 'error');
    }
  }
}

// ============================================================================
// RULES
// ============================================================================

function renderRules() {
  const tbody = qs('#rules-tbody');
  tbody.innerHTML = '';

  rules.forEach((rule) => {
    const owner = owners.find((o) => o.id === rule.ownerId);
    const phase = rule.phase === 'pre_onboarding' ? 'Pre-Onboarding' : 'Onboarding';

    const row = ce('tr');

    const input = ce('input');
    input.type = 'number';
    input.value = rule.daysFromStart;
    input.style.width = '80px';
    input.addEventListener('change', async () => {
      try {
        await apiFetch(`/settings/deadline-rules/${rule.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ daysFromStart: parseInt(input.value) }),
        });
        showToast('Rule updated');
        await loadSettings();
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });

    row.innerHTML = `
      <td>${phase}</td>
      <td>${owner.name}</td>
      <td></td>
      <td></td>
    `;

    // Replace the daysFromStart cell
    const daysCell = row.insertCell(2);
    daysCell.appendChild(input);

    tbody.appendChild(row);
  });
}

// ============================================================================
// REMINDERS
// ============================================================================

async function saveReminderSettings() {
  try {
    const enabled = qs('#reminder-enabled').checked;
    const time = qs('#reminder-time').value;

    reminderSettings = { enabled, time, lastRun: reminderSettings.lastRun };

    // Save to data via API (store in memory, could be persisted)
    localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));

    showToast('Reminder settings saved');
  } catch (error) {
    console.error('Error saving settings:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function triggerReminder() {
  try {
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Sending...';

    const res = await apiFetch('/reminders/send-now', {
      method: 'POST',
    });

    const resultEl = qs('#reminder-result');
    resultEl.style.display = 'block';

    if (res.sent > 0) {
      resultEl.innerHTML = `✅ <strong>Sent ${res.sent} reminder${res.sent !== 1 ? 's' : ''}</strong> to: ${res.recipients.join(', ')}`;
      resultEl.style.color = '#059669';
    } else {
      resultEl.innerHTML = `ℹ️ No overdue tasks found to remind about`;
      resultEl.style.color = '#6b7280';
    }

    reminderSettings.lastRun = new Date().toLocaleString();
    localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));
    updateLastRunDisplay();

    button.disabled = false;
    button.textContent = 'Send Reminders Now';
  } catch (error) {
    console.error('Error triggering reminder:', error);
    showToast(`Error: ${error.message}`, 'error');
    button.disabled = false;
    button.textContent = 'Send Reminders Now';
  }
}

function updateLastRunDisplay() {
  const lastRunEl = qs('#last-run-info');
  if (reminderSettings.lastRun) {
    lastRunEl.textContent = `Last sent: ${reminderSettings.lastRun}`;
  } else {
    lastRunEl.textContent = 'Never run';
  }
}

function loadReminderSettings() {
  const saved = localStorage.getItem('reminderSettings');
  if (saved) {
    reminderSettings = JSON.parse(saved);
  }

  qs('#reminder-enabled').checked = reminderSettings.enabled;
  qs('#reminder-time').value = reminderSettings.time;
  updateLastRunDisplay();
}

// Load settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadReminderSettings();
});
