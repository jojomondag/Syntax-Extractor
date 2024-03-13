import * as vscode from 'vscode';
import { copyToClipboard, readTextFromFile } from '../commands/index';
import { processSelectedItems } from './processSelectedItems';

export function extractAndCopyText(contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    let allText = '';

    processSelectedItems(
        allSelections,
        (filePath) => {
            allText += readTextFromFile(filePath) + '\n\n';
        }
    );

    if (allText) {
        copyToClipboard(allText);
        vscode.window.showInformationMessage('Text copied to clipboard!');
    } else {
        vscode.window.showErrorMessage('No text files selected or failed to read text from files.');
    }
}