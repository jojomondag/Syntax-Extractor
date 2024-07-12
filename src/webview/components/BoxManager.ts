import Box from './Box';

class BoxManager {
    private vscode: any;
    private draggedBox: Box | null = null;
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

    public createBox(fileType: string): Box {
        return new Box(fileType, this.handleDragStart.bind(this), this.handleDragEnd.bind(this), this.handleClick.bind(this));
    }

    private handleDragStart(box: Box, event: DragEvent) {
        this.draggedBox = box;
        const element = box.getElement();
        element.style.opacity = '0.5';
        this.placeholder.style.width = `${element.offsetWidth}px`;
        this.placeholder.style.height = `${element.offsetHeight}px`;
        this.removePlaceholder();
    }

    private handleDragOver(event: DragEvent) {
        event.preventDefault();
        if (!this.draggedBox) return;

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

    private handleDragEnd(box: Box, event: DragEvent) {
        const element = box.getElement();
        element.style.opacity = '';
        this.removePlaceholder();
        this.draggedBox = null;
    }

    private handleDrop(event: DragEvent) {
        event.preventDefault();
        if (this.draggedBox && this.placeholder.parentNode) {
            this.placeholder.parentNode.insertBefore(this.draggedBox.getElement(), this.placeholder);
            this.draggedBox.getElement().style.opacity = '';
        }
        this.removePlaceholder();
        this.draggedBox = null;
        this.updateFileTypes();
    }

    private handleClick(box: Box, event: MouseEvent) {
        this.moveBox(box);
    }

    private moveBox(box: Box) {
        const element = box.getElement();
        const currentRow = element.parentNode as HTMLElement;
        const targetRow = currentRow === this.row1 ? this.row2 : this.row1;

        const rect = element.getBoundingClientRect();

        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.left = `${rect.left}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.margin = '0';
        clone.style.transition = 'all 0.5s ease-in-out';
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);

        targetRow.appendChild(element);

        void clone.offsetWidth;

        const newRect = element.getBoundingClientRect();

        clone.style.left = `${newRect.left}px`;
        clone.style.top = `${newRect.top}px`;

        if (targetRow === this.row2) {
            clone.style.opacity = '0.5';
            element.style.opacity = '0.5';
            box.toggleEyeIcon(true);
        } else {
            clone.style.opacity = '1';
            element.style.opacity = '1';
            box.toggleEyeIcon(false);
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
            this.row1.appendChild(box.getElement());
        });

        fileTypesToIgnore.forEach(fileType => {
            const box = this.createBox(fileType);
            box.setOpacity('0.5');
            box.toggleEyeIcon(true);
            this.row2.appendChild(box.getElement());
        });
    }
}

export default BoxManager;