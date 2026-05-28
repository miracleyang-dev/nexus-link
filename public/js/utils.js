// API helper module
const API = {
  base: '/api',

  async request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  // Contacts
  getContacts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/contacts' + (q ? '?' + q : ''));
  },
  getContact(id) { return this.request('GET', `/contacts/${id}`); },
  createContact(data) { return this.request('POST', '/contacts', data); },
  updateContact(id, data) { return this.request('PUT', `/contacts/${id}`, data); },
  deleteContact(id) { return this.request('DELETE', `/contacts/${id}`); },

  // Tags
  getTags() { return this.request('GET', '/tags'); },
  createTag(data) { return this.request('POST', '/tags', data); },
  deleteTag(id) { return this.request('DELETE', `/tags/${id}`); },
  assignTags(contactId, tagIds) { return this.request('POST', `/contacts/${contactId}/tags`, { tag_ids: tagIds }); },

  // Interactions
  getInteractions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/interactions' + (q ? '?' + q : ''));
  },
  getTimeline() { return this.request('GET', '/interactions/timeline'); },
  createInteraction(data) { return this.request('POST', '/interactions', data); },
  deleteInteraction(id) { return this.request('DELETE', `/interactions/${id}`); },

  // Reminders
  getReminders(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', '/reminders' + (q ? '?' + q : ''));
  },
  getUpcomingReminders() { return this.request('GET', '/reminders/upcoming'); },
  updateReminder(id, data) { return this.request('PUT', `/reminders/${id}`, data); },
  deleteReminder(id) { return this.request('DELETE', `/reminders/${id}`); },

  // Stats
  getOverview() { return this.request('GET', '/stats/overview'); },
  getInteractionFrequency() { return this.request('GET', '/stats/interaction-frequency'); },
  getRelationshipLevels() { return this.request('GET', '/stats/relationship-levels'); },
  getMonthlyInteractions() { return this.request('GET', '/stats/monthly-interactions'); },
  getCategoryDistribution() { return this.request('GET', '/stats/category-distribution'); },
  getInteractionTypes() { return this.request('GET', '/stats/interaction-types'); },
  getMoodTrend() { return this.request('GET', '/stats/mood-trend'); },
  getCityDistribution() { return this.request('GET', '/stats/city-distribution'); },
  getNeglected() { return this.request('GET', '/stats/neglected'); },

  // Strengths
  getStrengths(contactId) { return this.request('GET', `/contacts/${contactId}/strengths`); },
  createStrength(contactId, data) { return this.request('POST', `/contacts/${contactId}/strengths`, data); },
  updateStrength(id, data) { return this.request('PUT', `/strengths/${id}`, data); },
  deleteStrength(id) { return this.request('DELETE', `/strengths/${id}`); },

  // Lunar calendar conversion
  convertDate(date, from) {
    return this.request('GET', `/lunar/convert?date=${date}&from=${from}`);
  },

  // Settings
  getSettings() { return this.request('GET', '/settings'); },
  setRecordStartDate(date) { return this.request('PUT', '/settings/record-start-date', { date }); },
  clearRecordStartDate() { return this.request('DELETE', '/settings/record-start-date'); },

  // Online Pings
  getPings(days = 7) { return this.request('GET', `/pings?days=${days}`); },
  createPing(date, contact_id) { return this.request('POST', '/pings', { date, contact_id }); },
  deletePing(date, contact_id) { return this.request('DELETE', `/pings?date=${date}&contact_id=${contact_id}`); },
};

// Utility functions
const Utils = {
  // Category config
  categories: {
    friend: { label: '朋友', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '👋' },
    family: { label: '家人', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '❤️' },
    colleague: { label: '同事', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: '💼' },
    business: { label: '商务', color: '#a855f7', bg: 'rgba(168,85,247,0.1)', icon: '🤝' },
    other: { label: '其他', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '📌' },
  },

  // Interaction type config
  interactionTypes: {
    meet: { label: '见面', icon: '🤝', color: '#10b981' },
    call: { label: '通话', icon: '📞', color: '#3b82f6' },
    chat: { label: '聊天', icon: '💬', color: '#8b5cf6' },
    gift: { label: '送礼', icon: '🎁', color: '#ec4899' },
    meal: { label: '聚餐', icon: '🍽️', color: '#f59e0b' },
    other: { label: '其他', icon: '📝', color: '#6b7280' },
  },

  // Mood config
  moods: { 1: '😞', 2: '😐', 3: '🙂', 4: '😊', 5: '🤩' },

  // Strength progress config
  progressConfig: {
    not_started: { label: '未开始', color: '#6b7280', icon: '○', bg: 'rgba(107,114,128,0.1)' },
    learning:    { label: '学习中', color: '#3b82f6', icon: '◔', bg: 'rgba(59,130,246,0.1)' },
    practicing:  { label: '实践中', color: '#f59e0b', icon: '◑', bg: 'rgba(245,158,11,0.1)' },
    mastered:    { label: '已掌握', color: '#10b981', icon: '●', bg: 'rgba(16,185,129,0.1)' },
  },

  // Render rating stars
  ratingStars(rating, size = 12) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<span style="color:${i <= rating ? '#f59e0b' : 'rgba(255,255,255,0.1)'};font-size:${size}px">★</span>`;
    }
    return html;
  },

  // Render progress badge
  progressBadge(progress) {
    const cfg = this.progressConfig[progress] || this.progressConfig.learning;
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}25">${cfg.icon} ${cfg.label}</span>`;
  },

  // Generate avatar color from name
  avatarColor(name) {
    const colors = [
      ['#0ea5e9', '#0369a1'], ['#a855f7', '#7c3aed'], ['#ec4899', '#db2777'],
      ['#10b981', '#059669'], ['#f59e0b', '#d97706'], ['#ef4444', '#dc2626'],
      ['#06b6d4', '#0891b2'], ['#8b5cf6', '#7c3aed'],
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  },

  // Create avatar HTML
  avatarHTML(name, size = 40) {
    const [bg1, bg2] = this.avatarColor(name);
    const initial = name.charAt(0);
    const fontSize = Math.round(size * 0.4);
    return `<div class="avatar" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,${bg1},${bg2});font-size:${fontSize}px;color:white">${initial}</div>`;
  },

  // Relationship level dots
  levelDots(level) {
    let html = '<div class="flex gap-1">';
    for (let i = 1; i <= 5; i++) {
      html += `<div class="rel-dot ${i <= level ? 'active' : 'inactive'}"></div>`;
    }
    html += '</div>';
    return html;
  },

  // Category badge
  categoryBadge(category) {
    const cat = this.categories[category] || this.categories.other;
    return `<span class="category-badge" style="background:${cat.bg};color:${cat.color};border:1px solid ${cat.color}30">${cat.icon} ${cat.label}</span>`;
  },

  // Tag pill
  tagPill(tag) {
    return `<span class="tag-pill" style="color:${tag.color};border-color:${tag.color}40;background:${tag.color}15">${tag.name}</span>`;
  },

  // Format date
  formatDate(dateStr) {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  // Relative time
  relativeTime(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    if (diff < 30) return `${Math.floor(diff/7)}周前`;
    if (diff < 365) return `${Math.floor(diff/30)}个月前`;
    return `${Math.floor(diff/365)}年前`;
  },

  // Days until
  daysUntil(dateStr) {
    const now = new Date();
    now.setHours(0,0,0,0);
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  },

  // Show toast
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const colors = { success: '#10b981', error: '#ef4444', info: '#0ea5e9' };
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span style="color:${colors[type]};font-weight:700">${icons[type]}</span> ${message}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },

  // Show modal
  showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-content').innerHTML = html;
    overlay.classList.remove('hidden');
    overlay.classList.add('show');
    overlay.onclick = (e) => { if (e.target === overlay) this.closeModal(); };
  },

  // Close modal
  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('show');
  },

  // Get zodiac emoji
  zodiacEmoji(zodiac) {
    const map = {
      '白羊座':'♈','金牛座':'♉','双子座':'♊','巨蟹座':'♋','狮子座':'♌','处女座':'♍',
      '天秤座':'♎','天蝎座':'♏','射手座':'♐','摩羯座':'♑','水瓶座':'♒','双鱼座':'♓'
    };
    return map[zodiac] || '';
  },

  // MBTI color
  mbtiColor(mbti) {
    if (!mbti) return '#6b7280';
    const typeMap = { E: '#f59e0b', I: '#8b5cf6', N: '#ec4899', S: '#10b981', T: '#3b82f6', F: '#ef4444', J: '#06b6d4', P: '#f97316' };
    return typeMap[mbti[0]] || '#6b7280';
  },

  // Debounce
  debounce(fn, ms = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  },

  // Lunar calendar conversion (client-side using LunarJS)
  solarToLunar(dateStr) {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const solar = LunarJS.Solar.fromYmd(y, m, d);
      const lunar = solar.getLunar();
      return {
        lunar: `${lunar.getYear()}-${String(Math.abs(lunar.getMonth())).padStart(2,'0')}-${String(lunar.getDay()).padStart(2,'0')}`,
        lunarChinese: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
      };
    } catch { return null; }
  },

  lunarToSolar(dateStr) {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const lunar = LunarJS.Lunar.fromYmd(y, m, d);
      const solar = lunar.getSolar();
      return {
        solar: `${solar.getYear()}-${String(solar.getMonth()).padStart(2,'0')}-${String(solar.getDay()).padStart(2,'0')}`,
        lunarChinese: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
      };
    } catch { return null; }
  },

  // Get this year's solar birthday from a contact's birthday data
  getThisYearSolarBirthday(birthday, birthdayType) {
    if (!birthday) return null;
    const [, m, d] = birthday.split('-').map(Number);
    const thisYear = new Date().getFullYear();
    if (birthdayType === 'lunar') {
      try {
        const lunar = LunarJS.Lunar.fromYmd(thisYear, m, d);
        const solar = lunar.getSolar();
        return `${solar.getYear()}-${String(solar.getMonth()).padStart(2,'0')}-${String(solar.getDay()).padStart(2,'0')}`;
      } catch { return null; }
    }
    return `${thisYear}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  },

  // Format birthday display with both calendars
  formatBirthday(birthday, birthdayType) {
    if (!birthday) return '';
    const typeLabel = birthdayType === 'lunar' ? '农历' : '公历';
    let display = `${birthday} (${typeLabel})`;
    if (birthdayType === 'lunar') {
      const conv = this.lunarToSolar(birthday);
      if (conv) display += `\n公历: ${conv.solar}`;
    } else {
      const conv = this.solarToLunar(birthday);
      if (conv) display += `\n农历: ${conv.lunarChinese}`;
    }
    return display;
  },
};
