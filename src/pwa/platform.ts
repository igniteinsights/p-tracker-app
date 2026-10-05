export function isIos(ua: string, platform: string, touchPoints: number): boolean {
  return /iphone|ipad|ipod/i.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
