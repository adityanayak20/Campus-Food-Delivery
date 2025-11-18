let adminData = JSON.parse(localStorage.getItem('adminData'));
let allOrders = [];

if (!adminData) {
  window.location.href = '/';
}

async function loadDashboard() {
  await loadOrders();
  await loadMenuItems();
}

async function loadOrders() {
  console.log('Loading orders for outlet:', adminData.outletId);
  try {
    const response = await fetch(`/api/admin/orders/${adminData.outletId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load orders');
    }
    allOrders = data;
    displayOrders(data);
  } catch (error) {
    console.error('Error loading orders:', error);
    document.getElementById('ordersTableBody').innerHTML =
      `<tr><td colspan="6">Error loading orders. Please check console for details.</td></tr>`;
  }
}

function displayOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '';
  orders.forEach(order => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>#${order.order_id}</td>
            <td>${order.studentname}</td>
            <td class="items-list">
                ${(order.items || []).map(item => `
                    <div>${item.item_name} - ₹${item.price} x ${item.quantity}</div>
                `).join('')}
            </td>
            <td>₹${order.totalamount}</td>
            <td class="status-${(order.status || '').toLowerCase()}">${order.status}</td>
            <td>
                ${order.status === 'Pending' ?
        `<button onclick="updateOrderStatus(${order.order_id}, 'Completed')" class="action-btn complete-btn">Mark Complete</button>` :
        `<button onclick="updateOrderStatus(${order.order_id}, 'Pending')" class="action-btn revert-btn">Revert to Pending</button>`
      }
            </td>
        `;
    tbody.appendChild(tr);
  });
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch(`/api/admin/orders/updateStatus/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update order status');
    }
    loadOrders();
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Error updating order status. Please try again.');
  }
}

function filterOrders(filter) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');

  let filteredOrders = allOrders;
  if (filter !== 'all') {
    filteredOrders = allOrders.filter(order =>
      (order.status || '').toLowerCase() === filter
    );
  }
  displayOrders(filteredOrders);
}

async function loadMenuItems() {
  try {
    const response = await fetch('/api/admin/menu/1');
    const items = await response.json();
    if (!response.ok) {
      throw new Error(items.error || 'Failed to load menu items');
    }
    const menuContainer = document.getElementById('menuItems');
    menuContainer.innerHTML = '';
    items.forEach(item => {
      const itemCard = document.createElement('div');
      itemCard.className = 'menu-item';
      itemCard.innerHTML = `
                <button onclick="deleteMenuItem(${item.item_id})" class="delete-btn">×</button>
                <h3>${item.item_name}</h3>
                <p>₹${item.price}</p>
                <p>${item.type}</p>
            `;
      menuContainer.appendChild(itemCard);
    });
  } catch (error) {
    console.error('Error loading menu items:', error);
    document.getElementById('menuItems').innerHTML = 'Error loading menu items';
  }
}

async function addMenuItem(event) {
  event.preventDefault();
  const name = document.getElementById('itemName').value;
  const price = document.getElementById('itemPrice').value;
  const category = document.getElementById('itemCategory').value;
  const type = category === 'Non-Vegetarian' ? 'Non-Veg' : 'Veg';
  try {
    const response = await fetch('/api/admin/menu/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, type, outletId: 1 })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to add menu item');
    }
    closeModal();
    loadMenuItems();
  } catch (error) {
    console.error('Error adding menu item:', error);
    alert('Error adding menu item');
  }
}

async function deleteMenuItem(itemId) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  try {
    const response = await fetch(`/api/admin/menu/delete/${itemId}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error deleting menu item');
    }
    loadMenuItems();
  } catch (error) {
    console.error('Error deleting menu item:', error);
    alert('Error deleting menu item');
  }
}

function showAddItemForm() {
  document.getElementById('addItemModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('addItemModal').style.display = 'none';
  document.getElementById('addItemForm').reset();
}

function logout() {
  localStorage.removeItem('adminData');
  window.location.href = '/';
}

loadDashboard();
setInterval(loadOrders, 30000);

