/**
 * KK Shop Content Studio - Google Drive Folder Configuration
 * These IDs are application configuration, NOT environment secrets.
 */

export const DRIVE_FOLDERS = {
  ROOT: '1Qa0FOKKeMjgQCsGTZin5NBsf1Zlc7fJ0',
  RAW_ROOT: '15fysVnrHoRVp6n2M4OzeZU7C-g9IkWu4',
  PRODUCT_IMAGES: '1ay7YKvda8cWXxVGbcsV0BM5bLWo0VV2R',
  RAW_PHOTOS: '1NpJLz8kGcv_wgmR_xyjeLA_MJap-68GQ',
  RAW_VIDEOS: '1VLx36E4iSEEnKkaLIjraT63WdEWeZ3PG',
  GENERATED: '1tOKAh20B7Xa17t-NjGX2UJ1egKH8eXYf',
  GENERATED_AD_IMAGES: '1JKlQz7742gFPDYImgwuFio09FMJnpvIl',
  GENERATED_VIDEOS: '19TWlPYgTUbdNTnxOKwfkaecpDEGtJnCk',
  APPROVED: '1MMHs7x7aZsrxly-ohvchP50VT6ZCvQ8I',
  POSTED_ARCHIVE: '1qe0oNJJuI5zLxf2rZnUXCW-kYM-OuMO1',
  PRODUCT_MASTER_FILE: '1-j7OrP1Z0y1rVjYk2fswuW3-3BC_8OpH',
} as const;

export type DriveFolderKey = keyof typeof DRIVE_FOLDERS;
