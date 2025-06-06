import { OutputChannel, window } from 'vscode';

export default class Logger {
	private output: OutputChannel;

	constructor() {
		this.output = window.createOutputChannel('Sync Everything');
	}

	info(message: string) {
		const timestamp = new Date().toISOString();
		this.output.appendLine(`[INFO] ${timestamp}: ${message}`);
		console.log(`[Sync Everything] ${message}`);
	}

	error(message: string, error?: any) {
		const timestamp = new Date().toISOString();
		const errorMsg = `[ERROR] ${timestamp}: ${message}`;
		this.output.appendLine(errorMsg);
		if (error) {
			this.output.appendLine(
				`Details: ${JSON.stringify(error, null, 2)}`
			);
		}
		console.error(`[Sync Everything] ${message}`, error);
		window.showErrorMessage(`Sync Everything: ${message}`);
	}

	warn(message: string) {
		const timestamp = new Date().toISOString();
		this.output.appendLine(`[WARN] ${timestamp}: ${message}`);
		console.warn(`[Sync Everything] ${message}`);
	}

	show() {
		this.output.show();
	}

	dispose() {
		this.output.dispose();
	}
}
