import type { AppState } from '../../state/AppState.js';
import { checkHasTrustDialogAccepted } from '../config.js';
import { logForDebugging } from '../debug.js';
type SetAppState = (f: (prevState: AppState) => AppState) => void;

/**
 * Perform plugin startup checks and initiate background installations
 *
 * This function starts background installation of marketplaces and plugins
 * from trusted sources (repository and user settings) without blocking startup.
 * Installation progress and errors are tracked in AppState and shown via notifications.
 *
 * SECURITY: This function is only called from REPL.tsx after the "trust this folder"
 * dialog has been confirmed. The trust dialog in cli.tsx blocks all execution until
 * the user explicitly trusts the current working directory, ensuring that plugin
 * installations only happen with user consent. This prevents malicious repositories
 * from automatically installing plugins without user approval.
 *
 * @param setAppState Function to update app state with installation progress
 */
export async function performStartupChecks(_setAppState: SetAppState): Promise<void> {
  logForDebugging('performStartupChecks called');

  // Check if the current directory has been trusted
  if (!checkHasTrustDialogAccepted()) {
    logForDebugging('Trust not accepted for current directory - skipping plugin installations');
    return;
  }
  try {
    logForDebugging('Background plugin installations disabled; keeping marketplace manual-only');
  } catch (error) {
    // Even if something fails here, don't block startup
    logForDebugging(`Error initiating background plugin installations: ${error}`);
  }
}
