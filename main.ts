import { MarkdownView, Notice, Plugin } from "obsidian";
import { setTimeout } from "timers";

export default class AppendNewlinesPlugin extends Plugin {
	readonly scrollerSelector = "div.cm-scroller";
	readonly lineWrappingSelector = "div.cm-content.cm-lineWrapping";

	// Check whether an element already has the listener(s).
	targetSet = new WeakSet<HTMLElement>();

	// Add event listeners to the markdown view.
	tryAddingEventListener(markdownView: MarkdownView) {
		const editor = markdownView.editor;
		const containerEl = markdownView.containerEl;
		const scroller = containerEl.querySelector(this.scrollerSelector) as HTMLElement;
		
		if (!scroller) {
			new Notice(this.manifest.id + ": cannot get scroller view!");
			return;
		}

		// Listener(s) exist.
		if (this.targetSet.has(scroller)) {
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
				elem = containerEl.querySelector("div.cm-content.cm-lineWrapping")
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
				containerEl.win.getComputedStyle(scroller)?.lineHeight ?? "24"
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
			let paragraph = containerEl.querySelector(this.lineWrappingSelector)
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
			this.registerDomEvent(scroller, "mouseup", (e) => mouseup(e, mousedownTime), {
				once: true,
			});
		};

		this.registerDomEvent(scroller, "mousedown", mousedown);
		this.targetSet.add(scroller);
	}

	async onload() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			this.tryAddingEventListener(view);
		}
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf?.view.getViewType() === "markdown") {
					this.tryAddingEventListener(leaf.view as MarkdownView);
				}
			})
		);
	}

	onunload() {
		// Nothing to do.
	}
}
