class BoxManager {
    private vscode: any;
    private draggedElement: HTMLElement | null = null;
    private placeholder: HTMLDivElement;
    private row1: HTMLElement;
    private row2: HTMLElement;

    constructor(vscode: any) {
        this.vscode = vscode;
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'placeholder';
        this.row1 = document.getElementById('row1')!;
        this.row2 = document.getElementById('row2')!;

        this.initializeRows();
    }

    private initializeRows() {
        [this.row1, this.row2].forEach(row => {
            row.addEventListener('dragover', this.handleDragOver.bind(this));
            row.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    public createBox(fileType: string): HTMLDivElement {
        const box = document.createElement('div');
        box.className = 'box';
        box.draggable = true;
        
        const iconSpan = document.createElement('span');
        iconSpan.className = `icon ${fileType.startsWith('.') ? 'icon-file' : 'icon-folder'}`;
    
        const eyeIcon = document.createElement('span');
        eyeIcon.className = 'eye-icon';
    
        box.appendChild(iconSpan);
        box.appendChild(document.createTextNode(fileType));
        box.appendChild(eyeIcon);
    
        box.addEventListener('dragstart', this.handleDragStart.bind(this));
        box.addEventListener('dragend', this.handleDragEnd.bind(this));
        box.addEventListener('click', this.handleClick.bind(this));
        return box;
    }

    private handleDragStart(event: DragEvent) {
        this.draggedElement = event.target as HTMLElement;
        if (this.draggedElement) {
            this.draggedElement.style.opacity = '0.5';
            this.placeholder.style.width = `${this.draggedElement.offsetWidth}px`;
            this.placeholder.style.height = `${this.draggedElement.offsetHeight}px`;
        }
        this.removePlaceholder();
    }

    private handleDragOver(event: DragEvent) {
        event.preventDefault();
        if (!this.draggedElement) return;

        const row = event.currentTarget as HTMLElement;
        const boxes = Array.from(row.querySelectorAll('.box')) as HTMLElement[];
        
        let insertBefore: HTMLElement | null = null;
        for (const box of boxes) {
            const rect = box.getBoundingClientRect();
            if (event.clientX < rect.left + rect.width / 2) {
                insertBefore = box;
                break;
            }
        }

        this.removePlaceholder();

        if (insertBefore) {
            row.insertBefore(this.placeholder, insertBefore);
        } else {
            row.appendChild(this.placeholder);
        }
    }

    private handleDragEnd(event: DragEvent) {
        if (this.draggedElement) {
            this.draggedElement.style.opacity = '';
        }
        this.removePlaceholder();
        this.draggedElement = null;
    }

    private handleDrop(event: DragEvent) {
        event.preventDefault();
        if (this.draggedElement && this.placeholder.parentNode) {
            this.placeholder.parentNode.insertBefore(this.draggedElement, this.placeholder);
            this.draggedElement.style.opacity = '';
        }
        this.removePlaceholder();
        this.draggedElement = null;
        this.updateFileTypes();
    }

    private handleClick(event: MouseEvent) {
        const box = event.currentTarget as HTMLElement;
        if (box) {
            this.moveBox(box);
        }
    }
    
    private moveBox(box: HTMLElement) {
        const currentRow = box.parentNode as HTMLElement;
        const targetRow = currentRow === this.row1 ? this.row2 : this.row1;
    
        const rect = box.getBoundingClientRect();
    
        const clone = box.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.margin = '0';
        clone.style.transition = 'all 0.5s ease-in-out';
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);
    
        targetRow.appendChild(box);
    
        void clone.offsetWidth;
    
        const newRect = box.getBoundingClientRect();
    
        clone.style.left = `${newRect.left}px`;
        clone.style.top = `${newRect.top}px`;
    
        if (targetRow === this.row2) {
            clone.style.opacity = '0.5';
            box.style.opacity = '0.5';
            box.querySelector('.eye-icon')!.classList.add('visible');
        } else {
            clone.style.opacity = '1';
            box.style.opacity = '1';
            box.querySelector('.eye-icon')!.classList.remove('visible');
        }
    
        setTimeout(() => {
            document.body.removeChild(clone);
        }, 500);
    
        this.updateFileTypes();
    }

    private removePlaceholder() {
        if (this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }
    }

    public updateFileTypes() {
        const activeFileTypes = Array.from(this.row1.children)
            .map(box => (box as HTMLElement).textContent!.trim())
            .filter((value, index, self) => self.indexOf(value) === index);

        const ignoredFileTypes = Array.from(this.row2.children)
            .map(box => (box as HTMLElement).textContent!.trim())
            .filter((value, index, self) => self.indexOf(value) === index);

        this.vscode.postMessage({
            command: 'updateFileTypes',
            activeFileTypes: activeFileTypes,
            ignoredFileTypes: ignoredFileTypes
        });
    }

    public updateFileTypeBoxes(fileTypes: string[], fileTypesToIgnore: string[]) {
        this.row1.innerHTML = '';
        this.row2.innerHTML = '';

        fileTypes.forEach(fileType => {
            const box = this.createBox(fileType);
            this.row1.appendChild(box);
        });

        fileTypesToIgnore.forEach(fileType => {
            const box = this.createBox(fileType);
            box.style.opacity = '0.5';
            box.querySelector('.eye-icon')!.classList.add('visible');
            this.row2.appendChild(box);
        });
    }
}

export default BoxManager;
