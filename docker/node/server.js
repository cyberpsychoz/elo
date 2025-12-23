const http = require('http');

// ISO8601 Duration parser and calculator
class Duration {
  constructor(iso8601) {
    this.iso8601 = iso8601;
    this._isDuration = true;
    this.milliseconds = this.parseToMilliseconds(iso8601);
  }

  static parse(iso8601) {
    return new Duration(iso8601);
  }

  parseToMilliseconds(iso8601) {
    // Parse ISO8601 duration: P[nY][nM][nW][nD][T[nH][nM][nS]]
    const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?/;
    const match = iso8601.match(regex);

    if (!match) return 0;

    const [, years = 0, months = 0, weeks = 0, days = 0, hours = 0, minutes = 0, seconds = 0] = match;

    // Approximate conversion to milliseconds
    // Note: This is approximate because months and years vary in length
    let ms = 0;
    ms += parseInt(years) * 365.25 * 24 * 60 * 60 * 1000;  // Average year
    ms += parseInt(months) * 30.44 * 24 * 60 * 60 * 1000;  // Average month
    ms += parseInt(weeks) * 7 * 24 * 60 * 60 * 1000;
    ms += parseInt(days) * 24 * 60 * 60 * 1000;
    ms += parseInt(hours) * 60 * 60 * 1000;
    ms += parseInt(minutes) * 60 * 1000;
    ms += parseFloat(seconds) * 1000;

    return ms;
  }

  addTo(date) {
    return new Date(date.getTime() + this.milliseconds);
  }

  subtractFrom(date) {
    return new Date(date.getTime() - this.milliseconds);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.url === '/eval' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const expression = data.expression;
        const variables = data.variables || {};

        // Create a function that evaluates the expression with variables in scope
        const varNames = Object.keys(variables);
        const varValues = Object.values(variables);

        // Make Duration available in the evaluation context
        const func = new Function('Duration', ...varNames, `return ${expression}`);
        const result = func(Duration, ...varValues);

        // Convert result to JSON-friendly format
        let resultValue;
        if (result instanceof Date) {
          resultValue = result.toISOString();
        } else if (result && result._isDuration) {
          resultValue = result.iso8601;
        } else {
          resultValue = result;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result: resultValue }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3002, '0.0.0.0', () => {
  console.log('Node.js evaluation server running on port 3002');
});
