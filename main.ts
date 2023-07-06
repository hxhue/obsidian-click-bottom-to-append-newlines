import { MarkdownView, Notice, Plugin } from "obsidian";
import { setTimeout } from "timers";

export default class MyPlugin extends Plugin {
	onclickAttribute = this.manifest.id + "-onclick-attribute";

	async onload() {
		this.addMyListener();
		this.registerEvent(this.app.workspace.on("active-leaf-change", this.addMyListener));
	}

	addMyListener = () => {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && !activeView.containerEl.getAttribute(this.onclickAttribute)) {
			const editor = activeView.editor;
			const scroller = document.querySelector("div.cm-scroller") as HTMLElement;

			if (!scroller) {
				new Notice(this.manifest.id + ": cannot get scroller view!");
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

			scroller.addEventListener("mousedown", (event: MouseEvent) => {
				const lines = linesToAppend(event);
				if (lines <= 0) {
					return;
				}
				let paragraph = document.querySelector("div.cm-content.cm-lineWrapping")
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
			});

			// Appending lines directly in 'mousedown' listener has some deficits:
			// - <img> element doesn't adjust instantly when two consecutive lines are appended.
			// - Lines may be selected when clicks happen too fast.
			scroller.addEventListener("click", (event: MouseEvent) => {
				const lines = linesToAppend(event); // lines may be 0
				for (let i = 0; i < lines; ++i) {
					editor.exec("newlineAndIndent");
				}
			});

			activeView.containerEl.setAttribute(this.onclickAttribute, "true");
		}
	};

	onunload() {}
}
