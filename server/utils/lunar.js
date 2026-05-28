const { Lunar, Solar } = require('lunar-javascript');
const express = require('express');

/**
 * Compute the next upcoming solar date for a birthday.
 * Works for both solar and lunar birthdays.
 *
 * @param {number} month - birth month
 * @param {number} day   - birth day
 * @param {'solar'|'lunar'} type - calendar type
 * @returns {{ solarDate: Date, calLabel: string } | null}
 */
function getNextBirthdaySolarDate(month, day, type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let solarDate;
  let calLabel;

  if (type === 'lunar') {
    calLabel = '农历';
    try {
      const lunarBday = Lunar.fromYmd(today.getFullYear(), month, day);
      solarDate = lunarBday.getSolar();
      solarDate = new Date(solarDate.getYear(), solarDate.getMonth() - 1, solarDate.getDay());
      if (solarDate < today) {
        const nextLunar = Lunar.fromYmd(today.getFullYear() + 1, month, day);
        const nextSolar = nextLunar.getSolar();
        solarDate = new Date(nextSolar.getYear(), nextSolar.getMonth() - 1, nextSolar.getDay());
      }
    } catch {
      return null;
    }
  } else {
    calLabel = '公历';
    solarDate = new Date(today.getFullYear(), month - 1, day);
    if (solarDate < today) {
      solarDate.setFullYear(solarDate.getFullYear() + 1);
    }
  }

  return { solarDate, calLabel };
}

// ── Lunar-solar date conversion API endpoint ────────────────────
const lunarRouter = express.Router();

// GET /api/lunar/convert?date=YYYY-MM-DD&from=solar|lunar
lunarRouter.get('/convert', (req, res) => {
  try {
    const { date, from } = req.query;
    if (!date || !from) {
      return res.status(400).json({ error: 'Missing required query parameters: date, from' });
    }
    if (from !== 'solar' && from !== 'lunar') {
      return res.status(400).json({ error: 'Parameter "from" must be "solar" or "lunar"' });
    }

    const parts = date.split('-');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    let solar, lunar;
    if (from === 'solar') {
      solar = Solar.fromYmd(year, month, day);
      lunar = solar.getLunar();
    } else {
      lunar = Lunar.fromYmd(year, month, day);
      solar = lunar.getSolar();
    }

    res.json({
      solar: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
      lunar: `${lunar.getYear()}-${String(Math.abs(lunar.getMonth())).padStart(2, '0')}-${String(lunar.getDay()).padStart(2, '0')}`,
      lunarChinese: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { getNextBirthdaySolarDate, lunarRouter };
