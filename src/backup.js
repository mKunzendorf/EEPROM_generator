/**
 * SOES EEPROM generator
 * Project backup save and restore

 * This tool serves as:
- EtherCAT Slave Information XML + EEPROM binary generator
- SOES code generator

 * Victor Sluiter 2013-2018
 * Kuba Buda 2020-2024
 */
'use strict'

// ####################### Backup serialization + deserialization ####################### //

function isValidBackup(backup) {
	if (!backup || !backup.form || !backup.od ) {
		if (!confirm('Backup is incomplete or invalid, proceed anyway?')) {
			return false;
		}
	}
	return true;
}

function isBackedUp(formControl) {
	return formControl.type != "button";
}

function isRadioButton(formControl) {
	return formControl.name.startsWith('DetailsEnable') || formControl.name.startsWith('CoeDetailsEnable');
}

function prepareBackupObject(form, odSections, dc, tcmod) {
	const formValues = {};
	if (form) {
		Object.entries(form).forEach(formEntry => {
			const formControl = formEntry[1]; // entry[0] is form control order number
			if(isBackedUp(formControl) && formControl.value) {
				const name = formControl.name;
				formValues[name] = isRadioButton(formControl) ? formControl.checked : formControl.value;
			};
		});
	}
	const backup = {
		form: formValues,
		od: odSections,
		dc: dc,
		tcmod: tcmod,
	};

	return backup;
}

function loadBackup(backupObject, form, odSections, dc, tcmod) {
	if (backupObject.od) {
		odSections.sdo = backupObject.od.sdo;
		odSections.txpdo = backupObject.od.txpdo;
		odSections.rxpdo = backupObject.od.rxpdo;
	}

	if (backupObject.dc) {
		backupObject.dc.forEach(d => dc.push(d));
	}

	if (backupObject.tcmod) {
		backupObject.tcmod.forEach(t => tcmod.push(t));
	} 
	
	setFormValues(form, backupObject);
}

function setFormValues(form, backupObject) {
	if (form) {
		Object.entries(form).forEach(formEntry => {
			const formControl = formEntry[1]; // entry[0] is index
			const value = backupObject.form[formControl.name];
			if (isBackedUp(formControl) && value != undefined) {
				setFormControlValue(formControl, value);
			};
		});
	}
}

// use to update getEmptyFrom in tests, when new forms are added
function getEmptyFrom(form) {
	const emptyForm = {};
	Object.entries(form).forEach(formEntry => {
		const formControl = formEntry[1]; // entry[0] is index
		if (formControl.name) {
			emptyForm[formControl.name] = { name: formControl.name };
		}
	});
	return emptyForm;
}

function setFormControlValue(formControl, value) {
	if (isRadioButton(formControl)) {
		formControl.checked = (value == true) ? true : false;
	} else {
		formControl.value = value;
	}
}

function prepareBackupFileContent(form, odSections, dc, tcmod) {
	const backupObject = prepareBackupObject(form, odSections, dc, tcmod);
	const backupFileContent = JSON.stringify(backupObject, null, 2); // pretty print
	return backupFileContent;
}

// ####################### Backup using JSON file from filesystem ####################### //

// Localstorage limit is usually 5MB, super large object dictionaries on older browsers might be problematic

function downloadBackupFile(backupJson) {
	downloadFile(backupJson, 'esi.json', 'text/json');
}

function restoreBackup(fileContent, form, odSections, dc, tcmod) {
	const backup = JSON.parse(fileContent);
	if (isValidBackup(backup)) {
		loadBackup(backup, form, odSections, dc, tcmod);
	}
}

// ####################### Backup using browser localstorage ####################### //

/** persist OD and settings changes over page reload */
function saveLocalBackup(backupJson) {
	localStorage.etherCATeepromGeneratorBackup = backupJson;
}

function tryRestoreLocalBackup(form, odSections, dc, tcmod) {
	if (localStorage.etherCATeepromGeneratorBackup)  {
		restoreBackup(localStorage.etherCATeepromGeneratorBackup, form, odSections, dc, tcmod);
	}	
}

function resetLocalBackup() {
	if (localStorage.etherCATeepromGeneratorBackup) {
		delete localStorage.etherCATeepromGeneratorBackup;
	}
}