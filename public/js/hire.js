// Hire task view page

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

let currentHire = null;
let currentCohortId = null;
let globalTasks = [];
let owners = [];
let rules = [];

async function loadHireData() {
  try {
    const hireId = getQueryParam('id');

    if (!hireId) {
      showToast('No hire ID provided', 'error');
      return;
    }

    // Load hire data
    const hireRes = await apiFetch(`/hires/${hireId}`);
    currentHire = hireRes.hire;
    currentCohortId = hireRes.cohortId;

    // Load global tasks, owners, and rules
    const tasksRes = await apiFetch('/settings/tasks');
    globalTasks = tasksRes.tasks;

    const ownersRes = await apiFetch('/settings/owners');
    owners = ownersRes.owners;

    const rulesRes = await apiFetch('/settings/deadline-rules');
    rules = rulesRes.rules;

    renderBreadcrumb();
    renderHireInfo();
    renderTasks();
  } catch (error) {
    console.error('Error loading hire data:', error);
    qs('main').innerHTML = `<div class="card"><p>Error: ${error.message}</p></div>`;
  }
}

function renderBreadcrumb() {
  const container = qs('#breadcrumb-container');

  let html = `
    <div class="breadcrumb">
      <a href="/">Dashboard</a>
      <span>&gt;</span>
  `;

  if (currentCohortId) {
    // This hire is part of a cohort
    html += `<a href="/cohort.html?id=${currentCohortId}">Cohort</a>
      <span>&gt;</span>`;
  }

  html += `<span>${currentHire.name}</span>
    </div>
  `;

  container.innerHTML = html;
}

function renderHireInfo() {
  qs('#hire-name').textContent = currentHire.name;
  qs('#hire-info').textContent = `Start Date: ${formatDate(currentHire.startDate)}`;
}

function renderTasks() {
  const container = qs('#tasks-container');
  container.innerHTML = '';

  // Group tasks by phase, then by owner
  const tasksByPhaseOwner = {};

  currentHire.tasks.forEach((hireTask) => {
    const globalTask = globalTasks.find((t) => t.id === hireTask.taskId);

    if (!globalTask || !globalTask.active) return;

    const key = `${globalTask.phase}_${globalTask.ownerId}`;

    if (!tasksByPhaseOwner[key]) {
      tasksByPhaseOwner[key] = {
        phase: globalTask.phase,
        ownerId: globalTask.ownerId,
        owner: owners.find((o) => o.id === globalTask.ownerId),
        tasks: [],
      };
    }

    const rule = rules.find(
      (r) => r.phase === globalTask.phase && r.ownerId === globalTask.ownerId
    );

    const overdue =
      !hireTask.completed && rule && isOverdue(currentHire.startDate, rule.daysFromStart);

    tasksByPhaseOwner[key].tasks.push({
      ...hireTask,
      ...globalTask,
      overdue,
      rule,
    });
  });

  // Sort tasks by order within each group
  Object.keys(tasksByPhaseOwner).forEach((key) => {
    tasksByPhaseOwner[key].tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  // Order phases
  const phaseOrder = { pre_onboarding: 1, onboarding: 2 };

  Object.keys(tasksByPhaseOwner)
    .sort((a, b) => {
      const [phaseA] = a.split('_');
      const [phaseB] = b.split('_');
      return phaseOrder[phaseA] - phaseOrder[phaseB];
    })
    .forEach((key) => {
      const group = tasksByPhaseOwner[key];

      const groupSection = ce('div', 'mb-lg');

      // Group header
      const header = ce('div', 'flex items-center gap-md mb-md');
      header.innerHTML = `
        <h3 style="margin: 0; flex: 1;">
          ${group.phase === 'pre_onboarding' ? 'Pre-Onboarding' : 'Onboarding'} — ${
        group.owner.name
      }
        </h3>
        <span class="text-small text-muted">
          ${group.tasks.filter((t) => t.completed).length}/${group.tasks.length}
        </span>
      `;
      groupSection.appendChild(header);

      // Tasks list
      const taskList = ce('ul', 'task-list');

      group.tasks.forEach((task) => {
        const taskItem = ce('li', 'task-item');

        if (task.completed) {
          taskItem.classList.add('completed');
        }

        if (task.overdue) {
          taskItem.classList.add('overdue');
        }

        const checkbox = ce('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

        const content = ce('div', 'task-content');
        const title = ce('div', 'task-title');
        title.innerHTML = task.title;

        if (task.completed) {
          title.classList.add('strikethrough');
        }

        content.appendChild(title);

        const meta = ce('div', 'task-meta');
        meta.innerHTML = `
          <span class="task-owner">${group.owner.name}</span>
        `;

        content.appendChild(meta);

        taskItem.appendChild(checkbox);
        taskItem.appendChild(content);

        if (task.overdue) {
          const badge = ce('span', 'badge');
          badge.style.marginLeft = 'auto';
          badge.textContent = 'Overdue';
          taskItem.appendChild(badge);
        }

        taskList.appendChild(taskItem);
      });

      groupSection.appendChild(taskList);
      container.appendChild(groupSection);
    });

  if (Object.keys(tasksByPhaseOwner).length === 0) {
    container.innerHTML = '<p>No active tasks.</p>';
  }
}

async function toggleTask(taskId, completed) {
  try {
    const endpoint = currentCohortId
      ? `/cohorts/${currentCohortId}/hires/${currentHire.id}/tasks/${taskId}`
      : `/hires/${currentHire.id}/tasks/${taskId}`;

    await apiFetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });

    showToast(completed ? 'Task completed!' : 'Task unmarked');

    // Reload to show updated state
    await loadHireData();
  } catch (error) {
    console.error('Error toggling task:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

function openDeleteConfirm(type) {
  qs('#delete-modal').style.display = 'flex';
}

function closeDeleteConfirm() {
  qs('#delete-modal').style.display = 'none';
}

async function confirmDelete(type) {
  try {
    await apiFetch(`/hires/${currentHire.id}`, {
      method: 'DELETE',
    });
    showToast('Hire deleted successfully');
    setTimeout(() => {
      if (currentCohortId) {
        window.location.href = `/cohort.html?id=${currentCohortId}`;
      } else {
        window.location.href = '/';
      }
    }, 500);
  } catch (error) {
    console.error('Error deleting hire:', error);
    showToast(`Error: ${error.message}`, 'error');
    closeDeleteConfirm();
  }
}

document.addEventListener('DOMContentLoaded', loadHireData);
