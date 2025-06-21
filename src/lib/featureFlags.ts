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
  api: {
    rateLimit: {
      enabled: boolean;
      requestsPerMinute: number;
    };
    cache: {
      enabled: boolean;
      ttlMinutes: number;
    };
  };
  ui: {
    debug: boolean;
    analytics: {
      enabled: boolean;
    };
  };
}

class FeatureFlagService {
  private config: AppConfig | null = null;
  private configPromise: Promise<AppConfig> | null = null;

  /**
   * Load configuration from YAML file
   */
  private async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    if (this.configPromise) {
      return this.configPromise;
    }

    this.configPromise = this.fetchConfig();
    this.config = await this.configPromise;
    return this.config;
  }

  private async fetchConfig(): Promise<AppConfig> {
    try {
      const response = await fetch('/config.yaml');
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      
      const yamlText = await response.text();
      const config = this.parseYAML(yamlText);
      
      console.log('Feature flags loaded:', config);
      return config;
    } catch (error) {
      console.error('Error loading feature flags, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Simple YAML parser for our configuration structure
   */
  private parseYAML(yamlText: string): AppConfig {
    const lines = yamlText.split('\n');
    const config: any = {};
    let currentSection: any = config;
    let sectionStack: any[] = [config];
    let indentStack: number[] = [0];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Calculate indentation
      const indent = line.length - line.trimStart().length;
      
      // Handle indentation changes
      while (indentStack.length > 1 && indent <= indentStack[indentStack.length - 1]) {
        indentStack.pop();
        sectionStack.pop();
      }
      
      currentSection = sectionStack[sectionStack.length - 1];

      if (trimmed.includes(':')) {
        const [key, value] = trimmed.split(':', 2);
        const cleanKey = key.trim();
        const cleanValue = value?.trim();

        if (!cleanValue || cleanValue === '') {
          // This is a section header
          currentSection[cleanKey] = {};
          sectionStack.push(currentSection[cleanKey]);
          indentStack.push(indent);
        } else {
          // This is a key-value pair
          currentSection[cleanKey] = this.parseValue(cleanValue);
        }
      }
    }

    return config as AppConfig;
  }

  private parseValue(value: string): any {
    // Remove quotes
    const cleaned = value.replace(/^["']|["']$/g, '');
    
    // Parse boolean
    if (cleaned === 'true') return true;
    if (cleaned === 'false') return false;
    
    // Parse number
    if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10);
    if (/^\d+\.\d+$/.test(cleaned)) return parseFloat(cleaned);
    
    // Return as string
    return cleaned;
  }

  /**
   * Default configuration when YAML loading fails
   */
  private getDefaultConfig(): AppConfig {
    return {
      features: {
        dataset: { enabled: false, description: "Dataset feature disabled by default" },
        suggestions: { enabled: true, description: "AI suggestions enabled by default" },
        rag: { enabled: true, description: "RAG feature enabled by default" },
        weeklyPlanner: { enabled: true, description: "Weekly planner enabled by default" },
      },
      api: {
        rateLimit: { enabled: true, requestsPerMinute: 60 },
        cache: { enabled: true, ttlMinutes: 30 },
      },
      ui: {
        debug: false,
        analytics: { enabled: false },
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
      console.warn(`Feature flag ${featureName} checked before config loaded, returning false`);
      return featureName !== 'dataset'; // All features except dataset default to true
    }
    return this.config.features[featureName]?.enabled ?? false;
  }

  /**
   * Preload configuration for synchronous access
   */
  async preloadConfig(): Promise<void> {
    await this.loadConfig();
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

export default featureFlagService;

export type { AppConfig, FeatureConfig };