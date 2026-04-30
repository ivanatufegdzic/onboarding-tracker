// New individual hire form handler

document.getElementById('hire-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const name = document.getElementById('name').value;
    const startDate = document.getElementById('startDate').value;

    const hireRes = await apiFetch('/hires', {
      method: 'POST',
      body: JSON.stringify({ name, startDate }),
    });

    const hire = hireRes.hire;

    showToast('Hire created successfully!');
    setTimeout(() => {
      window.location.href = `/hire.html?id=${hire.id}`;
    }, 500);
  } catch (error) {
    console.error('Error creating hire:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
});

// Set today's date as default
document.getElementById('startDate').valueAsDate = new Date();
