export class Box {
    private element: HTMLElement;
    private isVisible: boolean = true;

    constructor(template: HTMLTemplateElement, fileType: string) {
        this.element = this.createBoxElement(template, fileType);
        this.setupEventListeners();
    }

    private createBoxElement(template: HTMLTemplateElement, fileType: string): HTMLElement {
        const newBox = template.content.cloneNode(true) as HTMLElement;
        const box = newBox.querySelector('.box') as HTMLElement;
        if (!box) {
            throw new Error('Box element not found in template');
        }
        const textElement = box.querySelector('.text');
        if (textElement) {
            textElement.textContent = fileType;
        }
        return box;
    }

    private setupEventListeners() {
        const rightIcon = this.element.querySelector('.right-icon');
        if (rightIcon) {
            rightIcon.addEventListener('click', (event) => {
                event.stopPropagation();
                this.toggleVisibility();
            });
        }
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public updateBoxStyles() {
        if (!this.element) {
            console.error('Box element is undefined');
            return;
        }

        let rightIcon = this.element.querySelector('.right-icon') as HTMLElement;
        const textElement = this.element.querySelector('.text') as HTMLElement;

        if (!textElement) {
            console.error('Text element not found in box');
            return;
        }

        const parentRow = this.element.closest('.row');
        if (!parentRow) {
            console.error('Parent row not found for box');
            return;
        }

        if (parentRow.id === 'row2') {
            if (!rightIcon) {
                rightIcon = document.createElement('span');
                rightIcon.className = 'icon right-icon open-eye';
                rightIcon.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.toggleVisibility();
                });
                this.element.appendChild(rightIcon);
            }
            textElement.style.borderTopRightRadius = "0";
            textElement.style.borderBottomRightRadius = "0";
        } else {
            if (rightIcon) {
                rightIcon.remove();
            }
            textElement.style.borderTopRightRadius = "var(--border-radius)";
            textElement.style.borderBottomRightRadius = "var(--border-radius)";
        }

        this.updateIconBackground();
    }

    private updateIconBackground() {
        const iconElement = this.element.querySelector('.icon') as HTMLElement;
        if (!iconElement) {
            console.error('Icon element not found in box');
            return;
        }

        const parentRow = this.element.closest('.row');
        if (!parentRow) {
            console.error('Parent row not found for box');
            return;
        }

        if (parentRow.id === 'row2' && !iconElement.classList.contains('right-icon')) {
            iconElement.style.backgroundColor = 'var(--icon-bg-color-row2)';
        } else {
            iconElement.style.backgroundColor = 'var(--icon-bg-color)';
        }
    }

    public toggleVisibility() {
        const parentRow = this.element.closest('.row');
        if (!parentRow || parentRow.id !== 'row2') return;

        const rightIcon = this.element.querySelector('.right-icon') as HTMLElement;
        if (!rightIcon) return;

        this.isVisible = !this.isVisible;

        if (this.isVisible) {
            rightIcon.classList.remove('closed-eye');
            rightIcon.classList.add('open-eye');
            this.element.classList.remove('hidden');
            this.element.style.opacity = '1';
        } else {
            rightIcon.classList.remove('open-eye');
            rightIcon.classList.add('closed-eye');
            this.element.classList.add('hidden');
            this.element.style.opacity = '0.5';
        }
    }

    public setVisibility(isVisible: boolean) {
        if (this.isVisible !== isVisible) {
            this.toggleVisibility();
        }
    }

    public getVisibility(): boolean {
        return this.isVisible;
    }
}