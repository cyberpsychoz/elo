(function() { if (!(klang.add(dayjs('2024-01-15'), dayjs.duration('P1D')) > dayjs('2024-01-15'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(klang.add(dayjs('2024-01-15'), dayjs.duration('P1D')) < dayjs('2024-01-17'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(klang.subtract(dayjs('2024-01-15'), dayjs.duration('P1D')) < dayjs('2024-01-15'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(klang.subtract(dayjs('2024-01-15'), dayjs.duration('P1D')) > dayjs('2024-01-13'))) throw new Error("Assertion failed"); return true; })()
