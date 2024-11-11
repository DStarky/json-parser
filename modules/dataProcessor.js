export function processData(jsonData) {
	const { tags, variables, triggers } = parseGTMContainer(jsonData);

	const attributes = processVariables(variables);
	const { scripts, domainActions } = processTags(tags, triggers);

	return { attributes, scripts, domainActions };
}

function parseGTMContainer(jsonData) {
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

	tags.forEach(tag => {
		if (tag.type === 'html') {
			const name = tag.name || '';
			const parameter = tag.parameter || [];
			const templateParam = parameter.find(p => p.type === 'TEMPLATE' && p.key === 'html');
			const script_text = templateParam ? templateParam.value : '';

			const script = {
				name: name,
				script_text: script_text,
				status: 0,
				urls: [],
				publish: true,
			};

			const firingTriggerIds = tag.firingTriggerId || [];
			const relatedTriggers = triggers.filter(trigger => firingTriggerIds.includes(trigger.triggerId));
			const { triggerInfo, domainActions: triggerDomainActions } = processTriggers(relatedTriggers, name);

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

function processTriggers(triggers, tagName) {
	const triggerInfoList = [];
	const domainActions = [];

	triggers.forEach(trigger => {
		const triggerType = trigger.type;
		let canProcess = true;
		const conditions = [];

		if (['CLICK', 'LINK_CLICK', 'CUSTOM_EVENT'].includes(triggerType)) {
			const filters = trigger.filter || [];
			filters.forEach(filter => {
				const filterType = filter.type;
				const parameter = filter.parameter || [];
				const arg0 = parameter.find(p => p.key === 'arg0');
				const arg1 = parameter.find(p => p.key === 'arg1');
				const arg0Value = arg0 ? arg0.value : '';
				const arg1Value = arg1 ? arg1.value : '';

				if (
					(filterType === 'CSS_SELECTOR' && arg0Value === '{{Click Classes}}') ||
					(filterType === 'EQUALS' && arg0Value === '{{Click ID}}') ||
					(filterType === 'CONTAINS' && arg0Value === '{{Click Classes}}') ||
					(filterType === 'EQUALS' && arg0Value === '{{Click URL}}')
				) {
					let selector = arg1Value;
					let context = '';
					let actionType = '';

					if (filterType === 'CSS_SELECTOR' && arg0Value === '{{Click Classes}}') {
						actionType = 'click';
						selector = arg1Value;
						context = 'gClicks';
					} else if (filterType === 'EQUALS' && arg0Value === '{{Click ID}}') {
						actionType = 'click';
						selector = `#${arg1Value}`;
						context = 'gClicks';
					} else if (filterType === 'CONTAINS' && arg0Value === '{{Click Classes}}') {
						actionType = 'click';
						selector = `.${arg1Value}`;
						context = 'gClicks';
					} else if (filterType === 'EQUALS' && arg0Value === '{{Click URL}}') {
						actionType = 'click';
						selector = `[href="${arg1Value}"]`;
						context = 'gLinkClicks';
					}

					if (actionType && selector && context) {
						const domain =
							'https://' +
							window.location.hostname.replace('www.', '') +
							(window.location.port ? ':' + window.location.port : '');

						const requestBody = {
							actionType: actionType,
							selector: selector,
							context: context,
							domain: domain,
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
		} else {
			canProcess = false;
			conditions.push({
				message: `Триггер типа ${triggerType} не поддерживается`,
				cannotProcess: true,
			});
		}

		triggerInfoList.push({
			triggerId: trigger.triggerId,
			name: trigger.name || '',
			type: triggerType,
			conditions: conditions,
			canProcess: canProcess,
		});
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
