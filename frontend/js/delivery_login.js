document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const phoneNo = document.getElementById('phoneNo').value;
  try {
    const response = await fetch('/api/delivery/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNo })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }
    localStorage.setItem('deliveryPersonId', data.deliveryPersonId);
    localStorage.setItem('deliveryPersonName', data.name);
    window.location.href = '/frontend/delivery_dashboard.html';
  } catch (error) {
    console.error('Delivery login error:', error);
    alert('Error logging in');
  }
});