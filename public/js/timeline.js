// Timeline Module
const Timeline = {
  interactions: [],
  contacts: [],
  filterContactId: '',

  async init() {
    const [interactions, contacts] = await Promise.all([
      API.getInteractions(),
      API.getContacts()
    ]);
    this.interactions = interactions;
    this.contacts = contacts;
    this.render();
  },

  render() {
    const el = document.getElementById('view-timeline');
    let filtered = this.interactions;
    if (this.filterContactId) {
      filtered = filtered.filter(i => i.contact_id == this.filterContactId);
    }

    // Group by month
    const grouped = {};
    filtered.forEach(i => {
      const month = i.date.slice(0, 7);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(i);
    });

    const months = Object.keys(grouped).sort().reverse();

    el.innerHTML = `
      <div class="p-6 lg:p-8">
        <div class="flex items-center justify-between mb-6 gap-3">
          <div class="min-w-0">
            <h2 class="text-2xl font-bold text-white">互动时间线</h2>
            <p class="text-sm text-gray-500 mt-1">共 ${filtered.length} 条互动记录</p>
          </div>
          <button onclick="Timeline.showAddModal()" class="btn-primary flex items-center gap-2 shrink-0 text-xs sm:text-[13px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span class="hidden sm:inline">记录互动</span><span class="sm:hidden">记录</span>
          </button>
        </div>

        <!-- Contact filter -->
        <div class="flex gap-3 mb-6">
          <select onchange="Timeline.filterByContact(this.value)" class="form-input w-48">
            <option value="">全部联系人</option>
            ${this.contacts.map(c => `<option value="${c.id}" ${this.filterContactId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>

        <!-- Timeline -->
        ${months.length ? months.map(month => `
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
              <div class="px-3 py-1 rounded-lg bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-sm font-semibold">${month}</div>
              <div class="flex-1 h-px bg-white/5"></div>
              <span class="text-xs text-gray-500">${grouped[month].length} 条记录</span>
            </div>
            <div class="relative pl-10 space-y-4">
              <div class="timeline-line"></div>
              ${grouped[month].map(i => this.itemHTML(i)).join('')}
            </div>
          </div>
        `).join('') : `
          <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="text-sm">暂无互动记录</p>
          </div>
        `}
      </div>
    `;
  },

  itemHTML(i) {
    const t = Utils.interactionTypes[i.type] || Utils.interactionTypes.other;
    const contactName = i.contact_name || '未知';
    return `
      <div class="relative glass-card p-4">
        <div class="timeline-dot"></div>
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div class="type-icon" style="background:${t.color}20;color:${t.color}">${t.icon}</div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-semibold text-white text-sm">${i.title}</h4>
                <span class="mood-indicator">${Utils.moods[i.mood] || ''}</span>
              </div>
              <p class="text-xs text-gray-400 mb-1">
                <span class="text-neon-blue">${contactName}</span> · ${t.label} · ${Utils.formatDate(i.date)}
                ${i.location ? ` · 📍 ${i.location}` : ''}
              </p>
              ${i.content ? `<p class="text-sm text-gray-300 mt-2">${i.content}</p>` : ''}
            </div>
          </div>
          <button onclick="Timeline.deleteItem(${i.id})" class="text-gray-600 hover:text-red-400 transition-colors text-xs p-1" title="删除">✕</button>
        </div>
      </div>
    `;
  },

  filterByContact(id) {
    this.filterContactId = id;
    this.render();
  },

  showAddModal() {
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">记录新互动</h2>
        <form onsubmit="Timeline.saveItem(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">联系人 *</label>
              <select name="contact_id" class="form-input" required>
                <option value="">选择联系人</option>
                ${this.contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div><label class="detail-label block mb-1">类型</label>
              <select name="type" class="form-input">
                ${Object.entries(Utils.interactionTypes).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <div><label class="detail-label block mb-1">标题 *</label><input name="title" class="form-input" required></div>
          <div><label class="detail-label block mb-1">内容</label><textarea name="content" class="form-input" rows="3"></textarea></div>
          <div class="grid grid-cols-3 gap-4">
            <div><label class="detail-label block mb-1">日期</label><input name="date" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" required></div>
            <div><label class="detail-label block mb-1">地点</label><input name="location" class="form-input"></div>
            <div><label class="detail-label block mb-1">心情</label>
              <select name="mood" class="form-input">
                ${[5,4,3,2,1].map(i => `<option value="${i}">${Utils.moods[i]} ${i}分</option>`).join('')}
              </select>
            </div>
          </div>
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
    data.contact_id = parseInt(data.contact_id);
    data.mood = parseInt(data.mood) || 3;
    try {
      await API.createInteraction(data);
      Utils.closeModal();
      Utils.toast('互动记录已保存');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  async deleteItem(id) {
    if (!confirm('确定删除这条互动记录？')) return;
    try {
      await API.deleteInteraction(id);
      Utils.toast('已删除');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },
};
