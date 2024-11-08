import { setupFileHandler } from './modules/fileHandler.js';
import { processData } from './modules/dataProcessor.js';
import { displayVariables, displayScripts, displayDomainActions } from './modules/uiRenderer.js';

function handleFileRead(jsonData) {
	const { attributes, scripts, domainActions } = processData(jsonData);

	displayVariables(attributes);
	displayScripts(scripts);
	displayDomainActions(domainActions);
}

document.addEventListener('DOMContentLoaded', () => {
	setupFileHandler(handleFileRead);
});
