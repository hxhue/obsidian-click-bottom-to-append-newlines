import { MarkdownView, Notice, Plugin } from "obsidian";
import { setTimeout } from "timers";

export default class AppendNewlinesPlugin extends Plugin {
	readonly tagAttribute = this.manifest.id + "-tag-attribute";
	readonly scrollerSelector = "div.cm-scroller";
	readonly lineWrappingSelector = "div.cm-content.cm-lineWrapping";
	listenerMap = new WeakMap<HTMLElement, { click: EventListener; mousedown: EventListener }>();

	// Add event listeners to the markdown view
	addEventListeners(markdownView: MarkdownView) {
		const editor = markdownView.editor;
		const scroller = document.querySelector(this.scrollerSelector) as HTMLElement;
		if (!scroller) {
			new Notice(this.manifest.id + ": cannot get scroller view!");
			return;
		}
		// Listeners exist.
		if (this.listenerMap.get(scroller) !== undefined) {
			return;
		}

		// It may seem inefficient to check this both in 'mousedown' and 'click'
		// events, but when 'click' is fired the mouse position may have changed.
		const linesToAppend = (event: MouseEvent) => {
			if (event.button !== 0) {
				return 0; // Not left click
			}

			const distance = (() => {
				let elem = event.target as HTMLElement;
				let mouseY = event.offsetY;

				// A child receives the event
				while (elem !== scroller) {
					mouseY += elem.offsetTop;
					elem = elem.offsetParent as HTMLElement;
				}

				// Get the last element: possibly a paragraph or a picture
				elem = document.querySelector("div.cm-content.cm-lineWrapping")
					?.lastElementChild as HTMLElement;
				let contentY = elem.offsetTop + elem.offsetHeight;
				while (elem.offsetParent !== scroller) {
					elem = elem.offsetParent as HTMLElement;
					contentY += elem.offsetTop + elem.offsetHeight;
				}
				return mouseY - contentY;
			})();

			if (distance < 0) {
				return 0; // Click didn't happen at the bottom
			}

			const lastLine = editor.lastLine();
			const lastLineIsBlank = editor.getLine(lastLine).trim() === "";

			if (lastLineIsBlank && lastLine == 0) {
				return 0; // The document is one blank line
			}

			if (lastLineIsBlank && editor.getLine(lastLine - 1).trim() === "") {
				return 0; // The document ends with 2 blank lines
			}

			const lineHeightInPx = (() => {
				const height =
					document.defaultView?.getComputedStyle(scroller)?.lineHeight ?? "24px";
				// Trailing 'px' will be ignored by Number.parseFloat
				return Number.parseFloat(height);
			})();
			const threshold = lastLineIsBlank ? 0 : lineHeightInPx;
			const newlines = lastLineIsBlank ? 1 : 2;
			return distance > threshold ? newlines : 0;
		};

		// Disable cursor blink until two `editor.exec("newlineAndIndent")` complete
		const mousedown = (event: MouseEvent) => {
			const lines = linesToAppend(event);
			if (lines <= 0) {
				return;
			}
			let paragraph = document.querySelector(this.lineWrappingSelector)
				?.lastElementChild as HTMLElement;
			while (paragraph && !paragraph.className.includes("cm-line")) {
				paragraph = paragraph.previousElementSibling as HTMLElement;
			}
			if (paragraph) {
				const caretColor = paragraph.style.caretColor;
				paragraph.style.caretColor = "transparent";
				setTimeout(() => {
					paragraph.style.caretColor = caretColor;
				}, 100);
			}
		};

		// Appending lines directly in 'mousedown' listener has those deficits which are the
		// reasons why we register 'click' listener:
		// - <img> elements don't adjust instantly when two consecutive lines are appended.
		// - Lines may be selected when clicks happen too fast.
		const click = (event: MouseEvent) => {
			const lines = linesToAppend(event); // lines may be 0
			for (let i = 0; i < lines; ++i) {
				editor.exec("newlineAndIndent");
			}
		};

		scroller.addEventListener("mousedown", mousedown);
		scroller.addEventListener("click", click);
		this.listenerMap.set(scroller, { click, mousedown });
	};

	async onload() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			this.addEventListeners(view);
		}
		this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
			if (leaf?.view.getViewType() === 'markdown') {
				this.addEventListeners(leaf.view as MarkdownView)
			}
		}));
	}

	onunload() {
		app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view.getViewType() !== "markdown") {
				return;
			}
			const scroller = leaf.view.containerEl.querySelector(
				this.scrollerSelector
			) as HTMLElement;
			const listeners = this.listenerMap.get(scroller);
			if (listeners === undefined) {
				return;
			}
			const { click, mousedown } = listeners;
			scroller.removeEventListener("click", click);
			scroller.removeEventListener("mousedown", mousedown);
		});
	}
}
