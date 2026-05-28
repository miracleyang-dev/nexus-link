// Dashboard Module - Redesigned
const Dashboard = {
  charts: {},

  async init() {
    const [overview, frequency, levels, monthly, categories, interactionTypes, moodTrend, cityDist, neglected] = await Promise.all([
      API.getOverview(),
      API.getInteractionFrequency(),
      API.getRelationshipLevels(),
      API.getMonthlyInteractions(),
      API.getCategoryDistribution(),
      API.getInteractionTypes(),
      API.getMoodTrend(),
      API.getCityDistribution(),
      API.getNeglected()
    ]);
    this.render(overview, frequency, levels, monthly, categories, interactionTypes, moodTrend, cityDist, neglected);
  },

  render(overview, frequency, levels, monthly, categories, interactionTypes, moodTrend, cityDist, neglected) {
    const el = document.getElementById('view-dashboard');
    // Category labels/colors
    const catLabels = { friend: '朋友', family: '家人', colleague: '同事', business: '商务', other: '其他' };
    const catColors = { friend: '#10b981', family: '#f59e0b', colleague: '#3b82f6', business: '#a855f7', other: '#6b7280' };

    el.innerHTML = `
      <div class="p-6 lg:p-8">
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-white">数据仪表盘</h2>
          <p class="text-sm text-gray-500 mt-1">人脉数据概览与深度分析</p>
        </div>

        <!-- Stat Cards Row -->
        <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
          ${this.statCard('联系人', overview.total_contacts || 0, '👥', '#00d4ff', overview.new_contacts_this_month ? `本月 +${overview.new_contacts_this_month}` : '')}
          ${this.statCard('总互动', overview.total_interactions || 0, '💬', '#a855f7', overview.interactions_this_month ? `本月 ${overview.interactions_this_month} 次` : '')}
        </div>

        <!-- Row 1: Monthly Trend + Mood -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div class="lg:col-span-2 glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">互动趋势 & 心情变化</h3>
            <p class="text-[11px] text-gray-500 mb-4">近12个月互动频率与平均心情</p>
            <div style="height:220px"><canvas id="chart-trend"></canvas></div>
          </div>
          <div class="glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">互动方式</h3>
            <p class="text-[11px] text-gray-500 mb-4">各类型互动占比</p>
            <div style="height:220px"><canvas id="chart-types"></canvas></div>
          </div>
        </div>

        <!-- Row 2: Top Contacts + Category + Levels -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div class="glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">互动最频繁</h3>
            <p class="text-[11px] text-gray-500 mb-4">Top ${frequency.length} 联系人</p>
            <div id="top-contacts-list" class="space-y-2.5">
              ${frequency.map((d, i) => {
                const cat = catColors[d.category] || '#6b7280';
                const maxCount = frequency[0]?.interaction_count || 1;
                const pct = Math.round((d.interaction_count / maxCount) * 100);
                return `<div class="flex items-center gap-3">
                  <span class="text-[11px] text-gray-500 w-4 text-right">${i+1}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs text-gray-200 truncate">${d.name}</span>
                      <span class="text-[11px] text-gray-400">${d.interaction_count}次</span>
                    </div>
                    <div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-500" style="width:${pct}%;background:${cat}"></div>
                    </div>
                  </div>
                </div>`;
              }).join('')}
              ${frequency.length === 0 ? '<p class="text-xs text-gray-500">暂无数据</p>' : ''}
            </div>
          </div>
          <div class="glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">人脉构成</h3>
            <p class="text-[11px] text-gray-500 mb-4">按分类统计</p>
            <div style="height:200px"><canvas id="chart-categories"></canvas></div>
          </div>
          <div class="glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">亲密度分布</h3>
            <p class="text-[11px] text-gray-500 mb-4">关系深度层级</p>
            <div style="height:200px"><canvas id="chart-levels"></canvas></div>
          </div>
        </div>

        <!-- Row 3: City + Tags + Neglected -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <!-- City Distribution -->
          <div class="glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">城市分布</h3>
            <p class="text-[11px] text-gray-500 mb-4">联系人所在城市</p>
            <div class="space-y-2.5">
              ${cityDist.map(d => {
                const maxC = cityDist[0]?.count || 1;
                const pct = Math.round((d.count / maxC) * 100);
                return `<div class="flex items-center gap-3">
                  <span class="text-xs text-gray-300 w-14 truncate">${d.city}</span>
                  <div class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div class="h-full rounded-full bg-neon-blue/60" style="width:${pct}%"></div>
                  </div>
                  <span class="text-[11px] text-gray-500 w-4 text-right">${d.count}</span>
                </div>`;
              }).join('')}
              ${cityDist.length === 0 ? '<p class="text-xs text-gray-500">暂无数据</p>' : ''}
            </div>
          </div>

          <!-- Tag Distribution -->
          <div class="glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">标签分布</h3>
            <p class="text-[11px] text-gray-500 mb-4">标签使用情况</p>
            <div class="flex flex-wrap gap-2">
              ${(overview.tag_distribution || []).map(t => `
                <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/5" style="background:${t.color}10">
                  <div class="w-2 h-2 rounded-full" style="background:${t.color}"></div>
                  <span class="text-xs" style="color:${t.color}">${t.name}</span>
                  <span class="text-[10px] text-gray-500 ml-0.5">${t.count}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Neglected Contacts -->
          <div class="glass-card p-5">
            <h3 class="text-sm font-semibold text-gray-300 mb-1">待维护关系</h3>
            <p class="text-[11px] text-gray-500 mb-4">30天以上未互动</p>
            <div class="space-y-2">
              ${neglected.map(d => {
                const levelColor = ['#6b7280','#f59e0b','#0ea5e9','#a855f7','#ec4899'][d.relationship_level - 1] || '#6b7280';
                return `<div class="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                  ${Utils.avatarHTML(d.name, 28)}
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-gray-200 truncate">${d.name}</p>
                    <p class="text-[10px] text-gray-500">上次: ${Utils.relativeTime(d.last_interaction)}</p>
                  </div>
                  <span class="text-[10px] px-1.5 py-0.5 rounded-full" style="background:${levelColor}15;color:${levelColor}">
                    ${'★'.repeat(d.relationship_level)}
                  </span>
                </div>`;
              }).join('')}
              ${neglected.length === 0 ? '<p class="text-xs text-gray-500">所有关系维护良好</p>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Render charts after DOM update
    setTimeout(() => {
      this.renderTrendChart(monthly, moodTrend);
      this.renderTypesChart(interactionTypes);
      this.renderCategoryChart(categories);
      this.renderLevelsChart(levels);
    }, 80);
  },

  statCard(label, value, icon, color, subtitle) {
    return `
      <div class="glass-card p-4 sm:p-5 relative overflow-hidden group">
        <div class="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-10 group-hover:opacity-20 transition-opacity" style="background:${color}"></div>
        <div class="flex items-start justify-between mb-2">
          <span class="text-xl">${icon}</span>
          <span class="text-2xl sm:text-3xl font-bold text-white">${value}</span>
        </div>
        <p class="text-xs text-gray-400">${label}</p>
        ${subtitle ? `<p class="text-[10px] text-gray-600 mt-1">${subtitle}</p>` : ''}
      </div>
    `;
  },

  // Combined trend chart: interaction count (bar) + mood (line)
  renderTrendChart(monthly, moodTrend) {
    const ctx = document.getElementById('chart-trend');
    if (!ctx) return;
    if (this.charts.trend) this.charts.trend.destroy();

    // Merge months
    const allMonths = [...new Set([...monthly.map(d=>d.month), ...moodTrend.map(d=>d.month)])].sort();
    const monthMap = new Map(monthly.map(d => [d.month, d.count]));
    const moodMap = new Map(moodTrend.map(d => [d.month, d.avg_mood]));

    this.charts.trend = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: allMonths.map(m => m.slice(5) + '月'),
        datasets: [
          {
            type: 'bar',
            label: '互动次数',
            data: allMonths.map(m => monthMap.get(m) || 0),
            backgroundColor: 'rgba(0,212,255,0.25)',
            borderColor: '#00d4ff',
            borderWidth: 1,
            borderRadius: 4,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line',
            label: '平均心情',
            data: allMonths.map(m => moodMap.get(m) || null),
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236,72,153,0.1)',
            pointBackgroundColor: '#ec4899',
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            tension: 0.4,
            fill: false,
            yAxisID: 'y1',
            order: 1,
            spanGaps: true,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { color: '#9ca3af', font: { size: 10, family: 'Inter' }, boxWidth: 12, padding: 12 }
          },
          tooltip: {
            backgroundColor: '#1a2035',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            callbacks: {
              label: (ctx) => ctx.dataset.label === '平均心情'
                ? `心情: ${ctx.parsed.y}/5`
                : `互动: ${ctx.parsed.y}次`
            }
          }
        },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } },
          y: {
            position: 'left',
            ticks: { color: '#6b7280', font: { size: 10 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.03)' },
            title: { display: false }
          },
          y1: {
            position: 'right',
            min: 0, max: 5,
            ticks: { color: '#ec4899', font: { size: 10 }, stepSize: 1 },
            grid: { display: false },
            title: { display: false }
          }
        }
      }
    });
  },

  // Interaction types - horizontal bar
  renderTypesChart(data) {
    const ctx = document.getElementById('chart-types');
    if (!ctx) return;
    if (this.charts.types) this.charts.types.destroy();
    const typeConfig = {
      meet: { label: '见面', color: '#10b981' },
      call: { label: '通话', color: '#3b82f6' },
      chat: { label: '聊天', color: '#8b5cf6' },
      gift: { label: '送礼', color: '#ec4899' },
      meal: { label: '聚餐', color: '#f59e0b' },
      other: { label: '其他', color: '#6b7280' },
    };

    this.charts.types = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => (typeConfig[d.type] || typeConfig.other).label),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => (typeConfig[d.type] || typeConfig.other).color + '80'),
          borderColor: data.map(d => (typeConfig[d.type] || typeConfig.other).color),
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af', font: { size: 10, family: 'Inter' }, padding: 10, boxWidth: 10 }
          },
          tooltip: {
            backgroundColor: '#1a2035',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
          }
        },
      }
    });
  },

  // Category distribution - semi-donut
  renderCategoryChart(data) {
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;
    if (this.charts.categories) this.charts.categories.destroy();
    const colors = { friend: '#10b981', family: '#f59e0b', colleague: '#3b82f6', business: '#a855f7', other: '#6b7280' };
    const labels = { friend: '朋友', family: '家人', colleague: '同事', business: '商务', other: '其他' };

    const total = data.reduce((s, d) => s + d.count, 0);

    this.charts.categories = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => labels[d.category] || d.category),
        datasets: [{
          data: data.map(d => d.count),
          backgroundColor: data.map(d => (colors[d.category] || '#6b7280') + '70'),
          borderColor: data.map(d => colors[d.category] || '#6b7280'),
          borderWidth: 2,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 180,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af', font: { size: 10, family: 'Inter' }, padding: 8, boxWidth: 10 }
          },
          tooltip: {
            backgroundColor: '#1a2035',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed} 人 (${Math.round(ctx.parsed / total * 100)}%)`
            }
          }
        },
      }
    });
  },

  // Relationship levels - horizontal stacked bar (single bar, segmented)
  renderLevelsChart(data) {
    const ctx = document.getElementById('chart-levels');
    if (!ctx) return;
    if (this.charts.levels) this.charts.levels.destroy();

    const levelLabels = ['★ 初识', '★★ 一般', '★★★ 熟悉', '★★★★ 亲密', '★★★★★ 至交'];
    const levelColors = ['#6b7280', '#f59e0b', '#0ea5e9', '#a855f7', '#ec4899'];
    const total = data.reduce((s, d) => s + d.count, 0);

    // Build datasets - one per level for stacked bar
    const datasets = data.map(d => ({
      label: levelLabels[d.relationship_level - 1] || `等级${d.relationship_level}`,
      data: [d.count],
      backgroundColor: levelColors[d.relationship_level - 1] + '70',
      borderColor: levelColors[d.relationship_level - 1],
      borderWidth: 1,
      borderRadius: 3,
    }));

    this.charts.levels = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['亲密度'],
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af', font: { size: 9, family: 'Inter' }, padding: 8, boxWidth: 10 }
          },
          tooltip: {
            backgroundColor: '#1a2035',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x} 人 (${total ? Math.round(ctx.parsed.x / total * 100) : 0}%)`
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#6b7280', font: { size: 10 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.03)' }
          },
          y: {
            stacked: true,
            display: false,
          }
        }
      }
    });
  },
};
