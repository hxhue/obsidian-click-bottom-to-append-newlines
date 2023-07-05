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
			view.containerEl.addEventListener("click", (evt: MouseEvent) => {
				const editor = view.editor;
				const innerView = this.getInnerView();
				if (!innerView) {
					new Notice(this.manifest.id + ": cannot get inner view!");
					return;
				}

				const last = editor.lastLine();
				const lastLineText = editor.getLine(last);
				const lastLineIsBlank = lastLineText.trim() === "";

				if (
					lastLineIsBlank &&
					(last == 0 || editor.getLine(last - 1).trim() === "")
				) {
					return;
				}

				const lineHeight =
					document.defaultView?.getComputedStyle(innerView)
						?.lineHeight ?? "24";
				// Trailing 'px'/'pt' will be ignored by Number.parseFloat
				const lineHeightInPx = Number.parseFloat(lineHeight);
				const threshold = lastLineIsBlank ? 0 : lineHeightInPx;
				const newlines = lastLineIsBlank ? 1 : 2;
				const distance = evt.offsetY - innerView.innerHeight;
				if (distance > threshold) {
					for (let i = 0; i < newlines; ++i) {
						editor.exec("newlineAndIndent");
					}
				}
			});
			view.containerEl.setAttribute(this.onclickAttribute, "true");
		}
	};

	onunload() {}

	getInnerView(): HTMLElement | null {
		return document.querySelector(
			"body > div.app-container > div.horizontal-main-container > div > div.workspace-split.mod-vertical.mod-root > div > div.workspace-tab-container > div > div > div.view-content > div.markdown-source-view.cm-s-obsidian.mod-cm6.is-folding.is-live-preview.is-readable-line-width.node-insert-event > div > div.cm-scroller > div.cm-sizer > div.cm-contentContainer > div"
		);
	}
}
