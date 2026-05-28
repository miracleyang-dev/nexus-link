const { Lunar } = require('lunar-javascript');

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

module.exports = { getNextBirthdaySolarDate };
