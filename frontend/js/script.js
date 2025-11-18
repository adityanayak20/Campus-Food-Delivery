function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(tabName).style.display = 'block';
  document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
}

async function loginStudent(event) {
  event.preventDefault();
  try {
    const phoneNo = document.getElementById('loginPhone').value;
    const response = await fetch('/api/students/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNo })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }
    localStorage.setItem('studentId', data.studentId);
    window.location.href = '/frontend/dropdown.html';
  } catch (error) {
    console.error('Login error:', error);
    alert('Error during login. Please try again.');
  }
}

async function registerStudent(event) {
  event.preventDefault();
  const studentData = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    phoneNo: document.getElementById('phoneNo').value,
    hostel: document.getElementById('hostel').value
  };
  try {
    const response = await fetch('/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(studentData)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Registration failed');
    }
    localStorage.setItem('studentId', data.studentId);
    localStorage.setItem('firstName', studentData.firstName);
    window.location.href = '/frontend/dropdown.html';
  } catch (error) {
    console.error('Registration error:', error);
    alert('Error during registration. Please try again.');
  }
}

async function loginAdmin(event) {
  event.preventDefault();
  const username = document.getElementById('adminUsername').value;
  const password = document.getElementById('adminPassword').value;
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }
    localStorage.setItem('adminData', JSON.stringify({ token: data.token, outletId: data.outletId }));
    window.location.href = '/frontend/admin.html';
  } catch (error) {
    console.error('Admin login error:', error);
    alert('Error during admin login. Please try again.');
  }
}

async function loginDelivery(event) {
  event.preventDefault();
  const phoneNo = document.getElementById('deliveryPhone').value;
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
    alert('Error logging in as delivery person.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  showTab('login');
});