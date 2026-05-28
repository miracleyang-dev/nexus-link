// App Entry Point
let currentView = 'contacts';

function switchView(view) {
  currentView = view;
  // Hide all views
  document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
  // Show target
  document.getElementById(`view-${view}`).classList.remove('hidden');

  // Update desktop sidebar nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const desktopBtn = document.querySelector(`[data-nav="${view}"]`);
  if (desktopBtn) desktopBtn.classList.add('active');

  // Update mobile bottom nav
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));
  const mobileBtn = document.querySelector(`[data-nav-m="${view}"]`);
  if (mobileBtn) mobileBtn.classList.add('active');

  // Init view
  switch (view) {
    case 'contacts': Contacts.init(); break;
    case 'timeline': Timeline.init(); break;
    case 'graph': Graph.init(); break;
    case 'reminders': Reminders.init(); break;
    case 'dashboard': Dashboard.init(); break;
    case 'settings': Settings.init(); break;
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  switchView('contacts');
  // Load reminder count for badge
  Reminders.init().catch(() => {});
});