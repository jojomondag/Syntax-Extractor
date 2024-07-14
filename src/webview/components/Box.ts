// components/Box.ts

export class Box {
    private element: HTMLElement;
    private static boxNames = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses", "Profit", "Loss", "Investment", "Savings", "Debt", "Credit", "Cash", "Income"];
    private static clickAndHoldDuration = 200;
    private clickTimeout: number | undefined;
    private isClickAndHold = false;

    constructor(template: HTMLTemplateElement) {
        this.element = this.createBoxElement(template);
        this.setupEventListeners();
    }

    private createBoxElement(template: HTMLTemplateElement): HTMLElement {
        const newBox = template.content.cloneNode(true) as HTMLElement;
        const box = newBox.querySelector('.box') as HTMLElement;
        const textElement = box.querySelector('.text') as HTMLElement;
        if (textElement) {
            textElement.textContent = Box.getRandomName();
        }
        this.updateBoxStyles();
        return box;
    }

    private setupEventListeners() {
        this.element.addEventListener('mousedown', (e) => this.handleBehavior(e));
        this.element.addEventListener('mouseup', (e) => this.handleBehavior(e));
        this.element.addEventListener('click', (e) => this.handleBehavior(e));
        this.element.addEventListener('dragstart', (e) => this.handleDragStart(e as DragEvent));
        this.element.addEventListener('dragend', (e) => this.handleDragEnd(e as DragEvent));
    }

    private handleBehavior(event: MouseEvent) {
        if ((event.target as HTMLElement).closest('.right-icon')) {
            return;
        }

        switch (event.type) {
            case 'mousedown':
                this.isClickAndHold = false;
                this.clickTimeout = window.setTimeout(() => {
                    this.isClickAndHold = true;
                    this.handleDragStart(event as DragEvent);
                }, Box.clickAndHoldDuration);
                break;
            case 'mouseup':
                clearTimeout(this.clickTimeout);
                if (this.isClickAndHold) {
                    this.handleDragEnd(event as DragEvent);
                }
                break;
            case 'click':
                clearTimeout(this.clickTimeout);
                this.clickTimeout = window.setTimeout(() => {
                    if (!this.isClickAndHold) {
                        this.moveBox();
                    }
                }, Box.clickAndHoldDuration);
                break;
        }
    }

    private handleDragStart(event: DragEvent) {
        // Implementation remains the same, but using this.element instead of draggedElement
    }

    private handleDragEnd(event: DragEvent) {
        this.isClickAndHold = false;
    }

    public moveBox() {
        const row1 = document.getElementById('row1') as HTMLElement;
        const row2 = document.getElementById('row2') as HTMLElement;
        const currentRow = this.element.parentNode as HTMLElement;
        const targetRow = currentRow.id === 'row1' ? row2 : row1;

        const rect = this.element.getBoundingClientRect();
        targetRow.appendChild(this.element);
        const newRect = this.element.getBoundingClientRect();

        const deltaX = rect.left - newRect.left;
        const deltaY = rect.top - newRect.top;

        this.element.style.transition = 'none';
        this.element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        this.element.offsetWidth;
        this.element.style.transition = 'transform 0.5s ease-in-out';
        this.element.style.transform = 'translate(0, 0)';

        if (targetRow.id === 'row1') {
            this.element.classList.remove('hidden');
            const blueRegion = this.element.querySelector('.right-icon');
            if (blueRegion) {
                blueRegion.remove();
            }
            this.element.style.opacity = '1';
        }

        this.updateBoxStyles();
    }

    public updateBoxStyles() {
        let blueRegion = this.element.querySelector('.right-icon') as HTMLElement;
        const textElement = this.element.querySelector('.text') as HTMLElement;

        if ((this.element.parentNode as HTMLElement).id === 'row2') {
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
        if ((this.element.parentNode as HTMLElement).id === 'row2' && !iconElement.classList.contains('right-icon')) {
            iconElement.style.backgroundColor = 'var(--icon-bg-color-row2)';
        } else {
            iconElement.style.backgroundColor = 'var(--icon-bg-color)';
        }
    }

    private toggleEyeIcon(blueRegion: HTMLElement) {
        if ((this.element.parentNode as HTMLElement).id !== 'row2') return;

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

    private static getRandomName(): string {
        const randomIndex = Math.floor(Math.random() * Box.boxNames.length);
        return Box.boxNames[randomIndex];
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public static fromElement(element: HTMLElement): Box {
        const box = new Box(document.createElement('template'));
        box.element = element;
        return box;
    }
}