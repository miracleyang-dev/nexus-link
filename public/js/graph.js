// Graph Module - D3.js Force-Directed Graph
const Graph = {
  svg: null,
  simulation: null,

  async init() {
    const [contacts, relationships] = await Promise.all([
      API.getContacts(),
      API.getRelationships()
    ]);
    this.render(contacts, relationships);
  },

  render(contacts, relationships) {
    const el = document.getElementById('view-graph');
    el.innerHTML = `
      <div class="p-6 lg:p-8 h-full flex flex-col">
        <div class="flex items-center justify-between mb-4 gap-3">
          <div class="min-w-0">
            <h2 class="text-2xl font-bold text-white">关系图谱</h2>
            <p class="text-sm text-gray-500 mt-1">${contacts.length} 个节点 · ${relationships.length} 条关系</p>
          </div>
          <button onclick="Graph.showAddRelModal()" class="btn-primary flex items-center gap-2 shrink-0 text-xs sm:text-[13px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span class="hidden sm:inline">添加关系</span><span class="sm:hidden">添加</span>
          </button>
        </div>
        <!-- Legend -->
        <div class="flex flex-wrap gap-3 sm:gap-4 mb-4 text-[11px] sm:text-xs text-gray-400">
          ${Object.entries(Utils.categories).map(([k, v]) => `<div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 rounded-full" style="background:${v.color}"></div>${v.label}</div>`).join('')}
          <div class="flex items-center gap-1.5"><div class="w-5 h-0.5 bg-white/30"></div>连线粗=亲密</div>
        </div>
        <div id="graph-container" class="flex-1 glass-card grid-bg overflow-hidden rounded-xl" style="min-height:350px"></div>
      </div>
    `;

    this.drawGraph(contacts, relationships);
  },

  drawGraph(contacts, relationships) {
    const container = document.getElementById('graph-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    // Clear previous
    container.innerHTML = '';

    const nodes = contacts.map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      level: c.relationship_level,
      mbti: c.mbti,
      company: c.company
    }));

    const links = relationships.map(r => ({
      source: r.contact_id_1,
      target: r.contact_id_2,
      type: r.relationship_type,
      strength: r.strength,
      id: r.id
    }));

    const svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Defs for gradients and glow
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(d => d.strength * 0.15))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        const typeColors = { friend: '#10b981', colleague: '#3b82f6', family: '#f59e0b', partner: '#ec4899', other: '#6b7280' };
        return typeColors[d.type] || '#6b7280';
      })
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', d => d.strength * 0.8);

    // Node groups
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Node circles
    const catColors = { friend: '#10b981', family: '#f59e0b', colleague: '#3b82f6', business: '#a855f7', other: '#6b7280' };

    node.append('circle')
      .attr('r', d => 14 + d.level * 3)
      .attr('fill', d => catColors[d.category] || '#6b7280')
      .attr('fill-opacity', 0.2)
      .attr('stroke', d => catColors[d.category] || '#6b7280')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#glow)')
      .style('cursor', 'pointer');

    // Node labels
    node.append('text')
      .text(d => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => 14 + d.level * 3 + 16)
      .attr('fill', '#d1d5db')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, sans-serif');

    // Node initials
    node.append('text')
      .text(d => d.name.charAt(0))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#fff')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, sans-serif')
      .style('pointer-events', 'none');

    // Tooltip on hover
    node.append('title')
      .text(d => `${d.name}\n${d.company || ''}\nMBTI: ${d.mbti || '未知'}\n亲密度: ${'★'.repeat(d.level)}`);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    this.simulation = simulation;
    this._contacts = contacts;
  },

  async showAddRelModal() {
    const contacts = this._contacts || await API.getContacts();
    Utils.showModal(`
      <div class="p-6">
        <h2 class="text-lg font-bold text-white mb-6">添加关系</h2>
        <form onsubmit="Graph.saveRel(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">联系人 A *</label>
              <select name="contact_id_1" class="form-input" required>
                <option value="">选择</option>
                ${contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div><label class="detail-label block mb-1">联系人 B *</label>
              <select name="contact_id_2" class="form-input" required>
                <option value="">选择</option>
                ${contacts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="detail-label block mb-1">关系类型</label>
              <select name="relationship_type" class="form-input">
                <option value="friend">朋友</option>
                <option value="colleague">同事</option>
                <option value="family">家人</option>
                <option value="partner">伙伴</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div><label class="detail-label block mb-1">关系强度 (1-5)</label>
              <select name="strength" class="form-input">
                ${[3,4,5,2,1].map(i => `<option value="${i}">${i} - ${'★'.repeat(i)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div><label class="detail-label block mb-1">备注</label><input name="notes" class="form-input" placeholder="可选"></div>
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" onclick="Utils.closeModal()" class="btn-ghost">取消</button>
            <button type="submit" class="btn-primary">保存</button>
          </div>
        </form>
      </div>
    `);
  },

  async saveRel(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const data = {};
    for (const [k, v] of form.entries()) data[k] = v;
    data.contact_id_1 = parseInt(data.contact_id_1);
    data.contact_id_2 = parseInt(data.contact_id_2);
    data.strength = parseInt(data.strength);
    if (data.contact_id_1 === data.contact_id_2) {
      Utils.toast('不能与自己建立关系', 'error');
      return;
    }
    try {
      await API.createRelationship(data);
      Utils.closeModal();
      Utils.toast('关系已添加');
      await this.init();
    } catch (err) {
      Utils.toast(err.message, 'error');
    }
  },
};
