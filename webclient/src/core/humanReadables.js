// humanReadables.js



/**
 * return a human readable string for a number of bytes, e.g., 1 B, 5.3 kB, 17 MB, 12 GB, ...
 * @param {number} bytes
 */
export function bytesToString(bytes) {
  const units = ['B', 'kB', 'MB', 'GB', 'TB']; // I swear if someone sends a TB of data
  let unit = 0;
  
  while (bytes >= 1000 && unit < units.length - 1) {
    bytes /= 1000;
    unit += 1;
  }

  return `${bytes.toFixed(1)} ${units[unit]}`;
}



/**
 * return a human readable string for a number of seconds, e.g., 1s, 5m 17s, 3h 15m, ...
 * @param {number} seconds
 */
export function secondsToString(seconds) {
  let minutes = Math.floor(seconds / 60);
  seconds %= 60;
  let hours = Math.floor(minutes / 60);
  minutes %= 60;
  
  const str = [];

  if (hours > 0) {
    // if took hours, only mention hours and minutes (ignore seconds)
    str.push(`${hours}h`);
    if (minutes > 0) str.push(`${minutes}m`);
  } else {
    // if took less than an hour, mention minutes, seconds, or minutes and seconds
    if (minutes > 0) str.push(`${minutes}m`);
    if (seconds > 0) str.push(`${seconds}s`);
  }

  return str.join(" ");
}



/**
 * @param {Error} error
 */
export function errorToString(error) {
  let str = error.toString() + '\n\n';
  let currentError = error;

  while (currentError) {
    str += currentError.stack.trim() + '\n\n';
    currentError = currentError.cause;
  }

  return str;
}
