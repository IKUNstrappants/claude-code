import { readFileSync } from 'fs'
import { join } from 'path'
import { isEnvTruthy } from './envUtils.js'

/**
 * Privacy level controls how much nonessential network traffic and telemetry
 * Claude Code generates.
 *
 * Levels are ordered by restrictiveness:
 *   default < no-telemetry < essential-traffic
 *
 * - default:            Everything enabled.
 * - no-telemetry:       Analytics/telemetry disabled (Datadog, 1P events, feedback survey).
 * - essential-traffic:  ALL nonessential network traffic disabled
 *                       (telemetry + auto-updates, grove, release notes, model capabilities, etc.).
 *
 * The resolved level is the most restrictive signal from:
 *   config.toml                           -> essential-traffic
 *   CLAUDE_CODE_DISABLE_NON_DEEPSEEK_NETWORK / CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
 *                                         -> essential-traffic
 *   DISABLE_TELEMETRY                     -> no-telemetry
 */

type PrivacyLevel = 'default' | 'no-telemetry' | 'essential-traffic'

const PROJECT_CONFIG_TOML = join(process.cwd(), 'config.toml')

function readProjectConfigToml(): string | null {
  try {
    return readFileSync(PROJECT_CONFIG_TOML, 'utf8')
  } catch {
    return null
  }
}

function isTomlSectionValueEnabled(
  tomlText: string,
  section: string,
  key: string,
): boolean {
  let currentSection: string | null = null
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const keyPattern = new RegExp(`^${escapedKey}\\s*=\\s*(true|false)\\s*$`)

  for (const rawLine of tomlText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const sectionMatch = line.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]?.trim() ?? null
      continue
    }

    if (currentSection !== section) {
      continue
    }

    const keyMatch = line.match(keyPattern)
    if (keyMatch) {
      return keyMatch[1] === 'true'
    }
  }

  return false
}

function isProjectConfigDisablingNetwork(): boolean {
  const toml = readProjectConfigToml()
  if (!toml) {
    return false
  }
  return isTomlSectionValueEnabled(
    toml,
    'privacy',
    'disable_non_deepseek_network',
  )
}

export function isNonDeepSeekNetworkDisabled(): boolean {
  return (
    isProjectConfigDisablingNetwork() ||
    isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_NON_DEEPSEEK_NETWORK)
  )
}

export function getPrivacyLevel(): PrivacyLevel {
  if (isNonDeepSeekNetworkDisabled()) {
    return 'essential-traffic'
  }
  if (isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)) {
    return 'essential-traffic'
  }
  if (isEnvTruthy(process.env.DISABLE_TELEMETRY)) {
    return 'no-telemetry'
  }
  return 'default'
}

/**
 * True when all nonessential network traffic should be suppressed.
 * Equivalent to the old `process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` check.
 */
export function isEssentialTrafficOnly(): boolean {
  return getPrivacyLevel() === 'essential-traffic'
}

/**
 * True when telemetry/analytics should be suppressed.
 * True at both `no-telemetry` and `essential-traffic` levels.
 */
export function isTelemetryDisabled(): boolean {
  return getPrivacyLevel() !== 'default'
}

/**
 * Returns the env var or config reason responsible for the current
 * essential-traffic restriction, or null if unrestricted.
 */
export function getEssentialTrafficOnlyReason(): string | null {
  if (isProjectConfigDisablingNetwork()) {
    return 'config.toml:[privacy].disable_non_deepseek_network'
  }
  if (process.env.CLAUDE_CODE_DISABLE_NON_DEEPSEEK_NETWORK) {
    return 'CLAUDE_CODE_DISABLE_NON_DEEPSEEK_NETWORK'
  }
  if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) {
    return 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'
  }
  return null
}
