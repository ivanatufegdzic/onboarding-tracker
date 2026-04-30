// New cohort form handler

document.getElementById('cohort-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const name = document.getElementById('name').value;
    const startDate = document.getElementById('startDate').value;
    const hiresText = document.getElementById('hires').value;

    // Parse hire names
    const hireNames = hiresText
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (hireNames.length === 0) {
      showToast('Please add at least one hire', 'error');
      return;
    }

    // Create cohort
    const cohortRes = await apiFetch('/cohorts', {
      method: 'POST',
      body: JSON.stringify({ name, startDate }),
    });

    const cohort = cohortRes.cohort;

    // Add hires to cohort
    for (const hireName of hireNames) {
      await apiFetch(`/cohorts/${cohort.id}/hires`, {
        method: 'POST',
        body: JSON.stringify({
          name: hireName,
          startDate: startDate,
        }),
      });
    }

    showToast('Cohort created successfully!');
    setTimeout(() => {
      window.location.href = `/cohort.html?id=${cohort.id}`;
    }, 500);
  } catch (error) {
    console.error('Error creating cohort:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
});

// Set today's date as default
document.getElementById('startDate').valueAsDate = new Date();
