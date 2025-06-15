import { readFile } from 'fs/promises';
import JSON5 from 'json5';
import {
	commands,
	Extension,
	extensions,
	ProgressLocation,
	Uri,
	window,
	workspace
} from 'vscode';

import { appName, extConfig, IContextStore, logger } from '../extension';
import {
	IIgnored,
	IIgnoreList,
	IProfile,
	ISettings
} from '../models/interfaces';
import { findConfigFile } from '../utils';

export const getIgnoreList = async (path: string): Promise<IIgnoreList> => {
	try {
		const buffer = await readFile(path, 'utf-8');
		return JSON.parse(buffer) as IIgnoreList;
	} catch (error) {
		logger.error(`Failed to read ignore list`, error);
		throw error;
	}
};

export const filterProfile = async (
	profile: IProfile,
	ignored: IIgnored,
	pull: Boolean = false
): Promise<IProfile> => {
	logger.info('Applying Profile Filters');
	const [ignoredSettings, ignoredKeybindings, ignoredExtensions] =
		await Promise.all([
			ignored.settings(),
			ignored.keybindings(),
			ignored.extensions()
		]);

	// Settings are always ignored, for both sync directions
	if (ignoredSettings.length > 0) {
		logger.info(`Filtering ${ignoredSettings.length} Ignored Settings...`);
		// Filter Out Identical Keys
		profile.settings = Object.fromEntries(
			Object.entries(profile.settings).filter(
				([key]) => !ignoredSettings.includes(key)
			)
		);
		// TODO: Filter Nested Keys
	}

	if (pull) {
		logger.info(
			'Using pull strategy to filter, protecting local keybindings and extensions'
		);
		// Keybinds are only ignored for pull operations, not push operations
		if (ignoredKeybindings.length > 0) {
			logger.info(
				`Filtering ${ignoredKeybindings.length} Ignored Keybinds...`
			);
			profile.keybindings = profile.keybindings.filter(
				(k) => !ignoredKeybindings.includes(k)
			);
		}

		// Extensions are only ignored for pull operations, not push operations
		if (ignoredExtensions.length > 0) {
			logger.info(
				`Filtering ${ignoredExtensions.length} Ignored Extensions...`
			);
			profile.extensions = profile.extensions.filter(
				(e) => !ignoredExtensions.includes(e)
			);
		}
	} else {
		logger.info(
			'Using push strategy to filter, keybindings and extensions were pueshed to remote profile'
		);
	}

	return profile;
};

export const getSettings = async (path: string): Promise<ISettings> => {
	try {
		const buffer = await readFile(path, 'utf-8');
		return JSON5.parse(buffer) as ISettings;
	} catch (error) {
		logger.error(`Failed to read settings file: ${path}`, error);
		throw error;
	}
};

export const setSettings = async (path: string, settings: string | any) => {
	try {
		const content =
			typeof settings === 'string'
				? settings
				: JSON.stringify(settings, null, 2);
		await workspace.fs.writeFile(
			Uri.file(path),
			Buffer.from(content, 'utf8')
		);
		logger.info(`Settings updated: ${path}`);
	} catch (error) {
		logger.error(`Failed to write settings file: ${path}`, error);
		throw error;
	}
};

export const getKeybindings = async (path: string) => {
	try {
		const buffer = await readFile(path, 'utf-8');
		return JSON5.parse(buffer);
	} catch (error) {
		logger.error(`Failed to read keybindings file: ${path}`, error);
		throw error;
	}
};

export const setKeybindings = async (
	path: string,
	keybindings: string[] | any
) => {
	try {
		const content =
			typeof keybindings === 'string'
				? keybindings
				: JSON.stringify(keybindings, null, 2);
		await workspace.fs.writeFile(
			Uri.file(path),
			Buffer.from(content, 'utf8')
		);
		logger.info(`Keybindings updated: ${path}`);
	} catch (error) {
		logger.error(`Failed to write keybindings file: ${path}`, error);
		throw error;
	}
};

export const setManualPath = async (
	ctx: IContextStore<String>,
	t: 'keybindings' | 'settings'
) => {
	let path;
	if (!path) {
		const manualPath = await window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: { 'JSON files': ['json'] },
			title: `Select ${t}.json file`
		});

		if (!manualPath || manualPath.length === 0) {
			let message = `${t} file is required but not found`;
			logger.error(message, true);
			return;
		}
		path = manualPath[0].fsPath;
		logger.info(`Storing ${t} path as: ${path}`);
		ctx.set(path);
	}
};

export const validatePaths = async (
	settingsPath: IContextStore<string>,
	keybindingsPath: IContextStore<string>
): Promise<boolean> => {
	if (settingsPath.missing() || !settingsPath.get()) {
		let path;
		if (!path) {
			path = await findConfigFile(appName, 'settings.json');
		}
		if (!path) {
			await setManualPath(settingsPath, 'settings');
		}
	}

	// Keybindings path
	if (keybindingsPath.missing() || !keybindingsPath.get()) {
		let path;
		if (!path) {
			path = await findConfigFile(appName, 'keybindings.json');
		}

		if (!path) {
			await setManualPath(keybindingsPath, 'keybindings');
		}
	}

	return true;
};

export const getExtensions = (): string[] => {
	const excludeList = extConfig.get<string[]>('excludeExtensions') || [];
	return extensions.all
		.filter((ext: Extension<any>) => !ext.packageJSON.isBuiltin)
		.map((ext: Extension<any>) => ext.id)
		.filter((id) => !excludeList.includes(id));
};

export const setExtensions = async (remoteList: string[], ignored: any) => {
	const localList = getExtensions();
	const localSet = new Set(localList);
	const remoteSet = new Set(remoteList);

	const toInstall = remoteList.filter((id) => !localSet.has(id));
	const toDelete = localList.filter(
		(id) =>
			!remoteSet.has(id) && !(ignored.extensions as string[]).includes(id)
	);

	if (toInstall.length === 0 && toDelete.length === 0) {
		window.showInformationMessage('Extensions are already in sync');
		return;
	}
	const confirmBeforeSync = extConfig.get<boolean>('confirmBeforeSync', true);
	if (confirmBeforeSync) {
		const action = await window.showWarningMessage(
			`Sync will:\n• Install ${toInstall.length} extensions\n• Remove ${toDelete.length} extensions\n\nContinue?`,
			{ modal: true },
			'Yes',
			'Show Details',
			'Cancel'
		);

		if (action === 'Show Details') {
			const details = [
				toInstall.length > 0
					? `To Install:\n${toInstall.join('\n')}`
					: '',
				toDelete.length > 0 ? `To Remove:\n${toDelete.join('\n')}` : ''
			]
				.filter(Boolean)
				.join('\n\n');

			await window.showInformationMessage(details, {
				modal: true
			});
			return;
		}

		if (action !== 'Yes') {
			return;
		}
	}

	let needsReload = false;

	await window.withProgress(
		{
			location: ProgressLocation.Notification,
			title: 'Syncing Extensions',
			cancellable: false
		},
		async (progress) => {
			const total = toInstall.length + toDelete.length;
			let completed = 0;

			// Process deletions first
			for (const id of toDelete) {
				try {
					progress.report({
						message: `Uninstalling ${id}...`,
						increment: (++completed / total) * 100
					});
					await commands.executeCommand(
						'workbench.extensions.uninstallExtension',
						id
					);
					needsReload = true;
					logger.info(`Uninstalled extension: ${id}`);
				} catch (error) {
					logger.error(`Failed to uninstall ${id}`, error);
				}
			}

			// Then installations
			for (const id of toInstall) {
				try {
					progress.report({
						message: `Installing ${id}...`,
						increment: (++completed / total) * 100
					});
					await commands.executeCommand(
						'workbench.extensions.installExtension',
						id
					);
					needsReload = true;
					logger.info(`Installed extension: ${id}`);
				} catch (error) {
					logger.error(`Failed to install ${id}`, error);
				}
			}
		}
	);

	if (needsReload) {
		const reload = await window.showInformationMessage(
			'Extension sync complete. Reload window to apply all changes?',
			'Reload',
			'Later'
		);
		if (reload === 'Reload') {
			await commands.executeCommand('workbench.action.reloadWindow');
		}
	}
};
