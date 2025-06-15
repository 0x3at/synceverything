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
	filterProfile,
	getExtensions,
	getIgnoreList,
	getKeybindings,
	getSettings,
	setExtensions,
	setKeybindings,
	setManualPath,
	setSettings,
	validatePaths
} from './core/profile';
import { createConfigView } from './core/view';
import { IGist, IIgnored, IIgnoreList, IProfile } from './models/interfaces';
import { createIgnoreList, ignoreListExists } from './utils';

export interface IContextStore<T> {
	missing(): boolean;
	get(): T | undefined;
	set(val: T): void;
	clear(): void;
}
export let logger: Logger;
export let configView: vscode.WebviewPanel | undefined = undefined;
let statusBarItem: vscode.StatusBarItem;
export const appName = vscode.env.appName.includes('Code') ? 'Code' : 'Cursor';
export const extConfig = vscode.workspace.getConfiguration('synceverything');
export async function activate(ctx: vscode.ExtensionContext) {
	try {
		logger = new Logger();
		logger.info('Extension activation started');

		const contextStore = <T>(key: string): IContextStore<T> => {
			return {
				missing: () => ctx.globalState.get(key) === undefined,
				get: (): T | undefined => ctx.globalState.get(key),
				set: (val: T) => ctx.globalState.update(key, val),
				clear: () => ctx.globalState.update(key, undefined)
			};
		};

		// Value Stores
		logger.info('Initializing context stores');
		const masterId: IContextStore<string> =
			contextStore<string>('masterId');
		const settingsPath: IContextStore<string> =
			contextStore<string>('settingsPath');
		const keybindingsPath: IContextStore<string> =
			contextStore<string>('keybindingsPath');

		// Added in beta v0.3.0
		// Storing the path inside of the context store so we dont have to
		// start passing extension context all over the place
		logger.info('Initializing Ignore List Dependencies');
		const ignoreListPath: IContextStore<string> =
			contextStore<string>('ignoreList');
		ignoreListPath.set(
			`${vscode.Uri.joinPath(ctx.globalStorageUri, 'ignore.json').fsPath}`
		);

		const initializeIgnoreList = () => {
			const list = async (): Promise<IIgnoreList> =>
				await getIgnoreList(ignoreListPath.get()!);
			return {
				settings: async () => {
					return (await list()).settings;
				},
				keybindings: async () => {
					return (await list()).keybindings;
				},
				extensions: async () => {
					return (await list()).extensions;
				},
				update: async (
					settings: string[],
					exts: string[],
					keybindings: { key: string; command: string }[]
				) => {
					const ignoreList: IIgnoreList = {
						settings,
						extensions: exts,
						keybindings
					};
					const ignoreListFilePath = ignoreListPath.get();
					if (!ignoreListFilePath) {
						logger.error('Ignore list file path is not set.');
						return;
					}
					try {
						await vscode.workspace.fs.writeFile(
							vscode.Uri.file(ignoreListFilePath),
							Buffer.from(JSON.stringify(ignoreList, null, 2))
						);
						logger.info('Ignore list updated successfully.');
					} catch (error) {
						logger.error('Failed to update ignore list', error);
					}
				}
			};
		};

		const ignored: IIgnored = initializeIgnoreList();
		// Initialize Ignore List
		logger.info('Checking Ignore List status');
		if (!ignoreListExists(ctx)) {
			logger.info('Ignore List not found, generating new template');
			await createIgnoreList(ctx);
			logger.info('Successfully created new Ignore List');
		} else {
			logger.info('Found existing Ignore List');
		}

		// Master gist initialization
		const initializeMasterGist = async () => {
			if (masterId.missing() || !masterId.get()) {
				logger.info(
					'Master gist ID has not been captured, searching for existing master'
				);
				const master: IGist | undefined = await getMasterList();
				if (master) {
					masterId.set(master.id);
					logger.info(
						`Found existing master gist with ID: ${master.id}`
					);
				} else {
					logger.info(
						'No existing master gist found, creating Genisis profile'
					);

					const profile: IProfile = await filterProfile(
						{
							profileName: 'Genesis',
							settings: await getSettings(
								settingsPath.get() as string
							),
							extensions: getExtensions(),
							keybindings: await getKeybindings(
								keybindingsPath.get() as string
							)
						},
						ignored
					);
					const gist = await createMasterGist(profile);
					masterId.set(gist.id);
					logger.info(
						`Successfully created new master gist with ID: ${gist.id}`
					);
				}
			} else {
				logger.info(
					`Using existing master gist with ID: ${masterId.get()}`
				);
			}
		};

		// Initialize extension
		const initializeExtension = async (): Promise<boolean> => {
			try {
				logger.info('Beginning extension initialization sequence');

				// Validate and initialize paths
				logger.info('Validating configuration file paths');
				if (!(await validatePaths(settingsPath, keybindingsPath))) {
					logger.error(
						'Required configuration files not found during path validation'
					);
					throw new Error('Required configuration files not found');
				}
				logger.info('Configuration file paths validated successfully');

				// Initialize or find master gist
				logger.info('Initializing Remote Profile List');
				await initializeMasterGist();

				logger.info('Extension initialization completed successfully');
				return true;
			} catch (error) {
				logger.error('Extension initialization failed', error);

				const retry = await vscode.window.showErrorMessage(
					'Sync Everything failed to initialize. Would you like to retry?',
					'Retry',
					'Show Logs',
					'Disable'
				);

				if (retry === 'Retry') {
					logger.info('User chose to retry initialization');
					return await initializeExtension();
				} else if (retry === 'Show Logs') {
					logger.info('User requested to view logs');
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
					logger.info('Starting profile creation process');
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
						logger.error(
							'Profile creation cancelled: No profile name provided'
						);
						return;
					}

					logger.info(`Creating new profile: "${profileName}"`);

					await vscode.window.withProgress(
						{
							location: vscode.ProgressLocation.Notification,
							title: `Creating profile "${profileName}"...`,
							cancellable: false
						},
						async (progress) => {
							progress.report({
								message: 'Reading local profile...'
							});

							const profile: IProfile = await filterProfile(
								{
									profileName,
									settings: await getSettings(
										settingsPath.get() as string
									),
									extensions: getExtensions(),
									keybindings: await getKeybindings(
										keybindingsPath.get() as string
									)
								},
								ignored
							);

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
					logger.info('Starting profile pull process');
					const masterGist = await getGist(masterId.get() as string);
					const profileNames = Object.keys(masterGist.files);

					if (profileNames.length === 0) {
						logger.error('No profiles found in master gist', {
							masterGistId: masterGist.id,
							files: masterGist.files
						});
						vscode.window.showInformationMessage(
							'No profiles found'
						);
						return;
					}

					logger.info(
						`Found ${profileNames.length} available profiles`
					);

					const selectedProfile = await vscode.window.showQuickPick(
						profileNames.map((name) => ({
							label: name.replace('.json', ''),
							description: `Profile: ${name.replace('.json', '')}`
						})),
						{ placeHolder: 'Select a profile to pull' }
					);

					if (!selectedProfile) {
						logger.error(
							'No profile selected during quick pick selection'
						);
						return;
					}

					const confirmPull = await vscode.window.showWarningMessage(
						`This will overwrite your current settings, extensions, and keybindings with "${selectedProfile.label}". Continue?`,
						'Yes',
						'No'
					);

					if (confirmPull !== 'Yes') {
						logger.info('Profile Pull Canceled');
						return;
					}

					await vscode.window.withProgress(
						{
							location: vscode.ProgressLocation.Notification,
							title: `Pulling profile "${selectedProfile.label}"...`,
							cancellable: false
						},
						async (progress) => {
							progress.report({
								message: 'Loading Profile Reference...'
							});
							const profileFile =
								masterGist.files[
									`${selectedProfile.label}.json`
								];
							const profile = await filterProfile(
								await getRawProfile(profileFile.raw_url),
								ignored,
								true
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
							await setExtensions(profile.extensions, ignored);

							progress.report({
								message: 'Updating keybindings...',
								increment: 75
							});

							await setKeybindings(
								keybindingsPath.get() as string,
								profile.keybindings
							);

							progress.report({
								message: 'Sync Complete!',
								increment: 100
							});
						}
					);

					logger.info(`Pulled profile: ${selectedProfile.label}`);
					const reload = await vscode.window.showInformationMessage(
						`Profile "${selectedProfile.label}" applied successfully! Reload window to see all changes?`,
						'Reload Now',
						'Later'
					);

					if (reload === 'Reload Now') {
						logger.info('Initiating Window Reload...');
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
					logger.info('Starting profile update process');
					const masterGist = await getGist(masterId.get() as string);
					const profileNames = Object.keys(masterGist.files);

					if (profileNames.length === 0) {
						logger.error(
							'No profiles found to update in master gist'
						);
						vscode.window.showInformationMessage(
							'No profiles found to update'
						);
						return;
					}

					logger.info(
						`Found ${profileNames.length} profiles available for update`
					);

					const selectedProfile = await vscode.window.showQuickPick(
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

							const updatedProfile: IProfile =
								await filterProfile(
									{
										profileName: selectedProfile.label,
										settings: await getSettings(
											settingsPath.get() as string
										),
										extensions: getExtensions(),
										keybindings: await getKeybindings(
											keybindingsPath.get() as string
										)
									},
									ignored
								);

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
					logger.info('Starting profile deletion process');
					const masterGist = await getGist(masterId.get() as string);
					const profileNames = Object.keys(masterGist.files);

					if (profileNames.length === 0) {
						logger.error(
							'No profiles found to delete in master gist'
						);
						vscode.window.showInformationMessage(
							'No profiles found to delete'
						);
						return;
					}

					logger.info(
						`Found ${profileNames.length} profiles available for deletion`
					);

					const selectedProfile = await vscode.window.showQuickPick(
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
							progress.report({
								message: `Profile "${selectedProfile.label}" deleted successfully!`
							});
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
					},
					{
						label: '$(file-symlink-directory) Set Paths Manually',
						command: 'synceverything.setpathsmanually'
					}
				];

				const selected = await vscode.window.showQuickPick(options, {
					placeHolder: 'Choose an action'
				});
				if (selected) {
					await vscode.commands.executeCommand(selected.command);
				}
			}
		);

		const OpenConfigurationView = vscode.commands.registerCommand(
			`synceverything.showconfigview`,
			async () => {
				if (configView) {
					configView.reveal(vscode.ViewColumn.Active);
				} else {
					const localState = {
						settings: await getSettings(
							settingsPath.get() as string
						),
						extensions: vscode.extensions.all
							.filter(
								(ext: vscode.Extension<any>) =>
									!ext.packageJSON.isBuiltin
							)
							.map((ext: vscode.Extension<any>) => {
								return {
									name: ext.packageJSON.displayName || ext.id,
									id: ext.id
								};
							}),
						keybindings: await getKeybindings(
							keybindingsPath.get() as string
						)
					};
					logger.info(JSON.stringify(localState.extensions));
					const viewController = createConfigView(
						localState.settings,
						localState.extensions,
						localState.keybindings,
						await ignored.settings(),
						await ignored.extensions(),
						await ignored.keybindings()
					);
					configView = viewController.panel();
					configView.webview.html = viewController.html;
					configView.webview.onDidReceiveMessage((message) => {
						logger.info(
							`Message Recieved from Webview ${JSON.stringify(
								message
							)}`
						);
						switch (message.command) {
							case 'save':
								ignored.update(
									message.data.settings,
									message.data.extensions,
									message.data.keybindings
								);
						}
					});

					configView.onDidDispose(() => (configView = undefined));
					ctx.subscriptions.push(configView);
				}
			}
		);

		const SetManualPath = vscode.commands.registerCommand(
			'synceverything.setpathsmanually',
			async () => {
				const options = [
					{
						label: '$(settings) Set Settings Path',
						method: [setManualPath, settingsPath, 'settings']
					},
					{
						label: '$(keyboard) Set Keybindings Path',
						method: [setManualPath, keybindingsPath, 'keybindings']
					}
				];

				const selected = await vscode.window.showQuickPick(options, {
					placeHolder: 'Choose an action'
				});

				if (selected) {
					await setManualPath(
						selected.method[1] as IContextStore<String>,
						selected.method[2] as 'keybindings' | 'settings'
					);
				}
			}
		);

		const ShowLogs = vscode.commands.registerCommand(
			'synceverything.showlogs',
			() => {
				logger.show();
			}
		);

		// Setup Optional Status Bar Item
		if (extConfig.get('showSyncMenuShortcut', true)) {
			logger.info('Creating status bar item');
			statusBarItem = vscode.window.createStatusBarItem(
				vscode.StatusBarAlignment.Right,
				100
			);
			statusBarItem.text = '$(sync~spin) Sync';
			statusBarItem.tooltip = 'Sync Everything: Click to see profiles';
			statusBarItem.command = 'synceverything.showmenu';
			statusBarItem.show();
			logger.info('Status bar item created successfully');
		} else {
			logger.info(
				'Status bar item creation skipped based on configuration'
			);
		}

		// Initialize the extension
		logger.info('Starting final extension initialization');
		const initialized = await initializeExtension();
		if (!initialized) {
			logger.error('Extension failed to initialize properly');
			return;
		}

		// Register all commands
		logger.info('Registering extension commands');
		ctx.subscriptions.push(
			OpenConfigurationView,
			CreateProfile,
			PullProfile,
			UpdateProfile,
			DeleteProfile,
			ShowMenu,
			ShowLogs,
			statusBarItem,
			SetManualPath,
			logger
		);

		vscode.window.showInformationMessage('Sync Everything is now active!');
		logger.info('Extension activation completed successfully');
	} catch (error) {
		logger.error('Critical error during extension activation', error);
		vscode.window.showErrorMessage(`${error}`);
	}
}

export function deactivate() {
	logger?.info('Extension deactivation started');
	statusBarItem?.dispose();
	logger?.dispose();
	logger?.info('Extension deactivation completed');
}
