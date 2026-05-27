// Dashboard Module
const Dashboard = {
  charts: {},

  async init() {
    const [overview, frequency, levels, monthly, categories] = await Promise.all([
      API.getOverview(),
      API.getInteractionFrequency(),
      API.getRelationshipLevels(),
      API.getMonthlyInteractions(),
      API.getCategoryDistribution()
    ]);
    this.render(overview, frequency, levels, monthly, categories);
  },

  render(overview, frequency, levels, monthly, categories) {
    const el = document.getElementById('view-dashboard');
    el.innerHTML = `
      <div class="p-6 lg:p-8">
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-white">数据仪表盘</h2>
          <p class="text-sm text-gray-500 mt-1">人脉数据概览与分析</p>
        </div>

        <!-- Stat Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          ${this.statCard('联系人总数', overview.total_contacts || 0, '👥', '#00d4ff')}
          ${this.statCard('本月互动', overview.interactions_this_month || 0, '💬', '#a855f7')}
          ${this.statCard('待处理提醒', overview.upcoming_reminders || 0, '🔔', '#ec4899')}
          ${this.statCard('标签数量', overview.tag_count || 0, '🏷️', '#10b981')}
        </div>

        <!-- Charts Row 1 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <!-- Monthly Interactions -->
          <div class="glass-card p-4 sm:p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-4">📊 月度互动趋势</h3>
            <canvas id="chart-monthly" height="200"></canvas>
          </div>
          <!-- Category Distribution -->
          <div class="glass-card p-4 sm:p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-4">📂 联系人分类</h3>
            <canvas id="chart-categories" height="200"></canvas>
          </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <!-- Interaction Frequency (Top 10) -->
          <div class="glass-card p-4 sm:p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-4">🔥 互动频率 Top 10</h3>
            <canvas id="chart-frequency" height="240"></canvas>
          </div>
          <!-- Relationship Levels -->
          <div class="glass-card p-4 sm:p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-4">💎 亲密度分布</h3>
            <canvas id="chart-levels" height="240"></canvas>
          </div>
        </div>

        <!-- Tag Distribution -->
        ${overview.tag_distribution ? `
        <div class="glass-card p-5">
          <h3 class="text-sm font-semibold text-gray-300 mb-4">🏷️ 标签分布</h3>
          <div class="flex flex-wrap gap-3">
            ${overview.tag_distribution.map(t => `
              <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                <div class="w-2.5 h-2.5 rounded-full" style="background:${t.color}"></div>
                <span class="text-sm text-gray-300">${t.name}</span>
                <span class="text-xs text-gray-500">${t.count}</span>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      </div>
    `;

    // Render charts after DOM update
    setTimeout(() => {
      this.renderMonthlyChart(monthly);
      this.renderCategoryChart(categories);
      this.renderFrequencyChart(frequency);
      this.renderLevelsChart(levels);
    }, 100);
  },

  statCard(label, value, icon, color) {
    return `
      <div class="stat-card glass-card p-5" style="--accent-color:${color}">
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl">${icon}</span>
          <span class="text-3xl font-bold text-white">${value}</span>
        </div>
        <p class="text-xs text-gray-400">${label}</p>
      </div>
    `;
  },

  chartDefaults() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#9ca3af', font: { size: 11, family: 'Inter' } } },
      },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
      }
    };
  },

  renderMonthlyChart(data) {
    const ctx = document.getElementById('chart-monthly');
    if (!ctx) return;
    if (this.charts.monthly) this.charts.monthly.destroy();
    this.charts.monthly = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.month),
        datasets: [{
          label: '互动次数',
          data: data.map(d => d.count),
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0,212,255,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00d4ff',
          pointBorderColor: '#0a0e1a',
          pointBorderWidth: 2,
          pointRadius: 4,
        }]
      },
      options: { ...this.chartDefaults(), plugins: { ...this.chartDefaults().plugins, legend: { display: false } } }
    });
  },

  renderCategoryChart(data) {
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;
    if (this.charts.categories) this.charts.categories.destroy();
    const colors = { friend: '#10b981', family: '#f59e0b', colleague: '#3b82f6', business: '#a855f7', other: '#6b7280' };
    const labels = { friend: '朋友', family: '家人', colleague: '同事', business: '商务', other: '其他' };
    this.charts.categories = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => labels[d.category] || d.category),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => colors[d.category] || '#6b7280'),
          borderColor: '#0a0e1a',
          borderWidth: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 11, family: 'Inter' }, padding: 16 } }
        },
        cutout: '65%',
      }
    });
  },

  renderFrequencyChart(data) {
    const ctx = document.getElementById('chart-frequency');
    if (!ctx) return;
    if (this.charts.frequency) this.charts.frequency.destroy();
    this.charts.frequency = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(d => d.name),
        datasets: [{
          label: '互动次数',
          data: data.map(d => d.interaction_count),
          backgroundColor: data.map((_, i) => {
            const gradient = ['#00d4ff', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'];
            return gradient[i % gradient.length];
          }),
          borderRadius: 6,
          barThickness: 20,
        }]
      },
      options: {
        ...this.chartDefaults(),
        indexAxis: 'y',
        plugins: { ...this.chartDefaults().plugins, legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: { ticks: { color: '#d1d5db', font: { size: 11 } }, grid: { display: false } },
        }
      }
    });
  },

  renderLevelsChart(data) {
    const ctx = document.getElementById('chart-levels');
    if (!ctx) return;
    if (this.charts.levels) this.charts.levels.destroy();
    const levelLabels = { 1: '★ 初识', 2: '★★ 一般', 3: '★★★ 熟悉', 4: '★★★★ 亲密', 5: '★★★★★ 至交' };
    const levelColors = ['#6b7280', '#f59e0b', '#0ea5e9', '#a855f7', '#ec4899'];
    this.charts.levels = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: data.map(d => levelLabels[d.relationship_level] || `等级${d.relationship_level}`),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map((d, i) => levelColors[d.relationship_level - 1] + '60'),
          borderColor: data.map((d, i) => levelColors[d.relationship_level - 1]),
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 10, family: 'Inter' }, padding: 12 } }
        },
        scales: {
          r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  },
};
