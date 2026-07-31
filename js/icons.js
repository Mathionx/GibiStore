/* js/icons.js */
// ============================================================================
// GIBI STORE v3 — Icon library
// A small set of consistent line icons (same stroke style as the bottom nav)
// used everywhere the app used to reach for an emoji. Usage:
//   Icon('bell', 20)  ->  returns an <svg> string
// ============================================================================

const ICON_PATHS = {
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  shield: '<path d="M12 2 3 6v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V6z"/><path d="m9 12 2 2 4-4"/>',
  pin: '<path d="M12 21s7-6.6 7-11.5A7 7 0 0 0 5 9.5C5 14.4 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/>',
  alert: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17.5h.01"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11"/><path d="M4 13h16"/><path d="M12 9c-1.8 0-3.4-1-3.4-2.7A2.3 2.3 0 0 1 11 4c1.7 0 1.7 2.7 1 5Z"/><path d="M12 9c1.8 0 3.4-1 3.4-2.7A2.3 2.3 0 0 0 13 4c-1.7 0-1.7 2.7-1 5Z"/>',
  cap: '<path d="M2 9.5 12 5l10 4.5-10 4.5-10-4.5Z"/><path d="M6 12v4.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V12"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M9.5 15.5c.5.7 1.4 1 2.5 1 1.7 0 3-1 3-2.3 0-1.4-1.2-1.9-3-2.3-1.8-.4-3-1-3-2.3 0-1.3 1.3-2.3 3-2.3 1.1 0 2 .3 2.5 1"/><path d="M12 7v1.2M12 15.8V17"/>',
  bag: '<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  wifiOff: '<path d="m2 2 20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 13a10 10 0 0 1 3-2.1M19 13a10 10 0 0 0-4.6-2.7"/><path d="M2 8.8a15 15 0 0 1 4-2.5M22 8.8a15 15 0 0 0-8-4.3"/><path d="M12 20h.01"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  x: '<path d="m18 6-12 12"/><path d="m6 6 12 12"/>',
  check: '<path d="m5 12 5 5 9-9"/>',
  star: '<path d="m12 3 2.7 5.9 6.3.6-4.8 4.3 1.4 6.2L12 17l-5.6 3 1.4-6.2-4.8-4.3 6.3-.6L12 3Z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>'
};

/**
 * Returns an inline <svg> string for the given icon name.
 * size: pixel width/height (square). strokeWidth defaults to 2.
 */
function Icon(name, size = 20, strokeWidth = 2) {
  const path = ICON_PATHS[name];
  if (!path) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/** A filled star used for ratings, with an outline variant for empty stars. */
function StarIcon(filled, size = 12) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS.star}</svg>`;
}
