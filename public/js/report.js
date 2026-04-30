// Progress report page (print-friendly)

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

let reportType = null;
let reportData = null;
let globalTasks = [];
let owners = [];
let rules = [];

async function loadReport() {
  try {
    reportType = getQueryParam('type');
    const id = getQueryParam('id');

    if (!reportType || !id) {
      showToast('Missing report parameters', 'error');
      return;
    }

    // Load global data
    const tasksRes = await apiFetch('/settings/tasks');
    globalTasks = tasksRes.tasks;

    const ownersRes = await apiFetch('/settings/owners');
    owners = ownersRes.owners;

    const rulesRes = await apiFetch('/settings/deadline-rules');
    rules = rulesRes.rules;

    // Load report data
    if (reportType === 'cohort') {
      const res = await apiFetch(`/cohorts/${id}`);
      reportData = res.cohort;
      renderCohortReport();
    } else if (reportType === 'hire') {
      const res = await apiFetch(`/hires/${id}`);
      reportData = res.hire;
      renderHireReport();
    }
  } catch (error) {
    console.error('Error loading report:', error);
    document.body.innerHTML = `<div style="padding: 20px;"><h1>Error</h1><p>${error.message}</p></div>`;
  }
}

function renderCohortReport() {
  qs('#report-title').textContent = `Cohort Report: ${reportData.name}`;
  qs('#start-date').textContent = formatDate(reportData.startDate);
  qs('#report-date').textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate stats across all hires
  let totalTasks = 0;
  let completedTasks = 0;

  reportData.hires.forEach((hire) => {
    totalTasks += hire.tasks.length;
    completedTasks += hire.tasks.filter((t) => t.completed).length;
  });

  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  qs('#overall-percent').textContent = `${pct}%`;

  renderOwnerBreakdown();
  renderIncompleteTasks();
}

function renderHireReport() {
  qs('#report-title').textContent = `Individual Hire Report: ${reportData.name}`;
  qs('#start-date').textContent = formatDate(reportData.startDate);
  qs('#report-date').textContent = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalTasks = reportData.tasks.length;
  const completedTasks = reportData.tasks.filter((t) => t.completed).length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  qs('#overall-percent').textContent = `${pct}%`;

  renderOwnerBreakdown();
  renderIncompleteTasks();
}

function renderOwnerBreakdown() {
  const container = qs('#owner-breakdown');
  container.innerHTML = '';

  const table = ce('table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Owner</th>
        <th>Completed</th>
        <th>Total</th>
        <th>Percentage</th>
      </tr>
    </thead>
    <tbody id="breakdown-body"></tbody>
  `;

  const tbody = ce('tbody');

  owners.forEach((owner) => {
    let totalTasks = 0;
    let completedTasks = 0;

    if (reportType === 'cohort') {
      reportData.hires.forEach((hire) => {
        hire.tasks.forEach((task) => {
          const globalTask = globalTasks.find((t) => t.id === task.taskId);
          if (globalTask && globalTask.active && globalTask.ownerId === owner.id) {
            totalTasks++;
            if (task.completed) completedTasks++;
          }
        });
      });
    } else {
      reportData.tasks.forEach((task) => {
        const globalTask = globalTasks.find((t) => t.id === task.taskId);
        if (globalTask && globalTask.active && globalTask.ownerId === owner.id) {
          totalTasks++;
          if (task.completed) completedTasks++;
        }
      });
    }

    if (totalTasks > 0) {
      const pct = Math.round((completedTasks / totalTasks) * 100);
      const row = ce('tr');
      row.innerHTML = `
        <td><strong>${owner.name}</strong></td>
        <td>${completedTasks}</td>
        <td>${totalTasks}</td>
        <td>${pct}%</td>
      `;
      tbody.appendChild(row);
    }
  });

  table.querySelector('tbody').replaceWith(tbody);
  container.appendChild(table);
}

function renderIncompleteTasks() {
  const container = qs('#incomplete-tasks');
  container.innerHTML = '';

  const incompleteTasks = [];

  if (reportType === 'cohort') {
    reportData.hires.forEach((hire) => {
      hire.tasks.forEach((task) => {
        if (!task.completed) {
          const globalTask = globalTasks.find((t) => t.id === task.taskId);
          if (globalTask && globalTask.active) {
            incompleteTasks.push({
              title: globalTask.title,
              owner: owners.find((o) => o.id === globalTask.ownerId),
              hireName: hire.name,
            });
          }
        }
      });
    });
  } else {
    reportData.tasks.forEach((task) => {
      if (!task.completed) {
        const globalTask = globalTasks.find((t) => t.id === task.taskId);
        if (globalTask && globalTask.active) {
          incompleteTasks.push({
            title: globalTask.title,
            owner: owners.find((o) => o.id === globalTask.ownerId),
          });
        }
      }
    });
  }

  if (incompleteTasks.length === 0) {
    const empty = ce('p');
    empty.textContent = 'All tasks are complete!';
    container.appendChild(empty);
    return;
  }

  // Group by owner
  const byOwner = {};
  incompleteTasks.forEach((task) => {
    const key = task.owner.id;
    if (!byOwner[key]) {
      byOwner[key] = {
        owner: task.owner,
        tasks: [],
      };
    }
    byOwner[key].tasks.push(task);
  });

  Object.values(byOwner).forEach((group) => {
    const section = ce('div', 'mb-lg');

    const header = ce('h3');
    header.textContent = group.owner.name;
    header.style.marginBottom = '12px';
    section.appendChild(header);

    const list = ce('ul');
    list.style.paddingLeft = '20px';

    group.tasks.forEach((task) => {
      const item = ce('li');
      item.style.marginBottom = '8px';

      if (reportType === 'cohort') {
        item.textContent = `${task.title} (${task.hireName})`;
      } else {
        item.textContent = task.title;
      }

      list.appendChild(item);
    });

    section.appendChild(list);
    container.appendChild(section);
  });
}

document.addEventListener('DOMContentLoaded', loadReport);
