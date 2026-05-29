// Reminders Module - Birthday only
const Reminders = {
  reminders: [],

  async init() {
    const [all, upcoming] = await Promise.all([
      API.getReminders(),
      API.getUpcomingReminders()
    ]);

    this.reminders = all;
    const upcomingReminders = upcoming;

    // Update badge (desktop + mobile)
    const upcomingCount = upcomingReminders.length;
    ['reminder-badge', 'reminder-badge-m'].forEach(id => {
      const badge = document.getElementById(id);
      if (!badge) return;
      if (upcomingCount > 0) {
        badge.textContent = upcomingCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    });

    this.render();
  },

  render() {
    const el = document.getElementById('view-reminders');
    const now = new Date();
    now.setHours(0,0,0,0);

    // Split by timing
    const upcoming = this.reminders.filter(r => {
      const d = new Date(r.remind_date);
      d.setHours(0,0,0,0);
      return d >= now;
    });
    const past = this.reminders.filter(r => {
      const d = new Date(r.remind_date);
      d.setHours(0,0,0,0);
      return d < now;
    });

    // Group upcoming by month
    const groupedUpcoming = {};
    upcoming.forEach(r => {
      const month = r.remind_date.slice(0, 7);
      if (!groupedUpcoming[month]) groupedUpcoming[month] = [];
      groupedUpcoming[month].push(r);
    });
    const sortedMonths = Object.keys(groupedUpcoming).sort();

    el.innerHTML = `
      <div class="p-6 lg:p-8">
        <div class="flex items-center justify-between mb-6 gap-3">
          <div class="min-w-0">
            <h2 class="text-2xl font-bold text-white">生日提醒</h2>
            <p class="text-sm text-gray-500 mt-1">共 ${this.reminders.length} 位联系人有生日记录</p>
          </div>
        </div>

        <p class="text-xs text-gray-600 mb-6">💡 在联系人信息中填写生日后，系统会自动创建提醒并每年循环，支持公历与农历。</p>

        <!-- Upcoming birthdays grouped by month -->
        ${sortedMonths.length ? sortedMonths.map(month => `
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-neon-blue/10 text-neon-blue">${month}</span>
              <span>${groupedUpcoming[month].length} 个生日</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${groupedUpcoming[month].map(r => this.cardHTML(r)).join('')}
            </div>
          </div>
        `).join('') : `
          <div class="text-sm text-gray-500 py-8 text-center">暂无即将到来的生日</div>
        `}

        <!-- Past (completed cycle) -->
        ${past.length ? `
        <div class="mt-8">
          <h3 class="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span>已过期（将自动滚动到下一年）</span>
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-50">
            ${past.map(r => this.cardHTML(r)).join('')}
          </div>
        </div>` : ''}
      </div>
    `;
  },

  cardHTML(r) {
    const days = Utils.daysUntil(r.remind_date);
    let daysText, urgencyClass;
    if (days === 0) { daysText = '就是今天！'; urgencyClass = 'text-neon-pink'; }
    else if (days > 0 && days <= 7) { daysText = `还有 ${days} 天`; urgencyClass = 'text-yellow-400'; }
    else if (days > 7) { daysText = `还有 ${days} 天`; urgencyClass = 'text-gray-400'; }
    else { daysText = `已过 ${Math.abs(days)} 天`; urgencyClass = 'text-gray-500'; }

    const dateDisplay = Utils.formatDate(r.remind_date);

    return `
      <div class="glass-card p-4 flex items-center gap-4">
        <div class="type-icon text-lg" style="background:rgba(236,72,153,0.15)">🎂</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white">${r.title}</p>
          <p class="text-xs text-gray-400">${dateDisplay}</p>
        </div>
        <span class="text-xs ${urgencyClass} shrink-0">${daysText}</span>
      </div>
    `;
  },
};
