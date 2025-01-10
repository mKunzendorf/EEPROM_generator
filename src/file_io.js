/**
 * SOES EEPROM generator
 * Files input and output

 * This tool serves as:
- EtherCAT Slave Information XML + EEPROM binary generator
- SOES code generator

 * Victor Sluiter 2013-2018
 * Kuba Buda 2020-2024
 */
'use strict'

// ####################### File operations ####################### //

/** save file in local filesystem, by downloading from browser */
function downloadFile(content, fileName, contentType) {
    const a = document.createElement("a");
    const file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
	// a element will be garbage collected, no need to cleanup
}

/** reads saved project from file user opened */
function readFile(e) {
	const file = e.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = function(e) {
		onRestoreComplete(e.target.result);
  	}
	reader.readAsText(file);
}

function downloadGeneratedFilesZipped(result, projectName) {
	const zip = new JSZip();

	// Add files to the 'config' folder
	zip.file('config/esi.json', result.backupJson);

	// Add files to the 'master' folder
	zip.file(`master/${projectName}.xml`, result.ESI.value);

	// Add files to the 'linux' folder
	zip.file('linux/ioctl_lan9252.h', result.ioctl_lan9252.value);
	zip.file('linux/structure_handle_c.h', result.structure_handle_c.value);

	// Add files to the 'cpp' folder
	zip.file('cpp/structure_handle_cpp.h', result.structure_handle_cpp.value);
	zip.file('cpp/structure_handle_cpp.cpp', result.structure_handle_cpp_cpp.value);

	// Add files to the 'testfiles' folder
	zip.file('testfiles/main.cpp', result.main_cpp.value);
	zip.file('testfiles/test.c', result.test_c.value);

	// Add files to the 'other' folder
	zip.file('other/ecat_options.h', result.ecat_options.value);
	zip.file('other/eeprom.bin', result.HEX.hexData);
	zip.file('other/eeprom.hex', result.HEX.value);
	zip.file('other/eeprom.h', result.HEX.header);
	zip.file('other/objectlist.c', result.objectlist.value);
	zip.file('other/utypes.h', result.utypes.value);

	// Add TwinCAT module files to twincat_gvl folder
	if (result.twincat_modules) {
		Object.entries(result.twincat_modules).forEach(([moduleName, content]) => {
			zip.file(`twincat/gvl/${moduleName}.TcGVL`, content);
		});
	}

	// Add TwinCAT CRC files to twincat_crc folder
	if (result.twincat_crc) {
		Object.entries(result.twincat_crc).forEach(([fileName, content]) => {
				zip.file(`twincat/crc_calc/${fileName}.TcPOU`, content);
		});
	}

	// Generate and download the zip file
	zip.generateAsync({ type: "blob" }).then(function (blob) {
		downloadFile(blob, "esi.zip", "application/zip");
	}, function (err) {
		console.log(err);
	});
}

function downloadGeneratedFiles(result, projectName) {
	downloadFile(result.ESI.value, `${projectName}.xml`, 'text/html');
	downloadFile(result.HEX.value, 'eeprom.hex', 'application/octet-stream');
	downloadFile(result.HEX.header, 'eeprom.h', 'text/plain');
	downloadFile(result.ecat_options.value, 'ecat_options.h', 'text/plain');
	downloadFile(result.objectlist.value, 'objectlist.c', 'text/plain');
	downloadFile(result.utypes.value, 'utypes.h', 'text/plain');
	downloadFile(result.structure_handle_cpp.value, 'structure_handle_cpp.h', 'text/plain');
	downloadFile(result.structure_handle_c.value, 'structure_handle_c.h', 'text/plain');
	downloadFile(result.ioctl_lan9252.value, 'ioctl_lan9252.h', 'text/plain');
	downloadFile(result.main_cpp.value, 'main.cpp', 'text/plain');
	downloadFile(result.test_c.value, 'test.c', 'text/plain');
	downloadBackupFile(result.backupJson);
}