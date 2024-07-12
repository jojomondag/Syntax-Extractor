export default class Box {
    private element: HTMLDivElement;

    constructor(
        private fileType: string, 
        private onDragStart: (box: Box, event: DragEvent) => void, 
        private onDragEnd: (box: Box, event: DragEvent) => void, 
        private onClick: (box: Box, event: MouseEvent) => void
    ) {
        this.element = this.createBoxElement(fileType);
        this.bindEvents();
    }

    private createBoxElement(fileType: string): HTMLDivElement {
        const element = document.createElement('div');
        element.className = 'box';
        element.draggable = true;

        const iconSpan = document.createElement('span');
        iconSpan.className = `icon ${fileType.startsWith('.') ? 'icon-file' : 'icon-folder'}`;

        const eyeIcon = document.createElement('span');
        eyeIcon.className = 'eye-icon';

        element.appendChild(iconSpan);
        element.appendChild(document.createTextNode(fileType));
        element.appendChild(eyeIcon);

        return element;
    }

    private bindEvents() {
        this.element.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.element.addEventListener('dragend', this.handleDragEnd.bind(this));
        this.element.addEventListener('click', this.handleClick.bind(this));
    }

    private handleDragStart(event: DragEvent) {
        this.onDragStart(this, event);
    }

    private handleDragEnd(event: DragEvent) {
        this.onDragEnd(this, event);
    }

    private handleClick(event: MouseEvent) {
        this.onClick(this, event);
    }

    public getElement(): HTMLDivElement {
        return this.element;
    }

    public setOpacity(opacity: string) {
        this.element.style.opacity = opacity;
    }

    public toggleEyeIcon(visible: boolean) {
        const eyeIcon = this.element.querySelector('.eye-icon') as HTMLElement;
        if (eyeIcon) {
            eyeIcon.style.opacity = visible ? '1' : '0';
        }
    }

    public getFileType(): string {
        return this.fileType;
    }
}