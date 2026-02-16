/**
 * Feature flag system for controlling application behavior
 * across development, beta, and production environments.
 */

export interface FeatureFlags {
    betaMode: boolean
    creditPurchaseEnabled: boolean
    weeklyCreditsReset: boolean
    ragEnabled: boolean
    templateResponsesEnabled: boolean
    responseCacheEnabled: boolean
}

/**
 * Get all feature flags from environment variables
 */
export function getFeatureFlags(): FeatureFlags {
    const betaMode = process.env.BETA_MODE !== 'false'
    const creditPurchaseEnabled = process.env.CREDIT_PURCHASE_ENABLED === 'true'

    return {
        betaMode,
        creditPurchaseEnabled,
        // Weekly credits reset only in beta mode
        weeklyCreditsReset: betaMode && !creditPurchaseEnabled,
        ragEnabled: process.env.RAG_ENABLED === 'true',
        templateResponsesEnabled: process.env.TEMPLATE_RESPONSES_ENABLED === 'true',
        responseCacheEnabled: process.env.RESPONSE_CACHE_ENABLED === 'true',
    }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    const flags = getFeatureFlags()
    return flags[feature]
}

/**
 * Check if the app is in beta mode
 */
export function isBetaMode(): boolean {
    return isFeatureEnabled('betaMode')
}

/**
 * Check if credit purchases are enabled
 */
export function isCreditPurchaseEnabled(): boolean {
    return isFeatureEnabled('creditPurchaseEnabled')
}

/**
 * Check if weekly credit resets should happen
 * Only enabled in beta mode when purchases are not enabled
 */
export function shouldResetCreditsWeekly(): boolean {
    return isFeatureEnabled('weeklyCreditsReset')
}

/**
 * Get feature flags for client-side use (safe subset)
 */
export function getClientFeatureFlags() {
    const flags = getFeatureFlags()
    return {
        betaMode: flags.betaMode,
        creditPurchaseEnabled: flags.creditPurchaseEnabled,
    }
}
