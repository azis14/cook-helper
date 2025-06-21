import { supabase } from './supabase';

interface FeatureConfig {
  enabled: boolean;
  description?: string;
}

interface AppConfig {
  features: {
    dataset: FeatureConfig;
    suggestions: FeatureConfig;
    rag: FeatureConfig;
    weeklyPlanner: FeatureConfig;
  };
}

interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

class FeatureFlagService {
  private config: AppConfig | null = null;
  private configPromise: Promise<AppConfig> | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Load configuration from Supabase database
   */
  private async loadConfig(): Promise<AppConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.config && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.config;
    }

    // Return existing promise if already loading
    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.fetchConfig();
    try {
      this.config = await this.configPromise;
      this.lastFetch = now;
      return this.config;
    } finally {
      this.configPromise = null;
    }
  }

  private async fetchConfig(): Promise<AppConfig> {
    try {
      const { data: featureFlags, error } = await supabase
        .from('feature_flags')
        .select('*');

      if (error) {
        console.error('Error fetching feature flags from Supabase:', error);
        return this.getDefaultConfig();
      }

      if (!featureFlags || featureFlags.length === 0) {
        console.warn('No feature flags found in database, using defaults');
        return this.getDefaultConfig();
      }

      // Convert database rows to config format
      const config = this.convertToConfig(featureFlags);
      console.log('Feature flags loaded from Supabase:', config);
      return config;
    } catch (error) {
      console.error('Error loading feature flags from Supabase, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Convert database feature flags to config format
   */
  private convertToConfig(featureFlags: FeatureFlag[]): AppConfig {
    const features: any = {};
    
    featureFlags.forEach(flag => {
      features[flag.name] = {
        enabled: flag.enabled,
        description: flag.description
      };
    });

    // Ensure all required features exist with defaults
    const defaultFeatures = this.getDefaultConfig().features;
    Object.keys(defaultFeatures).forEach(featureName => {
      if (!features[featureName]) {
        features[featureName] = defaultFeatures[featureName as keyof typeof defaultFeatures];
      }
    });

    return { features };
  }

  /**
   * Default configuration when database loading fails
   */
  private getDefaultConfig(): AppConfig {
    return {
      features: {
        dataset: { enabled: false, description: "Dataset feature disabled by default" },
        suggestions: { enabled: true, description: "AI suggestions enabled by default" },
        rag: { enabled: true, description: "RAG feature enabled by default" },
        weeklyPlanner: { enabled: true, description: "Weekly planner enabled by default" },
      },
    };
  }

  /**
   * Check if a feature is enabled
   */
  async isFeatureEnabled(featureName: keyof AppConfig['features']): Promise<boolean> {
    try {
      const config = await this.loadConfig();
      return config.features[featureName]?.enabled ?? false;
    } catch (error) {
      console.error(`Error checking feature flag for ${featureName}:`, error);
      // Return safe defaults
      const defaults: Record<string, boolean> = {
        dataset: false, // Dataset disabled by default for security
        suggestions: true,
        rag: true,
        weeklyPlanner: true,
      };
      return defaults[featureName] ?? false;
    }
  }

  /**
   * Get full configuration
   */
  async getConfig(): Promise<AppConfig> {
    return this.loadConfig();
  }

  /**
   * Get feature configuration
   */
  async getFeatureConfig(featureName: keyof AppConfig['features']): Promise<FeatureConfig | null> {
    try {
      const config = await this.loadConfig();
      return config.features[featureName] ?? null;
    } catch (error) {
      console.error(`Error getting feature config for ${featureName}:`, error);
      return null;
    }
  }

  /**
   * Synchronous check for feature flags (uses cached config)
   * Use this only after ensuring config is loaded
   */
  isFeatureEnabledSync(featureName: keyof AppConfig['features']): boolean {
    if (!this.config) {
      console.warn(`Feature flag ${featureName} checked before config loaded, returning default`);
      // Return safe defaults when config not loaded
      const defaults: Record<string, boolean> = {
        dataset: false, // Dataset disabled by default for security
        suggestions: true,
        rag: true,
        weeklyPlanner: true,
      };
      return defaults[featureName] ?? false;
    }
    return this.config.features[featureName]?.enabled ?? false;
  }

  /**
   * Preload configuration for synchronous access
   */
  async preloadConfig(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Clear cache to force reload on next access
   */
  clearCache(): void {
    this.config = null;
    this.lastFetch = 0;
  }

  /**
   * Update a feature flag (admin function)
   */
  async updateFeatureFlag(featureName: string, enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled })
        .eq('name', featureName);

      if (error) {
        console.error('Error updating feature flag:', error);
        return false;
      }

      // Clear cache to force reload
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Error updating feature flag:', error);
      return false;
    }
  }
}

// Create singleton instance
const featureFlagService = new FeatureFlagService();

// Export convenience functions
export const isFeatureEnabled = (featureName: keyof AppConfig['features']) => 
  featureFlagService.isFeatureEnabled(featureName);

export const isFeatureEnabledSync = (featureName: keyof AppConfig['features']) => 
  featureFlagService.isFeatureEnabledSync(featureName);

export const getFeatureConfig = (featureName: keyof AppConfig['features']) => 
  featureFlagService.getFeatureConfig(featureName);

export const getConfig = () => featureFlagService.getConfig();

export const preloadFeatureFlags = () => featureFlagService.preloadConfig();

export const updateFeatureFlag = (featureName: string, enabled: boolean) =>
  featureFlagService.updateFeatureFlag(featureName, enabled);

export const clearFeatureFlagCache = () => featureFlagService.clearCache();

export default featureFlagService;

export type { AppConfig, FeatureConfig };