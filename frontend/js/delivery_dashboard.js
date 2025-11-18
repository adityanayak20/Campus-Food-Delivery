async function loadOrders() {
  const deliveryPersonId = localStorage.getItem('deliveryPersonId');
  if (!deliveryPersonId) {
    window.location.href = '/frontend/delivery_login.html';
    return;
  }
  try {
    const response = await fetch(`/api/delivery/orders/${deliveryPersonId}`);
    const orders = await response.json();
    if (!response.ok) {
      throw new Error(orders.error || 'Failed to load orders');
    }
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = orders.map(order => `
            <div class="card mb-3 ${order.status === 'Pending' ? 'border-danger' : 'border-success'}" style="border-width: 3px;">
                <div class="card-body">
                    <h5 class="card-title">Order #${order.order_id}</h5>
                    <p><strong>Items:</strong> ${order.orderitems}</p>
                    <p><strong>Student ID:</strong> ${order.stud_id}</p>
                    <p><strong>Phone:</strong> ${order.studentphone}</p>
                    <p><strong>Hostel:</strong> ${order.hostel}</p>
                    <p><strong>Total Amount:</strong> ₹${order.totalamount}</p>
                    <p><strong>Status:</strong> <span class="${order.status === 'Pending' ? 'text-danger' : 'text-success'}">${order.status}</span></p>
                </div>
            </div>
        `).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadOrders);

