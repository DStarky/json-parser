export function setupFileHandler(onFileRead) {
	const fileInput = document.getElementById('file-input');
	fileInput.addEventListener('change', event => handleFileSelect(event, onFileRead));
}

function handleFileSelect(event, onFileRead) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function (e) {
		try {
			const contents = e.target.result;
			const jsonData = JSON.parse(contents);
			onFileRead(jsonData);
		} catch (error) {
			alert('Ошибка при чтении файла. Убедитесь, что вы загрузили корректный JSON-файл.');
		}
	};
	reader.readAsText(file);
}
