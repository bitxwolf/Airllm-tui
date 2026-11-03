import { statSync } from 'node:fs';
import { findSystemPython, getPythonExe, getVenvDir, detectDevice, NoPythonError } from '../utils/platform.js';

export { NoPythonError };

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return false;
  }
}

export async function check() {
  const { exe: pythonExe, version: pythonVersion } = await findSystemPython();

  const venvDir = getVenvDir();
  const venvPythonExe = getPythonExe();
  const venvExists = isFile(venvPythonExe);

  const device = await detectDevice(venvExists ? venvPythonExe : null);

  return {
    pythonExe,
    pythonVersion,
    venvExists,
    device,
    venvPythonExe,
  };
}