import matchCommand from "matchCommand";
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

export class LatexSuggestion extends EditorSuggest<string> {
	constructor(app: App) {
		super(app);
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

		const wordMatch = wordBeforeCursor.match(/\\..*/);
		if (!wordMatch) return null;
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
		return matchCommand.filter((latexCommand) =>
			latexCommand.contains(context.query)
		);
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
		el.addClass("latex-autocompletion-suggestion-item");
		el.setText(value);
	}
}

const getWordBeforePosition = (cursor: EditorPosition, editor: Editor) => {
	let char = "";
	let counter = -1;
	while (char !== " " && cursor.ch - counter > 0) {
		counter++;
		char = editor.getRange(
			{ ...cursor, ch: cursor.ch - counter },
			cursor
		)[0];
	}

	if (char == " ") counter--;
	return {
		...cursor,
		ch: cursor.ch - counter,
	};
};
