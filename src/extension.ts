// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as https from 'https';
import * as loogleAPI from './loogle-api';
import * as loogleInterface from './loogle-interface';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "loogle-lean" is now active!');

	let loogleDisposable = vscode.commands.registerCommand('loogle-lean.loogle', () => {

		let i = 0;
		loogleInterface.showLoogleSearchBar(context);
		let myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		myStatusBarItem.command = `loogle-lean.loogle`;
	});
	context.subscriptions.push(loogleDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
