// Cohort view page

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

let currentCohort = null;
let globalTasks = [];
let owners = [];
let rules = [];

async function loadCohortData() {
  try {
    const cohortId = getQueryParam('id');

    if (!cohortId) {
      showToast('No cohort ID provided', 'error');
      return;
    }

    // Load cohort
    const cohortRes = await apiFetch(`/cohorts/${cohortId}`);
    currentCohort = cohortRes.cohort;

    // Load global data
    const tasksRes = await apiFetch('/settings/tasks');
    globalTasks = tasksRes.tasks;

    const ownersRes = await apiFetch('/settings/owners');
    owners = ownersRes.owners;

    const rulesRes = await apiFetch('/settings/deadline-rules');
    rules = rulesRes.rules;

    renderCohortInfo();
    renderOwnerSummary();
    renderCohortTasks();
  } catch (error) {
    console.error('Error loading cohort data:', error);
    qs('main').innerHTML = `<div class="card"><p>Error: ${error.message}</p></div>`;
  }
}

function renderCohortInfo() {
  qs('#cohort-name-breadcrumb').textContent = currentCohort.name;
  qs('#cohort-name').textContent = currentCohort.name;

  const hireNames = currentCohort.hires.map((h) => h.name).join(', ');
  qs('#cohort-info').innerHTML = `
    <p style="margin: 0 0 8px 0;"><strong>Start Date:</strong> ${formatDate(currentCohort.startDate)}</p>
    <p style="margin: 0;"><strong>Hires (${currentCohort.hires.length}):</strong> ${hireNames}</p>
  `;
}

function renderOwnerSummary() {
  const container = qs('#owner-summary');
  container.innerHTML = '';

  const summary = ce('div');

  owners.forEach((owner) => {
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueCount = 0;

    currentCohort.hires.forEach((hire) => {
      hire.tasks.forEach((task) => {
        const globalTask = globalTasks.find((t) => t.id === task.taskId);

        if (!globalTask || !globalTask.active || globalTask.ownerId !== owner.id) {
          return;
        }

        totalTasks++;

        if (task.completed) {
          completedTasks++;
        } else {
          const rule = rules.find(
            (r) => r.phase === globalTask.phase && r.ownerId === owner.id
          );
          if (rule && isOverdue(hire.startDate, rule.daysFromStart)) {
            overdueCount++;
          }
        }
      });
    });

    if (totalTasks > 0) {
      const line = ce('div', 'text-small mb-md');
      line.innerHTML = `
        <strong>${owner.name}:</strong> ${completedTasks}/${totalTasks} done
        ${overdueCount > 0 ? `<span style="color: #dc2626; margin-left: 8px;">, ${overdueCount} overdue</span>` : ''}
      `;
      summary.appendChild(line);
    }
  });

  container.appendChild(summary);
}

function renderCohortTasks() {
  const container = qs('#tasks-container');
  container.innerHTML = '';

  // Group tasks by phase, then by owner
  const tasksByPhaseOwner = {};

  currentCohort.hires[0].tasks.forEach((hireTask) => {
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

    tasksByPhaseOwner[key].tasks.push({
      ...hireTask,
      ...globalTask,
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

        const checkbox = ce('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () =>
          toggleCohortTask(task.id, checkbox.checked)
        );

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

        taskList.appendChild(taskItem);
      });

      groupSection.appendChild(taskList);
      container.appendChild(groupSection);
    });
}

async function toggleCohortTask(taskId, completed) {
  try {
    // Update task for all hires in the cohort
    for (const hire of currentCohort.hires) {
      await apiFetch(`/cohorts/${currentCohort.id}/hires/${hire.id}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
    }

    showToast(completed ? 'Task marked complete for all hires' : 'Task unmarked for all hires');

    // Reload to show updated state
    await loadCohortData();
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
    await apiFetch(`/cohorts/${currentCohort.id}`, {
      method: 'DELETE',
    });
    showToast('Cohort deleted successfully');
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  } catch (error) {
    console.error('Error deleting cohort:', error);
    showToast(`Error: ${error.message}`, 'error');
    closeDeleteConfirm();
  }
}

document.addEventListener('DOMContentLoaded', loadCohortData);
