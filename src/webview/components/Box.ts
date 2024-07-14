export class Box {
    private element: HTMLElement;

    constructor(template: HTMLTemplateElement, fileType: string) {
        this.element = this.createBoxElement(template, fileType);
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

    public getElement(): HTMLElement {
        return this.element;
    }

    public updateBoxStyles() {
        if (!this.element) {
            console.error('Box element is undefined');
            return;
        }

        let blueRegion = this.element.querySelector('.right-icon') as HTMLElement;
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
            if (!blueRegion) {
                blueRegion = document.createElement('span');
                blueRegion.className = 'icon right-icon open-eye';
                blueRegion.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.toggleEyeIcon(blueRegion);
                });
                this.element.appendChild(blueRegion);
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

    private toggleEyeIcon(blueRegion: HTMLElement) {
        const parentRow = this.element.closest('.row');
        if (!parentRow || parentRow.id !== 'row2') return;

        if (blueRegion.classList.contains('open-eye')) {
            blueRegion.classList.remove('open-eye');
            blueRegion.classList.add('closed-eye');
            this.element.classList.add('hidden');
            this.element.style.opacity = '0.5';
        } else {
            blueRegion.classList.remove('closed-eye');
            blueRegion.classList.add('open-eye');
            this.element.classList.remove('hidden');
            this.element.style.opacity = '1';
        }
    }
}