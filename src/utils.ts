import * as os from 'os';
import { Uri, workspace } from 'vscode';

import { logger } from './extension';

const getConfigPaths = (appName: string, file: string): string[] => {
	switch (os.platform()) {
		case 'win32':
			return [
				`${process.env.APPDATA}/${appName}/User/${file}`,
				`${process.env.USERPROFILE}/AppData/Roaming/${appName}/User/${file}`
			];
		case 'darwin':
			return [
				`${process.env.HOME}/Library/Application Support/${appName}/User/${file}`,
				`${os.homedir()}/Library/Application Support/${appName}/User/${file}`
			];
		default:
			return [
				`${process.env.HOME}/.config/${appName}/User/${file}`,
				`${
					process.env.XDG_CONFIG_HOME || `${os.homedir()}/.config`
				}/${appName}/User/${file}`,
				`${os.homedir()}/.config/${appName}/User/${file}`
			];
	}
};
export const findConfigFile = async (
	appName: string,
	file: string
): Promise<string | undefined> => {
	const possiblePaths = getConfigPaths(appName, file);

	for (const path of possiblePaths) {
		try {
			await workspace.fs.stat(Uri.file(path));
			logger.info(`Found ${file} at: ${path}`);
			return path;
		} catch {
			continue;
		}
	}
	logger.warn(`Could not find ${file} in any default location`);
	return undefined;
};
