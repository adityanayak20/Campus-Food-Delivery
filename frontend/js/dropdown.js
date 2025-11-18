// Simple navigation from dropdown to Red Chillies page for now

document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.menu-btn');
  if (button) {
    button.addEventListener('click', () => {
      window.location.href = '/frontend/RC.html';
    });
  }
});

