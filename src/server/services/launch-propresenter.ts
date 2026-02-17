/**
 * Launch ProPresenter on the host machine.
 *
 * Extracted from electron/main/index.ts so the web server can reuse the
 * same logic without pulling in Electron dependencies.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check whether the ProPresenter process is currently running.
 */
export async function isProPresenterRunning(): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync('pgrep -x ProPresenter');
      return stdout.trim().length > 0;
    } else if (process.platform === 'win32') {
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq ProPresenter.exe" /NH',
      );
      return stdout.includes('ProPresenter.exe');
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Launch the ProPresenter application.
 *
 * macOS  — `open -a ProPresenter`
 * Windows — tries common Program Files paths
 *
 * Throws if the platform is unsupported or the executable isn't found.
 */
export async function launchProPresenter(): Promise<void> {
  if (process.platform === 'darwin') {
    await execAsync('open -a ProPresenter');
  } else if (process.platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Renewed Vision\\ProPresenter\\ProPresenter.exe',
      'C:\\Program Files (x86)\\Renewed Vision\\ProPresenter\\ProPresenter.exe',
    ];

    for (const p of paths) {
      try {
        await execAsync(`start "" "${p}"`);
        return;
      } catch {
        continue;
      }
    }
    throw new Error('ProPresenter installation not found');
  } else {
    throw new Error('Unsupported platform for auto-launch');
  }
}

/**
 * Launch ProPresenter (if not already running) and wait for the API to
 * become reachable.
 *
 * Returns `{ launched, ready }` so callers know what happened.
 */
export async function launchAndWaitForAPI(
  host: string,
  port: number,
  maxWaitMs = 30_000,
): Promise<{ launched: boolean; ready: boolean; error?: string }> {
  const alreadyRunning = await isProPresenterRunning();

  if (!alreadyRunning) {
    try {
      await launchProPresenter();
    } catch (err: any) {
      return { launched: false, ready: false, error: err.message };
    }
  }

  // Poll the API until it responds or we time out
  const interval = 1_000;
  const attempts = Math.ceil(maxWaitMs / interval);

  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const res = await fetch(`http://${host}:${port}/version`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        return { launched: !alreadyRunning, ready: true };
      }
    } catch {
      // Not ready yet — wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    launched: !alreadyRunning,
    ready: false,
    error: 'ProPresenter started but API did not become available in time',
  };
}
