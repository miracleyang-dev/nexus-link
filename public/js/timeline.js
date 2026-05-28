// Timeline Module - with online pings tab
const Timeline = {
  interactions: [],
  contacts: [],
  filterContactId: '',
  activeTab: 'interactions', // 'interactions' or 'pings'
  pings: {},
  dragContactId: null,

  async init() {
    const [interactions, contacts] = await Promise.all([
      API.getInteractions(),
      API.getContacts()
    ]);
    this.interactions = interactions;
    this.contacts = contacts;
    if (this.activeTab === 'pings') {
      this.pings = await API.getPings(7);
    }
    this.render();
  },

  render() {
    const el = document.getElementById('view-timeline');
    el.innerHTML = `
      <div class="p-6 lg:p-8">
        <div class="flex items-center justify-between mb-6 gap-3">
          <div class="min-w-0">
            <h2 class="text-2xl font-bold text-white">互动</h2>
          </div>
          ${this.activeTab === 'interactions' ? `
          <button onclick="Timeline.showAddModal()" class="btn-primary flex items-center gap-2 shrink-0 text-xs sm:text-[13px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span class="hidden sm:inline">记录互动</span><span class="sm:hidden">记录</span>
          </button>` : ''}
        </div>

        <!-- Tab Switch -->
        <div class="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 mb-6 w-fit">
          <button onclick="Timeline.switchTab('interactions')" class="text-xs px-4 py-1.5 rounded-md transition-all ${this.activeTab === 'interactions' ? 'bg-neon-blue/20 text-neon-blue font-medium' : 'text-gray-500 hover:text-gray-300'}">互动记录</button>
          <button onclick="Timeline.switchTab('pings')" class="text-xs px-4 py-1.5 rounded-md transition-all ${this.activeTab === 'pings' ? 'bg-neon-blue/20 text-neon-blue font-medium' : 'text-gray-500 hover:text-gray-300'}">线上互动</button>
        </div>

        <div id="timeline-content"></div>
      </div>
    `;

    if (this.activeTab === 'interactions') {
      this.renderInteractions();
    } else {
      this.renderPings();
    }
  },

  async switchTab(tab) {
    this.activeTab = tab;
    if (tab === 'pings' && Object.keys(this.pings).length === 0) {
      this.pings = await API.getPings(7);
    }
    this.render();
  },

  // ── Interactions Tab ──

  renderInteractions() {
    const el = document.getElementById('timeline-content');
    let filtered = this.interactions;
    if (this.filterContactId) {
      const contact = this.contacts.find(c => c.id == this.filterContactId);
      if (contact) {
        const targetName = contact.name;
        filtered = filtered.filter(i => (i.contact_names || '').split(',').includes(targetName));
      } else {
        filtered = [];
      }
    }

    // Group by month in a single pass
    const grouped = {};
    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      const month = item.date.slice(0, 7);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(item);
    }
    const months = Object.keys(grouped).sort().reverse();

    el.innerHTML = `
      <p class="text-sm text-gray-500 mb-4">共 ${filtered.length} 条互动记录</p>
      <!-- Contact filter -->
      <div class="flex gap-3 mb-6">
        <select onchange="Timeline.filterByContact(this.value)" class="form-input w-48">
          <option value="">全部联系人</option>
          ${this.contacts.map(c => `<option value="${c.id}" ${this.filterContactId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>

      ${months.length ? months.map(month => `
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-4">
            <div class="px-3 py-1 rounded-lg bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-sm font-semibold">${month}</div>
            <div class="flex-1 h-px bg-white/5"></div>
            <span class="text-xs text-gray-500">${grouped[month].length} 条</span>
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
    `;
  },

  itemHTML(i) {
    const t = Utils.interactionTypes[i.type] || Utils.interactionTypes.other;
    const contactNames = i.contact_names || '未知';
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
                <span class="text-neon-blue">${contactNames}</span> · ${t.label} · ${Utils.formatDate(i.date)}
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

  // ── Online Pings Tab ──

  renderPings() {
    const el = document.getElementById('timeline-content');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Build last 7 days
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    // Contacts not yet pinged today
    const todayPingedIds = (this.pings[todayStr] || []).map(p => p.contact_id);
    const unpinged = this.contacts.filter(c => !todayPingedIds.includes(c.id));

    el.innerHTML = `
      <p class="text-xs text-gray-500 mb-4">将联系人拖入今日区域，标记线上互动。每人每天仅记录一次。</p>

      <!-- Today's drop zone -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
          今日 · ${todayStr}
        </h3>
        <div id="ping-drop-zone"
          class="min-h-[72px] p-3 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-all flex flex-wrap gap-2 items-start"
          ondragover="Timeline.onDragOver(event)"
          ondragleave="Timeline.onDragLeave(event)"
          ondrop="Timeline.onDrop(event, '${todayStr}')">
          ${(this.pings[todayStr] || []).map(p => `
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 group">
              ${Utils.avatarHTML(p.contact_name, 22)}
              <span class="text-xs text-gray-200">${p.contact_name}</span>
              <button onclick="Timeline.removePing('${todayStr}', ${p.contact_id})" class="text-gray-600 hover:text-red-400 text-[10px] ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          `).join('')}
          ${(this.pings[todayStr] || []).length === 0 ? '<span class="text-xs text-gray-600 py-2">拖入联系人到此处</span>' : ''}
        </div>
      </div>

      <!-- Draggable contacts pool -->
      <div class="mb-8">
        <h3 class="text-sm font-semibold text-gray-400 mb-3">联系人</h3>
        <div class="flex flex-wrap gap-2" id="ping-contact-pool">
          ${unpinged.map(c => `
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 cursor-grab active:cursor-grabbing hover:border-white/15 transition-all"
              draggable="true"
              ondragstart="Timeline.onDragStart(event, ${c.id}, '${c.name}')"
              data-contact-id="${c.id}">
              ${Utils.avatarHTML(c.name, 22)}
              <span class="text-xs text-gray-300">${c.name}</span>
            </div>
          `).join('')}
          ${unpinged.length === 0 ? '<span class="text-xs text-gray-600 py-2">今日已全部标记</span>' : ''}
        </div>
      </div>

      <!-- Recent history -->
      <div>
        <h3 class="text-sm font-semibold text-gray-400 mb-3">近期记录</h3>
        <div class="space-y-3">
          ${days.slice(1).map(dateStr => {
            const dayPings = this.pings[dateStr] || [];
            const d = new Date(dateStr + 'T00:00:00');
            const weekday = ['日','一','二','三','四','五','六'][d.getDay()];
            return `
              <div class="flex items-start gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div class="shrink-0 text-center w-14">
                  <div class="text-xs text-gray-500">周${weekday}</div>
                  <div class="text-sm text-gray-300 font-medium">${dateStr.slice(5)}</div>
                </div>
                <div class="flex flex-wrap gap-1.5 flex-1">
                  ${dayPings.length ? dayPings.map(p => `
                    <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5">
                      ${Utils.avatarHTML(p.contact_name, 18)}
                      <span class="text-[11px] text-gray-400">${p.contact_name}</span>
                    </div>
                  `).join('') : '<span class="text-[11px] text-gray-600">无记录</span>'}
                </div>
                <span class="text-[11px] text-gray-600 shrink-0">${dayPings.length} 人</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // Drag & Drop handlers
  onDragStart(e, contactId, contactName) {
    this.dragContactId = contactId;
    e.dataTransfer.setData('text/plain', contactId);
    e.dataTransfer.effectAllowed = 'move';
    // Highlight drop zone
    setTimeout(() => {
      const zone = document.getElementById('ping-drop-zone');
      if (zone) zone.classList.add('border-neon-blue/40', 'bg-neon-blue/5');
    }, 0);
  },

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const zone = document.getElementById('ping-drop-zone');
    if (zone) zone.classList.add('border-neon-blue/40', 'bg-neon-blue/5');
  },

  onDragLeave(e) {
    const zone = document.getElementById('ping-drop-zone');
    if (zone) zone.classList.remove('border-neon-blue/40', 'bg-neon-blue/5');
  },

  async onDrop(e, dateStr) {
    e.preventDefault();
    const zone = document.getElementById('ping-drop-zone');
    if (zone) zone.classList.remove('border-neon-blue/40', 'bg-neon-blue/5');

    const contactId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!contactId) return;

    try {
      await API.createPing(dateStr, contactId);
      // Refresh pings
      this.pings = await API.getPings(7);
      this.renderPings();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  async removePing(dateStr, contactId) {
    try {
      await API.deletePing(dateStr, contactId);
      this.pings = await API.getPings(7);
      this.renderPings();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  // ── Shared ──

  filterByContact(id) {
    this.filterContactId = id;
    this.renderInteractions();
  },

  showAddModal() {
    this._showAddModalInner(false);
  },

  _showAddModalInner(multiMode) {
    Utils.showModal(`
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-bold text-white">记录新互动</h2>
          <div class="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            <button type="button" onclick="Timeline._showAddModalInner(false)" class="text-[11px] px-2.5 py-1 rounded-md transition-all ${!multiMode ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-500 hover:text-gray-300'}">单人</button>
            <button type="button" onclick="Timeline._showAddModalInner(true)" class="text-[11px] px-2.5 py-1 rounded-md transition-all ${multiMode ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-500 hover:text-gray-300'}">多人</button>
          </div>
        </div>
        <form onsubmit="Timeline.saveItem(event)" class="space-y-4">
          ${multiMode ? `
          <div>
            <label class="detail-label block mb-2">参与人 * <span class="text-gray-600 text-[10px]">（可多选）</span></label>
            <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-lg bg-white/[0.02] border border-white/5">
              ${this.contacts.map(c => `
                <label class="tag-pill cursor-pointer text-xs" style="color:#9ca3af;border-color:rgba(156,163,175,0.3);background:rgba(156,163,175,0.05)">
                  <input type="checkbox" name="contact_ids" value="${c.id}" class="hidden peer" onchange="this.parentElement.style.borderColor=this.checked?'#00d4ff':'rgba(156,163,175,0.3)';this.parentElement.style.color=this.checked?'#00d4ff':'#9ca3af';this.parentElement.style.background=this.checked?'rgba(0,212,255,0.1)':'rgba(156,163,175,0.05)'">
                  ${c.name}
                </label>
              `).join('')}
            </div>
          </div>
          ` : `
          <div><label class="detail-label block mb-1">联系人 *</label>
            <select name="contact_id_single" class="form-input" required>
              <option value="">选择联系人</option>
              ${this.contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          `}
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">类型</label>
              <select name="type" class="form-input">
                ${Object.entries(Utils.interactionTypes).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
              </select>
            </div>
            <div><label class="detail-label block mb-1">日期</label><input name="date" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" required></div>
          </div>
          <div><label class="detail-label block mb-1">标题 *</label><input name="title" class="form-input" required></div>
          <div><label class="detail-label block mb-1">内容</label><textarea name="content" class="form-input" rows="3"></textarea></div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">地点</label><input name="location" class="form-input"></div>
            <div><label class="detail-label block mb-1">心情</label>
              <select name="mood" class="form-input">
                ${[5,4,3,2,1].map(i => `<option value="${i}">${Utils.moods[i]} ${i}分</option>`).join('')}
              </select>
            </div>
          </div>
          <input type="hidden" name="_multiMode" value="${multiMode ? '1' : '0'}">
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
    for (const [k, v] of form.entries()) {
      if (k === 'contact_ids' || k === '_multiMode') continue;
      data[k] = v;
    }
    data.mood = parseInt(data.mood) || 3;

    const isMulti = form.get('_multiMode') === '1';
    if (isMulti) {
      const ids = form.getAll('contact_ids').map(Number).filter(Boolean);
      if (ids.length === 0) {
        Utils.toast('请至少选择一位参与人', 'error');
        return;
      }
      data.contact_ids = ids;
    } else {
      const singleId = parseInt(form.get('contact_id_single'));
      if (!singleId) {
        Utils.toast('请选择联系人', 'error');
        return;
      }
      data.contact_ids = [singleId];
    }
    delete data.contact_id_single;

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
