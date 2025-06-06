import * as vscode from 'vscode';

import {
	createMasterGist,
	createProfile,
	deleteProfile,
	getGist,
	getMasterList,
	getRawProfile,
	updateMasterGist
} from './core/gist';
import Logger from './core/logger';
import {
	getExtensions,
	getKeybindings,
	getSettings,
	setExtensions,
	setKeybindings,
	setSettings,
	validatePaths
} from './core/profile';
import { IGist, IProfile } from './models/interfaces';

export interface IContextStore<T> {
	missing(): boolean;
	get(): T | undefined;
	set(val: T): void;
	clear(): void;
}
export let logger: Logger;
let statusBarItem: vscode.StatusBarItem;
export const appName = vscode.env.appName.includes('Code') ? 'Code' : 'Cursor';
export const extConfig = vscode.workspace.getConfiguration('synceverything');

export async function activate(ctx: vscode.ExtensionContext) {
	try {
		logger = new Logger();
		logger.info('Extension activation started');

		try {
			const contextStore = <T>(key: string): IContextStore<T> => {
				return {
					missing: () => ctx.globalState.get(key) === undefined,
					get: (): T | undefined => ctx.globalState.get(key),
					set: (val: T) => ctx.globalState.update(key, val),
					clear: () => ctx.globalState.update(key, undefined)
				};
			};

			// Value Stores
			const masterId: IContextStore<string> =
				contextStore<string>('masterId');
			const settingsPath: IContextStore<string> =
				contextStore<string>('settingsPath');
			const keybindingsPath: IContextStore<string> =
				contextStore<string>('keybindingsPath');

			// Master gist initialization
			const initializeMasterGist = async () => {
				if (masterId.missing() || !masterId.get()) {
					logger.info('Initializing master gist...');
					const master: IGist | undefined = await getMasterList();
					if (master) {
						masterId.set(master.id);
						logger.info(`Found existing master gist: ${master.id}`);
					} else {
						logger.info('Creating new master gist...');
						const profile: IProfile = {
							profileName: 'Genesis',
							settings: await getSettings(
								settingsPath.get() as string
							),
							extensions: getExtensions(),
							keybindings: await getKeybindings(
								keybindingsPath.get() as string
							)
						};
						const gist = await createMasterGist(profile);
						masterId.set(gist.id);
						logger.info(`Created new master gist: ${gist.id}`);
					}
				}
			};

			// Initialize extension
			const initializeExtension = async (): Promise<boolean> => {
				try {
					logger.info('Starting extension initialization...');

					// Validate and initialize paths
					if (!(await validatePaths(settingsPath, keybindingsPath))) {
						throw new Error(
							'Required configuration files not found'
						);
					}

					// Initialize or find master gist
					await initializeMasterGist();

					logger.info('Extension initialized successfully');
					return true;
				} catch (error) {
					logger.error('Failed to initialize extension', error);

					const retry = await vscode.window.showErrorMessage(
						'Sync Everything failed to initialize. Would you like to retry?',
						'Retry',
						'Show Logs',
						'Disable'
					);

					if (retry === 'Retry') {
						return await initializeExtension();
					} else if (retry === 'Show Logs') {
						logger.show();
					}

					return false;
				}
			};

			// Command implementations
			const CreateProfile = vscode.commands.registerCommand(
				'synceverything.createprofile',
				async () => {
					try {
						const profileName = await vscode.window.showInputBox({
							prompt: 'Enter profile name',
							validateInput: (value) => {
								if (!value || value.trim().length === 0) {
									return 'Profile name cannot be empty';
								}
								if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
									return 'Profile name can only contain letters, numbers, hyphens, and underscores';
								}
								return null;
							}
						});

						if (!profileName) {
							return;
						}

						await vscode.window.withProgress(
							{
								location: vscode.ProgressLocation.Notification,
								title: `Creating profile "${profileName}"...`,
								cancellable: false
							},
							async (progress) => {
								progress.report({
									message: 'Reading current settings...'
								});

								const profile: IProfile = {
									profileName,
									settings: await getSettings(
										settingsPath.get() as string
									),
									extensions: getExtensions(),
									keybindings: await getKeybindings(
										keybindingsPath.get() as string
									)
								};

								progress.report({
									message: 'Uploading to GitHub...'
								});
								await createProfile(
									masterId.get() as string,
									profile
								);

								logger.info(`Created profile: ${profileName}`);
								vscode.window.showInformationMessage(
									`Profile "${profileName}" created successfully!`
								);
							}
						);
					} catch (error) {
						logger.error(`Failed to create profile`, error);
					}
				}
			);

			const PullProfile = vscode.commands.registerCommand(
				'synceverything.pullprofile',
				async () => {
					try {
						const masterGist = await getGist(
							masterId.get() as string
						);
						const profileNames = Object.keys(masterGist.files);

						if (profileNames.length === 0) {
							vscode.window.showInformationMessage(
								'No profiles found'
							);
							return;
						}

						const selectedProfile =
							await vscode.window.showQuickPick(
								profileNames.map((name) => ({
									label: name.replace('.json', ''),
									description: `Profile: ${name.replace(
										'.json',
										''
									)}`
								})),
								{ placeHolder: 'Select a profile to pull' }
							);

						if (!selectedProfile) {
							return;
						}

						const confirmPull =
							await vscode.window.showWarningMessage(
								`This will overwrite your current settings, extensions, and keybindings with "${selectedProfile.label}". Continue?`,
								'Yes',
								'No'
							);

						if (confirmPull !== 'Yes') {
							return;
						}

						await vscode.window.withProgress(
							{
								location: vscode.ProgressLocation.Notification,
								title: `Pulling profile "${selectedProfile.label}"...`,
								cancellable: false
							},
							async (progress) => {
								const profileFile =
									masterGist.files[
										`${selectedProfile.label}.json`
									];
								const profile = await getRawProfile(
									profileFile.raw_url
								);

								progress.report({
									message: 'Updating settings...',
									increment: 25
								});
								await setSettings(
									settingsPath.get() as string,
									profile.settings
								);

								progress.report({
									message: 'Syncing extensions...',
									increment: 50
								});
								await setExtensions(profile.extensions);

								progress.report({
									message: 'Updating keybindings...',
									increment: 75
								});
								await setKeybindings(
									keybindingsPath.get() as string,
									profile.keybindings
								);

								progress.report({
									message: 'Complete!',
									increment: 100
								});
							}
						);

						logger.info(`Pulled profile: ${selectedProfile.label}`);
						const reload =
							await vscode.window.showInformationMessage(
								`Profile "${selectedProfile.label}" applied successfully! Reload window to see all changes?`,
								'Reload Now',
								'Later'
							);

						if (reload === 'Reload Now') {
							await vscode.commands.executeCommand(
								'workbench.action.reloadWindow'
							);
						}
					} catch (error) {
						logger.error(`Failed to pull profile`, error);
					}
				}
			);

			const UpdateProfile = vscode.commands.registerCommand(
				'synceverything.updateprofile',
				async () => {
					try {
						const masterGist = await getGist(
							masterId.get() as string
						);
						const profileNames = Object.keys(masterGist.files);

						if (profileNames.length === 0) {
							vscode.window.showInformationMessage(
								'No profiles found to update'
							);
							return;
						}

						const selectedProfile =
							await vscode.window.showQuickPick(
								profileNames.map((name) => ({
									label: name.replace('.json', ''),
									description: `Update profile: ${name.replace(
										'.json',
										''
									)}`
								})),
								{ placeHolder: 'Select a profile to update' }
							);

						if (!selectedProfile) {
							return;
						}

						const confirmUpdate =
							await vscode.window.showWarningMessage(
								`This will update "${selectedProfile.label}" with your current settings, extensions, and keybindings. Continue?`,
								'Yes',
								'No'
							);

						if (confirmUpdate !== 'Yes') {
							return;
						}

						await vscode.window.withProgress(
							{
								location: vscode.ProgressLocation.Notification,
								title: `Updating profile "${selectedProfile.label}"...`,
								cancellable: false
							},
							async (progress) => {
								progress.report({
									message: 'Reading current configuration...'
								});

								const updatedProfile: IProfile = {
									profileName: selectedProfile.label,
									settings: await getSettings(
										settingsPath.get() as string
									),
									extensions: getExtensions(),
									keybindings: await getKeybindings(
										keybindingsPath.get() as string
									)
								};

								progress.report({
									message: 'Uploading to GitHub...'
								});
								await updateMasterGist(
									masterId.get() as string,
									updatedProfile
								);

								logger.info(
									`Updated profile: ${selectedProfile.label}`
								);
								vscode.window.showInformationMessage(
									`Profile "${selectedProfile.label}" updated successfully!`
								);
							}
						);
					} catch (error) {
						logger.error(`Failed to update profile`, error);
					}
				}
			);

			const DeleteProfile = vscode.commands.registerCommand(
				'synceverything.deleteprofile',
				async () => {
					try {
						const masterGist = await getGist(
							masterId.get() as string
						);
						const profileNames = Object.keys(masterGist.files);

						if (profileNames.length === 0) {
							vscode.window.showInformationMessage(
								'No profiles found to delete'
							);
							return;
						}

						const selectedProfile =
							await vscode.window.showQuickPick(
								profileNames.map((name) => ({
									label: name.replace('.json', ''),
									description: `Delete profile: ${name.replace(
										'.json',
										''
									)}`
								})),
								{ placeHolder: 'Select a profile to delete' }
							);

						if (!selectedProfile) {
							return;
						}

						const confirmDelete =
							await vscode.window.showWarningMessage(
								`Are you sure you want to delete "${selectedProfile.label}"? This action cannot be undone.`,
								'Delete',
								'Cancel'
							);

						if (confirmDelete !== 'Delete') {
							return;
						}

						await vscode.window.withProgress(
							{
								location: vscode.ProgressLocation.Notification,
								title: `Deleting profile "${selectedProfile.label}"...`,
								cancellable: false
							},
							async (progress) => {
								const profileToDelete: IProfile = {
									profileName: selectedProfile.label,
									settings: '',
									extensions: [],
									keybindings: []
								};

								await deleteProfile(
									masterId.get() as string,
									profileToDelete
								);
								logger.info(
									`Deleted profile: ${selectedProfile.label}`
								);
								vscode.window.showInformationMessage(
									`Profile "${selectedProfile.label}" deleted successfully!`
								);
							}
						);
					} catch (error) {
						logger.error(`Failed to delete profile`, error);
					}
				}
			);

			const ShowMenu = vscode.commands.registerCommand(
				'synceverything.showmenu',
				async () => {
					const options = [
						{
							label: '$(plus) Create Profile',
							command: 'synceverything.createprofile'
						},
						{
							label: '$(cloud-download) Pull Profile',
							command: 'synceverything.pullprofile'
						},
						{
							label: '$(sync) Update Profile',
							command: 'synceverything.updateprofile'
						},
						{
							label: '$(trash) Delete Profile',
							command: 'synceverything.deleteprofile'
						},
						{
							label: '$(output) Show Logs',
							command: 'synceverything.showlogs'
						}
					];

					const selected = await vscode.window.showQuickPick(
						options,
						{
							placeHolder: 'Choose an action'
						}
					);

					if (selected) {
						await vscode.commands.executeCommand(selected.command);
					}
				}
			);

			const ShowLogs = vscode.commands.registerCommand(
				'synceverything.showlogs',
				() => {
					logger.show();
				}
			);

			// Status bar setup
			statusBarItem = vscode.window.createStatusBarItem(
				vscode.StatusBarAlignment.Right,
				100
			);
			statusBarItem.text = '$(sync~spin) Sync';
			statusBarItem.tooltip = 'Sync Everything: Click to see profiles';
			statusBarItem.command = 'synceverything.showmenu';
			statusBarItem.show();

			// Initialize the extension
			const initialized = await initializeExtension();
			if (!initialized) {
				logger.error('Extension failed to initialize properly');
				return;
			}

			// Register all commands
			ctx.subscriptions.push(
				CreateProfile,
				PullProfile,
				UpdateProfile,
				DeleteProfile,
				ShowMenu,
				ShowLogs,
				statusBarItem,
				logger
			);

			vscode.window.showInformationMessage(
				'Sync Everything is now active!'
			);
			logger.info('Extension activation completed successfully');
		} catch (error) {
			logger?.error('Extension activation failed', error);
			vscode.window.showErrorMessage(
				`Sync Everything: Activation failed - ${error}`
			);
		}
	} catch (error) {
		vscode.window.showErrorMessage(`${error}`);
	}
}

export function deactivate() {
	logger?.info('Extension deactivated');
	statusBarItem?.dispose();
	logger?.dispose();
}
