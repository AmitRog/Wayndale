// Remotion CLI config (used by `npx remotion studio|render`).
// Rendering in this environment uses the pre-installed headless Chromium.
import {Config} from '@remotion/cli/config';

const browser =
  process.env.REMOTION_BROWSER ??
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

Config.setBrowserExecutable(browser);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
