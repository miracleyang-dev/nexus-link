// Timeline Module - with online pings tab
const Timeline = {
  interactions: [],
  contacts: [],
  filterContactId: '',
  activeTab: 'interactions', // 'interactions' or 'pings'
  pings: {},
  dragContactId: null,
  pingFilterContactId: '',

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
          <button onclick="Timeline.switchTab('interactions')" class="text-xs px-4 py-1.5 rounded-md transition-all ${this.activeTab === 'interactions' ? 'bg-neon-blue/20 text-neon-blue font-medium' : 'text-gray-500 hover:text-gray-300'}">记录</button>
          <button onclick="Timeline.switchTab('pings')" class="text-xs px-4 py-1.5 rounded-md transition-all ${this.activeTab === 'pings' ? 'bg-neon-blue/20 text-neon-blue font-medium' : 'text-gray-500 hover:text-gray-300'}">线上浅社交</button>
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
            <div class="type-icon" style="background:${Utils.hexAlpha(t.color, 0x20)};color:${t.color}">${t.icon}</div>
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
    const todayStr = Utils.localDateStr(today);

    // Build last 7 days
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(Utils.localDateStr(d));
    }

    // Apply contact filter
    const filterId = this.pingFilterContactId ? parseInt(this.pingFilterContactId) : null;
    const matchFilter = (p) => !filterId || p.contact_id === filterId;

    // Contacts not yet pinged today (and matching filter)
    const todayPingedIds = (this.pings[todayStr] || []).map(p => p.contact_id);
    let unpinged = this.contacts.filter(c => !todayPingedIds.includes(c.id));
    if (filterId) unpinged = unpinged.filter(c => c.id === filterId);

    // Weekly summary
    const weekPings = days.reduce((sum, d) => sum + (this.pings[d] || []).filter(matchFilter).length, 0);
    const todayCount = (this.pings[todayStr] || []).filter(matchFilter).length;

    el.innerHTML = `
      <p class="text-xs text-gray-500 mb-4">将联系人拖入今日区域（或点击联系人快速标记）。每人每天仅记录一次。过去 7 天可拖拽或点击「补记」回填。</p>

      <!-- Filter + summary -->
      <div class="flex flex-wrap items-center gap-3 mb-5">
        <select onchange="Timeline.filterPingsByContact(this.value)" class="form-input w-48 text-xs">
          <option value="">全部联系人</option>
          ${this.contacts.map(c => `<option value="${c.id}" ${this.pingFilterContactId == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
        <div class="text-[11px] text-gray-500">
          今日 <span class="text-neon-green font-semibold">${todayCount}</span> · 近 7 天 <span class="text-neon-blue font-semibold">${weekPings}</span>
        </div>
      </div>

      <!-- Today's drop zone -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
          今日 · ${todayStr}
        </h3>
        <div id="ping-drop-zone"
          class="min-h-[72px] p-3 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-all flex flex-wrap gap-2 items-start"
          data-ping-day="${todayStr}"
          ondragover="Timeline.onDragOver(event)"
          ondragleave="Timeline.onDragLeave(event)"
          ondrop="Timeline.onDrop(event, '${todayStr}')">
          ${(this.pings[todayStr] || []).filter(matchFilter).map(p => `
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 group">
              ${Utils.avatarHTML(p.contact_name, 22, p.avatar_url)}
              <span class="text-xs text-gray-200">${p.contact_name}</span>
              <button onclick="Timeline.removePing('${todayStr}', ${p.contact_id})" class="text-gray-600 hover:text-red-400 text-[10px] ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          `).join('')}
          ${(this.pings[todayStr] || []).filter(matchFilter).length === 0 ? '<span class="text-xs text-gray-600 py-2">拖入或点击下方联系人</span>' : ''}
        </div>
      </div>

      <!-- Draggable contacts pool -->
      <div class="mb-8">
        <h3 class="text-sm font-semibold text-gray-400 mb-3">联系人 <span class="text-[10px] text-gray-600 font-normal">（点击=今日打卡；拖入任意日期可补记）</span></h3>
        <div class="flex flex-wrap gap-2" id="ping-contact-pool">
          ${unpinged.map(c => `
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 cursor-grab active:cursor-grabbing hover:border-neon-blue/40 hover:bg-neon-blue/5 transition-all"
              draggable="true"
              ondragstart="Timeline.onDragStart(event, ${c.id}, '${c.name}')"
              onclick="Timeline.quickPing(${c.id})"
              data-contact-id="${c.id}"
              title="点击=今日打卡；拖入任意日期补记">
              ${Utils.avatarHTML(c.name, 22, c.avatar_url)}
              <span class="text-xs text-gray-300">${c.name}</span>
            </div>
          `).join('')}
          ${unpinged.length === 0 ? '<span class="text-xs text-gray-600 py-2">今日已全部标记</span>' : ''}
        </div>
      </div>

      <!-- Recent history (每行皆为可补记的 drop zone) -->
      <div>
        <h3 class="text-sm font-semibold text-gray-400 mb-3">近期记录 <span class="text-[10px] text-gray-600 font-normal">（拖入联系人或点击「＋ 补记」回填过去日；hover ✕ 移除）</span></h3>
        <div class="space-y-3">
          ${days.slice(1).map(dateStr => {
            const dayPings = (this.pings[dateStr] || []).filter(matchFilter);
            const d = new Date(dateStr + 'T00:00:00');
            const weekday = ['日','一','二','三','四','五','六'][d.getDay()];
            return `
              <div class="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 transition-all"
                data-ping-day="${dateStr}"
                ondragover="Timeline.onDragOver(event)"
                ondragleave="Timeline.onDragLeave(event)"
                ondrop="Timeline.onDrop(event, '${dateStr}')">
                <div class="shrink-0 text-center w-14">
                  <div class="text-xs text-gray-500">周${weekday}</div>
                  <div class="text-sm text-gray-300 font-medium">${dateStr.slice(5)}</div>
                </div>
                <div class="flex flex-wrap gap-1.5 flex-1 min-h-[24px]">
                  ${dayPings.length ? dayPings.map(p => `
                    <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/5 group">
                      ${Utils.avatarHTML(p.contact_name, 18, p.avatar_url)}
                      <span class="text-[11px] text-gray-400">${p.contact_name}</span>
                      <button onclick="Timeline.removePing('${dateStr}', ${p.contact_id})" class="text-gray-600 hover:text-red-400 text-[10px] ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="移除">✕</button>
                    </div>
                  `).join('') : '<span class="text-[11px] text-gray-600 self-center">无记录 · 可拖入或补记</span>'}
                </div>
                <div class="shrink-0 flex items-center gap-2">
                  <span class="text-[11px] text-gray-600">${dayPings.length} 人</span>
                  <button onclick="Timeline.backfillPrompt('${dateStr}')" class="text-[10px] px-2 py-1 rounded-md bg-neon-blue/10 border border-neon-blue/20 text-neon-blue hover:bg-neon-blue/20 transition-all" title="补记该日浅社交">＋ 补记</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Re-bind touch drag listeners after every re-render
    this._bindTouchDrag();
  },

  filterPingsByContact(id) {
    this.pingFilterContactId = id;
    this.renderPings();
  },

  // Click/tap-to-add (defaults to today; pass dateStr to backfill any day)
  async quickPing(contactId, dateStr) {
    const target = dateStr || Utils.localDateStr(new Date());
    try {
      await API.createPing(target, contactId);
      this.pings = await API.getPings(7);
      this.renderPings();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  // Backfill modal: pick contacts not yet pinged on the given date
  backfillPrompt(dateStr) {
    const pingedIds = (this.pings[dateStr] || []).map(p => p.contact_id);
    const candidates = this.contacts.filter(c => !pingedIds.includes(c.id));
    if (candidates.length === 0) {
      Utils.toast('该日所有联系人已记录', 'info');
      return;
    }
    Utils.showModal(`
      <div class="p-6">
        <div class="mb-4">
          <h2 class="text-lg font-bold text-white">补记 · ${dateStr}</h2>
          <p class="text-xs text-gray-500 mt-1">勾选当日有过线上互动的联系人</p>
        </div>
        <form onsubmit="Timeline.submitBackfill(event, '${dateStr}')" class="space-y-4">
          <div class="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-2 rounded-lg bg-white/[0.02] border border-white/5">
            ${candidates.map(c => `
              <label class="tag-pill cursor-pointer text-xs flex items-center gap-1.5" style="color:#9ca3af;border-color:rgba(156,163,175,0.3);background:rgba(156,163,175,0.05)">
                <input type="checkbox" name="contact_ids" value="${c.id}" class="hidden peer" onchange="this.parentElement.style.borderColor=this.checked?'#00d4ff':'rgba(156,163,175,0.3)';this.parentElement.style.color=this.checked?'#00d4ff':'#9ca3af';this.parentElement.style.background=this.checked?'rgba(0,212,255,0.1)':'rgba(156,163,175,0.05)'">
                ${Utils.avatarHTML(c.name, 18, c.avatar_url)}
                ${c.name}
              </label>
            `).join('')}
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">保存</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitBackfill(e, dateStr) {
    e.preventDefault();
    const ids = new FormData(e.target).getAll('contact_ids').map(Number).filter(Boolean);
    if (ids.length === 0) {
      Utils.toast('请至少勾选 1 位联系人', 'error');
      return;
    }
    try {
      for (const cid of ids) {
        await API.createPing(dateStr, cid);
      }
      this.pings = await API.getPings(7);
      Utils.closeModal();
      Utils.toast(`已补记 ${ids.length} 条`);
      this.renderPings();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  // Drag & Drop handlers (desktop) — works for today + any past-day row
  onDragStart(e, contactId, contactName) {
    this.dragContactId = contactId;
    e.dataTransfer.setData('text/plain', contactId);
    e.dataTransfer.effectAllowed = 'move';
  },

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (e.currentTarget && e.currentTarget.classList) {
      e.currentTarget.classList.add('border-neon-blue/40', 'bg-neon-blue/5');
    }
  },

  onDragLeave(e) {
    if (e.currentTarget && e.currentTarget.classList) {
      e.currentTarget.classList.remove('border-neon-blue/40', 'bg-neon-blue/5');
    }
  },

  async onDrop(e, dateStr) {
    e.preventDefault();
    if (e.currentTarget && e.currentTarget.classList) {
      e.currentTarget.classList.remove('border-neon-blue/40', 'bg-neon-blue/5');
    }

    const contactId = parseInt(e.dataTransfer.getData('text/plain'));
    if (!contactId) return;

    try {
      await API.createPing(dateStr, contactId);
      this.pings = await API.getPings(7);
      this.renderPings();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  // ── Touch Drag & Drop (mobile) ──
  _touchState: null,
  _touchGhost: null,

  _bindTouchDrag() {
    const pool = document.getElementById('ping-contact-pool');
    if (!pool) return;
    pool.querySelectorAll('[data-contact-id]').forEach(el => {
      el.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
    });
  },

  _onTouchStart(e) {
    const el = e.currentTarget;
    const contactId = parseInt(el.dataset.contactId);
    if (!contactId) return;

    // Delay to distinguish scroll from drag
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    let moved = false;

    const onMove = (ev) => {
      const t = ev.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!moved && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (!moved) {
        moved = true;
        ev.preventDefault();
        // Create ghost element
        const rect = el.getBoundingClientRect();
        const ghost = el.cloneNode(true);
        ghost.style.cssText = `position:fixed;z-index:9999;pointer-events:none;opacity:0.85;width:${rect.width}px;left:${t.clientX - rect.width/2}px;top:${t.clientY - 20}px;`;
        document.body.appendChild(ghost);
        this._touchGhost = ghost;
        this._touchState = { contactId, el };
        el.style.opacity = '0.3';
      }
      if (moved) {
        ev.preventDefault();
        if (this._touchGhost) {
          this._touchGhost.style.left = (t.clientX - this._touchGhost.offsetWidth / 2) + 'px';
          this._touchGhost.style.top = (t.clientY - 20) + 'px';
        }
        // Highlight whichever day row the finger is currently over
        document.querySelectorAll('[data-ping-day]').forEach(z => {
          const r = z.getBoundingClientRect();
          const inside = t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom;
          z.classList.toggle('border-neon-blue/40', inside);
          z.classList.toggle('bg-neon-blue/5', inside);
        });
      }
    };

    const onEnd = async (ev) => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);

      if (!moved || !this._touchState) {
        this._cleanupTouch();
        return;
      }

      const t = ev.changedTouches[0];
      // Find the day row under the finger (today or any past-7-day row)
      let targetDate = null;
      document.querySelectorAll('[data-ping-day]').forEach(z => {
        const r = z.getBoundingClientRect();
        if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
          targetDate = z.getAttribute('data-ping-day');
        }
        z.classList.remove('border-neon-blue/40', 'bg-neon-blue/5');
      });

      if (targetDate) {
        try {
          await API.createPing(targetDate, this._touchState.contactId);
          this.pings = await API.getPings(7);
          this._cleanupTouch();
          this.renderPings();
          return;
        } catch (err) {
          Utils.toast(err.message, 'error');
        }
      }
      this._cleanupTouch();
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
  },

  _cleanupTouch() {
    if (this._touchGhost) {
      this._touchGhost.remove();
      this._touchGhost = null;
    }
    if (this._touchState && this._touchState.el) {
      this._touchState.el.style.opacity = '';
    }
    this._touchState = null;
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
            <div><label class="detail-label block mb-1">日期</label><input name="date" type="date" class="form-input" value="${Utils.todayStr()}" required></div>
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
