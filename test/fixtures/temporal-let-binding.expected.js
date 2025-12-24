((x) => klang.add(x, dayjs.duration('P1D')))(dayjs().startOf('day'))
((d) => klang.add(dayjs().startOf('day'), d))(dayjs.duration('P1D'))
((x) => ((d) => klang.add(x, d))(dayjs.duration('P1D')))(dayjs().startOf('day'))
