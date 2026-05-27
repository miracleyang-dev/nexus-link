// Reminders Module
const Reminders = {
  reminders: [],
  contacts: [],

  async init() {
    const [reminders, upcoming, contacts] = await Promise.all([
      API.getReminders(),
      API.getUpcomingReminders(),
      API.getContacts()
    ]);
    // Merge and deduplicate
    const allMap = new Map();
    reminders.forEach(r => allMap.set(r.id, r));
    upcoming.forEach(r => { if (r.id && !allMap.has(r.id)) allMap.set(r.id, r); });
    // Add auto-generated birthday reminders (they have no id)
    const autoReminders = upcoming.filter(r => !r.id);

    this.reminders = [...allMap.values()];
    this.autoReminders = autoReminders;
    this.contacts = contacts;

    // Update badge (desktop + mobile)
    const upcomingCount = upcoming.filter(r => !r.is_completed).length;
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

    // Split into categories
    const overdue = this.reminders.filter(r => !r.is_completed && new Date(r.remind_date) < now);
    const upcoming = this.reminders.filter(r => !r.is_completed && new Date(r.remind_date) >= now);
    const completed = this.reminders.filter(r => r.is_completed);

    // Type config
    const typeConfig = {
      birthday: { icon: '🎂', color: '#ec4899', label: '生日' },
      anniversary: { icon: '💫', color: '#f59e0b', label: '纪念日' },
      follow_up: { icon: '📋', color: '#3b82f6', label: '跟进' },
      custom: { icon: '📌', color: '#6b7280', label: '自定义' },
    };

    el.innerHTML = `
      <div class="p-6 lg:p-8">
        <div class="flex items-center justify-between mb-6 gap-3">
          <div class="min-w-0">
            <h2 class="text-2xl font-bold text-white">智能提醒</h2>
            <p class="text-sm text-gray-500 mt-1">待处理 ${overdue.length + upcoming.length} 项</p>
          </div>
          <button onclick="Reminders.showAddModal()" class="btn-primary flex items-center gap-2 shrink-0 text-xs sm:text-[13px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span class="hidden sm:inline">添加提醒</span><span class="sm:hidden">添加</span>
          </button>
        </div>

        <!-- Auto birthday reminders -->
        ${this.autoReminders.length ? `
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">🎂 即将到来的生日</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${this.autoReminders.map(r => {
              const days = Utils.daysUntil(r.remind_date);
              return `<div class="glass-card p-4 flex items-center gap-4" style="--accent-color:#ec4899">
                <div class="type-icon text-lg" style="background:rgba(236,72,153,0.15)">🎂</div>
                <div class="flex-1">
                  <p class="text-sm font-medium text-white">${r.title}</p>
                  <p class="text-xs text-gray-400">${Utils.formatDate(r.remind_date)} · ${days > 0 ? `还有 ${days} 天` : days === 0 ? '就是今天！' : ''}</p>
                </div>
                ${days <= 7 ? `<span class="text-xs px-2 py-1 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20">即将到来</span>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- Overdue -->
        ${overdue.length ? `
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">⚠️ 已逾期 (${overdue.length})</h3>
          <div class="space-y-3">
            ${overdue.map(r => this.cardHTML(r, typeConfig, true)).join('')}
          </div>
        </div>` : ''}

        <!-- Upcoming -->
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-gray-400 mb-3">📅 待处理 (${upcoming.length})</h3>
          ${upcoming.length ? `<div class="space-y-3">${upcoming.map(r => this.cardHTML(r, typeConfig, false)).join('')}</div>` :
            `<div class="text-sm text-gray-500 py-4">暂无待处理提醒</div>`}
        </div>

        <!-- Completed -->
        ${completed.length ? `
        <div>
          <h3 class="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span>✓ 已完成 (${completed.length})</span>
            <button onclick="this.parentElement.parentElement.querySelector('.completed-list').classList.toggle('hidden')" class="text-xs text-gray-500 hover:text-gray-300">展开/收起</button>
          </h3>
          <div class="completed-list hidden space-y-3">
            ${completed.map(r => this.cardHTML(r, typeConfig, false)).join('')}
          </div>
        </div>` : ''}
      </div>
    `;
  },

  cardHTML(r, typeConfig, isOverdue) {
    const tc = typeConfig[r.type] || typeConfig.custom;
    const days = Utils.daysUntil(r.remind_date);
    const daysText = days > 0 ? `${days}天后` : days === 0 ? '今天' : `逾期${Math.abs(days)}天`;

    return `
      <div class="glass-card p-4 flex items-center gap-4 ${r.is_completed ? 'opacity-50' : ''} ${isOverdue ? 'border-red-500/20' : ''}">
        <button onclick="Reminders.toggleComplete(${r.id}, ${r.is_completed ? 0 : 1})"
          class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
          ${r.is_completed ? 'bg-neon-green border-neon-green' : 'border-gray-600 hover:border-neon-blue'}"
        >${r.is_completed ? '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>' : ''}</button>

        <div class="type-icon" style="background:${tc.color}20;color:${tc.color}">${tc.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-white ${r.is_completed ? 'line-through' : ''}">${r.title}</p>
            <span class="text-[10px] px-1.5 py-0.5 rounded-full" style="background:${tc.color}15;color:${tc.color};border:1px solid ${tc.color}30">${tc.label}</span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">
            ${Utils.formatDate(r.remind_date)}
            ${r.contact_name ? ` · ${r.contact_name}` : ''}
            ${r.description ? ` · ${r.description}` : ''}
          </p>
        </div>
        <div class="shrink-0 flex items-center gap-2">
          <span class="text-xs ${isOverdue ? 'text-red-400' : days <= 3 ? 'text-yellow-400' : 'text-gray-500'}">${daysText}</span>
          <button onclick="Reminders.deleteItem(${r.id})" class="text-gray-600 hover:text-red-400 text-xs p-1">✕</button>
        </div>
      </div>
    `;
  },

  async toggleComplete(id, val) {
    try {
      await API.updateReminder(id, { is_completed: val });
      Utils.toast(val ? '已标记完成' : '已取消完成');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  async deleteItem(id) {
    if (!confirm('确定删除此提醒？')) return;
    try {
      await API.deleteReminder(id);
      Utils.toast('提醒已删除');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  showAddModal() {
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">添加提醒</h2>
        <form onsubmit="Reminders.saveItem(event)" class="space-y-4">
          <div><label class="detail-label block mb-1">标题 *</label><input name="title" class="form-input" required></div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">提醒日期 *</label><input name="remind_date" type="date" class="form-input" required></div>
            <div><label class="detail-label block mb-1">类型</label>
              <select name="type" class="form-input">
                <option value="custom">📌 自定义</option>
                <option value="birthday">🎂 生日</option>
                <option value="anniversary">💫 纪念日</option>
                <option value="follow_up">📋 跟进</option>
              </select>
            </div>
          </div>
          <div><label class="detail-label block mb-1">关联联系人</label>
            <select name="contact_id" class="form-input">
              <option value="">不关联</option>
              ${this.contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div><label class="detail-label block mb-1">描述</label><textarea name="description" class="form-input" rows="2"></textarea></div>
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">保存</button>
          </div>
        </form>
      </div>
    `);
  },

  async saveItem(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {};
    for (const [k, v] of form.entries()) data[k] = v;
    if (data.contact_id) data.contact_id = parseInt(data.contact_id);
    else delete data.contact_id;
    try {
      await API.createReminder(data);
      Utils.closeModal();
      Utils.toast('提醒已创建');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },
};
