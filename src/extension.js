const vscode = require('vscode');

function activate(context) {
  console.log('Syntax Extractor is now active!');

  // Register command to support multi-selection in Explorer view
  let disposable = vscode.commands.registerCommand('codeExtractor.extractCode', async (uri, uris) => {
    // Command logic remains the same
  });

  context.subscriptions.push(disposable);

  // Register the TreeDataProvider for the view
  const syntaxExtractorProvider = new SyntaxExtractorProvider();
  vscode.window.registerTreeDataProvider('syntaxExtractorView', syntaxExtractorProvider);
}

class SyntaxExtractorProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    // Example: Return dummy data
    return Promise.resolve([new vscode.TreeItem('Sample Item')]);
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
