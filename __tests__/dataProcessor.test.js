import { describe, it, expect } from 'vitest';
import { processData } from '../modules/dataProcessor.js';
import testRight from '../testRight.json';
import testWrong from '../testWrong.json';

describe('processData', () => {
	it('корректно парсит файл и получает свойства attributes, scripts и domainActions', () => {
		const result = processData(testRight);

		expect(result).toHaveProperty('attributes');
		expect(result).toHaveProperty('scripts');
		expect(result).toHaveProperty('domainActions');
	});

	it('корректно обрабатывает некорректные данные', () => {
		const result = processData(testWrong);

		expect(result).toEqual({ attributes: [], scripts: [], domainActions: [] });
	});
});
