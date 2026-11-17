/**
 * ASCII-only wordmarks. Keeping the artwork to basic ASCII characters avoids
 * width differences between Windows Terminal fonts and Unicode-aware renderers.
 */
export const LOGO_MARK = [
  "  ____  _____  __  __ ",
  " |  _ \\|  __ \\|  \\/  |",
  " | | | | |  | | \\  / ",
  " | |_| | |__| | /  \\  ",
  " |____/|_____/ /_/\\_\\ ",
] as const;

export const LOGO_FULL = [
  "       ____  ____  __  __ ",
  "      / __ \\/ __ \\|  \\/  |",
  "     / / / / / / / / \\  / ",
  "    / /_/ / /_/ / / /  \\  ",
  "   /_____/\\____/ /_/  \\_\\ ",
] as const;
