import matchCommand from "../data/mathLatexCommand";
import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from "obsidian";
export type Suggestion = string | { displayName: string; replacement: string };

const LATEX_TRIGGER_PATTERN = /\\..*/;
const WORD_DELIMITER = " ";
const CSS_SUGGESTION_ITEM_CLASS = "latex-autocompletion-suggestion-item";

export class LatexSuggestion extends EditorSuggest<string> {
	private currentSuggestions: string[] = [];

	constructor(app: App) {
		super(app);

		this.scope.register([], "Tab", (evt) => {
			if (!this.context) return true;
			const bestSuggestion = this.currentSuggestions[0];
			if (!bestSuggestion) return true;

			this.selectSuggestion(bestSuggestion, evt);
			return false;
		});
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile | null
	): EditorSuggestTriggerInfo | null {
		const cursorWordBeforePostion = getWordBeforePosition(cursor, editor);

		const line = editor.getLine(cursor.line);
		const wordBeforeCursor = line.slice(
			cursorWordBeforePostion.ch,
			cursor.ch
		);

		const wordMatch = wordBeforeCursor.match(LATEX_TRIGGER_PATTERN);
		if (!wordMatch) {
			this.currentSuggestions = [];
			return null;
		}
		const query = wordMatch[0];

		return {
			start: {
				ch: cursor.ch - query.length,
				line: cursor.line,
			},
			end: cursor,
			query,
		};
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		// TODO: Better match engine by using Leipstein Distance with tree discovery(for performance)
		this.currentSuggestions = matchCommand.filter((latexCommand) =>
			latexCommand.contains(context.query)
		);
		return this.currentSuggestions;
	}

	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		if (!this.context) return;
		this.context.editor.replaceRange(
			value,
			this.context.start,
			this.context.end
		);
		this.close();
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.addClass(CSS_SUGGESTION_ITEM_CLASS);
		el.setText(value);
	}

	close(): void {
		this.currentSuggestions = [];
		super.close();
	}
}

const getWordBeforePosition = (cursor: EditorPosition, editor: Editor) => {
	let char = "";
	let counter = -1;
	while (char !== WORD_DELIMITER && cursor.ch - counter > 0) {
		counter++;
		char = editor.getRange(
			{ ...cursor, ch: cursor.ch - counter },
			cursor
		)[0];
	}

	if (char == WORD_DELIMITER) counter--;
	return {
		...cursor,
		ch: cursor.ch - counter,
	};
};
