// Dayjs with plugins for temporal operations
const _dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const isoWeek = require('dayjs/plugin/isoWeek');
const quarterOfYear = require('dayjs/plugin/quarterOfYear');
_dayjs.extend(duration);
_dayjs.extend(isoWeek);
_dayjs.extend(quarterOfYear);

// Time injection for testing: set KLANG_NOW environment variable
// Example: KLANG_NOW="2025-12-01T19:34:00" node test.js
let dayjs;
if (process.env.KLANG_NOW) {
  const fixedTime = _dayjs(process.env.KLANG_NOW);
  dayjs = function(input) {
    if (input === undefined) {
      return fixedTime.clone();
    }
    return _dayjs(input);
  };
  // Copy static methods from original dayjs
  Object.keys(_dayjs).forEach(key => {
    dayjs[key] = _dayjs[key];
  });
} else {
  dayjs = _dayjs;
}
