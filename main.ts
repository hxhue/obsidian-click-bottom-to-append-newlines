import { MarkdownView, Notice, Plugin } from "obsidian";
import { setTimeout } from "timers";

export default class AppendNewlinesPlugin extends Plugin {
	readonly tagAttribute = this.manifest.id + "-tag-attribute";
	readonly scrollerSelector = "div.cm-scroller";
	readonly lineWrappingSelector = "div.cm-content.cm-lineWrapping";

	// There may be multiple listeners in the future, so we use 'object' as the value type.
	listenerMap = new WeakMap<HTMLElement, { mousedown: EventListener }>();

	// Add event listeners to the markdown view.
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
				return 0; // Click didn't happen at the bottom.
			}

			const lastLine = editor.lastLine();
			const lastLineIsBlank = editor.getLine(lastLine).trim() === "";

			if (lastLineIsBlank && lastLine === 0) {
				return 0; // The document is one blank line.
			}

			if (lastLineIsBlank && editor.getLine(lastLine - 1).trim() === "") {
				return 0; // The document ends with 2 blank lines.
			}

			// Trailing 'px' from `.lineHeight` will be ignored by Number.parseFloat
			const lineHeightInPx = Number.parseFloat(
				document.defaultView?.getComputedStyle(scroller)?.lineHeight ?? "24"
			);
			const threshold = lastLineIsBlank ? 0 : lineHeightInPx;
			const newlines = lastLineIsBlank ? 1 : 2;
			return distance > threshold ? newlines : 0;
		};

		const mouseup = (event: MouseEvent, mousedownTime: number) => {
			// Either it's a long press, or the events do not pair.
			if (performance.now() - mousedownTime > 500 /* ms */) {
				return;
			}
			const lines = linesToAppend(event); // lines may be 0
			if (lines <= 0) {
				return;
			}
			// Compared to `editor.exec('newlineAndIndent')`, `editor.setLine` can avoid inserting
			// lines in the middle of the text.
			const lastLine = editor.lastLine();
			editor.setLine(lastLine + 1, "\n".repeat(lines));
			editor.setCursor(lastLine + lines);
		};

		// Disable cursor blink until two `editor.exec("newlineAndIndent")` complete.
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
			// Add a one-time event listener.
			const mousedownTime = performance.now();
			scroller.addEventListener("mouseup", (e) => mouseup(e, mousedownTime), {
				once: true,
			});
		};

		scroller.addEventListener("mousedown", mousedown);
		this.listenerMap.set(scroller, { mousedown });
	}

	async onload() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			this.addEventListeners(view);
		}
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf?.view.getViewType() === "markdown") {
					this.addEventListeners(leaf.view as MarkdownView);
				}
			})
		);
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
			const { mousedown } = listeners;
			scroller.removeEventListener("mousedown", mousedown);
		});
	}
}
