((x) => x.add(dayjs.duration('P1D')))(dayjs().startOf('day'))
((d) => dayjs().startOf('day').add(d))(dayjs.duration('P1D'))
((x) => ((d) => x.add(d))(dayjs.duration('P1D')))(dayjs().startOf('day'))
