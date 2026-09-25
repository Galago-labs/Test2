export interface YandexSDK {
  environment: { i18n: { lang: string }; app?: { id: string } };
  features: {
    LoadingAPI?: { ready: () => void };
    GameplayAPI?: { start: () => void; stop: () => void };
  };
  adv?: {
    showFullscreenAdv: (options?: { callbacks?: {
      onOpen?: () => void;
      onClose?: (wasShown: boolean) => void;
      onError?: (error: unknown) => void;
    } }) => void;
  };
  screen?: { fullscreen?: { status: string; request: () => Promise<void>; exit: () => Promise<void> } };
  deviceInfo?: { type: 'desktop' | 'mobile' | 'tablet' | 'tv' };
  on: (event: 'game_api_pause' | 'game_api_resume', callback: () => void) => void;
  off: (event: 'game_api_pause' | 'game_api_resume', callback: () => void) => void;
}

export interface PlatformConnection {
  mode: 'yandex' | 'standalone';
  sdk: YandexSDK | null;
  language?: string;
  initializationFailed: boolean;
}

declare global {
  interface Window {
    YaGames?: { init: () => Promise<YandexSDK> };
  }
}