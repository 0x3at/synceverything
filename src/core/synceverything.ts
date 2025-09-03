import { readFile } from "fs/promises";
import JSON5 from "json5";
import {
    Extension,
    ExtensionContext,
    ProgressLocation,
    Uri,
    commands,
    env,
    extensions,
    window,
    workspace,
} from "vscode";
import { IKeybinds, IProfile, ISettings } from "../models/interfaces";
import { findConfigFile } from "../utils";
import Logger from "./logger";

export default class SyncEverything {
  context: ExtensionContext;
  logger: Logger;

  private constructor(logger: Logger, context: ExtensionContext) {
    this.logger = logger;
    this.context = context;
  }

  public static async initialize(
    logger: Logger,
    context: ExtensionContext
  ): Promise<SyncEverything | undefined> {
    const appName: string = env.appName.includes("Code")
      ? env.appName.includes("Insiders")
        ? "Code - Insiders"
        : "Code"
      : "Cursor";
    if (!context.globalState.get("settingsPath")) {
      try {
        const settingsPath = await findConfigFile(appName, "settings.json");
        context.globalState.update("settingsPath", settingsPath);
      } catch (error) {
        logger.error(
          "Failed to automatically find settings.json file - opening file picker",
          "SyncEverything.initialize",
          true
        );
        try {
          const settingsPath = await SyncEverything.setManualPath("settings");
          context.globalState.update("settingsPath", settingsPath);
        } catch (error) {
          logger.error(
            "Configuration files are required for SyncEverything to work, please reactivate extension and select correct configuration files.",
            "SyncEverything.initialize",
            true
          );
          return undefined;
        }
      }
    }
    if (!context.globalState.get("keybindingsPath")) {
      try {
        const keybindingsPath:string = await findConfigFile(
          appName,
          "keybindings.json"
        );
        context.globalState.update("keybindingsPath", keybindingsPath);
      } catch (error) {
        logger.error(
          "Failed to automatically find keybindings.json file - opening file picker",
          "SyncEverything.initialize",
          true
        );
        try {
          const keybindingsPath:string = await SyncEverything.setManualPath("keybindings");
          context.globalState.update("keybindingsPath", keybindingsPath);
        } catch (error) {
          logger.error(
            "Configuration files are required for SyncEverything to work, please reactivate extension and select correct configuration files.",
            "SyncEverything.initialize",
            true
          );
          return undefined;
        }
      }
    }
    return new SyncEverything(logger, context);
  }
  public static async setManualPath(
    t: "keybindings" | "settings",
    title?: string
  ): Promise<string> {
    try {
      const manualPath = (await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { "JSON files": ["json"] },
        title: title ? title : `Select ${t}.json file`,
      }))!;
      return manualPath[0].fsPath;
    } catch (error) {
      throw error;
    }
  }

  public async getActiveProfile(): Promise<Partial<IProfile>> {
    const settings = (await this.readConfigFile<ISettings>("settings"))!;
    const keybinds = (await this.readConfigFile<IKeybinds[]>("keybindings"))!;
    const exts: string[] = this.getExtensions()!;

    return {
      settings: settings,
      extensions: exts,
      keybindings: keybinds,
    } as Partial<IProfile>;
  }

  public async updateLocalProfile(profile: IProfile) {
    const settingsPath: string = this.context.globalState.get(`settingsPath`)!;
    await this.writeConfigFile(settingsPath, profile.settings);

    const keybindingsPath: string =
      this.context.globalState.get(`keybindingsPath`)!;
    await this.writeConfigFile(keybindingsPath, profile.keybindings);

    await this.installExtensions(profile.extensions);
  }

  private async readConfigFile<T>(
    t: "keybindings" | "settings"
  ): Promise<T | undefined> {
    let path:string;
    try {
      path = this.context.globalState.get(`${t}Path`)!;
    } catch (error) {
      this.logger.error(
        `${t} file has not been set, cannot read from empty file path`,
        "SyncEverything.readConfigFile",
        true,
        error
      );
      return undefined;
    }
    try {
      const buffer = await readFile(path, "utf-8");
      return JSON5.parse(buffer) as T;
    } catch (error) {
      this.logger.error(
        `Failed to read ${t} file: ${path}`,
        "SyncEverything.readConfigFile",
        true,
        error
      );
      return undefined;
    }
  }
  private async writeConfigFile(path: string, data: string | any) {
    try {
      const content =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);
      await workspace.fs.writeFile(
        Uri.file(path),
        Buffer.from(content, "utf8")
      );
      this.logger.info(`Configuration file updated: ${path}`);
    } catch (error) {
      this.logger.error(
        `Failed to write settings file: ${path}`,
        "SyncEverything.writeConfigFile",
        true,
        error
      );
      throw error;
    }
  }
  private getExtensions(): string[] {
    const excludeList =
      workspace
        .getConfiguration("synceverything")
        .get<string[]>("excludeExtensions") || [];
    return extensions.all
      .filter((ext: Extension<any>) => !ext.packageJSON.isBuiltin)
      .map((ext: Extension<any>) => ext.id)
      .filter((id) => !excludeList.includes(id));
  }
  private async installExtensions(remoteList: string[]) {
    const localList: string[] = this.getExtensions();
    const localSet = new Set(localList);
    const remoteSet = new Set(remoteList);

    const toInstall = remoteList.filter((id) => !localSet.has(id));
    const toDelete = localList.filter((id) => !remoteSet.has(id));

    if (toInstall.length === 0 && toDelete.length === 0) {
      window.showInformationMessage("Extensions are already in sync");
      return;
    }
    const confirmBeforeSync = workspace
      .getConfiguration("synceverything")
      .get<boolean>("confirmBeforeSync", true);
    if (confirmBeforeSync) {
      const action = await window.showWarningMessage(
        `Sync will:\n• Install ${toInstall.length} extensions\n• Remove ${toDelete.length} extensions\n\nContinue?`,
        { modal: true },
        "Yes",
        "Show Details",
        "Cancel"
      );

      if (action === "Show Details") {
        const details = [
          toInstall.length > 0 ? `To Install:\n${toInstall.join("\n")}` : "",
          toDelete.length > 0 ? `To Remove:\n${toDelete.join("\n")}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        await window.showInformationMessage(details, {
          modal: true,
        });
        return;
      }

      if (action !== "Yes") {
        return;
      }
    }

    let needsReload = false;

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Syncing Extensions",
        cancellable: false,
      },
      async (progress) => {
        const total = toInstall.length + toDelete.length;
        let completed = 0;

        // Process deletions first
        for (const id of toDelete) {
          try {
            progress.report({
              message: `Uninstalling ${id}...`,
              increment: (++completed / total) * 100,
            });
            await commands.executeCommand(
              "workbench.extensions.uninstallExtension",
              id
            );
            needsReload = true;
            this.logger.info(`Uninstalled extension: ${id}`);
          } catch (error) {
            this.logger.error(
              `Failed to uninstall ${id}`,
              "SyncEverything.installExtensions",
              false,
              error
            );
          }
        }

        // Then installations
        for (const id of toInstall) {
          try {
            progress.report({
              message: `Installing ${id}...`,
              increment: (++completed / total) * 100,
            });
            await commands.executeCommand(
              "workbench.extensions.installExtension",
              id
            );
            needsReload = true;
            this.logger.info(`Installed extension: ${id}`);
          } catch (error) {
            this.logger.error(
              `Failed to install ${id}`,
              "SyncEverything.installExtensions",
              false,
              error
            );
          }
        }
      }
    );

    if (needsReload) {
      const reload = await window.showInformationMessage(
        "Extension sync complete. Reload window to apply all changes?",
        "Reload",
        "Later"
      );
      if (reload === "Reload") {
        await commands.executeCommand("workbench.action.reloadWindow");
      }
    }
  }
}
