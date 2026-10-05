import { mockServices } from './mock'
import type { CultServices } from './types'

/**
 * Single switch point for integrations. When real adapters exist
 * (e.g. `xApiSocial`, `wagmiWallet`, `cultTokenContract`), compose them here:
 *
 *   export const services: CultServices = { ...mockServices, social: xApiSocial, wallet: wagmiWallet }
 */
export const services: CultServices = mockServices

export const IS_SIMULATED = true

export { InsufficientBalanceError } from './types'
export { UPGRADE_COST } from './mock'
