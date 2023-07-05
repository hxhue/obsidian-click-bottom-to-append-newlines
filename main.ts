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
				const lastLine = editor.getLine(last);
				const lastIsBlank = lastLine.trim() === "";
				const secondFromLastIsBlank =
					last - 1 >= 0 && editor.getLine(last - 1).trim() === "";
				// default branch: if (lastLineIsBlank)
				let threshold = 0;
				let linesNeeded = 1;
				if (lastIsBlank && secondFromLastIsBlank) {
					return;
				} else if (!lastIsBlank) {
					const lineHeight = document.defaultView
						?.getComputedStyle(innerView)
						.lineHeight.slice(0, -2);
					threshold = lineHeight ? Number.parseFloat(lineHeight) : 24;
					++linesNeeded;
				}

				const distance = evt.offsetY - innerView.innerHeight;
				if (distance > threshold) {
					for (let i = 0; i < linesNeeded; ++i) {
						editor.exec("newlineAndIndent");
					}
				}
			});
			view.containerEl.setAttribute(this.onclickAttribute, "true");
		}
	};

	onunload() {
		super.onunload();
	}

	getInnerView(): HTMLElement | null {
		return document.querySelector(
			"body > div.app-container > div.horizontal-main-container > div > div.workspace-split.mod-vertical.mod-root > div > div.workspace-tab-container > div > div > div.view-content > div.markdown-source-view.cm-s-obsidian.mod-cm6.is-folding.is-live-preview.is-readable-line-width.node-insert-event > div > div.cm-scroller > div.cm-sizer > div.cm-contentContainer > div"
		);
	}
}
