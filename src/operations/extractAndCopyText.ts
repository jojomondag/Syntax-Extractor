import { path, vscode } from '../index';
import { copyToClipboard, readTextFromFile } from '../commands/index';
import { processSelectedItems } from './processSelectedItems';
import { ConfigManager } from '../config/ConfigManager';

export function extractAndCopyText(contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    let allText = '';

    const configManager = new ConfigManager();

    processSelectedItems(
        allSelections,
        (filePath) => {
            const extension = path.extname(filePath);
            if (configManager.fileTypes.includes(extension)) {
                allText += readTextFromFile(filePath) + '\n\n';
            }
        }
    );

    if (allText) {
        copyToClipboard(allText);
        vscode.window.showInformationMessage('Text copied to clipboard!');
    } else {
        vscode.window.showErrorMessage('No text files selected or failed to read text from files.');
    }
}