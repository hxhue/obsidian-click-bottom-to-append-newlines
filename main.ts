import { MarkdownView, Notice, Plugin } from "obsidian";

export default class MyPlugin extends Plugin {
	onclickAttribute = this.manifest.id + "-onclick-attribute";

	async onload() {
		this.addMyListener();
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", this.addMyListener)
		);
	}

	addMyListener = () => {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view && !view.containerEl.getAttribute(this.onclickAttribute)) {
			const scroller = document.querySelector("div.cm-scroller");
			if (!scroller) {
				new Notice(this.manifest.id + ": cannot get scroller view!");
				return;
			}

			scroller.addEventListener("click", (evt: MouseEvent) => {
				const distance = (() => {
					let elem = evt.target as HTMLElement;
					let mouseY = evt.offsetY;

					// A child receives the event
					while (elem !== scroller) {
						mouseY += elem.offsetTop;
						elem = elem.offsetParent as HTMLElement;
					}

					// Get the last element: possibly a paragraph or a picture
					elem = document.querySelector(
						"div.cm-content.cm-lineWrapping"
					)?.lastElementChild as HTMLElement;

					let contentY = elem.offsetTop + elem.offsetHeight;
					while (elem.offsetParent !== scroller) {
						elem = elem.offsetParent as HTMLElement;
						contentY += elem.offsetTop + elem.offsetHeight;
					}
					return mouseY - contentY;
				})();

				if (distance < 0) {
					return; // Click didn't happen at the bottom
				}

				const editor = view.editor;
				const last = editor.lastLine();
				const lastLineIsBlank = editor.getLine(last).trim() === "";

				if (lastLineIsBlank && last == 0) {
					return; // The document is one blank line
				}

				if (lastLineIsBlank && editor.getLine(last - 1).trim() === "") {
					return; // The document ends with 2 blank lines
				}

				const lineHeightInPx = (() => {
					const height =
						document.defaultView?.getComputedStyle(scroller)
							?.lineHeight ?? "24px";
					// Trailing 'px' will be ignored by Number.parseFloat
					return Number.parseFloat(height);
				})();
				const threshold = lastLineIsBlank ? 0 : lineHeightInPx;
				const newlines = lastLineIsBlank ? 1 : 2;

				if (distance > threshold) {
					editor.exec("goDown");
					editor.exec("goRight");
					for (let i = 0; i < newlines; ++i) {
						editor.exec("newlineAndIndent");
					}
				}
			});

			view.containerEl.setAttribute(this.onclickAttribute, "true");
		}
	};

	onunload() {}
}
