// Contacts Module
const Contacts = {
  contacts: [],
  tags: [],
  currentFilter: { search: '', category: '', tag: '' },

  async init() {
    await this.loadTags();
    await this.loadContacts();
    this.render();
  },

  async loadContacts() {
    const params = {};
    if (this.currentFilter.search) params.search = this.currentFilter.search;
    if (this.currentFilter.category) params.category = this.currentFilter.category;
    if (this.currentFilter.tag) params.tag = this.currentFilter.tag;
    this.contacts = await API.getContacts(params);
  },

  async loadTags() {
    this.tags = await API.getTags();
  },

  render() {
    const el = document.getElementById('view-contacts');
    el.innerHTML = `
      <div class="p-6 lg:p-8">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 gap-3">
          <div class="min-w-0">
            <h2 class="text-2xl font-bold text-white">联系人</h2>
            <p class="text-sm text-gray-500 mt-1">共 ${this.contacts.length} 位联系人</p>
          </div>
          <button onclick="Contacts.showAddModal()" class="btn-primary flex items-center gap-2 shrink-0 text-xs sm:text-[13px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span class="hidden sm:inline">添加联系人</span><span class="sm:hidden">添加</span>
          </button>
        </div>

        <!-- Search & Filters -->
        <div class="flex flex-wrap gap-3 mb-4">
          <div class="search-bar flex-1 min-w-0">
            <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="搜索姓名、公司、备注..." value="${this.currentFilter.search}" oninput="Contacts.onSearch(this.value)">
          </div>
        </div>

        <!-- Category Filter Chips (horizontal scroll on mobile) -->
        <div class="flex gap-2 mb-4 filter-scroll">
          <button onclick="Contacts.filterCategory('')" class="filter-chip ${!this.currentFilter.category ? 'active' : ''}">全部</button>
          ${Object.entries(Utils.categories).map(([key, cat]) =>
            `<button onclick="Contacts.filterCategory('${key}')" class="filter-chip ${this.currentFilter.category === key ? 'active' : ''}">${cat.icon} ${cat.label}</button>`
          ).join('')}
        </div>

        <!-- Tag Filter (horizontal scroll on mobile) -->
        ${this.tags.length ? `
        <div class="flex gap-2 mb-6 filter-scroll">
          ${this.tags.map(t => `
            <button onclick="Contacts.filterTag('${t.name}')" class="tag-pill cursor-pointer ${this.currentFilter.tag === t.name ? 'ring-1 ring-offset-1 ring-offset-surface-1' : ''}" style="color:${t.color};border-color:${t.color}40;background:${t.color}15">${t.name}${t.contact_count ? ` (${t.contact_count})` : ''}</button>
          `).join('')}
          ${this.currentFilter.tag ? `<button onclick="Contacts.filterTag('')" class="text-xs text-gray-500 hover:text-gray-300 ml-1 shrink-0">清除标签</button>` : ''}
        </div>` : ''}

        <!-- Contact Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="contacts-grid">
          ${this.contacts.length ? this.contacts.map(c => this.cardHTML(c)).join('') :
            `<div class="col-span-full empty-state">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <p class="text-sm">暂无联系人</p>
            </div>`
          }
        </div>
      </div>
    `;
  },

  cardHTML(c) {
    const tags = c.tags || [];
    return `
      <div class="contact-card p-4" onclick="Contacts.showDetail(${c.id})">
        <div class="flex items-start gap-3">
          ${Utils.avatarHTML(c.name, 44)}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-white truncate">${c.name}</h3>
              ${Utils.categoryBadge(c.category)}
            </div>
            <p class="text-xs text-gray-400 truncate">${[c.company, c.position].filter(Boolean).join(' · ') || '暂无职位信息'}</p>
          </div>
          <div class="shrink-0">${Utils.levelDots(c.relationship_level)}</div>
        </div>
        ${c.personality_traits ? `<p class="text-xs text-gray-500 mt-3 truncate">✦ ${c.personality_traits}</p>` : ''}
        ${tags.length ? `<div class="flex flex-wrap gap-1.5 mt-3">${tags.slice(0, 3).map(t => Utils.tagPill(t)).join('')}${tags.length > 3 ? `<span class="text-[10px] text-gray-500 self-center">+${tags.length - 3}</span>` : ''}</div>` : ''}
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div class="flex items-center gap-3 text-[11px] text-gray-500">
            ${c.mbti ? `<span class="font-mono" style="color:${Utils.mbtiColor(c.mbti)}">${c.mbti}</span>` : ''}
            ${c.zodiac ? `<span>${Utils.zodiacEmoji(c.zodiac)} ${c.zodiac}</span>` : ''}
          </div>
          ${c.birthday ? `<span class="text-[11px] text-gray-500">🎂 ${c.birthday.slice(5)}</span>` : ''}
        </div>
      </div>
    `;
  },

  onSearch: Utils.debounce(async function(val) {
    Contacts.currentFilter.search = val;
    await Contacts.loadContacts();
    Contacts.render();
  }, 300),

  async filterCategory(cat) {
    this.currentFilter.category = cat;
    await this.loadContacts();
    this.render();
  },

  async filterTag(tag) {
    this.currentFilter.tag = this.currentFilter.tag === tag ? '' : tag;
    await this.loadContacts();
    this.render();
  },

  async showDetail(id) {
    const c = await API.getContact(id);
    const interactions = c.recent_interactions || [];
    const tags = c.tags || [];

    Utils.showModal(`
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div class="flex items-center gap-4">
            ${Utils.avatarHTML(c.name, 56)}
            <div>
              <h2 class="text-xl font-bold text-white">${c.name}</h2>
              <p class="text-sm text-gray-400">${[c.company, c.position].filter(Boolean).join(' · ') || ''}</p>
              <div class="flex items-center gap-2 mt-1">
                ${Utils.categoryBadge(c.category)}
                ${Utils.levelDots(c.relationship_level)}
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="Contacts.showEditModal(${c.id})" class="btn-ghost text-xs px-3 py-2">编辑</button>
            <button onclick="Contacts.confirmDelete(${c.id},'${c.name}')" class="btn-danger text-xs px-3 py-2">删除</button>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          ${this.detailField('手机', c.phone, '📱')}
          ${this.detailField('邮箱', c.email, '📧')}
          ${this.detailField('生日', c.birthday ? `${c.birthday} ${Utils.zodiacEmoji(c.zodiac)} ${c.zodiac || ''}` : null, '🎂')}
          ${this.detailField('MBTI', c.mbti, '🧠')}
          ${this.detailField('血型', c.blood_type ? c.blood_type + '型' : null, '🩸')}
          ${this.detailField('家乡', c.hometown, '🏠')}
          ${this.detailField('现居', c.current_city, '📍')}
          ${this.detailField('性格特征', c.personality_traits, '✦')}
        </div>

        ${c.strengths ? `<div class="detail-section"><div class="detail-label">💪 个人长处</div><div class="detail-value">${c.strengths}</div></div>` : ''}
        ${c.preferences ? `<div class="detail-section"><div class="detail-label">❤️ 兴趣偏好</div><div class="detail-value">${c.preferences}</div></div>` : ''}
        ${c.notes ? `<div class="detail-section"><div class="detail-label">📝 备注</div><div class="detail-value">${c.notes}</div></div>` : ''}

        <!-- Tags -->
        ${tags.length ? `<div class="detail-section"><div class="detail-label mb-2">🏷️ 标签</div><div class="flex flex-wrap gap-2">${tags.map(t => Utils.tagPill(t)).join('')}</div></div>` : ''}

        <!-- Recent Interactions -->
        <div class="detail-section">
          <div class="flex items-center justify-between mb-3">
            <div class="detail-label">📅 最近互动</div>
            <button onclick="Contacts.showAddInteractionModal(${c.id},'${c.name}')" class="text-xs text-neon-blue hover:underline">+ 添加互动</button>
          </div>
          ${interactions.length ? `
            <div class="space-y-2">
              ${interactions.slice(0, 5).map(i => {
                const t = Utils.interactionTypes[i.type] || Utils.interactionTypes.other;
                return `<div class="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                  <div class="type-icon" style="background:${t.color}20;color:${t.color}">${t.icon}</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-200 truncate">${i.title}</p>
                    <p class="text-[11px] text-gray-500">${Utils.formatDate(i.date)} · ${t.label}</p>
                  </div>
                  <span class="mood-indicator">${Utils.moods[i.mood] || ''}</span>
                </div>`;
              }).join('')}
            </div>
          ` : '<p class="text-sm text-gray-500">暂无互动记录</p>'}
        </div>
      </div>
    `);
  },

  detailField(label, value, icon) {
    if (!value) return '';
    return `<div><div class="detail-label">${icon} ${label}</div><div class="detail-value">${value}</div></div>`;
  },

  showAddModal() {
    this._showFormModal('添加联系人', {});
  },

  async showEditModal(id) {
    Utils.closeModal();
    const c = await API.getContact(id);
    this._showFormModal('编辑联系人', c);
  },

  _showFormModal(title, c) {
    const isEdit = !!c.id;
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">${title}</h2>
        <form id="contact-form" onsubmit="Contacts.saveContact(event, ${c.id || 'null'})" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">姓名 *</label><input name="name" class="form-input" required value="${c.name || ''}"></div>
            <div><label class="detail-label block mb-1">分类</label>
              <select name="category" class="form-input">
                ${Object.entries(Utils.categories).map(([k, v]) => `<option value="${k}" ${c.category === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
              </select>
            </div>
            <div><label class="detail-label block mb-1">手机</label><input name="phone" class="form-input" value="${c.phone || ''}"></div>
            <div><label class="detail-label block mb-1">邮箱</label><input name="email" class="form-input" type="email" value="${c.email || ''}"></div>
            <div><label class="detail-label block mb-1">公司</label><input name="company" class="form-input" value="${c.company || ''}"></div>
            <div><label class="detail-label block mb-1">职位</label><input name="position" class="form-input" value="${c.position || ''}"></div>
            <div><label class="detail-label block mb-1">生日</label><input name="birthday" class="form-input" type="date" value="${c.birthday || ''}"></div>
            <div><label class="detail-label block mb-1">星座</label><input name="zodiac" class="form-input" value="${c.zodiac || ''}" placeholder="如：双子座"></div>
            <div><label class="detail-label block mb-1">MBTI</label><input name="mbti" class="form-input" value="${c.mbti || ''}" placeholder="如：INFJ" maxlength="4"></div>
            <div><label class="detail-label block mb-1">血型</label>
              <select name="blood_type" class="form-input">
                <option value="">未知</option>
                ${['A','B','AB','O'].map(t => `<option value="${t}" ${c.blood_type === t ? 'selected' : ''}>${t}型</option>`).join('')}
              </select>
            </div>
            <div><label class="detail-label block mb-1">家乡</label><input name="hometown" class="form-input" value="${c.hometown || ''}"></div>
            <div><label class="detail-label block mb-1">现居城市</label><input name="current_city" class="form-input" value="${c.current_city || ''}"></div>
            <div><label class="detail-label block mb-1">亲密度 (1-5)</label>
              <select name="relationship_level" class="form-input">
                ${[1,2,3,4,5].map(i => `<option value="${i}" ${(c.relationship_level||3) == i ? 'selected' : ''}>${i} - ${'★'.repeat(i)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div><label class="detail-label block mb-1">性格特征</label><input name="personality_traits" class="form-input" value="${c.personality_traits || ''}" placeholder="如：果断,有领导力,目标导向"></div>
          <div><label class="detail-label block mb-1">个人长处</label><textarea name="strengths" class="form-input" rows="2" placeholder="擅长的能力...">${c.strengths || ''}</textarea></div>
          <div><label class="detail-label block mb-1">兴趣偏好</label><textarea name="preferences" class="form-input" rows="2" placeholder="爱好、喜欢的事物...">${c.preferences || ''}</textarea></div>
          <div><label class="detail-label block mb-1">备注</label><textarea name="notes" class="form-input" rows="3" placeholder="其他重要信息...">${c.notes || ''}</textarea></div>

          <!-- Tags -->
          <div>
            <label class="detail-label block mb-2">标签</label>
            <div class="flex flex-wrap gap-2">
              ${Contacts.tags.map(t => {
                const checked = (c.tags || []).some(ct => ct.id === t.id);
                return `<label class="tag-pill cursor-pointer" style="color:${t.color};border-color:${checked ? t.color : t.color+'40'};background:${checked ? t.color+'30' : t.color+'15'}">
                  <input type="checkbox" name="tags" value="${t.id}" ${checked ? 'checked' : ''} class="hidden"> ${t.name}
                </label>`;
              }).join('')}
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">${isEdit ? '保存修改' : '创建联系人'}</button>
          </div>
        </form>
      </div>
    `);
  },

  async saveContact(e, id) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {};
    for (const [k, v] of form.entries()) {
      if (k === 'tags') continue;
      data[k] = v;
    }
    data.relationship_level = parseInt(data.relationship_level) || 3;

    const tagCheckboxes = e.target.querySelectorAll('input[name="tags"]:checked');
    const tagIds = Array.from(tagCheckboxes).map(cb => parseInt(cb.value));

    try {
      let contact;
      if (id) {
        contact = await API.updateContact(id, data);
      } else {
        contact = await API.createContact(data);
        id = contact.id;
      }
      if (tagIds.length >= 0) {
        await API.assignTags(id, tagIds);
      }
      Utils.closeModal();
      Utils.toast(id ? '联系人已更新' : '联系人已创建');
      await this.loadContacts();
      await this.loadTags();
      this.render();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  async confirmDelete(id, name) {
    if (confirm(`确定要删除联系人「${name}」吗？此操作不可撤销。`)) {
      try {
        await API.deleteContact(id);
        Utils.closeModal();
        Utils.toast('联系人已删除');
        await this.loadContacts();
        await this.loadTags();
        this.render();
      } catch (err) {
        Utils.toast(err.message, 'error');
      }
    }
  },

  showAddInteractionModal(contactId, contactName) {
    Utils.closeModal();
    setTimeout(() => {
      Utils.showModal(`
        <div class="p-6">
          <h2 class="text-lg font-bold text-white mb-6">添加互动 - ${contactName}</h2>
          <form onsubmit="Contacts.saveInteraction(event, ${contactId})" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div><label class="detail-label block mb-1">类型</label>
                <select name="type" class="form-input">
                  ${Object.entries(Utils.interactionTypes).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
                </select>
              </div>
              <div><label class="detail-label block mb-1">日期</label><input name="date" type="date" class="form-input" value="${new Date().toISOString().slice(0,10)}" required></div>
            </div>
            <div><label class="detail-label block mb-1">标题 *</label><input name="title" class="form-input" required placeholder="简短描述..."></div>
            <div><label class="detail-label block mb-1">详细内容</label><textarea name="content" class="form-input" rows="3" placeholder="详细记录..."></textarea></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="detail-label block mb-1">地点</label><input name="location" class="form-input" placeholder="可选"></div>
              <div><label class="detail-label block mb-1">心情 (1-5)</label>
                <select name="mood" class="form-input">
                  ${[5,4,3,2,1].map(i => `<option value="${i}">${Utils.moods[i]} ${i}分</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
              <button type="submit" class="btn-primary">保存互动</button>
            </div>
          </form>
        </div>
      `);
    }, 200);
  },

  async saveInteraction(e, contactId) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = { contact_id: contactId };
    for (const [k, v] of form.entries()) data[k] = v;
    data.mood = parseInt(data.mood) || 3;
    try {
      await API.createInteraction(data);
      Utils.closeModal();
      Utils.toast('互动记录已添加');
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },
};
