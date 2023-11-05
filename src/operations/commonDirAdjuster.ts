import { path, vscode } from '..';

export function getAdjustedCommonDir(allSelections: vscode.Uri[], commonDir: string): string {
    let nextDirLevel = "";
    for (let selection of allSelections) {
        const relativePath = path.relative(commonDir, selection.fsPath);
        const splitPath = relativePath.split(path.sep);

        if (splitPath[0]) {
            nextDirLevel = splitPath[0];
            break;
        }
    }

    return path.join(commonDir, nextDirLevel);
}