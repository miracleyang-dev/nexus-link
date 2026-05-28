// Settings Module
const Settings = {
  settings: {},

  async init() {
    this.settings = await API.getSettings();
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

        <!-- Record Start Date -->
        <div class="glass-card p-6 mb-6">
          <div class="flex items-start gap-4">
            <div class="type-icon shrink-0" style="background:rgba(0,212,255,0.1);color:#00d4ff;font-size:18px">📅</div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-white mb-1">记录起始日期</h3>
              <p class="text-xs text-gray-500 mb-4">设置后，系统仅保存该日期及之后的数据。该日期之前的互动记录、提醒、联系人将被<span class="text-red-400 font-medium">永久删除</span>，且新建记录不可早于此日期。</p>

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

        <!-- Explanation -->
        <div class="glass-card p-5">
          <h4 class="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">说明</h4>
          <ul class="space-y-2 text-xs text-gray-500">
            <li class="flex items-start gap-2">
              <span class="text-neon-blue mt-0.5">&#x2022;</span>
              <span>设置起始日期后，该日期之前的<strong class="text-gray-400">互动记录</strong>、<strong class="text-gray-400">提醒</strong>、<strong class="text-gray-400">联系人</strong>（含其标签、优点、关系）将被永久删除</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-neon-blue mt-0.5">&#x2022;</span>
              <span>新增互动或提醒时，日期不可早于起始日期</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-neon-blue mt-0.5">&#x2022;</span>
              <span>清除限制后，不会恢复已删除的数据，但不再限制新建记录的日期</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-400 mt-0.5">&#x2022;</span>
              <span class="text-red-400/80">此操作不可逆，请谨慎设置</span>
            </li>
          </ul>
        </div>
      </div>
    `;
  },

  confirmSetStartDate() {
    const input = document.getElementById('start-date-input');
    const date = input ? input.value : '';
    if (!date) {
      Utils.toast('请先选择日期', 'error');
      return;
    }

    // Show confirmation modal
    Utils.showModal(`
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">⚠️</span>
          <h2 class="text-lg font-bold text-white">确认设置起始日期</h2>
        </div>
        <div class="mb-6 space-y-3">
          <p class="text-sm text-gray-300">
            将记录起始日期设为 <strong class="text-neon-blue">${date}</strong>，以下数据将被<span class="text-red-400 font-semibold">永久删除</span>：
          </p>
          <ul class="text-sm text-gray-400 space-y-1.5 pl-4">
            <li>&#x2022; 日期早于 ${date} 的所有互动记录</li>
            <li>&#x2022; 提醒日期早于 ${date} 的所有提醒</li>
            <li>&#x2022; 创建时间早于 ${date} 的所有联系人及其关联数据</li>
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
      const total = (p.deleted_interactions || 0) + (p.deleted_reminders || 0) + (p.deleted_contacts || 0);
      if (total > 0) {
        Utils.toast(`已设置起始日期，清理了 ${p.deleted_contacts || 0} 位联系人、${p.deleted_interactions || 0} 条互动、${p.deleted_reminders || 0} 条提醒`);
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
