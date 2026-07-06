import { existsSync } from 'node:fs';
import { findSystemPython, getPythonExe, getVenvDir, detectDevice, NoPythonError } from '../utils/platform.js';

export { NoPythonError };

export async function check() {
  const { exe: pythonExe, version: pythonVersion } = await findSystemPython();

  const venvDir = getVenvDir();
  const venvPythonExe = getPythonExe();
  const venvExists = existsSync(venvPythonExe);

  const device = await detectDevice(venvExists ? venvPythonExe : null);

  return {
    pythonExe,
    pythonVersion,
    venvExists,
    device,
    venvPythonExe,
  };
}
