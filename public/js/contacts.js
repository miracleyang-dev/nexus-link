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

        <!-- Category Filter Chips -->
        <div class="flex gap-2 mb-4 filter-scroll">
          <button onclick="Contacts.filterCategory('')" class="filter-chip ${!this.currentFilter.category ? 'active' : ''}">全部</button>
          ${Object.entries(Utils.categories).map(([key, cat]) =>
            `<button onclick="Contacts.filterCategory('${key}')" class="filter-chip ${this.currentFilter.category === key ? 'active' : ''}">${cat.icon} ${cat.label}</button>`
          ).join('')}
        </div>

        <!-- Tag Filter -->
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

  // Partial re-render: only update the contact grid (avoids losing search focus)
  renderGrid() {
    const grid = document.getElementById('contacts-grid');
    if (!grid) return this.render();
    grid.innerHTML = this.contacts.length
      ? this.contacts.map(c => this.cardHTML(c)).join('')
      : `
        <div class="col-span-full empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <p class="text-sm">暂无联系人</p>
        </div>
      `;
    const countEl = document.querySelector('#view-contacts .text-sm.text-gray-500');
    if (countEl) countEl.textContent = '共 ' + this.contacts.length + ' 位联系人';
  },

  cardHTML(c) {
    const tags = c.tags || [];
    const strengthsPreview = (c.strengths_list || c.strengths_preview || []).map(s => s.content || s).filter(Boolean).join(', ');
    return `
      <div class="contact-card p-4" onclick="Contacts.showDetail(${c.id})">
        <div class="flex items-start gap-3">
          ${Utils.avatarHTML(c.name, 44, c.avatar_url)}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-white truncate">${c.name}</h3>
              ${Utils.categoryBadge(c.category)}
            </div>
            <p class="text-xs text-gray-400 truncate">${[c.company, c.position].filter(Boolean).join(' · ') || '暂无职位信息'}</p>
          </div>
          <div class="shrink-0">${Utils.levelDots(c.relationship_level)}</div>
        </div>
        ${strengthsPreview ? `<p class="text-xs text-gray-500 mt-3 truncate">💪 ${strengthsPreview}</p>` : ''}
        ${c.notes ? `<p class="text-xs text-gray-600 mt-1 truncate">📝 ${c.notes}</p>` : ''}
        ${tags.length ? `<div class="flex flex-wrap gap-1.5 mt-3">${tags.slice(0, 3).map(t => Utils.tagPill(t)).join('')}${tags.length > 3 ? `<span class="text-[10px] text-gray-500 self-center">+${tags.length - 3}</span>` : ''}</div>` : ''}
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div class="flex items-center gap-3 text-[11px] text-gray-500">
            ${c.mbti ? `<span class="font-mono" style="color:${Utils.mbtiColor(c.mbti)}">${c.mbti}</span>` : ''}
            ${c.zodiac ? `<span>${Utils.zodiacEmoji(c.zodiac)} ${c.zodiac}</span>` : ''}
          </div>
          ${c.birthday ? `<span class="text-[11px] text-gray-500">🎂 ${c.birthday_type === 'lunar' ? Utils.lunarDateLabel(c.birthday) : c.birthday.slice(5)}</span>` : ''}
        </div>
      </div>
    `;
  },

  onSearch: Utils.debounce(async function(val) {
    Contacts.currentFilter.search = val;
    await Contacts.loadContacts();
    Contacts.renderGrid();
  }, 300),

  async filterCategory(cat) {
    this.currentFilter.category = cat;
    await this.loadContacts();
    this.renderGrid();
    document.querySelectorAll('.filter-scroll .filter-chip').forEach(btn => {
      const btnCat = btn.getAttribute('onclick')?.match(/filterCategory\('(.*)'\)/)?.[1] || '';
      btn.classList.toggle('active', btnCat === cat);
    });
  },

  async filterTag(tag) {
    this.currentFilter.tag = this.currentFilter.tag === tag ? '' : tag;
    await this.loadContacts();
    this.render();
  },

  async showDetail(id) {
    await Utils._ensureLunar();
    const c = await API.getContact(id);
    const interactions = c.recent_interactions || [];
    const tags = c.tags || [];
    const methods = c.contact_methods || [];
    c.strengths_list = c.strengths || [];

    Utils.showModal(`
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div class="flex items-center gap-4">
            ${Utils.avatarHTML(c.name, 56, c.avatar_url)}
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

        <!-- Contact Methods -->
        ${methods.length ? `
        <div class="detail-section">
          <div class="detail-label mb-2">📱 联系方式</div>
          <div class="space-y-1.5">
            ${methods.map(m => `
              <div class="flex items-center gap-2 text-sm">
                <span class="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">${m.type}</span>
                <span class="text-gray-200">${m.value}</span>
              </div>
            `).join('')}
          </div>
        </div>` : ''}

        <!-- Info Grid -->
        <div class="grid grid-cols-2 gap-4 mb-6">
          ${c.birthday ? (() => {
            const solarBirthday = c.birthday_type === 'lunar'
              ? (Utils.lunarToSolar(c.birthday)?.solar || '--')
              : Utils.formatDate(c.birthday);
            const zodiacText = c.zodiac ? ` <span class="ml-1">${Utils.zodiacEmoji(c.zodiac)} ${c.zodiac}</span>` : '';
            return this.detailField('生日', `${solarBirthday}${zodiacText}`, '🎂');
          })() : ''}
          ${this.detailField('MBTI', c.mbti, '🧠')}
          ${this.detailField('家乡', c.hometown, '🏠')}
          ${this.detailField('现居', c.current_city, '📍')}
          ${this.detailField('性格特征', c.personality_traits, '✦')}
        </div>

        <!-- Structured Strengths -->
        <div class="detail-section">
          <div class="flex items-center justify-between mb-3">
            <div class="detail-label">💪 个人优点</div>
          </div>
          ${(c.strengths_list || []).length ? `
            <div class="space-y-2">
              ${c.strengths_list.map(s => {
                const pcfg = Utils.progressConfig[s.progress] || Utils.progressConfig.learning;
                return `<div class="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1.5">
                      <span class="text-sm text-gray-200">${s.content}</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="flex items-center gap-0.5">${Utils.ratingStars(s.rating, 11)}</div>
                      ${Utils.progressBadge(s.progress)}
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          ` : '<p class="text-sm text-gray-500">暂无记录，点击编辑添加</p>'}
        </div>

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
                const names = (i.contact_names || []).join(', ');
                return `<div class="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                  <div class="type-icon" style="background:${t.color}20;color:${t.color}">${t.icon}</div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-200 truncate">${i.title}</p>
                    <p class="text-[11px] text-gray-500">${Utils.formatDate(i.date)} · ${t.label}${names ? ` · ${names}` : ''}</p>
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

  async showAddModal() {
    await Utils._ensureLunar();
    this._showFormModal('添加联系人', {});
  },

  async showEditModal(id) {
    await Utils._ensureLunar();
    Utils.closeModal();
    const c = await API.getContact(id);
    // Ensure strengths are loaded for the edit form
    c._strengths = c.strengths || [];
    this._showFormModal('编辑联系人', c);
  },

  _showFormModal(title, c) {
    const isEdit = !!c.id;
    const methods = c.contact_methods || [];
    const strengthsList = c._strengths || [];
    // Store original strength IDs for diffing on save
    this._originalStrengthIds = strengthsList.map(s => s.id);
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">${title}</h2>
        <form id="contact-form" onsubmit="Contacts.saveContact(event, ${c.id || 'null'})" class="space-y-4">
          <!-- Avatar Drop Zone -->
          <div class="flex items-center gap-4 mb-2">
            <div id="avatar-drop-zone" class="relative cursor-pointer shrink-0"
              ondragover="event.preventDefault();this.classList.add('ring-2','ring-neon-blue')"
              ondragleave="this.classList.remove('ring-2','ring-neon-blue')"
              ondrop="Contacts.onAvatarDrop(event)"
              onclick="document.getElementById('avatar-file-input').click()"
              style="border-radius:50%">
              ${c.avatar_url
                ? `<div class="avatar" style="width:56px;height:56px;overflow:hidden"><img src="${c.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>`
                : Utils.avatarHTML(c.name || '?', 56)}
              <div class="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                <span class="text-white text-[10px]">拖拽/点击</span>
              </div>
            </div>
            <input type="file" id="avatar-file-input" accept="image/*" class="hidden" onchange="Contacts.onAvatarFileSelect(event)">
            <input type="hidden" name="avatar_url" value="${c.avatar_url || ''}">
            <div class="text-xs text-gray-500">拖拽或点击头像更换<br>支持 JPG/PNG 格式</div>
          </div>

          <!-- Basic Info -->
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">姓名 *</label><input name="name" class="form-input" required value="${c.name || ''}"></div>
            <div><label class="detail-label block mb-1">分类</label>
              <select name="category" class="form-input">
                ${Object.entries(Utils.categories).map(([k, v]) => `<option value="${k}" ${c.category === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
              </select>
            </div>
            <div><label class="detail-label block mb-1">公司 <span class="text-gray-600 text-[10px]">(选填)</span></label><input name="company" class="form-input" value="${c.company || ''}"></div>
            <div><label class="detail-label block mb-1">职位 <span class="text-gray-600 text-[10px]">(选填)</span></label><input name="position" class="form-input" value="${c.position || ''}"></div>
          </div>

          <!-- Contact Methods (dynamic) -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="detail-label">联系方式 <span class="text-gray-600 text-[10px]">(选填)</span></label>
              <button type="button" onclick="Contacts.addMethodRow()" class="text-xs text-neon-blue hover:underline">+ 添加</button>
            </div>
            <div id="contact-methods-list" class="space-y-2">
              ${methods.length ? methods.map((m, idx) => Contacts._methodRowHTML(m.type, m.value, idx)).join('') : Contacts._methodRowHTML('微信', '', 0)}
            </div>
          </div>

          <!-- Birthday with calendar type -->
          <div class="grid grid-cols-3 gap-4">
            <div class="col-span-2"><label class="detail-label block mb-1">生日 <span class="text-gray-600 text-[10px]">(公历输入)</span></label><input name="birthday" class="form-input" type="date" value="${c.birthday || ''}" onchange="Contacts.onBirthdayChange(this)"></div>
            <div><label class="detail-label block mb-1">提醒模式</label>
              <select name="birthday_type" class="form-input" onchange="Contacts.onBirthdayTypeChange(this)">
                <option value="solar" ${(c.birthday_type || 'solar') === 'solar' ? 'selected' : ''}>按公历提醒</option>
                <option value="lunar" ${c.birthday_type === 'lunar' ? 'selected' : ''}>按农历提醒</option>
              </select>
            </div>
          </div>
          <div id="birthday-conversion" class="text-xs text-gray-500 -mt-2 pl-1 hidden"></div>

          <!-- More Info (collapsible) -->
          <details class="border border-white/5 rounded-lg" ${(c.zodiac || c.mbti || c.hometown || c.current_city) ? 'open' : ''}>
            <summary class="px-4 py-2.5 text-sm text-gray-400 cursor-pointer hover:text-gray-200 select-none">更多个人信息 <span class="text-gray-600 text-[10px]">(选填)</span></summary>
            <div class="p-4 pt-2 grid grid-cols-2 gap-4">
              <div><label class="detail-label block mb-1">星座</label><input name="zodiac" class="form-input" value="${c.zodiac || ''}" placeholder="如：双子座"></div>
              <div><label class="detail-label block mb-1">MBTI</label><input name="mbti" class="form-input" value="${c.mbti || ''}" placeholder="如：INFJ" maxlength="4"></div>
              <div><label class="detail-label block mb-1">亲密度</label>
                <select name="relationship_level" class="form-input">
                  ${[1,2,3,4,5].map(i => `<option value="${i}" ${(c.relationship_level||3) == i ? 'selected' : ''}>${i} - ${'★'.repeat(i)}</option>`).join('')}
                </select>
              </div>
              <div><label class="detail-label block mb-1">家乡</label><input name="hometown" class="form-input" value="${c.hometown || ''}"></div>
              <div><label class="detail-label block mb-1">现居城市</label><input name="current_city" class="form-input" value="${c.current_city || ''}"></div>
            </div>
          </details>

          <!-- Personality & Notes -->
          <details class="border border-white/5 rounded-lg" ${(c.personality_traits || c.strengths || c.preferences || c.notes) ? 'open' : ''}>
            <summary class="px-4 py-2.5 text-sm text-gray-400 cursor-pointer hover:text-gray-200 select-none">性格与备注 <span class="text-gray-600 text-[10px]">(选填)</span></summary>
            <div class="p-4 pt-2 space-y-4">
              <div><label class="detail-label block mb-1">性格特征</label><input name="personality_traits" class="form-input" value="${c.personality_traits || ''}" placeholder="如：果断,有领导力,目标导向"></div>
              <div><label class="detail-label block mb-1">兴趣偏好</label><textarea name="preferences" class="form-input" rows="2" placeholder="爱好、喜欢的事物...">${c.preferences || ''}</textarea></div>
              <div><label class="detail-label block mb-1">备注</label><textarea name="notes" class="form-input" rows="3" placeholder="其他重要信息...">${c.notes || ''}</textarea></div>
            </div>
          </details>

          <div class="border border-white/5 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <label class="detail-label">💪 个人优点 <span class="text-gray-600 text-[10px]">(选填，支持评级与进度)</span></label>
              <button type="button" onclick="Contacts.addStrengthRow()" class="text-xs text-neon-blue hover:underline">+ 添加优点</button>
            </div>
            <div id="strengths-list" class="space-y-2">
              ${strengthsList.map(s => Contacts._strengthRowHTML(s.id, s.content, s.rating, s.progress)).join('')}
            </div>
          </div>

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

    // Show conversion hint if birthday is already filled
    if (c.birthday) {
      this.updateBirthdayConversion(c.birthday, c.birthday_type || 'solar');
    }
  },

  // Contact method row HTML
  _methodRowHTML(type, value, idx) {
    const presets = ['微信', '邮箱'];
    return `<div class="flex items-center gap-2 method-row">
      <div class="relative">
        <input list="method-types" class="form-input w-20 text-xs" value="${type || ''}" placeholder="类型" data-method-type>
        <datalist id="method-types">
          ${presets.map(p => `<option value="${p}">`).join('')}
        </datalist>
      </div>
      <input class="form-input flex-1" value="${value || ''}" placeholder="账号/号码" data-method-value>
      <button type="button" onclick="this.closest('.method-row').remove()" class="text-gray-500 hover:text-red-400 text-sm px-1">✕</button>
    </div>`;
  },

  addMethodRow() {
    const list = document.getElementById('contact-methods-list');
    if (!list) return;
    const div = document.createElement('div');
    div.innerHTML = Contacts._methodRowHTML('', '', list.children.length);
    list.appendChild(div.firstElementChild);
  },

  // ── Strength row helpers ──

  _strengthRowHTML(id, content, rating, progress) {
    content = content || '';
    rating = rating || 4;
    progress = progress || 'learning';
    const dataId = id ? `data-strength-id="${id}"` : '';
    return `
      <div class="strength-row" ${dataId}>
        <div class="flex items-center gap-2">
          <input class="form-input flex-1" value="${content}" placeholder="如：沟通能力强" maxlength="30" data-strength-content>
          <button type="button" onclick="this.closest('.strength-row').remove()" class="text-gray-500 hover:text-red-400 text-sm px-1 shrink-0">✕</button>
        </div>
        <div class="strength-extra hidden md:flex items-center gap-2 mt-2">
          <select class="form-input w-24 text-xs" data-strength-rating>
            ${[5,4,3,2,1].map(i => `<option value="${i}" ${i===rating?'selected':''}>${'★'.repeat(i)}${'☆'.repeat(5-i)}</option>`).join('')}
          </select>
          <select class="form-input w-28 text-xs" data-strength-progress>
            ${Object.entries(Utils.progressConfig).map(([k,v]) => `<option value="${k}" ${k===progress?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="md:hidden text-[11px] text-neon-blue mt-1" onclick="this.previousElementSibling.classList.toggle('hidden');this.textContent=this.previousElementSibling.classList.contains('hidden')?'展开评级 ▸':'收起 ▴'">展开评级 ▸</button>
      </div>
    `;
  },

  addStrengthRow() {
    const list = document.getElementById('strengths-list');
    if (!list) return;
    const div = document.createElement('div');
    div.innerHTML = Contacts._strengthRowHTML(null, '', 4, 'learning');
    list.appendChild(div.firstElementChild);
  },

  _collectStrengths() {
    const rows = document.querySelectorAll('#strengths-list .strength-row');
    const strengths = [];
    rows.forEach(row => {
      const content = row.querySelector('[data-strength-content]').value.trim();
      const rating = parseInt(row.querySelector('[data-strength-rating]').value) || 3;
      const progress = row.querySelector('[data-strength-progress]').value;
      const id = row.dataset.strengthId ? parseInt(row.dataset.strengthId) : null;
      if (content) strengths.push({ id, content, rating, progress });
    });
    return strengths;
  },

  // Collect contact methods from form
  _collectMethods() {
    const rows = document.querySelectorAll('#contact-methods-list .method-row');
    const methods = [];
    rows.forEach(row => {
      const type = row.querySelector('[data-method-type]').value.trim();
      const value = row.querySelector('[data-method-value]').value.trim();
      if (type && value) methods.push({ type, value });
    });
    return methods;
  },

  onBirthdayChange(input) {
    const form = input.closest('form');
    const type = form.querySelector('[name="birthday_type"]').value;
    this.updateBirthdayConversion(input.value, type);
  },

  onBirthdayTypeChange(select) {
    const form = select.closest('form');
    const birthday = form.querySelector('[name="birthday"]').value;
    this.updateBirthdayConversion(birthday, select.value);
  },

  updateBirthdayConversion(birthday, type) {
    const el = document.getElementById('birthday-conversion');
    if (!el || !birthday) { if (el) el.classList.add('hidden'); return; }
    try {
      if (type === 'lunar') {
        const conv = Utils.lunarToSolar(birthday);
        if (conv) { el.textContent = `对应公历: ${conv.solar}`; el.classList.remove('hidden'); return; }
      } else {
        const conv = Utils.solarToLunar(birthday);
        if (conv) { el.textContent = `对应农历: ${conv.lunarChinese}`; el.classList.remove('hidden'); return; }
      }
    } catch {}
    el.classList.add('hidden');
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
    if (!data.birthday_type) data.birthday_type = 'solar';

    // Collect contact methods
    data.contact_methods = this._collectMethods();

    // Collect strengths from form
    const formStrengths = this._collectStrengths();

    const tagCheckboxes = e.target.querySelectorAll('input[name="tags"]:checked');
    const tagIds = Array.from(tagCheckboxes).map(cb => parseInt(cb.value));

    try {
      const isUpdate = !!id;
      let contact;
      if (id) {
        contact = await API.updateContact(id, data);
      } else {
        contact = await API.createContact(data);
        id = contact.id;
      }
      if (tagIds.length > 0) {
        await API.assignTags(id, tagIds);
      }

      // Sync strengths: diff against originals
      const originalIds = this._originalStrengthIds || [];
      const currentIds = formStrengths.filter(s => s.id).map(s => s.id);

      // Delete removed strengths
      for (const oid of originalIds) {
        if (!currentIds.includes(oid)) {
          await API.deleteStrength(oid);
        }
      }

      // Create or update strengths
      for (const s of formStrengths) {
        const payload = { content: s.content, rating: s.rating, progress: s.progress };
        if (s.id) {
          await API.updateStrength(s.id, payload);
        } else {
          await API.createStrength(id, payload);
        }
      }

      Utils.closeModal();
      Utils.toast(isUpdate ? '联系人已更新' : '联系人已创建');
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
          <form onsubmit="Contacts.saveInteraction(event, [${contactId}])" class="space-y-4">
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

  async saveInteraction(e, contactIds) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = { contact_ids: contactIds };
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

  // ── Avatar drag & drop / file select ──
  onAvatarDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-neon-blue');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) this._processAvatarFile(file);
  },

  onAvatarFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) this._processAvatarFile(file);
  },

  _processAvatarFile(file) {
    if (file.size > 2 * 1024 * 1024) { Utils.toast('图片不能超过 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      // Update preview
      const zone = document.getElementById('avatar-drop-zone');
      if (zone) {
        zone.querySelector('.avatar').outerHTML = `<div class="avatar" style="width:56px;height:56px;overflow:hidden"><img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div>`;
      }
      // Update hidden input
      const input = document.querySelector('input[name="avatar_url"]');
      if (input) input.value = dataUrl;
    };
    reader.readAsDataURL(file);
  },

  // ── Strengths (managed via contact edit form) ──
  // Strengths CRUD is handled inline within saveContact() via _collectStrengths() diffing.
};
