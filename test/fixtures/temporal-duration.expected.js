(function() { if (!(Duration.parse('P1D').addTo(new Date('2024-01-15')) > new Date('2024-01-15'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(Duration.parse('P1D').addTo(new Date('2024-01-15')) < new Date('2024-01-17'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(Duration.parse('P1D').subtractFrom(new Date('2024-01-15')) < new Date('2024-01-15'))) throw new Error("Assertion failed"); return true; })()
(function() { if (!(Duration.parse('P1D').subtractFrom(new Date('2024-01-15')) > new Date('2024-01-13'))) throw new Error("Assertion failed"); return true; })()
