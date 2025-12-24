// ISO 8601 Duration parser for JavaScript
class Duration {
  constructor(milliseconds) {
    this.milliseconds = milliseconds;
  }

  static parse(iso8601) {
    const regex = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
    const match = iso8601.match(regex);

    if (!match) {
      throw new Error(`Invalid ISO 8601 duration: ${iso8601}`);
    }

    const [, years, months, days, hours, minutes, seconds] = match;

    // Convert to milliseconds
    // Note: Years and months are approximate (365.25 days and 30 days respectively)
    let ms = 0;
    if (years) ms += parseInt(years) * 365.25 * 24 * 60 * 60 * 1000;
    if (months) ms += parseInt(months) * 30 * 24 * 60 * 60 * 1000;
    if (days) ms += parseInt(days) * 24 * 60 * 60 * 1000;
    if (hours) ms += parseInt(hours) * 60 * 60 * 1000;
    if (minutes) ms += parseInt(minutes) * 60 * 1000;
    if (seconds) ms += parseFloat(seconds) * 1000;

    return new Duration(ms);
  }

  addTo(date) {
    return new Date(date.getTime() + this.milliseconds);
  }

  subtractFrom(date) {
    return new Date(date.getTime() - this.milliseconds);
  }
}
