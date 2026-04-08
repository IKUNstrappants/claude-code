import { logForDebugging } from '../debug.js'
import { logError } from '../log.js'

/**
 * Install plugins for headless/CCR mode.
 *
 * This is the headless equivalent of performBackgroundPluginInstallations(),
 * but without AppState updates (no UI to update in headless mode).
 *
 * @returns true if any plugins were installed (caller should refresh MCP)
 */
export async function installPluginsForHeadless(): Promise<boolean> {
  try {
    logForDebugging('installPluginsForHeadless disabled; marketplace remains manual-only')
    return false
  } catch (error) {
    logError(error)
    return false
  }
}
