// Dashboard page

async function loadDashboard() {
  try {
    // Load stats for overdue alert
    const statsData = await apiFetch('/stats');
    renderOverdueAlert(statsData);

    // Render hire progress summary
    await renderHireProgressSummary();

    // Load global data
    const tasksRes = await apiFetch('/settings/tasks');
    const globalTasks = tasksRes.tasks;

    const ownersRes = await apiFetch('/settings/owners');
    const owners = ownersRes.owners;

    const rulesRes = await apiFetch('/settings/deadline-rules');
    const rules = rulesRes.rules;

    // Render checklist progress by phase + owner
    await renderChecklistProgress(globalTasks, owners, rules);

    // Load cohorts
    const cohortsData = await apiFetch('/cohorts');
    renderCohorts(cohortsData.cohorts);

    // Load individual hires
    const hiresData = await apiFetch('/hires');
    renderIndividualHires(hiresData.hires);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    qs('main').innerHTML = `<div class="card"><p>Error loading dashboard: ${error.message}</p></div>`;
  }
}

function renderOverdueAlert(stats) {
  const container = qs('#overdue-alert');
  container.innerHTML = '';

  if (stats.overdue === 0) {
    return; // Don't show alert if no overdue tasks
  }

  const alert = ce('div', 'card');
  alert.style.backgroundColor = '#fef2f2';
  alert.style.borderLeft = '4px solid #dc2626';
  alert.style.marginBottom = '24px';

  alert.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">⚠️</span>
      <div>
        <strong style="color: #dc2626; font-size: 16px;">${stats.overdue} task${
    stats.overdue !== 1 ? 's are' : ' is'
  } overdue</strong>
        <p style="margin: 4px 0 0 0; color: #666; font-size: 13px;">Immediate action required across your team</p>
      </div>
    </div>
  `;

  container.appendChild(alert);
}

function renderStats(stats) {
  const container = qs('#stats-container');
  container.innerHTML = '';

  const cards = [
    {
      label: 'Total Tasks',
      value: stats.totalTasks,
      color: '#2d6a4f',
    },
    {
      label: 'Completed',
      value: stats.completed,
      color: '#059669',
    },
    {
      label: 'Remaining',
      value: stats.remaining,
      color: '#3b82f6',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      color: '#dc2626',
    },
  ];

  cards.forEach((card) => {
    const cardEl = ce('div', 'stat-card');
    cardEl.innerHTML = `
      <div class="stat-card-label">${card.label}</div>
      <div class="stat-card-value" style="color: ${card.color};">${card.value}</div>
    `;
    container.appendChild(cardEl);
  });
}

async function renderHireProgressSummary() {
  const container = qs('#hire-progress-container');
  container.innerHTML = '';

  try {
    const cohortsRes = await apiFetch('/cohorts');
    const hiresRes = await apiFetch('/hires');
    const tasksRes = await apiFetch('/settings/tasks');
    const rulesRes = await apiFetch('/settings/deadline-rules');

    const cohorts = cohortsRes.cohorts;
    const hires = hiresRes.hires;
    const globalTasks = tasksRes.tasks;
    const rules = rulesRes.rules;

    // Render cohort progress cards
    cohorts.forEach((cohort) => {
      const card = ce('div', 'card cursor-pointer');
      card.onclick = () => {
        window.location.href = `/cohort.html?id=${cohort.id}`;
      };
      card.style.marginBottom = '24px';

      // Count unique tasks in cohort
      const uniqueTaskIds = new Set();
      cohort.hires.forEach((hire) => {
        hire.tasks.forEach((task) => {
          const globalTask = globalTasks.find((t) => t.id === task.taskId);
          if (globalTask && globalTask.active) {
            uniqueTaskIds.add(globalTask.id);
          }
        });
      });

      // Count completed and overdue
      let completedCount = 0;
      let overdueCount = 0;

      uniqueTaskIds.forEach((taskId) => {
        const globalTask = globalTasks.find((t) => t.id === taskId);
        const isCompleted = cohort.hires.some((hire) => {
          const hireTask = hire.tasks.find((t) => t.taskId === taskId);
          return hireTask && hireTask.completed;
        });

        if (isCompleted) {
          completedCount++;
        } else {
          const rule = rules.find((r) => r.phase === globalTask.phase && r.ownerId === globalTask.ownerId);
          if (rule) {
            const isTaskOverdue = cohort.hires.some((hire) => isOverdue(hire.startDate, rule.daysFromStart));
            if (isTaskOverdue) {
              overdueCount++;
            }
          }
        }
      });

      const totalTasks = uniqueTaskIds.size;
      const remainingCount = totalTasks - completedCount;
      const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
      const isOnTrack = overdueCount === 0;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
          <div>
            <h3 style="margin: 0; color: #1a1a1a;">${cohort.name}</h3>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">
              ${cohort.hires.length} hire${cohort.hires.length !== 1 ? 's' : ''} • ${formatDate(cohort.startDate)}
            </p>
          </div>
          <div>
            ${buildStatusPill(false, isOnTrack).outerHTML}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 500; margin-bottom: 8px;">Total Tasks</div>
            <div style="font-size: 24px; font-weight: bold; color: #2d6a4f;">${totalTasks}</div>
          </div>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 500; margin-bottom: 8px;">Completed</div>
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${completedCount}</div>
          </div>
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #3b82f6; font-weight: 500; margin-bottom: 8px;">Remaining</div>
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${remainingCount}</div>
          </div>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #dc2626; font-weight: 500; margin-bottom: 8px;">Overdue</div>
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${overdueCount}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="flex: 1;">
            <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background-color: ${isOnTrack ? '#059669' : '#dc2626'}; height: 100%; width: ${pct}%;"></div>
            </div>
          </div>
        </div>

        <div style="text-align: right; font-size: 13px; font-weight: 500; color: #6b7280;">
          ${pct}% Complete
        </div>
      `;

      container.appendChild(card);
    });

    // Render individual hire progress cards
    hires.forEach((hire) => {
      const card = ce('div', 'card cursor-pointer');
      card.onclick = () => {
        window.location.href = `/hire.html?id=${hire.id}`;
      };
      card.style.marginBottom = '24px';

      // Count unique tasks for hire
      const uniqueTaskIds = new Set();
      hire.tasks.forEach((task) => {
        const globalTask = globalTasks.find((t) => t.id === task.taskId);
        if (globalTask && globalTask.active) {
          uniqueTaskIds.add(globalTask.id);
        }
      });

      // Count completed and overdue
      let completedCount = 0;
      let overdueCount = 0;

      uniqueTaskIds.forEach((taskId) => {
        const hireTask = hire.tasks.find((t) => t.taskId === taskId);
        if (hireTask && hireTask.completed) {
          completedCount++;
        } else {
          const globalTask = globalTasks.find((t) => t.id === taskId);
          const rule = rules.find((r) => r.phase === globalTask.phase && r.ownerId === globalTask.ownerId);
          if (rule && isOverdue(hire.startDate, rule.daysFromStart)) {
            overdueCount++;
          }
        }
      });

      const totalTasks = uniqueTaskIds.size;
      const remainingCount = totalTasks - completedCount;
      const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
      const isOnTrack = overdueCount === 0;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
            ${buildAvatar(hire.name, 0).outerHTML}
            <div>
              <h3 style="margin: 0; color: #1a1a1a;">${hire.name}</h3>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">${formatDate(hire.startDate)}</p>
            </div>
          </div>
          <div>
            ${buildStatusPill(false, isOnTrack).outerHTML}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 500; margin-bottom: 8px;">Total Tasks</div>
            <div style="font-size: 24px; font-weight: bold; color: #2d6a4f;">${totalTasks}</div>
          </div>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 500; margin-bottom: 8px;">Completed</div>
            <div style="font-size: 24px; font-weight: bold; color: #059669;">${completedCount}</div>
          </div>
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #3b82f6; font-weight: 500; margin-bottom: 8px;">Remaining</div>
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${remainingCount}</div>
          </div>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #dc2626; font-weight: 500; margin-bottom: 8px;">Overdue</div>
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${overdueCount}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="flex: 1;">
            <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="background-color: ${isOnTrack ? '#059669' : '#dc2626'}; height: 100%; width: ${pct}%;"></div>
            </div>
          </div>
        </div>

        <div style="text-align: right; font-size: 13px; font-weight: 500; color: #6b7280;">
          ${pct}% Complete
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error rendering hire progress summary:', error);
  }
}

async function renderChecklistProgress(globalTasks, owners, rules) {
  const container = qs('#checklist-progress');
  container.innerHTML = '';

  // Load all hires
  const cohortsRes = await apiFetch('/cohorts');
  const hiresRes = await apiFetch('/hires');

  const allHires = [];
  const cohortMap = new Map(); // Map cohort name to cohort for reference

  // Collect all hires from cohorts
  cohortsRes.cohorts.forEach((cohort) => {
    cohortMap.set(cohort.name, cohort);
    cohort.hires.forEach((hire) => {
      allHires.push({ ...hire, cohortName: cohort.name });
    });
  });

  // Add individual hires
  hiresRes.hires.forEach((hire) => {
    allHires.push({ ...hire, cohortName: null });
  });

  // Collect unique task IDs and metadata per group
  const groupData = {};
  allHires.forEach((hire) => {
    hire.tasks.forEach((task) => {
      const globalTask = globalTasks.find((t) => t.id === task.taskId);
      if (!globalTask || !globalTask.active) return;

      const cohortLabel = hire.cohortName || hire.name;
      const key = `${globalTask.phase}_${globalTask.ownerId}_${cohortLabel}`;

      if (!groupData[key]) {
        groupData[key] = {
          phase: globalTask.phase,
          ownerId: globalTask.ownerId,
          cohortLabel,
          isIndividual: !hire.cohortName,
          uniqueTaskIds: new Set(),
        };
      }

      groupData[key].uniqueTaskIds.add(globalTask.id);
    });
  });

  // Build stats with unique task counts
  const phaseOwnerCohortStats = {};

  Object.entries(groupData).forEach(([key, data]) => {
    // Get all hires in this cohort
    const groupHires = allHires.filter((h) => {
      const hCohort = h.cohortName || 'Individual Hires';
      return hCohort === data.cohortLabel;
    });

    // Count completion for unique tasks
    let completedCount = 0;
    let overdueCount = 0;

    data.uniqueTaskIds.forEach((taskId) => {
      // Check if ANY hire in this cohort has completed this task
      const isCompleted = groupHires.some((hire) => {
        const hireTask = hire.tasks.find((t) => t.taskId === taskId);
        return hireTask && hireTask.completed;
      });

      if (isCompleted) {
        completedCount++;
      } else {
        // Check if overdue - ANY hire in this cohort has this task overdue
        const rule = rules.find((r) => r.phase === data.phase && r.ownerId === data.ownerId);
        if (rule) {
          const isTaskOverdue = groupHires.some((hire) => {
            return isOverdue(hire.startDate, rule.daysFromStart);
          });
          if (isTaskOverdue) {
            overdueCount++;
          }
        }
      }
    });

    phaseOwnerCohortStats[key] = {
      phase: data.phase,
      ownerId: data.ownerId,
      owner: owners.find((o) => o.id === data.ownerId),
      cohortLabel: data.cohortLabel,
      isIndividual: data.isIndividual,
      total: data.uniqueTaskIds.size,
      completed: completedCount,
      overdue: overdueCount,
      allHires,
      globalTasks,
      rules,
    };
  });

  // Sort tasks by order within each group
  Object.keys(phaseOwnerCohortStats).forEach((key) => {
    phaseOwnerCohortStats[key].globalTasks = [...globalTasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  // Sort by phase, owner, cohorts before individual hires, then alphabetically
  const phaseOrder = { pre_onboarding: 1, onboarding: 2 };
  const ownerOrder = { hr: 1, operations: 2, managers: 3 };

  Object.keys(phaseOwnerCohortStats)
    .sort((a, b) => {
      const statA = phaseOwnerCohortStats[a];
      const statB = phaseOwnerCohortStats[b];

      // Sort by phase
      if (statA.phase !== statB.phase) {
        return phaseOrder[statA.phase] - phaseOrder[statB.phase];
      }

      // Sort by owner
      if (statA.ownerId !== statB.ownerId) {
        return (ownerOrder[statA.ownerId] || 999) - (ownerOrder[statB.ownerId] || 999);
      }

      // Cohorts before individual hires
      if (statA.isIndividual !== statB.isIndividual) {
        return statA.isIndividual ? 1 : -1;
      }

      // Alphabetically within each group
      return statA.cohortLabel.localeCompare(statB.cohortLabel);
    })
    .forEach((key) => {
      const stat = phaseOwnerCohortStats[key];

      // Wrapper for row + dropdown
      const wrapper = ce('div');

      const row = ce('div', 'card mb-md');
      row.style.padding = '16px';
      row.style.cursor = 'pointer';
      row.style.transition = 'all 0.2s';

      row.onmouseover = () => row.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      row.onmouseout = () => row.style.boxShadow = '';

      const phaseLabel = stat.phase === 'pre_onboarding' ? 'Pre-Onboarding' : 'Onboarding';
      const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;

      let statusPill = 'Not started';
      let statusColor = '#9ca3af';
      if (stat.completed === stat.total) {
        statusPill = 'Complete';
        statusColor = '#059669';
      } else if (stat.overdue > 0) {
        statusPill = 'Has overdue';
        statusColor = '#dc2626';
      } else if (stat.completed > 0) {
        statusPill = 'In progress';
        statusColor = '#f59e0b';
      }

      // Compute display label for cohort/hire name - always in bold capitals
      const displayLabel = stat.cohortLabel.toUpperCase();
      const displayLabelHtml = `<span style="font-weight: bold; font-size: 14px; color: #1a1a1a;">• ${displayLabel}</span>`;

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <strong>${phaseLabel}</strong>
              <span class="owner-tag ${stat.ownerId}" style="margin: 0;">${stat.owner.name}</span>
              ${displayLabelHtml}
              <span class="text-small text-muted">• ${stat.total} task${stat.total !== 1 ? 's' : ''}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="flex: 1; max-width: 300px;">
                <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background-color: ${getOwnerColor(stat.ownerId) === 'hr' ? '#2d6a4f' : getOwnerColor(stat.ownerId) === 'operations' ? '#1d4ed8' : '#d97706'}; height: 100%; width: ${pct}%;"></div>
                </div>
              </div>
              <span class="text-small text-bold">${stat.completed}/${stat.total}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="text-small text-bold mb-sm">${pct}% done</div>
            <span class="pill" style="background-color: ${statusColor}22; color: ${statusColor}; display: inline-block;">${statusPill}</span>
            ${stat.overdue > 0 ? `<div class="badge" style="margin-top: 4px; display: block;">${stat.overdue} overdue</div>` : ''}
          </div>
        </div>
      `;

      wrapper.appendChild(row);

      // Dropdown container - use safe ID with encoded cohort label
      const safeCohortLabel = stat.cohortLabel.replace(/\s+/g, '-');
      const dropdownId = `dropdown-${stat.phase}-${stat.ownerId}-${safeCohortLabel}`;
      const dropdown = ce('div');
      dropdown.id = dropdownId;
      dropdown.style.display = 'none';
      dropdown.style.marginBottom = '16px';
      dropdown.style.marginTop = '-12px';
      dropdown.style.paddingLeft = '24px';
      dropdown.style.paddingRight = '24px';
      dropdown.style.paddingBottom = '16px';
      dropdown.style.backgroundColor = '#f9fafb';
      dropdown.style.borderRadius = '6px';

      row.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Row clicked, toggling dropdown:', dropdownId);
        toggleTaskDropdown(dropdownId, stat);
      };

      wrapper.appendChild(dropdown);
      container.appendChild(wrapper);
    });
}

function renderOverallProgress(stats) {
  const container = qs('#overall-progress');
  container.innerHTML = '';

  if (!stats.byOwner || stats.byOwner.length === 0) {
    container.textContent = 'No tasks yet';
    return;
  }

  const segments = stats.byOwner.map((owner) => ({
    ownerId: owner.ownerId,
    completed: owner.completed,
    total: owner.total,
  }));

  const bar = buildProgressBar(segments);
  container.appendChild(bar);

  // Add owner breakdown
  const breakdown = ce('div', 'mt-md');
  breakdown.innerHTML = '<div class="text-small text-muted" style="margin-top: 12px;">';

  stats.byOwner.forEach((owner) => {
    const pct = owner.total > 0 ? Math.round((owner.completed / owner.total) * 100) : 0;
    const line = ce('div', 'text-small mb-sm');
    line.innerHTML = `
      <strong>${owner.ownerName}</strong>: ${owner.completed}/${owner.total} (${pct}%)
      ${owner.overdue > 0 ? `<span style="color: #dc2626;"> • ${owner.overdue} overdue</span>` : ''}
    `;
    breakdown.appendChild(line);
  });

  breakdown.innerHTML += '</div>';
  container.appendChild(breakdown);
}

async function renderCohorts(cohorts) {
  const container = qs('#cohorts-container');
  container.innerHTML = '';

  if (cohorts.length === 0) {
    const empty = ce('div', 'card');
    empty.textContent = 'No cohorts yet. Create one to get started.';
    container.appendChild(empty);
    return;
  }

  for (const cohort of cohorts) {
    const card = ce('div', 'card cursor-pointer');
    card.onclick = () => {
      window.location.href = `/cohort.html?id=${cohort.id}`;
    };

    // Count unique tasks across all hires in cohort
    const tasksData = await apiFetch('/settings/tasks');
    const globalTasks = tasksData.tasks;
    const uniqueTaskIds = new Set();
    let completedTasks = 0;
    let overdueCount = 0;

    cohort.hires.forEach((hire) => {
      hire.tasks.forEach((task) => {
        const globalTask = globalTasks.find((t) => t.id === task.taskId);
        if (globalTask && globalTask.active) {
          uniqueTaskIds.add(globalTask.id);
        }
      });
    });

    const totalTasks = uniqueTaskIds.size;

    // Count completion for unique tasks
    uniqueTaskIds.forEach((taskId) => {
      const isCompleted = cohort.hires.some((hire) => {
        const hireTask = hire.tasks.find((t) => t.taskId === taskId);
        return hireTask && hireTask.completed;
      });
      if (isCompleted) completedTasks++;
    });

    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get all deadline rules
    const rulesData = await apiFetch('/settings/deadline-rules');

    // Count overdue for unique incomplete tasks
    uniqueTaskIds.forEach((taskId) => {
      const globalTask = globalTasks.find((t) => t.id === taskId);
      if (!globalTask) return;

      const isCompleted = cohort.hires.some((hire) => {
        const hireTask = hire.tasks.find((t) => t.taskId === taskId);
        return hireTask && hireTask.completed;
      });

      if (!isCompleted) {
        const rule = rulesData.rules.find(
          (r) => r.phase === globalTask.phase && r.ownerId === globalTask.ownerId
        );
        if (rule) {
          const isTaskOverdue = cohort.hires.some((hire) => {
            return isOverdue(hire.startDate, rule.daysFromStart);
          });
          if (isTaskOverdue) {
            overdueCount++;
          }
        }
      }
    });

    const isOnTrack = overdueCount === 0;

    card.innerHTML = `
      <div class="card-header">
        <div style="flex: 1;">
          <h3>${cohort.name}</h3>
        </div>
        <button onclick="deleteCohort('${cohort.id}', event)" class="button button-secondary button-small" style="color: #dc2626; white-space: nowrap;">
          🗑️ Delete
        </button>
      </div>
      <div class="card-body">
        <p class="text-small text-muted">
          <strong>Start:</strong> ${formatDate(cohort.startDate)} •
          <strong>Hires:</strong> ${cohort.hires.length}
        </p>

        <div class="avatar-group mt-md mb-md">
          ${cohort.hires
            .map((h, i) => buildAvatar(h.name, i).outerHTML)
            .join('')}
        </div>

        <div class="progress-mini mt-md mb-md">
          <div style="flex: 1;">
            <div class="text-small text-bold mb-xs">${completedTasks}/${totalTasks} (${pct}%)</div>
          </div>
        </div>

        <div class="mt-md">
          ${buildStatusPill(false, isOnTrack).outerHTML}
          ${overdueCount > 0 ? `<span class="badge ml-md" style="margin-left: 8px;">${overdueCount} overdue</span>` : ''}
        </div>
      </div>
    `;

    container.appendChild(card);
  }
}

async function renderIndividualHires(hires) {
  const container = qs('#hires-container');
  container.innerHTML = '';

  if (hires.length === 0) {
    const empty = ce('div', 'card');
    empty.textContent = 'No individual hires yet.';
    container.appendChild(empty);
    return;
  }

  const rulesData = await apiFetch('/settings/deadline-rules');
  const tasksData = await apiFetch('/settings/tasks');
  const globalTasks = tasksData.tasks;

  hires.forEach((hire, idx) => {
    const card = ce('div', 'card cursor-pointer');
    card.onclick = () => {
      window.location.href = `/hire.html?id=${hire.id}`;
    };

    // Count unique tasks for this hire
    const uniqueTaskIds = new Set();
    let completedTasks = 0;
    let overdueCount = 0;

    hire.tasks.forEach((task) => {
      const globalTask = globalTasks.find((t) => t.id === task.taskId);
      if (globalTask && globalTask.active) {
        uniqueTaskIds.add(globalTask.id);

        if (task.completed) {
          completedTasks++;
        } else {
          const rule = rulesData.rules.find(
            (r) => r.phase === globalTask.phase && r.ownerId === globalTask.ownerId
          );
          if (rule && isOverdue(hire.startDate, rule.daysFromStart)) {
            overdueCount++;
          }
        }
      }
    });

    const totalTasks = uniqueTaskIds.size;
    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const isOnTrack = overdueCount === 0;

    card.innerHTML = `
      <div class="card-header">
        <div class="flex items-center gap-md" style="flex: 1;">
          ${buildAvatar(hire.name, idx).outerHTML}
          <h3 style="margin: 0;">${hire.name}</h3>
        </div>
        <button onclick="deleteHire('${hire.id}', event)" class="button button-secondary button-small" style="color: #dc2626; white-space: nowrap;">
          🗑️ Delete
        </button>
      </div>
      <div class="card-body">
        <p class="text-small text-muted">
          <strong>Start:</strong> ${formatDate(hire.startDate)}
        </p>

        <div class="progress-mini mt-md mb-md">
          <div style="flex: 1;">
            <div class="text-small text-bold mb-xs">${completedTasks}/${totalTasks} (${pct}%)</div>
          </div>
        </div>

        <div class="mt-md">
          ${buildStatusPill(false, isOnTrack).outerHTML}
          ${overdueCount > 0 ? `<span class="badge ml-md" style="margin-left: 8px;">${overdueCount} overdue</span>` : ''}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// ============================================================================
// OVERDUE TASKS DROPDOWN
// ============================================================================

async function toggleTaskDropdown(dropdownId, stat) {
  console.log(`Toggle dropdown called with ID: ${dropdownId}`);
  const dropdown = qs(`#${dropdownId}`);

  if (!dropdown) {
    console.error(`Dropdown element not found! ID: ${dropdownId}`);
    return;
  }

  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
    return;
  }

  try {
    // Load data
    const tasksRes = await apiFetch('/settings/tasks');
    const globalTasks = tasksRes.tasks;

    const rulesRes = await apiFetch('/settings/deadline-rules');
    const rules = rulesRes.rules;

    const cohortsRes = await apiFetch('/cohorts');
    const hiresRes = await apiFetch('/hires');

    // Collect all hires with cohort info
    const allHires = [];

    cohortsRes.cohorts.forEach((cohort) => {
      cohort.hires.forEach((hire) => {
        allHires.push({ ...hire, cohortName: cohort.name });
      });
    });

    hiresRes.hires.forEach((hire) => {
      allHires.push({ ...hire, cohortName: null });
    });

    // Count hires per cohort to determine display names
    const cohortHireCount = {};
    cohortsRes.cohorts.forEach((cohort) => {
      cohortHireCount[cohort.name] = cohort.hires.length;
    });

    // Filter hires by cohort or individual hire name
    const cohortHires = allHires.filter((hire) => {
      if (stat.isIndividual) {
        // For individual hires, match by hire name
        return hire.name === stat.cohortLabel && !hire.cohortName;
      } else {
        // For cohorts, match by cohort name
        return hire.cohortName === stat.cohortLabel;
      }
    });

    // Group tasks by taskId to get unique tasks with all hires
    const uniqueTasksMap = new Map(); // taskId -> {title, order, completed: [], incomplete: []}

    cohortHires.forEach((hire) => {
      hire.tasks.forEach((task) => {
        const globalTask = globalTasks.find((t) => t.id === task.taskId);

        if (
          !globalTask ||
          !globalTask.active ||
          globalTask.phase !== stat.phase ||
          globalTask.ownerId !== stat.ownerId
        ) {
          return;
        }

        if (!uniqueTasksMap.has(globalTask.id)) {
          uniqueTasksMap.set(globalTask.id, {
            title: globalTask.title,
            order: globalTask.order || 0,
            completed: [],
            incomplete: [],
          });
        }

        const taskEntry = uniqueTasksMap.get(globalTask.id);

        if (task.completed) {
          taskEntry.completed.push({
            hireName: hire.name,
            cohortName: hire.cohortName,
            completedAt: task.completedAt,
          });
        } else {
          // Task is incomplete - check if overdue
          const rule = rules.find(
            (r) => r.phase === stat.phase && r.ownerId === stat.ownerId
          );

          const dueDate = new Date(hire.startDate);
          dueDate.setDate(dueDate.getDate() + (rule?.daysFromStart || 0));

          const daysOverdue = Math.floor(
            (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          taskEntry.incomplete.push({
            hireName: hire.name,
            cohortName: hire.cohortName,
            daysOverdue,
          });
        }
      });
    });

    // Sort tasks by order
    const sortedTasks = Array.from(uniqueTasksMap.values()).sort(
      (a, b) => a.order - b.order
    );

    // Populate dropdown
    dropdown.innerHTML = '';

    // Group by completed vs incomplete
    const completedTasks = sortedTasks.filter((t) => t.completed.length > 0 && t.incomplete.length === 0);
    const incompleteTasks = sortedTasks.filter((t) => t.incomplete.length > 0);

    // Show completed tasks section
    if (completedTasks.length > 0) {
      const completedHeader = ce('div');
      completedHeader.style.marginBottom = '12px';
      completedHeader.innerHTML = `<div class="text-bold" style="color: #059669; margin-bottom: 8px;">✓ Completed (${completedTasks.length})</div>`;
      dropdown.appendChild(completedHeader);

      completedTasks.forEach((task) => {
        const hireNames = task.completed.map((c) => c.hireName).join(', ');
        const item = ce('div');
        item.style.backgroundColor = '#f0fdf4';
        item.style.border = '1px solid #bbf7d0';
        item.style.borderRadius = '6px';
        item.style.padding = '12px';
        item.style.marginBottom = '8px';
        item.style.borderLeft = '4px solid #059669';

        item.innerHTML = `
          <div class="text-bold mb-xs" style="color: #1a1a1a; text-decoration: line-through;">${task.title}</div>
          <div class="text-small text-muted" style="margin-bottom: 4px;">
            <strong>[${hireNames}]</strong>
          </div>
          <div class="text-small" style="color: #059669; font-weight: 500;">
            Completed ${formatDate(task.completed[0].completedAt)}
          </div>
        `;

        dropdown.appendChild(item);
      });
    }

    // Show incomplete tasks section
    if (incompleteTasks.length > 0) {
      if (completedTasks.length > 0) {
        const divider = ce('div');
        divider.style.height = '1px';
        divider.style.backgroundColor = '#e5e7eb';
        divider.style.margin = '12px 0';
        dropdown.appendChild(divider);
      }

      const incompleteHeader = ce('div');
      incompleteHeader.style.marginBottom = '12px';
      incompleteHeader.innerHTML = `<div class="text-bold" style="color: #dc2626; margin-bottom: 8px;">⏳ Incomplete (${incompleteTasks.length})</div>`;
      dropdown.appendChild(incompleteHeader);

      incompleteTasks.forEach((task) => {
        const hireNames = task.incomplete.map((c) => c.hireName).join(', ');
        const item = ce('div');
        item.style.backgroundColor = '#fef2f2';
        item.style.border = '1px solid #fecaca';
        item.style.borderRadius = '6px';
        item.style.padding = '12px';
        item.style.marginBottom = '8px';
        item.style.borderLeft = '4px solid #dc2626';

        // Show overdue status if applicable
        const maxDaysOverdue = Math.max(...task.incomplete.map((t) => t.daysOverdue));
        let statusText = '';
        if (maxDaysOverdue > 0) {
          statusText = `<div class="text-small" style="color: #dc2626; font-weight: 500;">⚠️ Overdue ${maxDaysOverdue} day${maxDaysOverdue !== 1 ? 's' : ''}</div>`;
        } else {
          statusText = `<div class="text-small" style="color: #f59e0b; font-weight: 500;">📋 Due in ${Math.abs(maxDaysOverdue)} day${Math.abs(maxDaysOverdue) !== 1 ? 's' : ''}</div>`;
        }

        item.innerHTML = `
          <div class="text-bold mb-xs" style="color: #1a1a1a;">${task.title}</div>
          <div class="text-small text-muted" style="margin-bottom: 4px;">
            <strong>[${hireNames}]</strong>
          </div>
          ${statusText}
        `;

        dropdown.appendChild(item);
      });
    }

    if (sortedTasks.length === 0) {
      const emptyMsg = ce('p');
      emptyMsg.style.color = '#6b7280';
      emptyMsg.style.marginTop = '12px';
      emptyMsg.textContent = 'No tasks for this phase and owner.';
      dropdown.appendChild(emptyMsg);
    }

    dropdown.style.display = 'block';
  } catch (error) {
    console.error('Error loading tasks:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function deleteCohort(cohortId, event) {
  event.stopPropagation();

  if (!confirm('Are you sure you want to delete this cohort and all its hires? This cannot be undone.')) {
    return;
  }

  try {
    await apiFetch(`/cohorts/${cohortId}`, {
      method: 'DELETE',
    });
    showToast('Cohort deleted successfully');
    loadDashboard();
  } catch (error) {
    console.error('Error deleting cohort:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function deleteHire(hireId, event) {
  event.stopPropagation();

  if (!confirm('Are you sure you want to delete this hire? This cannot be undone.')) {
    return;
  }

  try {
    await apiFetch(`/hires/${hireId}`, {
      method: 'DELETE',
    });
    showToast('Hire deleted successfully');
    loadDashboard();
  } catch (error) {
    console.error('Error deleting hire:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

// Load dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
