document.getElementById('file-input').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function (e) {
		try {
			const contents = e.target.result;
			const jsonData = JSON.parse(contents);
			processData(jsonData);
		} catch (error) {
			alert('Ошибка при чтении файла. Убедитесь, что вы загрузили корректный JSON-файл.');
		}
	};
	reader.readAsText(file);
}

function processData(jsonData) {
	const { tags, variables, triggers } = parseGTMContainer(jsonData);

	const attributes = processVariables(variables);
	displayVariables(attributes);

	const scripts = processTags(tags, triggers);
	displayScripts(scripts);
}

function parseGTMContainer(jsonData) {
	const containerVersion = jsonData.containerVersion;
	const tags = containerVersion.tag || [];
	const variables = containerVersion.variable || [];
	const triggers = containerVersion.trigger || [];
	return { containerVersion, tags, variables, triggers };
}

function processVariables(variables) {
	const attributes = variables.map(variable => {
		const name = variable.name || '';
		const parameter = variable.parameter || [];
		const searchNameParam = parameter.find(p => p.key === 'name');
		const search_name = searchNameParam ? searchNameParam.value : '';

		const attribute = {
			id: 0,
			name: name,
			description: '',
			search_name: search_name,
			collect_type: 0,
			source_name: '',
			attr_name: '',
			attr_type: 0,
			save_attr_value: 0,
		};

		return attribute;
	});

	return attributes;
}

function processTags(tags, triggers) {
	const scripts = [];

	tags.forEach(tag => {
		if (tag.type === 'html') {
			const name = tag.name || '';
			const parameter = tag.parameter || [];
			const templateParam = parameter.find(p => p.type === 'TEMPLATE');
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
			const triggerInfo = processTriggers(relatedTriggers);

			scripts.push({
				script: script,
				triggerInfo: triggerInfo,
				canProcess: triggerInfo.every(ti => ti.canProcess),
			});
		}
	});

	return scripts;
}

function processTriggers(triggers) {
	const triggerInfoList = [];

	triggers.forEach(trigger => {
		const triggerType = trigger.type;
		let canProcess = true;
		const conditions = [];

		// Добавляем 'CUSTOM_EVENT' в список обрабатываемых типов триггеров
		if (triggerType === 'CLICK' || triggerType === 'LINK_CLICK' || triggerType === 'CUSTOM_EVENT') {
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
					(filterType === 'EQUALS' && arg0Value === '{{Click ID}}')
				) {
					let selector = arg1Value;
					if (filterType === 'EQUALS' && arg0Value === '{{Click ID}}') {
						selector = `#${arg1Value}`;
					}

					conditions.push({
						variable: arg0Value,
						operator: translateOperator(filterType),
						value: selector,
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

	return triggerInfoList;
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

function displayVariables(attributes) {
	const variablesSection = document.getElementById('variables-section');

	if (attributes.length > 0) {
		const title = document.createElement('h2');
		title.textContent = 'Атрибуты';
		variablesSection.appendChild(title);

		const endpointInfo = document.createElement('p');
		endpointInfo.classList.add('endpoint-info');
		endpointInfo.textContent = 'Эндпоинт: sitescripts/CommonScript/CreateClientAttr';
		variablesSection.appendChild(endpointInfo);

		attributes.forEach(attribute => {
			const attributeDiv = document.createElement('div');
			attributeDiv.classList.add('item');

			const nameElem = document.createElement('h3');
			nameElem.textContent = `Имя: ${attribute.name}`;
			attributeDiv.appendChild(nameElem);

			const searchNameElem = document.createElement('p');
			searchNameElem.textContent = `Search Name: ${attribute.search_name}`;
			attributeDiv.appendChild(searchNameElem);

			const detailsButton = document.createElement('button');
			detailsButton.textContent = 'Показать запрос';
			detailsButton.addEventListener('click', () => {
				requestDetails.style.display = requestDetails.style.display === 'none' ? 'block' : 'none';
			});
			attributeDiv.appendChild(detailsButton);

			const requestDetails = document.createElement('pre');
			requestDetails.style.display = 'none';
			requestDetails.textContent = JSON.stringify(attribute, null, 2);
			attributeDiv.appendChild(requestDetails);

			variablesSection.appendChild(attributeDiv);
		});
	}
}

function displayScripts(scripts) {
	const scriptsSection = document.getElementById('scripts-section');

	if (scripts.length > 0) {
		const title = document.createElement('h2');
		title.textContent = 'Скрипты';
		scriptsSection.appendChild(title);

		const endpointInfo = document.createElement('p');
		endpointInfo.classList.add('endpoint-info');
		endpointInfo.textContent = 'Эндпоинт: sitescripts/CommonScript/';
		scriptsSection.appendChild(endpointInfo);

		scripts.forEach(item => {
			const script = item.script;
			const triggerInfoList = item.triggerInfo;
			const canProcess = item.canProcess;

			const scriptDiv = document.createElement('div');
			scriptDiv.classList.add('item');
			if (!canProcess) {
				scriptDiv.classList.add('error');
			}

			const nameElem = document.createElement('h3');
			nameElem.textContent = `Имя: ${script.name}`;
			scriptDiv.appendChild(nameElem);

			triggerInfoList.forEach(triggerInfo => {
				const triggerDiv = document.createElement('div');
				triggerDiv.classList.add('trigger-item');

				const triggerNameElem = document.createElement('p');
				triggerNameElem.textContent = `Триггер: ${triggerInfo.name} (${triggerInfo.type})`;
				triggerDiv.appendChild(triggerNameElem);

				triggerInfo.conditions.forEach(condition => {
					const conditionElem = document.createElement('p');
					if (condition.cannotProcess) {
						conditionElem.style.color = 'red';
						if (condition.message) {
							// Если есть сообщение, отображаем его
							conditionElem.textContent = `Необрабатываемое условие: ${condition.message}`;
						} else {
							// Иначе отображаем переменные
							conditionElem.textContent = `Необрабатываемое условие: ${condition.variable} ${condition.operator} ${condition.value}`;
						}
					} else {
						conditionElem.textContent = `Условие: ${condition.variable} ${condition.operator} ${condition.value}`;
					}
					triggerDiv.appendChild(conditionElem);
				});

				scriptDiv.appendChild(triggerDiv);
			});

			const detailsButton = document.createElement('button');
			detailsButton.textContent = 'Показать запрос';
			detailsButton.addEventListener('click', () => {
				requestDetails.style.display = requestDetails.style.display === 'none' ? 'block' : 'none';
			});
			scriptDiv.appendChild(detailsButton);

			const requestDetails = document.createElement('pre');
			requestDetails.style.display = 'none';
			requestDetails.textContent = JSON.stringify(script, null, 2);
			scriptDiv.appendChild(requestDetails);

			scriptsSection.appendChild(scriptDiv);
		});
	}
}
