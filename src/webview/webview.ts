import './styles/webview.css';
import { Box } from './components/Box';

// Declare acquireVsCodeApi to avoid TypeScript error
declare function acquireVsCodeApi(): any;

const vscode = acquireVsCodeApi();
let draggedElement: HTMLElement | null = null;
const placeholder = document.createElement('div');
placeholder.className = 'placeholder';
const clickAndHoldDuration = 200;
let clickTimeout: number | undefined;
let isClickAndHold = false;
const boxNames = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses", "Profit", "Loss", "Investment", "Savings", "Debt", "Credit", "Cash", "Income"];

type Message = {
    command: string;
    compressionLevel?: number;
    clipboardDataBoxHeight?: number;
    content?: string;
    count?: number;
};

window.addEventListener('message', (event: MessageEvent<Message>) => {
    const message = event.data;
    switch (message.command) {
        case 'initConfig':
        case 'configUpdated':
            if (message.compressionLevel !== undefined) {
                updateUI(message.compressionLevel, message.clipboardDataBoxHeight);
            }
            break;
        case 'updateClipboardDataBox':
            const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
            if (clipboardDataBox && message.content !== undefined) {
                clipboardDataBox.value = message.content;
                vscode.postMessage({
                    command: 'requestCounts',
                    text: message.content
                });
            }
            break;
        case 'setTokenCount':
            const tokenCountElement = document.getElementById('tokenCount') as HTMLInputElement;
            if (tokenCountElement && message.count !== undefined) {
                tokenCountElement.value = message.count.toString();
            }
            break;
        case 'setCharCount':
            const charCountElement = document.getElementById('charCount') as HTMLInputElement;
            if (charCountElement && message.count !== undefined) {
                charCountElement.value = message.count.toString();
            }
            break;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setClipboardDataBoxHeight();
    setupTextInput();
    document.getElementById('openWebpageButton')?.addEventListener('click', openWebpageButton);
    document.getElementById('compressionLevelHard')?.addEventListener('click', () => updateCompressionLevel(3));
    document.getElementById('compressionLevelMedium')?.addEventListener('click', () => updateCompressionLevel(2));
    document.getElementById('compressionLevelLight')?.addEventListener('click', () => updateCompressionLevel(1));
    setupDragAndDrop();
    createInitialBoxes();
});

function setupTextInput() {
    const textarea = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
    if (!textarea) return;

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

function openWebpageButton() {
    vscode.postMessage({
        command: 'openWebpage'
    });
}

function setClipboardDataBoxHeight() {
    const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;

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

function updateCompressionLevel(level: number) {
    console.log(`Sending compression level: ${level}`);
    vscode.postMessage({
        command: 'setCompressionLevel',
        level: level
    });
}

function updateUI(compressionLevel: number, clipboardDataBoxHeight?: number) {
    console.log(`Received Compression Level: ${compressionLevel}`);

    document.querySelectorAll('.compression-button').forEach(button => {
        button.classList.remove('selected');
    });

    const levelMap: { [key: number]: string } = {1: 'compressionLevelLight', 2: 'compressionLevelMedium', 3: 'compressionLevelHard'};
    const selectedButtonId = levelMap[compressionLevel];
    const selectedButton = document.getElementById(selectedButtonId);
    if (selectedButton) {
        selectedButton.classList.add('selected');
    }

    if (clipboardDataBoxHeight !== undefined) {
        const clipboardDataBox = document.getElementById('clipboardDataBox') as HTMLTextAreaElement;
        if (clipboardDataBox) {
            clipboardDataBox.style.height = `${clipboardDataBoxHeight}px`;
        }
    }
}

function setupDragAndDrop() {
    document.querySelectorAll('.row').forEach(row => {
        row.addEventListener('dragover', (event) => handleDragOver(event as DragEvent));
        row.addEventListener('drop', (event) => handleDrop(event as DragEvent));
    });
}

function handleBehavior(event: MouseEvent) {
    const box = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (!box) return;

    if ((event.target as HTMLElement).closest('.right-icon')) {
        return;
    }

    switch (event.type) {
        case 'mousedown':
            isClickAndHold = false;
            clickTimeout = window.setTimeout(() => {
                isClickAndHold = true;
                handleDragStart(event as DragEvent);
            }, clickAndHoldDuration);
            break;
        case 'mouseup':
            clearTimeout(clickTimeout);
            if (isClickAndHold) {
                handleDragEnd(event as DragEvent);
            }
            break;
        case 'click':
            clearTimeout(clickTimeout);
            clickTimeout = window.setTimeout(() => {
                if (!isClickAndHold) {
                    moveBox(box);
                }
            }, clickAndHoldDuration);
            break;
    }
}

function handleDragStart(event: DragEvent) {
    draggedElement = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (draggedElement) {
        placeholder.style.width = `${draggedElement.offsetWidth}px`;
        placeholder.style.height = `${draggedElement.offsetHeight}px`;

        // Ensure event.dataTransfer is available
        if (event.dataTransfer) {
            const dragImage = draggedElement.cloneNode(true) as HTMLElement;
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            dragImage.style.opacity = '1';
            dragImage.style.pointerEvents = 'none';
            document.body.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, 0, 0);
        }
    }
}

function handleDragOver(event: DragEvent) {
    event.preventDefault();
    const target = (event.target as HTMLElement).closest('.box') as HTMLElement;
    if (target && target !== draggedElement) {
        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + bounding.height / 2;
        if (event.clientY - offset > 0) {
            target.parentNode!.insertBefore(placeholder, target.nextSibling);
        } else {
            target.parentNode!.insertBefore(placeholder, target);
        }
    }
}

function handleDragEnd(event: DragEvent) {
    if (draggedElement && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    draggedElement = null;
    isClickAndHold = false;

    // Remove the custom drag image
    const dragImages = document.querySelectorAll('.box[style*="position: absolute"]');
    dragImages.forEach(img => {
        img.remove();
    });
}

function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (draggedElement && placeholder.parentNode) {
        placeholder.parentNode.replaceChild(draggedElement, placeholder);
        updateBoxStyles(draggedElement);
    }
    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    draggedElement = null;
    isClickAndHold = false;
}

function moveBox(box: HTMLElement) {
    const row1 = document.getElementById('row1') as HTMLElement;
    const row2 = document.getElementById('row2') as HTMLElement;
    const currentRow = box.parentNode as HTMLElement;
    const targetRow = currentRow.id === 'row1' ? row2 : row1;

    const rect = box.getBoundingClientRect();
    targetRow.appendChild(box);
    const newRect = box.getBoundingClientRect();

    const deltaX = rect.left - newRect.left;
    const deltaY = rect.top - newRect.top;

    box.style.transition = 'none';
    box.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    box.offsetWidth;
    box.style.transition = 'transform 0.5s ease-in-out';
    box.style.transform = 'translate(0, 0)';

    if (targetRow.id === 'row1') {
        box.classList.remove('hidden');
        const blueRegion = box.querySelector('.right-icon');
        if (blueRegion) {
            blueRegion.remove();
        }
        box.style.opacity = '1';
    }

    updateBoxStyles(box);
}

function updateBoxStyles(box: HTMLElement) {
    let blueRegion = box.querySelector('.right-icon') as HTMLElement;
    const textElement = box.querySelector('.text') as HTMLElement;

    if ((box.parentNode as HTMLElement).id === 'row2') {
        if (!blueRegion) {
            blueRegion = document.createElement('span');
            blueRegion.className = 'icon right-icon open-eye';
            blueRegion.addEventListener('click', function(event) {
                event.stopPropagation();
                toggleEyeIcon(blueRegion);
            });
            box.appendChild(blueRegion);
        }
        textElement.style.borderTopRightRadius = "0";
        textElement.style.borderBottomRightRadius = "0";
    } else {
        if (blueRegion) {
            blueRegion.remove();
        }
        textElement.style.borderTopRightRadius = "var(--border-radius)";
        textElement.style.borderBottomRightRadius = "var(--border-radius)";
    }

    updateIconBackground(box);
}

function updateIconBackground(box: HTMLElement) {
    const iconElement = box.querySelector('.icon') as HTMLElement;
    if ((box.parentNode as HTMLElement).id === 'row2' && !iconElement.classList.contains('right-icon')) {
        iconElement.style.backgroundColor = 'var(--icon-bg-color-row2)';
    } else {
        iconElement.style.backgroundColor = 'var(--icon-bg-color)';
    }
}

function toggleEyeIcon(blueRegion: HTMLElement) {
    const box = blueRegion.closest('.box') as HTMLElement;
    if ((box.parentNode as HTMLElement).id !== 'row2') return;

    if (blueRegion.classList.contains('open-eye')) {
        blueRegion.classList.remove('open-eye');
        blueRegion.classList.add('closed-eye');
        box.classList.add('hidden');
        box.style.opacity = '0.5';
    } else {
        blueRegion.classList.remove('closed-eye');
        blueRegion.classList.add('open-eye');
        box.classList.remove('hidden');
        box.style.opacity = '1';
    }
}

function createBox() {
    const template = document.getElementById('box-template') as HTMLTemplateElement;
    if (!template) return;
    
    const newBox = template.content.cloneNode(true) as HTMLElement;
    const row1 = document.getElementById('row1');
    if (!row1) return;
    
    row1.appendChild(newBox);
    const box = row1.lastElementChild as HTMLElement;
    if (!box) return;
    
    box.addEventListener('mousedown', handleBehavior);
    box.addEventListener('mouseup', handleBehavior);
    box.addEventListener('click', handleBehavior);
    box.addEventListener('dragstart', handleDragStart);
    box.addEventListener('dragend', handleDragEnd);

    const textElement = box.querySelector('.text') as HTMLElement;
    if (textElement) {
        textElement.textContent = getRandomName();
    }

    updateBoxStyles(box);
}

function getRandomName() {
    const randomIndex = Math.floor(Math.random() * boxNames.length);
    return boxNames[randomIndex];
}

function createInitialBoxes() {
    for (let i = 0; i < 8; i++) {
        createBox();
    }
}