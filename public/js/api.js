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
  createReminder(data) { return this.request('POST', '/reminders', data); },
  updateReminder(id, data) { return this.request('PUT', `/reminders/${id}`, data); },
  deleteReminder(id) { return this.request('DELETE', `/reminders/${id}`); },

  // Stats
  getOverview() { return this.request('GET', '/stats/overview'); },
  getInteractionFrequency() { return this.request('GET', '/stats/interaction-frequency'); },
  getRelationshipLevels() { return this.request('GET', '/stats/relationship-levels'); },
  getMonthlyInteractions() { return this.request('GET', '/stats/monthly-interactions'); },
  getCategoryDistribution() { return this.request('GET', '/stats/category-distribution'); },

  // Relationships (graph)
  getRelationships() { return this.request('GET', '/relationships'); },
  createRelationship(data) { return this.request('POST', '/relationships', data); },
  deleteRelationship(id) { return this.request('DELETE', `/relationships/${id}`); },
};
