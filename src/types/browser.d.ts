interface Window {
  ingredientDatabase: typeof import('../data/ingredientDatabase').ingredientDatabase;
  universalHalalPolicy: typeof import('../data/universalHalalPolicy').universalHalalPolicy;
  halalAnalyzer: typeof import('../utils/halalAnalyzer').halalAnalyzer;
  productModel: typeof import('../models/productModel').productModel;
  productCatalog: typeof import('../data/productCatalog').productCatalog;
  productRepository: typeof import('../utils/productRepository').productRepository;
  halalI18n: typeof import('../i18n/index').halalI18n;
  halalAnalytics: typeof import('../services/analytics').halalAnalytics;
  HALALCHECK_ANALYTICS_ENDPOINT?: string;
  HALALCHECK_SUPABASE_URL?: string;
  HALALCHECK_SUPABASE_ANON_KEY?: string;
  HALALCHECK_ADMIN_STATS_ENDPOINT?: string;
  halalAdminConfig: { ready: true; value: { url: string; key: string; statsEndpoint: string } } | { ready: false; value?: never };
  BarcodeDetector?: { new (options?: { formats?: string[] }): { detect(source: HTMLVideoElement | ImageBitmap): Promise<Array<{ rawValue: string }>> }; getSupportedFormats?: () => Promise<string[]> };
}
interface MediaTrackCapabilities { torch?: boolean }
interface MediaTrackConstraintSet { torch?: boolean }
interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{outcome: 'accepted' | 'dismissed'}> }
declare module 'https://esm.sh/@supabase/supabase-js@2.119.0' { export { createClient } from '@supabase/supabase-js'; }
