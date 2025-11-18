function showCart() {
  document.getElementById('cart-modal').style.display = 'block';
  updateCart();
}

function closeCart() {
  document.getElementById('cart-modal').style.display = 'none';
}

function addToCart(itemName, price) {
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const existingItem = cartItems.find(item => item.item === itemName);
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + 1;
    existingItem.totalPrice = existingItem.price * existingItem.quantity;
  } else {
    cartItems.push({ item: itemName, price, quantity: 1, totalPrice: price });
  }
  localStorage.setItem('cartItems', JSON.stringify(cartItems));
  updateCartCount();
  updateCart();
}

function updateCartCount() {
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector('.cart-count').textContent = totalItems;
}

function updateQuantity(itemName, change) {
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const item = cartItems.find(item => item.item === itemName);
  if (item) {
    item.quantity = Math.max(0, item.quantity + change);
    item.totalPrice = item.price * item.quantity;
    if (item.quantity === 0) {
      const index = cartItems.indexOf(item);
      cartItems.splice(index, 1);
    }
  }
  localStorage.setItem('cartItems', JSON.stringify(cartItems));
  updateCartCount();
  updateCart();
}

function updateCart() {
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const cartList = document.getElementById('cartItems');
  const totalElement = document.getElementById('total');
  let total = 0;
  cartList.innerHTML = cartItems.map(item => {
    total += item.totalPrice;
    return `
            <div class="cart-item">
                <span>${item.item}</span>
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item.item}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.item}', 1)">+</button>
                </div>
                <span>₹${item.totalPrice}</span>
            </div>
        `;
  }).join('');
  totalElement.textContent = `₹${total}`;
  localStorage.setItem('cartTotal', total);
}

async function loadMenuItems() {
  try {
    const response = await fetch('/api/admin/menu/1');
    const menuItems = await response.json();
    if (!response.ok) {
      throw new Error(menuItems.error || 'Failed to load menu items');
    }
    const vegMenu = document.getElementById('vegMenu');
    const nonVegMenu = document.getElementById('nonVegMenu');
    vegMenu.innerHTML = '';
    nonVegMenu.innerHTML = '';
    menuItems.forEach(item => {
      const row = `
                <tr>
                    <td>${item.item_name}</td>
                    <td>₹${item.price}</td>
                    <td><button onclick="addToCart('${item.item_name}', ${item.price})">Add to Cart</button></td>
                </tr>
            `;
      if (item.type === 'Veg') {
        vegMenu.innerHTML += row;
      } else {
        nonVegMenu.innerHTML += row;
      }
    });
  } catch (error) {
    console.error('Error loading menu items:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadMenuItems();
  updateCartCount();
});

async function placeOrder() {
  const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
  const studentId = localStorage.getItem('studentId');
  if (!studentId) {
    alert('Please login first');
    window.location.href = '/';
    return;
  }
  if (cartItems.length === 0) {
    alert('Your cart is empty');
    return;
  }
  const orderData = {
    items: cartItems,
    totalAmount: parseFloat(localStorage.getItem('cartTotal')),
    studentId
  };
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to place order');
    }
    alert('Order placed successfully!');
    localStorage.removeItem('cartItems');
    localStorage.removeItem('cartTotal');
    updateCartCount();
    closeCart();
  } catch (error) {
    console.error('Order error:', error);
    alert('Error placing order');
  }
}