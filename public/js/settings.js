// Settings Module
const Settings = {
  settings: {},
  tags: [],

  async init() {
    this.settings = await API.getSettings();
    this.tags = await API.getTags();
    this.render();
  },

  render() {
    const el = document.getElementById('view-settings');
    const startDate = this.settings.record_start_date || '';

    el.innerHTML = `
      <div class="p-6 lg:p-8 max-w-2xl">
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-white">系统设置</h2>
          <p class="text-sm text-gray-500 mt-1">管理全局配置</p>
        </div>

        ${this._renderTagManagement()}

        ${this._renderCategoryManagement()}

        ${this._renderInteractionTypeManagement()}

        ${this._renderDataManagement()}

        ${this._renderStartDate(startDate)}

        ${this._renderExplanation()}
      </div>
    `;
  },

  // ── Section renderers ──

  _renderTagManagement() {
    return `
      <div class="glass-card p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="type-icon shrink-0" style="background:rgba(59,130,246,0.1);color:#3b82f6;font-size:18px">🏷️</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-white mb-1">标签管理</h3>
            <p class="text-xs text-gray-500 mb-4">添加、编辑或删除联系人标签</p>

            <div class="space-y-2">
              ${this.tags.map(t => `
                <div class="flex items-center gap-3">
                  <span class="tag-pill" style="color:${t.color};border-color:${t.color}40;background:${t.color}15">${t.name}</span>
                  <span class="text-[11px] text-gray-500">${t.contact_count || 0} 人</span>
                  <button onclick="Settings.editTagName(${t.id}, '${t.name.replace(/'/g, "&#39;")}')" class="text-xs text-gray-500 hover:text-neon-blue">改名</button>
                  <button onclick="Settings.deleteTag(${t.id}, '${t.name.replace(/'/g, "&#39;")}')" class="text-xs text-gray-500 hover:text-red-400">删除</button>
                </div>
              `).join('')}
              ${!this.tags.length ? '<div class="text-xs text-gray-500">暂无标签</div>' : ''}
            </div>

            <div class="flex items-center gap-3 mt-4">
              <input id="new-tag-name" class="form-input flex-1" placeholder="新标签名称">
              <input id="new-tag-color" class="form-input w-20" type="color" value="#3B82F6">
              <button onclick="Settings.addTag()" class="btn-primary text-xs px-4 py-2">添加</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderCategoryManagement() {
    const cats = Utils.categories;
    return `
      <div class="glass-card p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="type-icon shrink-0" style="background:rgba(16,185,129,0.1);color:#10b981;font-size:18px">📂</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-white mb-1">联系人分类</h3>
            <p class="text-xs text-gray-500 mb-4">自定义联系人分类，可增删改</p>

            <div class="space-y-2">
              ${Object.entries(cats).map(([key, cat]) => `
                <div class="flex items-center gap-3">
                  <span class="text-sm">${cat.icon}</span>
                  <span class="text-sm text-gray-200">${cat.label}</span>
                  <span class="text-[11px] text-gray-500">${key}</span>
                  <button onclick="Settings.editCategory('${key}')" class="text-xs text-gray-500 hover:text-neon-blue">编辑</button>
                  <button onclick="Settings.removeCategory('${key}')" class="text-xs text-gray-500 hover:text-red-400">删除</button>
                </div>
              `).join('')}
            </div>

            <button onclick="Settings.showAddCategoryModal()" class="btn-primary text-xs px-4 py-2 mt-4">添加新分类</button>
          </div>
        </div>
      </div>
    `;
  },

  _renderInteractionTypeManagement() {
    const types = Utils.interactionTypes;
    return `
      <div class="glass-card p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="type-icon shrink-0" style="background:rgba(139,92,246,0.1);color:#8b5cf6;font-size:18px">💬</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-white mb-1">互动类型</h3>
            <p class="text-xs text-gray-500 mb-4">自定义互动记录的类型</p>

            <div class="space-y-2">
              ${Object.entries(types).map(([key, t]) => `
                <div class="flex items-center gap-3">
                  <span class="text-sm">${t.icon}</span>
                  <span class="text-sm text-gray-200">${t.label}</span>
                  <span class="text-[11px] text-gray-500">${key}</span>
                  <button onclick="Settings.editInteractionType('${key}')" class="text-xs text-gray-500 hover:text-neon-blue">编辑</button>
                  <button onclick="Settings.removeInteractionType('${key}')" class="text-xs text-gray-500 hover:text-red-400">删除</button>
                </div>
              `).join('')}
            </div>

            <button onclick="Settings.showAddInteractionTypeModal()" class="btn-primary text-xs px-4 py-2 mt-4">添加新类型</button>
          </div>
        </div>
      </div>
    `;
  },

  _renderDataManagement() {
    return `
      <div class="glass-card p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="type-icon shrink-0" style="background:rgba(236,72,153,0.1);color:#ec4899;font-size:18px">💾</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-white mb-1">数据管理</h3>
            <p class="text-xs text-gray-500 mb-4">导入、导出或清空系统数据</p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onclick="Settings.exportData()" class="btn-ghost text-xs">数据导出</button>
              <button onclick="Settings.showImportModal()" class="btn-ghost text-xs">数据导入</button>
              <button onclick="Settings.handleClearAll()" class="btn-danger text-xs">一键清空</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderStartDate(startDate) {
    return `
      <div class="glass-card p-6 mb-6">
        <div class="flex items-start gap-4">
          <div class="type-icon shrink-0" style="background:rgba(0,212,255,0.1);color:#00d4ff;font-size:18px">📅</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-white mb-1">记录起始日期</h3>
            <p class="text-xs text-gray-500 mb-4">设置后，系统仅保存该日期及之后的数据。该日期之前的互动记录、提醒将被永久删除。</p>
            ${startDate ? `
              <div class="flex items-center gap-3 mb-4 p-3 rounded-xl bg-neon-blue/5 border border-neon-blue/15">
                <span class="text-sm text-gray-300">当前起始日期：</span>
                <span class="text-sm font-semibold text-neon-blue">${startDate}</span>
                <button onclick="Settings.clearStartDate()" class="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-white/5">清除限制</button>
              </div>
            ` : `
              <div class="flex items-center gap-2 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span class="text-xs text-gray-500">未设置，所有历史数据均保留</span>
              </div>
            `}
            <div class="flex items-end gap-3">
              <div class="flex-1">
                <label class="detail-label block mb-1">${startDate ? '修改' : '设置'}起始日期</label>
                <input type="date" id="start-date-input" class="form-input" value="${startDate}" max="${new Date().toISOString().slice(0,10)}">
              </div>
              <button onclick="Settings.confirmSetStartDate()" class="btn-primary text-xs px-5 py-2.5 shrink-0">
                ${startDate ? '更新并清理' : '设置并清理'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderExplanation() {
    return `
      <div class="glass-card p-5">
        <h4 class="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">说明</h4>
        <ul class="space-y-2 text-xs text-gray-500">
          <li class="flex items-start gap-2"><span class="text-neon-blue mt-0.5">&#x2022;</span><span>修改分类和互动类型后，已有数据不会自动变更，但显示时会使用新配置</span></li>
          <li class="flex items-start gap-2"><span class="text-neon-blue mt-0.5">&#x2022;</span><span>删除分类或互动类型不会删除已使用该类型的数据，但显示时会回退到默认样式</span></li>
          <li class="flex items-start gap-2"><span class="text-neon-blue mt-0.5">&#x2022;</span><span>删除标签会自动解除所有联系人与该标签的关联</span></li>
          <li class="flex items-start gap-2"><span class="text-neon-blue mt-0.5">&#x2022;</span><span>数据导出会将所有数据打包为 JSON 文件下载到本地</span></li>
          <li class="flex items-start gap-2"><span class="text-neon-blue mt-0.5">&#x2022;</span><span>数据导入会覆盖当前所有数据，建议先导出备份</span></li>
          <li class="flex items-start gap-2"><span class="text-red-400 mt-0.5">&#x2022;</span><span class="text-red-400/80">一键清空和起始日期操作均不可逆，请谨慎使用</span></li>
        </ul>
      </div>
    `;
  },

  // ── Tag CRUD ──

  async addTag() {
    const nameEl = document.getElementById('new-tag-name');
    const colorEl = document.getElementById('new-tag-color');
    const name = nameEl ? nameEl.value.trim() : '';
    const color = colorEl ? colorEl.value : '#3B82F6';
    if (!name) { Utils.toast('请输入标签名称', 'error'); return; }
    try {
      await API.createTag({ name, color });
      Utils.toast('标签已添加');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  async updateTag(id, data) {
    try {
      await API.updateTag(id, data);
      Utils.toast('标签已更新');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  editTagName(id, currentName) {
    const newName = prompt('修改标签名称：', currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
      this.updateTag(id, { name: newName.trim() });
    }
  },

  async deleteTag(id, name) {
    if (!confirm(`确定删除标签「${name}」？所有联系人的该标签关联将被移除。`)) return;
    try {
      await API.deleteTag(id);
      Utils.toast('标签已删除');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  // ── Category CRUD ──

  showAddCategoryModal() {
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">添加联系人分类</h2>
        <form onsubmit="Settings.saveNewCategory(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">标识 (英文) *</label><input name="key" class="form-input" required></div>
            <div><label class="detail-label block mb-1">显示名称 *</label><input name="label" class="form-input" required></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">图标 (Emoji)</label><input name="icon" class="form-input"></div>
            <div><label class="detail-label block mb-1">颜色</label><input name="color" class="form-input" type="color" value="#6b7280"></div>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">添加分类</button>
          </div>
        </form>
      </div>
    `);
  },

  async saveNewCategory(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const key = form.get('key').trim().toLowerCase();
    const label = form.get('label').trim();
    const icon = form.get('icon').trim() || '📌';
    const color = form.get('color') || '#6b7280';
    if (!key || !label) { Utils.toast('标识和名称为必填', 'error'); return; }
    if (Utils.categories[key]) { Utils.toast('该标识已存在', 'error'); return; }

    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    Utils.categories[key] = { label, icon, color, bg: `rgba(${r},${g},${b},0.1)` };
    await this._saveCategories();
    Utils.closeModal();
    Utils.toast('分类已添加');
    this.render();
  },

  editCategory(key) {
    const cat = Utils.categories[key];
    if (!cat) return;
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">编辑分类 - ${cat.label}</h2>
        <form onsubmit="Settings.saveEditCategory(event, '${key}')" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">标识</label><input name="key" class="form-input" value="${key}" disabled></div>
            <div><label class="detail-label block mb-1">显示名称 *</label><input name="label" class="form-input" required value="${cat.label}"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">图标 (Emoji)</label><input name="icon" class="form-input" value="${cat.icon}"></div>
            <div><label class="detail-label block mb-1">颜色</label><input name="color" class="form-input" type="color" value="${cat.color}"></div>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">保存</button>
          </div>
        </form>
      </div>
    `);
  },

  async saveEditCategory(e, key) {
    e.preventDefault();
    const form = new FormData(e.target);
    const label = form.get('label').trim();
    const icon = form.get('icon').trim() || '📌';
    const color = form.get('color') || '#6b7280';
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    Utils.categories[key] = { label, icon, color, bg: `rgba(${r},${g},${b},0.1)` };
    await this._saveCategories();
    Utils.closeModal();
    Utils.toast('分类已更新');
    this.render();
  },

  async removeCategory(key) {
    if (Object.keys(Utils.categories).length <= 1) {
      Utils.toast('至少保留一个分类', 'error');
      return;
    }
    if (!confirm('确定删除该分类？已有联系人不会被删除，但显示会回退到默认分类。')) return;
    delete Utils.categories[key];
    await this._saveCategories();
    Utils.toast('分类已删除');
    this.render();
  },

  async _saveCategories() {
    await API.saveCustomCategories(Utils.categories);
    await Utils.loadCustomConfigs();
  },

  // ── Interaction Types CRUD ──

  showAddInteractionTypeModal() {
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">添加互动类型</h2>
        <form onsubmit="Settings.saveNewInteractionType(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">标识 (英文) *</label><input name="key" class="form-input" required></div>
            <div><label class="detail-label block mb-1">显示名称 *</label><input name="label" class="form-input" required></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">图标 (Emoji)</label><input name="icon" class="form-input"></div>
            <div><label class="detail-label block mb-1">颜色</label><input name="color" class="form-input" type="color" value="#6b7280"></div>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">添加类型</button>
          </div>
        </form>
      </div>
    `);
  },

  async saveNewInteractionType(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const key = form.get('key').trim().toLowerCase();
    const label = form.get('label').trim();
    const icon = form.get('icon').trim() || '📝';
    const color = form.get('color') || '#6b7280';
    if (!key || !label) { Utils.toast('标识和名称为必填', 'error'); return; }
    if (Utils.interactionTypes[key]) { Utils.toast('该标识已存在', 'error'); return; }

    Utils.interactionTypes[key] = { label, icon, color };
    await this._saveInteractionTypes();
    Utils.closeModal();
    Utils.toast('互动类型已添加');
    this.render();
  },

  editInteractionType(key) {
    const t = Utils.interactionTypes[key];
    if (!t) return;
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">编辑互动类型 - ${t.label}</h2>
        <form onsubmit="Settings.saveEditInteractionType(event, '${key}')" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">标识</label><input name="key" class="form-input" value="${key}" disabled></div>
            <div><label class="detail-label block mb-1">显示名称 *</label><input name="label" class="form-input" required value="${t.label}"></div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">图标 (Emoji)</label><input name="icon" class="form-input" value="${t.icon}"></div>
            <div><label class="detail-label block mb-1">颜色</label><input name="color" class="form-input" type="color" value="${t.color}"></div>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">保存</button>
          </div>
        </form>
      </div>
    `);
  },

  async saveEditInteractionType(e, key) {
    e.preventDefault();
    const form = new FormData(e.target);
    Utils.interactionTypes[key] = {
      label: form.get('label').trim(),
      icon: form.get('icon').trim() || '📝',
      color: form.get('color') || '#6b7280',
    };
    await this._saveInteractionTypes();
    Utils.closeModal();
    Utils.toast('互动类型已更新');
    this.render();
  },

  async removeInteractionType(key) {
    if (Object.keys(Utils.interactionTypes).length <= 1) {
      Utils.toast('至少保留一个互动类型', 'error');
      return;
    }
    if (!confirm('确定删除该互动类型？已有记录不会被删除，但显示会回退到默认类型。')) return;
    delete Utils.interactionTypes[key];
    await this._saveInteractionTypes();
    Utils.toast('互动类型已删除');
    this.render();
  },

  async _saveInteractionTypes() {
    await API.saveCustomInteractionTypes(Utils.interactionTypes);
    await Utils.loadCustomConfigs();
  },

  // ── Data import/export ──

  async exportData() {
    try {
      const data = await API.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexuslink-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  showImportModal() {
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-4">导入数据</h2>
        <p class="text-xs text-gray-500 mb-4">选择之前导出的 JSON 备份文件进行恢复。</p>
        <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
          <p class="text-xs text-red-400">导入将覆盖当前所有数据，建议先导出备份。</p>
        </div>
        <input type="file" id="import-file-input" class="form-input" accept="application/json">
        <div class="flex justify-end gap-3 pt-4 border-t border-white/5 mt-4">
          <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
          <button type="button" onclick="Settings.executeImport()" class="btn-primary">确认导入</button>
        </div>
      </div>
    `);
  },

  async executeImport() {
    const fileInput = document.getElementById('import-file-input');
    if (!fileInput || !fileInput.files.length) { Utils.toast('请先选择文件', 'error'); return; }
    try {
      const text = await fileInput.files[0].text();
      const data = JSON.parse(text);
      const result = await API.importData(data);
      Utils.closeModal();
      const c = result.counts || {};
      Utils.toast(`导入成功：${c.contacts || 0} 位联系人, ${c.interactions || 0} 条互动`);
      await Utils.loadCustomConfigs();
      this.init();
    } catch (err) {
      Utils.toast(err.message || '导入失败，请检查文件格式', 'error');
    }
  },

  handleClearAll() {
    Utils.showModal(`
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">🗑️</span>
          <h2 class="text-lg font-bold text-white">一键清空所有数据</h2>
        </div>
        <div class="mb-6 space-y-2 text-sm text-gray-400">
          <p>此操作将删除系统中的所有数据，包括：</p>
          <ul class="space-y-1 pl-4">
            <li>&#x2022; 所有联系人及其联系方式</li>
            <li>&#x2022; 所有互动记录</li>
            <li>&#x2022; 所有标签</li>
            <li>&#x2022; 所有提醒</li>
            <li>&#x2022; 所有在线记录</li>
            <li>&#x2022; 所有系统设置（含自定义分类和互动类型）</li>
          </ul>
          <p class="text-red-400">此操作不可撤销！建议先导出数据备份。</p>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
          <button type="button" onclick="Settings.executeClearAll()" class="btn-danger">确认清空</button>
        </div>
      </div>
    `);
  },

  async executeClearAll() {
    try {
      await API.clearAllData();
      Utils.closeModal();
      Utils.toast('所有数据已清空');
      Utils.categories = JSON.parse(JSON.stringify(Utils._defaultCategories));
      Utils.interactionTypes = JSON.parse(JSON.stringify(Utils._defaultInteractionTypes));
      this.settings = {};
      this.tags = [];
      this.render();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  // ── Start Date ──

  confirmSetStartDate() {
    const input = document.getElementById('start-date-input');
    const date = input ? input.value : '';
    if (!date) { Utils.toast('请先选择日期', 'error'); return; }
    Utils.showModal(`
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">⚠️</span>
          <h2 class="text-lg font-bold text-white">确认设置起始日期</h2>
        </div>
        <div class="mb-6 space-y-3">
          <p class="text-sm text-gray-300">将记录起始日期设为 <strong class="text-neon-blue">${date}</strong>，以下数据将被永久删除：</p>
          <ul class="text-sm text-gray-400 space-y-1.5 pl-4">
            <li>&#x2022; 日期早于 ${date} 的所有互动记录</li>
            <li>&#x2022; 提醒日期早于 ${date} 的所有提醒</li>
          </ul>
          <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p class="text-xs text-red-400 font-medium">此操作不可撤销，删除后无法恢复。</p>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
          <button type="button" onclick="Settings.executeSetStartDate('${date}')" class="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all cursor-pointer">确认删除并设置</button>
        </div>
      </div>
    `);
  },

  async executeSetStartDate(date) {
    try {
      const result = await API.setRecordStartDate(date);
      Utils.closeModal();
      const p = result.purged || {};
      const total = (p.deleted_interactions || 0) + (p.deleted_reminders || 0);
      if (total > 0) {
        Utils.toast(`已设置起始日期，清理了 ${p.deleted_interactions || 0} 条互动、${p.deleted_reminders || 0} 条提醒`);
      } else {
        Utils.toast('起始日期已设置，无需清理旧数据');
      }
      this.settings.record_start_date = date;
      this.render();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },

  async clearStartDate() {
    if (!confirm('确定清除起始日期限制？清除后不会恢复已删除的数据，但新建记录不再受日期限制。')) return;
    try {
      await API.clearRecordStartDate();
      Utils.toast('起始日期限制已清除');
      delete this.settings.record_start_date;
      this.render();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },
};
