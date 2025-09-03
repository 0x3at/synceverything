import * as os from "os";
import { Uri, workspace, FileSystemError } from "vscode";

import { logger } from "./extension";

const getConfigPaths = (appName: string, file: string): string[] => {
  switch (os.platform()) {
    case "win32":
      return [
        `${process.env.APPDATA}\\${appName}\\User\\${file}`,
        `${process.env.USERPROFILE}\\AppData\\Roaming\\${appName}\\User\\${file}`,
      ];
    case "darwin":
      return [
        `${process.env.HOME}/Library/Application Support/${appName}/User/${file}`,
        `${os.homedir()}/Library/Application Support/${appName}/User/${file}`,
      ];
    default:
      return [
        `${process.env.HOME}/.config/${appName}/User/${file}`,
        `${
          process.env.XDG_CONFIG_HOME || `${os.homedir()}/.config`
        }/${appName}/User/${file}`,
        `${os.homedir()}/.config/${appName}/User/${file}`,
      ];
  }
};

export async function pathExists(path: string): Promise<boolean> {
  try {
    await workspace.fs.stat(Uri.file(path));
    logger.info(`Found file at: ${path}`);
    return true;
  } catch (error) {
    return false;
  }
}

export const findConfigFile = async (
  appName: string,
  file: string
): Promise<string> => {
  const possiblePaths = getConfigPaths(appName, file);
  for (const path of possiblePaths) {
    if (await pathExists(path)) {
      return Uri.parse(path).fsPath;
    } else {
      continue;
    }
  }
  logger.error(
    `Could not find ${file} in any default location`,
    "utils.findConfigFile",
    true
  );
  throw FileSystemError.FileNotFound(
    `${file} does not exist in any of the configuration directories`
  );
};
