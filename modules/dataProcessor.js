export function processData(jsonData) {
	const { tags, variables, triggers } = parseGTMContainer(jsonData);

	if (!tags || tags.length === 0) return { attributes: [], scripts: [], domainActions: [] };

	const attributes = processVariables(variables);
	const { scripts, domainActions } = processTags(tags, triggers);

	return { attributes, scripts, domainActions };
}

function parseGTMContainer(jsonData) {
	if (!jsonData || !jsonData.containerVersion) return {};
	const containerVersion = jsonData.containerVersion;
	const tags = containerVersion.tag || [];
	const variables = containerVersion.variable || [];
	const triggers = containerVersion.trigger || [];
	return { containerVersion, tags, variables, triggers };
}

function processVariables(variables) {
	return variables.map(variable => {
		const name = variable.name || '';
		const parameter = variable.parameter || [];
		const searchNameParam = parameter.find(p => p.key === 'name');
		const search_name = searchNameParam ? searchNameParam.value : '';

		const formatValue = variable.formatValue || {};
		const caseConversionType = formatValue.caseConversionType || '';
		const convertNullToValue = formatValue.convertNullToValue ? formatValue.convertNullToValue.value : '';
		const convertUndefinedToValue = formatValue.convertUndefinedToValue
			? formatValue.convertUndefinedToValue.value
			: '';
		const convertTrueToValue = formatValue.convertTrueToValue ? formatValue.convertTrueToValue.value : '';
		const convertFalseToValue = formatValue.convertFalseToValue ? formatValue.convertFalseToValue.value : '';

		return {
			id: 0,
			name: name,
			description: '',
			search_name: search_name,
			collect_type: 0,
			source_name: '',
			attr_name: '',
			attr_type: 0,
			save_attr_value: 0,
			caseConversionType: caseConversionType,
			convertNullToValue: convertNullToValue,
			convertUndefinedToValue: convertUndefinedToValue,
			convertTrueToValue: convertTrueToValue,
			convertFalseToValue: convertFalseToValue,
		};
	});
}

function processTags(tags, triggers) {
	const scripts = [];
	const domainActions = [];
	let scriptCounter = 1;

	tags.forEach(tag => {
		if (tag.type === 'html') {
			const name = tag.name || '';
			const parameter = tag.parameter || [];
			const templateParam = parameter.find(p => p.type === 'TEMPLATE' && p.key === 'html');
			const script_text = templateParam ? templateParam.value : '';

			const script = {
				script_id: scriptCounter++,
				name: name,
				script_text: script_text,
				status: 0,
				urls: [],
				publish: true,
			};

			const firingTriggerIds = tag.firingTriggerId || [];
			const relatedTriggers = triggers.filter(trigger => firingTriggerIds.includes(trigger.triggerId));
			const { triggerInfo, domainActions: triggerDomainActions } = processTriggers(
				relatedTriggers,
				name,
				script.script_id,
			);

			scripts.push({
				script: script,
				triggerInfo: triggerInfo,
				canProcess: triggerInfo.every(ti => ti.canProcess),
			});

			domainActions.push(...triggerDomainActions);
		}
	});

	return { scripts, domainActions };
}

function processTriggers(triggers, tagName, script_id) {
	const triggerInfoList = [];
	const domainActions = [];

	triggers.forEach(trigger => {
		const triggerType = trigger.type;
		let canProcess = true;
		const conditions = [];

		if (triggerType === 'CUSTOM_EVENT') {
			const domain =
				'https://' +
				window.location.hostname.replace('www.', '') +
				(window.location.port ? ':' + window.location.port : '');

			const requestBody = {
				actionType: 'customAction',
				selector: '.ux_customAction',
				context: 'customAction',
				domain: domain,
				sendToRocket: false,
				script_id: script_id,
			};

			domainActions.push({
				name: tagName,
				triggerName: trigger.name || '',
				triggerType: triggerType,
				condition: {},
				requestBody: requestBody,
			});

			conditions.push({
				message: 'Обработан триггер CUSTOM_EVENT',
				processed: true,
			});

			triggerInfoList.push({
				triggerId: trigger.triggerId,
				name: trigger.name || '',
				type: triggerType,
				conditions: conditions,
				canProcess: true,
			});
		} else if (['CLICK', 'LINK_CLICK'].includes(triggerType)) {
			const filters = trigger.filter || [];
			filters.forEach(filter => {
				const filterType = filter.type;
				const parameter = filter.parameter || [];
				const arg0 = parameter.find(p => p.key === 'arg0');
				const arg1 = parameter.find(p => p.key === 'arg1');
				const arg0Value = arg0 ? arg0.value : '';
				const arg1Value = arg1 ? arg1.value : '';

				let selector = '';
				let context = '';
				let actionType = '';
				let canProcessCondition = true;

				if (arg0Value === '{{Click Classes}}') {
					actionType = 'click';
					context = 'gClicks';
					if (['EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH'].includes(filterType)) {
						selector = arg1Value
							.split(' ')
							.map(className => '.' + className)
							.join('');
					} else {
						canProcessCondition = false;
					}
				} else if (arg0Value === '{{Click ID}}') {
					actionType = 'click';
					context = 'gClicks';
					if (filterType === 'EQUALS') {
						selector = `#${arg1Value}`;
					} else if (filterType === 'CONTAINS') {
						selector = `[id*="${arg1Value}"]`;
					} else if (filterType === 'STARTS_WITH') {
						selector = `[id^="${arg1Value}"]`;
					} else if (filterType === 'ENDS_WITH') {
						selector = `[id$="${arg1Value}"]`;
					} else {
						canProcessCondition = false;
					}
				} else if (arg0Value === '{{Click URL}}') {
					actionType = 'click';
					context = 'gLinkClicks';
					if (filterType === 'EQUALS') {
						selector = `[href="${arg1Value}"]`;
					} else if (filterType === 'CONTAINS') {
						selector = `[href*="${arg1Value}"]`;
					} else if (filterType === 'STARTS_WITH') {
						selector = `[href^="${arg1Value}"]`;
					} else if (filterType === 'ENDS_WITH') {
						selector = `[href$="${arg1Value}"]`;
					} else {
						canProcessCondition = false;
					}
				} else {
					canProcessCondition = false;
				}

				if (canProcessCondition && actionType && selector && context) {
					const domain =
						'https://' +
						window.location.hostname.replace('www.', '') +
						(window.location.port ? ':' + window.location.port : '');

					const requestBody = {
						actionType: actionType,
						selector: selector,
						context: context,
						domain: domain,
						sendToRocket: false,
						script_id: script_id,
					};

					conditions.push({
						variable: arg0Value,
						operator: translateOperator(filterType),
						value: selector,
						processed: true,
						requestBody: requestBody,
					});

					domainActions.push({
						name: tagName,
						triggerName: trigger.name || '',
						triggerType: triggerType,
						condition: {
							variable: arg0Value,
							operator: translateOperator(filterType),
							value: arg1Value,
						},
						requestBody: requestBody,
					});
				} else {
					canProcess = false;
					conditions.push({
						variable: arg0Value,
						operator: translateOperator(filterType),
						value: arg1Value,
						cannotProcess: true,
					});
				}
			});

			triggerInfoList.push({
				triggerId: trigger.triggerId,
				name: trigger.name || '',
				type: triggerType,
				conditions: conditions,
				canProcess: canProcess,
			});
		} else {
			canProcess = false;
			conditions.push({
				message: `Триггер типа ${triggerType} не поддерживается`,
				cannotProcess: true,
			});

			triggerInfoList.push({
				triggerId: trigger.triggerId,
				name: trigger.name || '',
				type: triggerType,
				conditions: conditions,
				canProcess: false,
			});
		}
	});

	return { triggerInfo: triggerInfoList, domainActions };
}

function translateOperator(operator) {
	switch (operator) {
		case 'EQUALS':
			return 'равно';
		case 'CONTAINS':
			return 'содержит';
		case 'STARTS_WITH':
			return 'начинается с';
		case 'ENDS_WITH':
			return 'заканчивается на';
		case 'CSS_SELECTOR':
			return 'CSS селектор';
		default:
			return operator;
	}
}
