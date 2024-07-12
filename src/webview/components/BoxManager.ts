import Box from './Box';

class BoxManager {
    private vscode: any;
    private draggedBox: Box | null = null;
    private placeholder: HTMLDivElement;
    private row1: HTMLElement;
    private row2: HTMLElement;

    constructor(vscode: any) {
        this.vscode = vscode;
        this.placeholder = this.createPlaceholder();
        this.row1 = document.getElementById('row1')!;
        this.row2 = document.getElementById('row2')!;

        this.initializeRows([this.row1, this.row2]);
    }

    private createPlaceholder(): HTMLDivElement {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        return placeholder;
    }

    private initializeRows(rows: HTMLElement[]) {
        rows.forEach(row => {
            row.addEventListener('dragover', this.handleDragOver.bind(this));
            row.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    public createBox(fileType: string): Box {
        return new Box(fileType, this.handleDragStart.bind(this), this.handleDragEnd.bind(this), this.handleClick.bind(this));
    }

    private handleDragStart(box: Box, event: DragEvent) {
        this.draggedBox = box;
        this.draggedBox.getElement().classList.add('dragging');
        this.updatePlaceholderSize(box.getElement());
        this.removePlaceholder();
    }

    private handleDragOver(event: DragEvent) {
        event.preventDefault();
        if (!this.draggedBox) return;

        const row = event.currentTarget as HTMLElement;
        const insertBefore = this.getInsertBeforeElement(row, event.clientX);

        this.removePlaceholder();

        if (insertBefore) {
            row.insertBefore(this.placeholder, insertBefore);
        } else {
            row.appendChild(this.placeholder);
        }
    }

    private getInsertBeforeElement(row: HTMLElement, clientX: number): HTMLElement | null {
        return Array.from(row.querySelectorAll('.box')).find(box => {
            const rect = box.getBoundingClientRect();
            return clientX < rect.left + rect.width / 2;
        }) as HTMLElement | null;
    }

    private handleDragEnd(box: Box, event: DragEvent) {
        this.draggedBox?.getElement().classList.remove('dragging');
        this.removePlaceholder();
        this.draggedBox = null;
    }

    private handleDrop(event: DragEvent) {
        event.preventDefault();
        if (this.draggedBox && this.placeholder.parentNode) {
            const targetRow = this.placeholder.parentNode as HTMLElement;
            this.moveBox(this.draggedBox, targetRow);
            this.draggedBox = null;
            this.updateFileTypes();
        }
        this.removePlaceholder();
    }

    private moveBox(box: Box, targetRow: HTMLElement) {
        const element = box.getElement();
        const currentRow = element.parentNode as HTMLElement;
        if (currentRow === targetRow) return;

        const isMovingToRow2 = targetRow === this.row2;

        // Get the initial position
        const initialRect = element.getBoundingClientRect();

        // Create a clone for animation
        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.position = 'fixed';
        clone.style.left = `${initialRect.left}px`;
        clone.style.top = `${initialRect.top}px`;
        clone.style.width = `${initialRect.width}px`;
        clone.style.height = `${initialRect.height}px`;
        clone.style.transition = 'all 0.3s ease';
        clone.style.zIndex = '1000';
        document.body.appendChild(clone);

        // Move the original element instantly
        targetRow.appendChild(element);
        this.updateBoxAppearance(box, isMovingToRow2);

        // Get the final position
        const finalRect = element.getBoundingClientRect();

        // Animate the clone
        requestAnimationFrame(() => {
            clone.style.left = `${finalRect.left}px`;
            clone.style.top = `${finalRect.top}px`;
            clone.style.opacity = isMovingToRow2 ? '0.5' : '1';
        });

        // Remove the clone after animation
        setTimeout(() => {
            document.body.removeChild(clone);
        }, 300);
    }

    private updateBoxAppearance(box: Box, isInRow2: boolean) {
        const element = box.getElement();
        element.style.opacity = isInRow2 ? '0.5' : '1';
        box.toggleEyeIcon(isInRow2);
    }

    public handleClick(box: Box, event: MouseEvent) {
        const currentRow = box.getElement().parentNode as HTMLElement;
        const targetRow = currentRow === this.row1 ? this.row2 : this.row1;
        this.moveBox(box, targetRow);
        this.updateFileTypes();
    }

    private updatePlaceholderSize(element: HTMLElement) {
        this.placeholder.style.width = `${element.offsetWidth}px`;
        this.placeholder.style.height = `${element.offsetHeight}px`;
    }

    private removePlaceholder() {
        this.placeholder.remove();
    }

    public updateFileTypes() {
        const getFileTypes = (row: HTMLElement) =>
            Array.from(row.children)
                .map(box => box.textContent!.trim())
                .filter((value, index, self) => self.indexOf(value) === index);

        this.vscode.postMessage({
            command: 'updateFileTypes',
            activeFileTypes: getFileTypes(this.row1),
            ignoredFileTypes: getFileTypes(this.row2)
        });
    }

    public updateFileTypeBoxes(fileTypes: string[], fileTypesToIgnore: string[]) {
        this.clearRows();
        this.populateRows(fileTypes, fileTypesToIgnore);
    }

    private clearRows() {
        this.row1.innerHTML = '';
        this.row2.innerHTML = '';
    }

    private populateRows(fileTypes: string[], fileTypesToIgnore: string[]) {
        fileTypes.forEach(fileType => {
            const box = this.createBox(fileType);
            this.row1.appendChild(box.getElement());
        });
        fileTypesToIgnore.forEach(fileType => {
            const box = this.createBox(fileType);
            this.updateBoxAppearance(box, true);
            this.row2.appendChild(box.getElement());
        });
    }
}

export default BoxManager;