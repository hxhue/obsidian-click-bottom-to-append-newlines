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
				const innerView = this.getInnerView();
				if (innerView) {
					const textH = innerView.innerHeight;
					const mouseY = evt.offsetY;
					if (mouseY > textH) {
						const editor = view.editor;
						const lastLine = editor.lastLine();
						const lastLineText = editor.getLine(lastLine);
						if (lastLineText.trim() !== "") {
							editor.exec("goEnd");
							editor.exec("newlineAndIndent");
						}
					}
				} else {
					new Notice(this.manifest.id + ": cannot get inner view!");
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
