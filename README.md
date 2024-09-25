# Syntax Extractor

<img src="https://github.com/jojomondag/Syntax-Extractor/blob/main/resources/Syntax%20Extractor.png?raw=true" width="800">

**Syntax Extractor** is a Visual Studio Code extension.

The main purpose of this extension is to extract the structure and content of code files or directories selected in Visual Studio Code, automatically organizing them into a readable format. It copies the results (including folder structure, file types, and content) to the clipboard and displays them in a webview for easy review and sharing. The key goal is to help a large language model (LLM) quickly understand the codebase, enabling it to provide more accurate and context-aware answers. This improves the LLM's ability to assist with troubleshooting, debugging, and development tasks, making collaboration and problem-solving more efficient.

## Table of Contents

- [Features](#features)
- [Usage](#usage)
  - [Extracting Code Structure](#extracting-code-structure)
  - [Viewing Extracted Data](#viewing-extracted-data)
  - [Exporting Data](#exporting-data)
- [Installation](#installation)
  - [Via VSCode Marketplace](#1-via-vscode-marketplace)
- [Contact](#contact)

## Features

- **Extract Code Structure**: Automatically traverse your project directories to extract folder hierarchy and file types.
- **Clipboard Integration**: Copy extracted data directly to your clipboard for easy paste into your favourite LLM.
- **Interactive Webview**: View and manage your code structure within an intuitive webview interface.
- **Export Options**: Export extracted data in various formats, including JSON, Markdown, or plain text.

## Usage

### Extracting Code Structure

1. **Select Files or Folders**

   - Open the **Explorer** in VSCode.
   - Select the files or folders you want to analyze.

2. **Run the Extract Command**

   - Right-click on the selected items.
   - Choose **"Extract Code Structure"** from the context menu.

### Viewing Extracted Data

- **Webview Interface**
  
  - After running the extract command, the extracted data will be displayed in the **Syntax Extractor** webview.
  - The webview provides an interactive interface wher you can see amount of tokens for your copied text.

- **Clipboard**
  
  - The extracted data is also copied to your clipboard, allowing you to paste it into documentation, emails, or other applications.

### Exporting Data

- **Export Options**

  - You can export the extracted data in different formats such as JSON, Markdown, or plain text. Simply use the export options available in the **Syntax Extractor** webview.

## Installation

### 1. Via VSCode Marketplace

- Open Visual Studio Code.
- Navigate to the **Extensions** view by clicking the Extensions icon in the Activity Bar or pressing `Ctrl+Shift+X`.
- Search for **Syntax Extractor**.
- Click **Install**.

### [marketplace.visualstudio](https://marketplace.visualstudio.com/items?itemName=JosefNobach.syntax-extractor)
### [GitHub Repository](https://github.com/jojomondag/Syntax-Extractor)

## Contact

For any inquiries, please feel free to reach out to **Josef Nobach** ([@jojomondag](https://github.com/jojomondag)) via GitHub.
