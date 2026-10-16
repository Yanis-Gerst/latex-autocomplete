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
		const normalizedQuery = context.query.replace(/^\\/, "").toLowerCase();
		if (normalizedQuery.length < 1) return [];

		this.currentSuggestions = matchCommand
			.map((cmd) => {
				const normalizedCmd = cmd.toLowerCase().startsWith('\\') 
					? cmd.toLowerCase().slice(1) 
					: cmd.toLowerCase();

				return {
					command: cmd,
					score: this.#getAutocompleteScore(normalizedCmd, normalizedQuery),
				};
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => {
				if (b.score !== a.score) return b.score - a.score;
				return a.command.length - b.command.length;
			})
			.map((item) => item.command);

		return this.currentSuggestions;
	}

	#getAutocompleteScore(command:string , query: string) {
		let maxScore = -1; 
		for (let i=0; i < command.length; i++) {
			if (command[i] === query[0]) {
				const score = this.#getSliceScore(command, query, i);
				if (score > maxScore) maxScore = score;
			}
		}
		return maxScore;
	}

	#getSliceScore(command: string, query: string, startMatchIndex: number) {
		let score = startMatchIndex == 0 ? 20 : 10;
		let queryIndex = 1;
		let typoIndex = queryIndex;
		let commandIndex = startMatchIndex + 1;
		let prevMatch = true;
		while (commandIndex < command.length && queryIndex < query.length) {
			if (command[commandIndex] === query[queryIndex]) {
				score += prevMatch ? 15 : 10;
				prevMatch = true;
				queryIndex++;
			} else if (command[commandIndex] === query[queryIndex+1]) {
				queryIndex+=2;
				score += 10;
				prevMatch = true;
			} else {
				prevMatch = false;
			}
			commandIndex++;
		}

		const remaning = query.length - queryIndex;
		if (remaning > 2) {
			return -1;
		}
		score -= (command.length - query.length);
		return score;
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
