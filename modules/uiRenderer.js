export function displayVariables(attributes) {
	if (!attributes || attributes.length === 0) {
		createEmptySection('variables-section', 'Атрибуты');
		return;
	}

	const variablesSection = createSection('variables-section', 'Атрибуты', 'sitescripts/CommonScript/CreateClientAttr');

	attributes.forEach(attribute => {
		createItem(
			variablesSection,
			itemDiv => {
				const nameElem = document.createElement('h3');
				nameElem.textContent = `Имя: ${attribute.name}`;
				itemDiv.appendChild(nameElem);

				const searchNameElem = document.createElement('p');
				searchNameElem.textContent = `Search Name: ${attribute.search_name}`;
				itemDiv.appendChild(searchNameElem);

				if (attribute.caseConversionType) {
					const caseConversionElem = document.createElement('p');
					caseConversionElem.textContent = `Case Conversion Type: ${attribute.caseConversionType}`;
					itemDiv.appendChild(caseConversionElem);
				}

				if (attribute.convertNullToValue) {
					const convertNullElem = document.createElement('p');
					convertNullElem.textContent = `Convert Null To Value: ${attribute.convertNullToValue}`;
					itemDiv.appendChild(convertNullElem);
				}

				if (attribute.convertUndefinedToValue) {
					const convertUndefinedElem = document.createElement('p');
					convertUndefinedElem.textContent = `Convert Undefined To Value: ${attribute.convertUndefinedToValue}`;
					itemDiv.appendChild(convertUndefinedElem);
				}

				if (attribute.convertTrueToValue) {
					const convertTrueElem = document.createElement('p');
					convertTrueElem.textContent = `Convert True To Value: ${attribute.convertTrueToValue}`;
					itemDiv.appendChild(convertTrueElem);
				}

				if (attribute.convertFalseToValue) {
					const convertFalseElem = document.createElement('p');
					convertFalseElem.textContent = `Convert False To Value: ${attribute.convertFalseToValue}`;
					itemDiv.appendChild(convertFalseElem);
				}
			},
			attribute,
		);
	});
}

export function displayScripts(scripts) {
	if (!scripts || scripts.length === 0) {
		createEmptySection('scripts-section', 'Скрипты');
		return;
	}

	const scriptsSection = createSection('scripts-section', 'Скрипты', 'sitescripts/CommonScript/');

	scripts.forEach(item => {
		const { script, triggerInfo, canProcess } = item;

		createItem(
			scriptsSection,
			itemDiv => {
				itemDiv.classList.toggle('error', !canProcess);

				const nameElem = document.createElement('h3');
				nameElem.textContent = `Имя: ${script.name} (ID: ${script.script_id})`;
				itemDiv.appendChild(nameElem);

				triggerInfo.forEach(trigger => {
					const triggerDiv = document.createElement('div');
					triggerDiv.classList.add('trigger-item');

					const triggerNameElem = document.createElement('p');
					triggerNameElem.textContent = `Триггер: ${trigger.name} (${trigger.type})`;
					triggerDiv.appendChild(triggerNameElem);

					trigger.conditions.forEach(condition => {
						const conditionElem = document.createElement('p');
						if (condition.cannotProcess) {
							conditionElem.style.color = 'red';
							conditionElem.textContent = condition.message
								? `Необрабатываемое условие: ${condition.message}`
								: `Необрабатываемое условие: ${condition.variable} ${condition.operator} ${condition.value}`;
						} else if (condition.processed) {
							conditionElem.style.color = 'green';
							conditionElem.textContent = condition.message
								? condition.message
								: `Условие обработано: ${condition.variable} ${condition.operator} ${condition.value}`;
						} else {
							conditionElem.textContent = `Условие: ${condition.variable} ${condition.operator} ${condition.value}`;
						}
						triggerDiv.appendChild(conditionElem);
					});

					itemDiv.appendChild(triggerDiv);
				});
			},
			script,
		);
	});
}

export function displayDomainActions(domainActions) {
	if (!domainActions || domainActions.length === 0) {
		createEmptySection('domainaction-section', 'Domain Actions');
		return;
	}

	const domainActionsSection = createSection('domainaction-section', 'Domain Actions', 'sitescripts/DomainAction/');

	domainActions.forEach(action => {
		createItem(
			domainActionsSection,
			itemDiv => {
				const nameElem = document.createElement('h3');
				nameElem.textContent = `Имя: ${action.name} ${
					action.requestBody.script_id ? `(ID: ${action.requestBody.script_id})` : ''
				}`;
				itemDiv.appendChild(nameElem);

				const triggerElem = document.createElement('p');
				triggerElem.textContent = `Триггер: ${action.triggerName} (${action.triggerType})`;
				itemDiv.appendChild(triggerElem);

				if (action.condition && action.condition.variable) {
					const conditionElem = document.createElement('p');
					conditionElem.textContent = `Условие обработано: ${action.condition.variable} ${action.condition.operator} ${action.condition.value}`;
					itemDiv.appendChild(conditionElem);
				} else if (action.triggerType === 'CUSTOM_EVENT') {
					const conditionElem = document.createElement('p');
					conditionElem.textContent = `Обработан триггер CUSTOM_EVENT`;
					itemDiv.appendChild(conditionElem);
				} else {
					const conditionElem = document.createElement('p');
					conditionElem.textContent = `Условие: нет доступной информации`;
					itemDiv.appendChild(conditionElem);
				}
			},
			action.requestBody,
		);
	});
}

function createSection(sectionId, titleText, endpointText) {
	const section = document.getElementById(sectionId);
	section.innerHTML = '';

	const title = document.createElement('h2');
	title.textContent = titleText;
	section.appendChild(title);

	const endpointInfo = document.createElement('p');
	endpointInfo.classList.add('endpoint-info');
	endpointInfo.textContent = `Эндпоинт: ${endpointText}`;
	section.appendChild(endpointInfo);

	return section;
}

function createToggleButton(preElement) {
	const button = document.createElement('button');
	button.textContent = 'Показать запрос';
	button.addEventListener('click', () => {
		preElement.style.display = preElement.style.display === 'none' ? 'block' : 'none';
	});
	return button;
}

function createRequestDetails(content) {
	const pre = document.createElement('pre');
	pre.style.display = 'none';
	pre.textContent = JSON.stringify(content, null, 2);
	return pre;
}

function createItem(container, contentBuilder, detailsContent) {
	const itemDiv = document.createElement('div');
	itemDiv.classList.add('item');

	contentBuilder(itemDiv);

	const detailsButton = document.createElement('button');
	detailsButton.textContent = 'Показать запрос';
	itemDiv.appendChild(detailsButton);

	const requestDetails = createRequestDetails(detailsContent);
	itemDiv.appendChild(requestDetails);

	detailsButton.addEventListener('click', () => {
		requestDetails.style.display = requestDetails.style.display === 'none' ? 'block' : 'none';
	});

	container.appendChild(itemDiv);
}

function createEmptySection(sectionId, titleText) {
	const section = document.getElementById(sectionId);
	section.innerHTML = '';

	const title = document.createElement('h2');
	title.textContent = `${titleText}: Данные отсутствуют`;
	section.appendChild(title);
}
