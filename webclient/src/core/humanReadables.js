// humanReadables.js

// return a human readable string for a number of bytes, e.g., 1 B, 5.3 kB, 17 MB, 12 GB, ...
export function bytesToHRString(bytes) {
  const units = ['B', 'kB', 'MB', 'GB', 'TB']; // I swear if someone sends a TB of data
  let unit = 0;
  
  while (bytes >= 1000 && unit < units.length - 1) {
    bytes /= 1000;
    unit += 1;
  }

  return `${bytes.toFixed(1)} ${units[unit]}`;
}