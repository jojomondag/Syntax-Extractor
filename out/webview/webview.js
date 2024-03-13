"use strict";
const vscode = acquireVsCodeApi();
// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    switch (message.command) {
        case 'initConfig':
        case 'configUpdated':
            // Use message.fileTypes and message.compressionLevel to update UI
            updateUI(message.fileTypes, message.compressionLevel, message.clipboardDataBoxHeight);
            break;
        case 'updateClipboardDataBox':
            const clipboardDataBox = document.getElementById('clipboardDataBox');
            if (clipboardDataBox) {
                clipboardDataBox.value = message.content;
                // Immediately after updating the textarea, request token and char counts
                vscode.postMessage({
                    command: 'requestCounts',
                    text: message.content // Send the updated content for counting
                });
            }
            break;
        case 'setTokenCount':
            const tokenCountElement = document.getElementById('tokenCount');
            if (tokenCountElement) {
                tokenCountElement.value = message.count.toString();
            }
            break;
        case 'setCharCount':
            const charCountElement = document.getElementById('charCount');
            if (charCountElement) {
                charCountElement.value = message.count.toString();
            }
            break;
    }
});
// Initialize button event listeners after the DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
    setClipboardDataBoxHeight();
    setupTextInput();
    setupFileTypeInputListener();
    document.getElementById('openWebpageButton')?.addEventListener('click', () => openWebpageButton());
    document.getElementById('compressionLevelHard')?.addEventListener('click', () => updateCompressionLevel(3));
    document.getElementById('compressionLevelMedium')?.addEventListener('click', () => updateCompressionLevel(2));
    document.getElementById('compressionLevelLight')?.addEventListener('click', () => updateCompressionLevel(1));
});
//Function that updatesFiletypes
function setupFileTypeInputListener() {
    const fileTypeInput = document.getElementById('fileTypeInput');
    if (!fileTypeInput)
        return;
    fileTypeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            const inputElement = event.target;
            const fileType = inputElement.value.trim();
            if (fileType) {
                vscode.postMessage({
                    command: 'updateFileTypes',
                    fileType: fileType
                });
                inputElement.value = ''; // Clear the input after sending
            }
        }
    });
}
function setupTextInput() {
    const textarea = document.getElementById('clipboardDataBox');
    if (!textarea)
        return;
    textarea.addEventListener('input', () => {
        vscode.postMessage({
            command: 'countTokens',
            text: textarea.value
        });
        vscode.postMessage({
            command: 'countChars',
            text: textarea.value
        });
    });
}
//Function for openWebpageButton
function openWebpageButton() {
    vscode.postMessage({
        command: 'openWebpage'
    });
}
// Sets the height of the ClipboardDataBox
function setClipboardDataBoxHeight() {
    //This is the code that saves the height after resizing the clipboardDataBox
    const clipboardDataBox = document.getElementById('clipboardDataBox');
    document.addEventListener('mouseup', () => {
        if (clipboardDataBox) {
            const height = clipboardDataBox.offsetHeight;
            vscode.postMessage({
                command: 'setClipboardDataBoxHeight',
                height: height
            });
        }
    });
}
// Sends the chosen compression level back to the extension
function updateCompressionLevel(level) {
    // Log the level being sent
    console.log(`Sending compression level: ${level}`);
    vscode.postMessage({
        command: 'setCompressionLevel',
        level: level
    });
}
// Updates the UI based on the current configuration
function updateUI(fileTypes, compressionLevel, clipboardDataBoxHeight) {
    // Log the received configuration
    console.log(`Received fileTypes: ${fileTypes}, Compression Level: ${compressionLevel}`);
    // Clear previous selections
    document.querySelectorAll('.compression-button').forEach(button => {
        button.classList.remove('selected');
    });
    // Mark the current compression level as selected
    const levelMap = { 1: 'compressionLevelLight', 2: 'compressionLevelMedium', 3: 'compressionLevelHard' };
    const selectedButtonId = levelMap[compressionLevel];
    const selectedButton = document.getElementById(selectedButtonId);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }
    //Change size of the clipboardDataBox
    // Apply clipboardDataBoxHeight
    if (clipboardDataBoxHeight !== undefined) {
        const clipboardDataBox = document.getElementById('clipboardDataBox');
        if (clipboardDataBox) {
            clipboardDataBox.style.height = `${clipboardDataBoxHeight}px`;
        }
    }
    // Update file types list
    const fileTypeContainer = document.getElementById('file-types-container');
    if (fileTypeContainer) {
        fileTypeContainer.innerHTML = '';
        fileTypes.forEach(fileType => {
            const listItem = document.createElement('li');
            listItem.textContent = fileType;
            fileTypeContainer.appendChild(listItem);
        });
    }
}
//# sourceMappingURL=webview.js.map