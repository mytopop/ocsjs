import { answerSimilar, clearString, removeRedundant } from '../utils';
import { QuestionResolver, WorkContext } from './interface';
import { isPlainAnswer, splitAnswer } from './utils';
import { StringUtils } from '@ocsjs/common/src/utils/string';
/** 默认答案题目处理器 */
export function defaultQuestionResolve<E>(
	ctx: WorkContext<E>
): Record<'single' | 'multiple' | 'completion' | 'judgement', QuestionResolver<E>> {
	return {
		/**
		 * 单选题处理器
		 *
		 * 在多个题库给出的答案中，找出最相似的答案
		 */
		single(results, options, handler) {
			// 是否为纯ABCD答案
			for (const result of results) {
				for (const answer of result.answers) {
					const ans = StringUtils.nowrap(answer.answer).trim();
					if (ans.length === 1 && isPlainAnswer(ans)) {
						const index = ans.charCodeAt(0) - 65;
						handler('single', options[index].textContent || options[index].innerText, options[index], ctx);
						return { finish: true, option: options[index] };
					}
				}
			}

			/** 配对选项的相似度 */
			const ratings = answerSimilar(
				results.map((res) => res.answers.map((ans) => ans.answer)).flat(),
				options.map((el) => el.textContent || el.innerText)
			);
			/**  找出最相似的选项 */
			let index = -1;
			let max = 0;
			ratings.forEach((rating, i) => {
				if (rating.rating > max) {
					max = rating.rating;
					index = i;
				}
			});
			// 存在选项，并且相似度超过 60 %
			if (index !== -1 && max > 0.6) {
				/** 经自定义的处理器进行处理 */
				handler('single', options[index].textContent || options[index].innerText, options[index], ctx);
				return {
					finish: true,
					ratings: ratings.map((r) => r.rating)
				};
			}
			return { finish: false };
		},
		/**
		 * 多选题处理器
		 *
		 * 匹配每个题库的答案，找出匹配数量最多的题库，并且选择
		 */
		multiple(results, options, handler) {
			/** 最终的回答列表 */
			const targetAnswers: string[][] = [];
			/** 最终的选项 */
			const targetOptions: HTMLElement[][] = [];

			// 各个题库的序号
			let count = 0;
			for (const answers of results.map((res) => res.answers.map((ans) => ans.answer))) {
				targetAnswers[count] = [];
				targetOptions[count] = [];

				// 判断选项是否完全存在于答案里面
				options.forEach((el, i) => {
					if (answers.some((answer) => answer.includes(removeRedundant(el.textContent || el.innerText)))) {
						targetAnswers[count][i] = el.textContent || el.innerText;
						targetOptions[count][i] = el;
					}
				});

				// 判断是否为纯ABCD答案
				for (const answer of answers) {
					const ans = StringUtils.nowrap(answer).trim();
					if (isPlainAnswer(ans)) {
						for (let i = 0; i < ans.length; i++) {
							const index = ans.charCodeAt(i) - 65;
							targetAnswers[count][i] = options[index].textContent || options[index].innerText;
							targetOptions[count][i] = options[index];
						}
					}
				}

				if (targetAnswers[count].length === 0) {
					const ratings = answerSimilar(
						answers,
						options.map((el) => el.textContent || el.innerText)
					).sort((a, b) => b.rating - a.rating);

					// 匹配相似率
					if (ratings.some((rating) => rating.rating > 0.6)) {
						options.forEach((el, i) => {
							if (ratings[i].rating > 0.6) {
								targetAnswers[count][i] = el.textContent || el.innerText;
								targetOptions[count][i] = el;
							}
						});
					}
				}

				count++;
			}

			/** 查找每个题库里面是否存在答案 ， 并且找到答案数量较多的一个 */
			let max = 0;
			let index = -1;
			for (let i = 0; i < targetOptions.length; i++) {
				const len = targetAnswers[i].filter((ans) => ans !== undefined).length;
				if (len > max) {
					max = len;
					index = i;
				}
			}

			/** 如果答案不存在 */
			if (index === -1) {
				return { finish: false };
			} else {
				targetAnswers[index] = targetAnswers[index].filter((ans) => ans !== undefined);
				targetOptions[index] = targetOptions[index].filter((ans) => ans !== undefined);

				targetOptions[index].forEach((_, i) => {
					/** 延长点击时间，避免一次点击全部 */
					setTimeout(() => {
						handler('multiple', targetAnswers[index][i], targetOptions[index][i], ctx);
					}, 500 * i);
				});

				return { finish: true, targetOptions, targetAnswers };
			}
		},
		/** 判断题处理器 */
		judgement(results, options, handler) {
			for (const answers of results.map((res) => res.answers.map((ans) => ans.answer))) {
				const correctWords = ['是', '对', '正确', '√', '对的', '是的', '正确的', 'true', 'yes', '1'];
				const incorrectWords = [
					'非',
					'否',
					'错',
					'错误',
					'×',
					'X',
					'错的',
					'不对',
					'不正确的',
					'不正确',
					'不是',
					'不是的',
					'false',
					'no',
					'0'
				];

				/** 答案显示正确 */
				const answerShowCorrect = answers.find((answer) => matches(answer, correctWords));
				/** 答案显示错误 */
				const answerShowIncorrect = answers.find((answer) => matches(answer, incorrectWords));

				if (answerShowCorrect || answerShowIncorrect) {
					let option: HTMLElement | undefined;
					for (const el of options) {
						/** 选项显示正确 */
						const textShowCorrect = matches(el.textContent || el.innerText, correctWords);
						/** 选项显示错误 */
						const textShowIncorrect = matches(el.textContent || el.innerText, incorrectWords);
						if (answerShowCorrect && textShowCorrect) {
							option = el;
							handler('judgement', answerShowCorrect, el, ctx);
							break;
						}
						if (answerShowIncorrect && textShowIncorrect) {
							option = el;
							handler('judgement', answerShowIncorrect, el, ctx);
							break;
						}
					}

					return { finish: true, option };
				}

				function matches(target: string, options: string[]) {
					return options.some((option) => RegExp(clearString(option, '√', '×')).test(clearString(target, '√', '×')));
				}
			}

			return { finish: false };
		},
		/** 填空题处理器 */
		completion: function (results, options, handler) {
			for (const answers of results.map((res) => res.answers.map((ans) => ans.answer))) {
				let ans = answers;
				if (ans.length === 1) {
					ans = splitAnswer(ans[0]);
				}

				if (ans.length !== 0 && ans.length === options.length) {
					options.forEach((el, i) => {
						/** 延长填写时间，避免一次全部填写 */
						setTimeout(() => {
							handler('completion', ans[i], el, ctx);
						}, 500 * i);
					});
					return { finish: true };
				}
			}

			return { finish: false };
		}
	};
}
