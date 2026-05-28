const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    email TEXT,
    company TEXT,
    position TEXT,
    birthday TEXT,
    birthday_type TEXT DEFAULT 'solar' CHECK(birthday_type IN ('solar','lunar')),
    zodiac TEXT,
    mbti TEXT,
    blood_type TEXT,
    hometown TEXT,
    current_city TEXT,
    personality_traits TEXT,
    strengths TEXT,
    preferences TEXT,
    notes TEXT,
    relationship_level INTEGER DEFAULT 3 CHECK(relationship_level BETWEEN 1 AND 5),
    category TEXT DEFAULT 'other' CHECK(category IN ('friend','family','colleague','business','other')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (contact_id, tag_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    type TEXT DEFAULT 'other' CHECK(type IN ('meet','call','chat','gift','meal','other')),
    title TEXT NOT NULL,
    content TEXT,
    location TEXT,
    date TEXT NOT NULL,
    mood INTEGER DEFAULT 3 CHECK(mood BETWEEN 1 AND 5),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    remind_date TEXT NOT NULL,
    type TEXT DEFAULT 'custom' CHECK(type IN ('birthday','anniversary','follow_up','custom')),
    is_completed INTEGER DEFAULT 0 CHECK(is_completed IN (0,1)),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS contact_strengths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER DEFAULT 3 CHECK(rating BETWEEN 1 AND 5),
    progress TEXT DEFAULT 'learning' CHECK(progress IN ('not_started','learning','practicing','mastered')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id_1 INTEGER NOT NULL,
    contact_id_2 INTEGER NOT NULL,
    relationship_type TEXT DEFAULT 'friend' CHECK(relationship_type IN ('friend','colleague','family','partner','other')),
    strength INTEGER DEFAULT 3 CHECK(strength BETWEEN 1 AND 5),
    notes TEXT,
    FOREIGN KEY (contact_id_1) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id_2) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM contacts').get();
  if (count.cnt > 0) return;

  // Seed contacts
  const insertContact = db.prepare(`
    INSERT INTO contacts (name, avatar_url, phone, email, company, position, birthday, birthday_type, zodiac, mbti, blood_type, hometown, current_city, personality_traits, strengths, preferences, notes, relationship_level, category)
    VALUES (@name, @avatar_url, @phone, @email, @company, @position, @birthday, @birthday_type, @zodiac, @mbti, @blood_type, @hometown, @current_city, @personality_traits, @strengths, @preferences, @notes, @relationship_level, @category)
  `);

  const contacts = [
    {
      name: '张伟', avatar_url: null, phone: '13800138001', email: 'zhangwei@example.com',
      company: '腾讯科技', position: '高级产品经理', birthday: '1990-03-15', birthday_type: 'solar', zodiac: '双鱼座',
      mbti: 'ENTJ', blood_type: 'A', hometown: '北京', current_city: '深圳',
      personality_traits: '果断,有领导力,目标导向', strengths: '战略思维强，擅长团队管理',
      preferences: '篮球,科技产品,咖啡,阅读商业书籍', notes: '大学室友，关系非常好，每年都会见面',
      relationship_level: 5, category: 'friend'
    },
    {
      name: '李婷', avatar_url: null, phone: '13900139002', email: 'liting@example.com',
      company: '阿里巴巴', position: '数据分析师', birthday: '1992-07-22', birthday_type: 'solar', zodiac: '巨蟹座',
      mbti: 'INFJ', blood_type: 'O', hometown: '杭州', current_city: '杭州',
      personality_traits: '细心,有洞察力,善良', strengths: '数据分析能力强，善于发现规律',
      preferences: '瑜伽,烘焙,看电影,旅行', notes: '前同事，转行做数据后发展很好',
      relationship_level: 4, category: 'colleague'
    },
    {
      name: '王建国', avatar_url: null, phone: '13700137003', email: 'wangjianguo@example.com',
      company: '建国律师事务所', position: '合伙人', birthday: '1985-11-08', birthday_type: 'solar', zodiac: '天蝎座',
      mbti: 'ISTJ', blood_type: 'B', hometown: '上海', current_city: '上海',
      personality_traits: '严谨,可靠,注重细节', strengths: '法律专业能力强，人脉广',
      preferences: '高尔夫,红酒,古典音乐,收藏', notes: '帮忙处理过合同问题，非常专业',
      relationship_level: 3, category: 'business'
    },
    {
      name: '陈美玲', avatar_url: null, phone: '13600136004', email: 'chenmeiling@example.com',
      company: null, position: null, birthday: '1965-05-20', birthday_type: 'solar', zodiac: '金牛座',
      mbti: 'ESFJ', blood_type: 'A', hometown: '成都', current_city: '成都',
      personality_traits: '温柔,体贴,传统', strengths: '厨艺精湛，家庭管理能力强',
      preferences: '广场舞,种花,做菜,看剧', notes: '妈妈的好朋友，从小看着我长大',
      relationship_level: 4, category: 'family'
    },
    {
      name: '刘洋', avatar_url: null, phone: '13500135005', email: 'liuyang@example.com',
      company: '字节跳动', position: '前端工程师', birthday: '1995-01-30', birthday_type: 'solar', zodiac: '水瓶座',
      mbti: 'INTP', blood_type: 'AB', hometown: '武汉', current_city: '北京',
      personality_traits: '聪明,内向,有创造力', strengths: '技术能力强，学习速度快',
      preferences: '编程,游戏,动漫,摄影', notes: '技术社区认识的朋友，经常交流技术',
      relationship_level: 3, category: 'friend'
    },
    {
      name: '赵雪', avatar_url: null, phone: '13400134006', email: 'zhaoxue@example.com',
      company: '小红书', position: '内容运营总监', birthday: '1993-09-12', birthday_type: 'solar', zodiac: '处女座',
      mbti: 'ENFP', blood_type: 'O', hometown: '南京', current_city: '上海',
      personality_traits: '活泼,有创意,社交达人', strengths: '内容创作能力强，人脉资源丰富',
      preferences: '美食探店,时尚,健身,写作', notes: '行业活动认识，合作过几个项目',
      relationship_level: 4, category: 'business'
    },
    {
      name: '孙浩然', avatar_url: null, phone: '13300133007', email: 'sunhaoran@example.com',
      company: '华为技术', position: '研发总监', birthday: '1988-04-05', birthday_type: 'solar', zodiac: '白羊座',
      mbti: 'ESTJ', blood_type: 'A', hometown: '西安', current_city: '深圳',
      personality_traits: '务实,坚韧,有责任心', strengths: '项目管理经验丰富，技术视野广',
      preferences: '登山,钓鱼,象棋,历史', notes: '张伟介绍认识的，为人很靠谱',
      relationship_level: 3, category: 'friend'
    },
    {
      name: '周小燕', avatar_url: null, phone: '13200132008', email: 'zhouxiaoyan@example.com',
      company: '新东方教育', position: '英语教师', birthday: '1991-12-25', birthday_type: 'solar', zodiac: '摩羯座',
      mbti: 'ISFJ', blood_type: 'B', hometown: '长沙', current_city: '广州',
      personality_traits: '耐心,温和,有爱心', strengths: '英语口语流利，教学经验丰富',
      preferences: '读书,旅行,手工,茶道', notes: '高中同学，一直保持联系',
      relationship_level: 5, category: 'friend'
    },
    {
      name: '黄志强', avatar_url: null, phone: '13100131009', email: 'huangzhiqiang@example.com',
      company: '美团', position: '区域经理', birthday: '1989-08-18', birthday_type: 'solar', zodiac: '狮子座',
      mbti: 'ESTP', blood_type: 'O', hometown: '重庆', current_city: '重庆',
      personality_traits: '豪爽,大方,有执行力', strengths: '沟通能力强，市场敏感度高',
      preferences: '火锅,麻将,看球赛,自驾游', notes: '大学社团认识，重庆出差必联系的人',
      relationship_level: 4, category: 'friend'
    },
    {
      name: '林雨晨', avatar_url: null, phone: '13000130010', email: 'linyuchen@example.com',
      company: '自由职业', position: '独立设计师', birthday: '1994-06-01', birthday_type: 'solar', zodiac: '双子座',
      mbti: 'INFP', blood_type: 'AB', hometown: '厦门', current_city: '厦门',
      personality_traits: '敏感,浪漫,理想主义', strengths: 'UI设计能力出众，审美独特',
      preferences: '绘画,咖啡,独立音乐,猫', notes: '合作过APP设计项目，作品质量很高',
      relationship_level: 3, category: 'business'
    }
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insertContact.run(item);
    }
  });
  insertMany(contacts);

  // Seed tags
  const insertTag = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
  const tags = [
    ['技术圈', '#3B82F6'], ['创业伙伴', '#EF4444'], ['大学同学', '#10B981'],
    ['高中同学', '#F59E0B'], ['行业大佬', '#8B5CF6'], ['吃货团', '#EC4899'],
    ['运动搭子', '#06B6D4'], ['老乡', '#F97316']
  ];
  for (const [name, color] of tags) {
    insertTag.run(name, color);
  }

  // Assign tags to contacts
  const insertCT = db.prepare('INSERT INTO contact_tags (contact_id, tag_id) VALUES (?, ?)');
  const tagAssignments = [
    [1, 3], [1, 7], // 张伟: 大学同学, 运动搭子
    [2, 1], [2, 3], // 李婷: 技术圈, 大学同学
    [3, 5],         // 王建国: 行业大佬
    [4, 8],         // 陈美玲: 老乡
    [5, 1],         // 刘洋: 技术圈
    [6, 5], [6, 6], // 赵雪: 行业大佬, 吃货团
    [7, 1], [7, 2], // 孙浩然: 技术圈, 创业伙伴
    [8, 4], [8, 6], // 周小燕: 高中同学, 吃货团
    [9, 3], [9, 6], [9, 7], // 黄志强: 大学同学, 吃货团, 运动搭子
    [10, 1], [10, 2]  // 林雨晨: 技术圈, 创业伙伴
  ];
  for (const [cid, tid] of tagAssignments) {
    insertCT.run(cid, tid);
  }

  // Seed interactions
  const insertInteraction = db.prepare(`
    INSERT INTO interactions (contact_id, type, title, content, location, date, mood)
    VALUES (@contact_id, @type, @title, @content, @location, @date, @mood)
  `);

  const interactions = [
    { contact_id: 1, type: 'meal', title: '深圳聚餐', content: '在南山区一家粤菜馆吃饭，聊了很多近况和职业规划', location: '深圳南山', date: '2026-05-20', mood: 5 },
    { contact_id: 1, type: 'call', title: '电话聊天', content: '聊了半小时，讨论了他最近的项目进展', location: null, date: '2026-04-15', mood: 4 },
    { contact_id: 2, type: 'chat', title: '微信交流数据工具', content: '她推荐了几个数据可视化工具，很有帮助', location: null, date: '2026-05-10', mood: 4 },
    { contact_id: 2, type: 'meet', title: '杭州出差见面', content: '出差顺便约了咖啡，聊了行业趋势', location: '杭州西湖区', date: '2026-03-22', mood: 5 },
    { contact_id: 3, type: 'call', title: '合同咨询', content: '咨询了合作协议中的几个条款问题', location: null, date: '2026-05-05', mood: 3 },
    { contact_id: 4, type: 'meet', title: '回成都探望', content: '带了礼物回去看望阿姨，她做了一桌好菜', location: '成都', date: '2026-02-10', mood: 5 },
    { contact_id: 4, type: 'call', title: '母亲节电话', content: '母亲节给阿姨打了电话问候', location: null, date: '2026-05-11', mood: 4 },
    { contact_id: 5, type: 'chat', title: '技术问题讨论', content: '讨论了React 19的新特性和性能优化', location: null, date: '2026-05-18', mood: 4 },
    { contact_id: 5, type: 'meet', title: '技术沙龙', content: '一起参加了北京的前端技术沙龙活动', location: '北京朝阳区', date: '2026-04-20', mood: 5 },
    { contact_id: 6, type: 'meal', title: '上海商务晚餐', content: '讨论了下一季度的内容合作方案', location: '上海静安区', date: '2026-05-15', mood: 4 },
    { contact_id: 6, type: 'gift', title: '送生日礼物', content: '送了一本限量版设计书', location: null, date: '2025-09-12', mood: 5 },
    { contact_id: 7, type: 'call', title: '项目合作沟通', content: '讨论了潜在的技术合作机会', location: null, date: '2026-05-08', mood: 3 },
    { contact_id: 8, type: 'chat', title: '日常聊天', content: '聊了最近看的书和旅行计划', location: null, date: '2026-05-22', mood: 5 },
    { contact_id: 8, type: 'gift', title: '寄茶叶', content: '从云南带了普洱茶寄给她', location: null, date: '2026-04-01', mood: 4 },
    { contact_id: 9, type: 'meal', title: '重庆火锅', content: '出差重庆，老黄带我吃了正宗火锅', location: '重庆渝中区', date: '2026-04-28', mood: 5 },
    { contact_id: 9, type: 'meet', title: '一起看球赛', content: 'CBA半决赛一起看的直播，很激动', location: null, date: '2026-03-15', mood: 5 },
    { contact_id: 10, type: 'chat', title: '设计方案讨论', content: '讨论了新项目的UI设计方向', location: null, date: '2026-05-25', mood: 4 },
    { contact_id: 10, type: 'meet', title: '厦门见面', content: '在厦门旅游时约了咖啡，参观了她的工作室', location: '厦门思明区', date: '2026-01-18', mood: 5 }
  ];
  for (const i of interactions) {
    insertInteraction.run(i);
  }

  // Seed contact strengths (structured from old text field)
  const insertStrength = db.prepare(`
    INSERT INTO contact_strengths (contact_id, content, rating, progress)
    VALUES (@contact_id, @content, @rating, @progress)
  `);
  const strengths = [
    { contact_id: 1, content: '战略思维强', rating: 5, progress: 'mastered' },
    { contact_id: 1, content: '擅长团队管理', rating: 4, progress: 'practicing' },
    { contact_id: 2, content: '数据分析能力强', rating: 5, progress: 'mastered' },
    { contact_id: 2, content: '善于发现规律', rating: 4, progress: 'mastered' },
    { contact_id: 3, content: '法律专业能力强', rating: 5, progress: 'mastered' },
    { contact_id: 3, content: '人脉广', rating: 4, progress: 'practicing' },
    { contact_id: 4, content: '厨艺精湛', rating: 5, progress: 'mastered' },
    { contact_id: 4, content: '家庭管理能力强', rating: 4, progress: 'mastered' },
    { contact_id: 5, content: '技术能力强', rating: 5, progress: 'practicing' },
    { contact_id: 5, content: '学习速度快', rating: 4, progress: 'learning' },
    { contact_id: 6, content: '内容创作能力强', rating: 5, progress: 'mastered' },
    { contact_id: 6, content: '人脉资源丰富', rating: 4, progress: 'practicing' },
    { contact_id: 7, content: '项目管理经验丰富', rating: 4, progress: 'mastered' },
    { contact_id: 7, content: '技术视野广', rating: 3, progress: 'learning' },
    { contact_id: 8, content: '英语口语流利', rating: 5, progress: 'mastered' },
    { contact_id: 8, content: '教学经验丰富', rating: 4, progress: 'practicing' },
    { contact_id: 9, content: '沟通能力强', rating: 5, progress: 'mastered' },
    { contact_id: 9, content: '市场敏感度高', rating: 4, progress: 'practicing' },
    { contact_id: 10, content: 'UI设计能力出众', rating: 5, progress: 'mastered' },
    { contact_id: 10, content: '审美独特', rating: 4, progress: 'mastered' },
  ];
  for (const s of strengths) {
    insertStrength.run(s);
  }

  // Seed reminders
  const insertReminder = db.prepare(`
    INSERT INTO reminders (contact_id, title, description, remind_date, type, is_completed)
    VALUES (@contact_id, @title, @description, @remind_date, @type, @is_completed)
  `);

  const reminders = [
    { contact_id: 1, title: '张伟生日', description: '准备生日礼物，他喜欢科技产品', remind_date: '2026-03-15', type: 'birthday', is_completed: 1 },
    { contact_id: 6, title: '赵雪生日', description: '记得提前订花', remind_date: '2026-09-12', type: 'birthday', is_completed: 0 },
    { contact_id: 8, title: '周小燕生日', description: '圣诞节也是她生日，准备双份惊喜', remind_date: '2026-12-25', type: 'birthday', is_completed: 0 },
    { contact_id: 3, title: '合同续签跟进', description: '跟王律师确认合同续签事宜', remind_date: '2026-06-01', type: 'follow_up', is_completed: 0 },
    { contact_id: 7, title: '合作方案跟进', description: '跟孙浩然确认技术合作方案', remind_date: '2026-06-05', type: 'follow_up', is_completed: 0 },
    { contact_id: null, title: '整理联系人信息', description: '更新所有联系人的最新职位信息', remind_date: '2026-06-15', type: 'custom', is_completed: 0 },
    { contact_id: 2, title: '李婷工作周年', description: '她在阿里三周年，发个祝贺', remind_date: '2026-07-01', type: 'anniversary', is_completed: 0 },
    { contact_id: 9, title: '黄志强生日', description: '他喜欢火锅，可以送火锅底料礼盒', remind_date: '2026-08-18', type: 'birthday', is_completed: 0 }
  ];
  for (const r of reminders) {
    insertReminder.run(r);
  }

  // Seed relationships
  const insertRel = db.prepare(`
    INSERT INTO relationships (contact_id_1, contact_id_2, relationship_type, strength, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const rels = [
    [1, 7, 'friend', 4, '张伟介绍认识的孙浩然'],
    [1, 9, 'friend', 5, '大学同班同学'],
    [1, 2, 'colleague', 3, '之前在同一家公司'],
    [2, 5, 'colleague', 3, '都在互联网行业，技术交流'],
    [5, 10, 'colleague', 4, '合作过设计和前端开发项目'],
    [6, 10, 'friend', 3, '都在上海/厦门，设计圈朋友'],
    [8, 9, 'friend', 3, '通过我认识的，偶尔聚餐'],
    [3, 6, 'other', 2, '介绍过法律咨询'],
    [7, 5, 'colleague', 3, '都是技术圈的']
  ];
  for (const [c1, c2, type, str, notes] of rels) {
    insertRel.run(c1, c2, type, str, notes);
  }

  console.log('Database seeded successfully.');
}

seedDatabase();

module.exports = db;
