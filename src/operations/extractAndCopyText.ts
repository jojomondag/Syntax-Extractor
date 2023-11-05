import { path, vscode } from '../index';
import fileTypesToRead from '../config/fileTypesToRead.json';
import { copyToClipboard, readTextFromFile } from '../commands/index';
import { processSelectedItems } from './processSelectedItems'; 

export function extractAndCopyText(contextSelection: vscode.Uri, allSelections: vscode.Uri[]) {
    let allText = '';

    processSelectedItems(
        allSelections,
        (filePath) => {
            const extension = path.extname(filePath);
            if (fileTypesToRead.textExtensions.includes(extension)) {
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