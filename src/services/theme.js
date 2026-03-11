/**
 * @returns {{ isDark: boolean, mode: string }}
 */
export const applyThemeFromStorage = () => {
  const root = document.documentElement;
  const mode = localStorage.getItem('app_themeMode') || 'system';

  let isDark = false;
  if (mode === 'dark') isDark = true;
  else if (
    mode === 'system' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    isDark = true;
  }

  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  /**
   * @param {string} color
   * @param {number} percent
   * @returns {string}
   */
  const shadeHexColor = (color, percent) => {
    let f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff;
    return (
      '#' +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    );
  };

  /**
   * @param {string} key
   * @param {string} cssVar
   */
  const applyColor = (key, cssVar) => {
    const val = localStorage.getItem(key);
    if (val) root.style.setProperty(cssVar, val);
    else root.style.removeProperty(cssVar);
  };

  const customPrimary = localStorage.getItem('app_primary');
  if (customPrimary) {
    root.style.setProperty('--app-primary', customPrimary);
    root.style.setProperty(
      '--app-primary-hover',
      shadeHexColor(customPrimary, isDark ? 0.15 : -0.15),
    );
  } else {
    root.style.removeProperty('--app-primary');
    root.style.removeProperty('--app-primary-hover');
  }

  const customBg = localStorage.getItem('app_bg');
  if (customBg) {
    root.style.setProperty('--app-bg', customBg);
    root.style.setProperty('--app-surface', shadeHexColor(customBg, isDark ? 0.05 : 0.08));
    root.style.setProperty('--app-border', shadeHexColor(customBg, isDark ? 0.15 : -0.1));
  } else {
    root.style.removeProperty('--app-bg');
    root.style.removeProperty('--app-surface');
    root.style.removeProperty('--app-border');
  }

  const customDanger = localStorage.getItem('app_danger');
  if (customDanger) {
    root.style.setProperty('--app-danger', customDanger);
    root.style.setProperty(
      '--app-danger-hover',
      shadeHexColor(customDanger, isDark ? 0.15 : -0.15),
    );
  } else {
    root.style.removeProperty('--app-danger');
    root.style.removeProperty('--app-danger-hover');
  }

  applyColor('app_navbar', '--app-navbar-bg');
  applyColor('app_text', '--app-text');
  applyColor('app_text_muted', '--app-text-muted');

  applyColor('app_input_bg', '--app-input-bg');
  applyColor('app_input_text', '--app-input-text');
  applyColor('app_badge_bg', '--app-badge-bg');
  applyColor('app_badge_text', '--app-badge-text');
  applyColor('app_spinner', '--app-spinner-color');

  applyColor('alert_warning_bg', '--alert-warning-bg');
  applyColor('alert_warning_text', '--alert-warning-text');
  applyColor('alert_info_bg', '--alert-info-bg');
  applyColor('alert_info_text', '--alert-info-text');
  applyColor('alert_danger_bg', '--alert-danger-bg');
  applyColor('alert_danger_text', '--alert-danger-text');

  applyColor('app_fave', '--fave-color');
  applyColor('app_upvote', '--upvote-color');
  applyColor('app_downvote', '--downvote-color');

  return { isDark, mode };
};
