import { Plugin } from "obsidian";
import { LatexSuggestion } from "src/LatexSuggestion";

export default class LatexPlugin extends Plugin {
	onload() {
		this.registerEditorSuggest(new LatexSuggestion(this.app));
	}
}
