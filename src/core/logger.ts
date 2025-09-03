import { OutputChannel, window } from "vscode";
import util from "node:util";

export default class Logger {
  private readonly output: OutputChannel;
  private development: boolean = false;
  constructor() {
    this.output = window.createOutputChannel("Sync Everything");
  }

  public trace(message: string, origin?: string) {
    if (this.development) {
      const logLevel: string = "trace";
      this.output.appendLine(this.format(logLevel, message, origin));
    } else {
      return;
    }
  }

  public debug(message: string, origin?: string) {
    if (this.development) {
      const logLevel: string = "debug";
      this.output.appendLine(this.format(logLevel, message, origin));
    } else {
      return;
    }
  }

  public debugObject(obj: any, origin?: string) {
    if (this.development) {
      const logLevel: string = "debug";
      this.output.appendLine(
        this.format(logLevel, this.prettyStr(obj), origin)
      );
    } else {
      return;
    }
  }

  public info(message: string, notify: boolean = false, origin?: string) {
    const logLevel: string = "info";
    this.output.appendLine(this.format(logLevel, message, origin));
    if (notify) {
      this.notifyUser(logLevel, message);
    }
  }

  public warn(message: string, notify: boolean = false, origin?: string) {
    let logLevel: string = "warn";
    this.output.appendLine(this.format(logLevel, message, origin));
    if (notify) {
      this.notifyUser(logLevel, message);
    }
  }

  public error(
    message: string,
    origin: string,
    notify: boolean,
    errorObject?: any
  ) {
    let logLevel: string = "error";
    this.output.appendLine(this.format(logLevel, message, origin, errorObject));
    if (notify) {
      this.notifyUser(logLevel, message);
    }
  }

  public show() {
    this.output.show();
  }

  public dispose() {
    this.output.dispose();
  }
  private prettyStr(obj: any): string {
    if (typeof obj === "string") {
      return obj;
    }
    return util.inspect(obj, {
      colors: false,
      depth: null,
      maxArrayLength: 50,
      compact: false,
      sorted: true,
      breakLength: 84,
    });
  }
  private timestamp: () => string = (): string => {
    return new Date().toISOString();
  };

  private format: (
    level: string,
    message: string,
    origin?: string,
    errorObject?: any
  ) => string = (
    level: string,
    message: string,
    origin?: string,
    errorObject?: any
  ) => {
    return `[${level.toUpperCase()}] ${
      origin ? `${origin}->` : ""
    } ${this.timestamp()}:${message} ${
      errorObject ? `\nError Object:\n${this.prettyStr(errorObject)}` : ""
    }`;
  };

  private notifyUser(level: string, message: string) {
    switch (true) {
      case level === "info":
        window.showInformationMessage(message);
      case level === "warn":
        window.showWarningMessage(message);
      case level == "error":
        window.showErrorMessage(message);
    }
  }
}
