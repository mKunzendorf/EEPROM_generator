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

// Helper function to sort PDO sections by hex address
function sortPdoSectionByHex(pdoSection) {
	// Get all keys and sort them by hex value
	const originalKeys = Object.keys(pdoSection);
	const sortedKeys = [...originalKeys].sort((a, b) => {  // Create a copy with spread operator
		const numA = parseInt(a, 16);
		const numB = parseInt(b, 16);
		return numA - numB;
	});
	
	console.log('sortPdoSectionByHex DEBUG:');
	console.log('  Input keys:', originalKeys.join(', '));
	console.log('  Sorted keys:', sortedKeys.join(', '));
	console.log('  6009 hex value:', parseInt('6009', 16));
	console.log('  600A hex value:', parseInt('600A', 16));
	console.log('  6010 hex value:', parseInt('6010', 16));
	console.log('  Sort comparison 6009 vs 600A:', parseInt('6009', 16) - parseInt('600A', 16));
	console.log('  Sort comparison 600A vs 6010:', parseInt('600A', 16) - parseInt('6010', 16));
	
	// Rebuild the object with sorted keys - use a different approach
	const sortedSection = {};
	
	// Delete all properties first to ensure clean slate
	Object.keys(pdoSection).forEach(key => {
		delete sortedSection[key];
	});
	
	// Add properties in sorted order - each one by one to force insertion order
	sortedKeys.forEach(key => {
		sortedSection[key] = pdoSection[key];
	});
	
	// Verify the result
	const resultKeys = Object.keys(sortedSection);
	console.log('  Result keys after rebuild:', resultKeys.join(', '));
	console.log('  Sort successful:', JSON.stringify(sortedKeys) === JSON.stringify(resultKeys));
	
	return sortedSection;
}

function prepareBackupObject(form, odSections, dc, tcmod, indexes) {
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
	
	// Use a completely different approach: build JSON using array order, not object property order
	let sortedOdSections;
	if (indexes) {
		// Filter indexes to only PDO ranges and sort them properly
		const txpdoIndexes = indexes.filter(index => {
			const hexVal = parseInt(index, 16);
			return hexVal >= 0x6000 && hexVal < 0x7000 && odSections.txpdo[index];
		}).sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
		
		const rxpdoIndexes = indexes.filter(index => {
			const hexVal = parseInt(index, 16);
			return hexVal >= 0x7000 && hexVal < 0x8000 && odSections.rxpdo[index];
		}).sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
		
		// Store the correct order in the backup object for custom JSON serialization
		sortedOdSections = {
			sdo: odSections.sdo,
			txpdo: odSections.txpdo,  // Keep original object
			rxpdo: odSections.rxpdo,  // Keep original object
			_txpdoOrder: txpdoIndexes, // Store correct order separately
			_rxpdoOrder: rxpdoIndexes  // Store correct order separately
		};
		
	} else {
		// Fallback to manual sorting if indexes not provided
		sortedOdSections = {
			sdo: odSections.sdo,
			txpdo: sortPdoSectionByHex(odSections.txpdo),
			rxpdo: sortPdoSectionByHex(odSections.rxpdo)
		};
	}
	
	const backupObject = {
		form: formValues,
		od: sortedOdSections,
		dc: dc,
		tcmod: tcmod
	};
	
	return backupObject;
}

function loadBackup(backupObject, form, odSections, dc, tcmod) {
	// restore OD sections WITH PROPER SORTING to fix old backups
	if (backupObject.od) {
		console.log('=== LOADING BACKUP WITH SORTING ===');
		console.log('Backup txpdo keys before sorting:', Object.keys(backupObject.od.txpdo || {}).join(', '));
		console.log('Backup rxpdo keys before sorting:', Object.keys(backupObject.od.rxpdo || {}).join(', '));
		
		// Create a temporary OD to get proper sorted indexes
		const tempOd = {};
		
		// Add all objects from backup to temporary OD
		Object.assign(tempOd, backupObject.od.sdo || {});
		Object.assign(tempOd, backupObject.od.txpdo || {});
		Object.assign(tempOd, backupObject.od.rxpdo || {});
		
		// Get properly sorted indexes
		const sortedIndexes = getUsedIndexes(tempOd);
		console.log('Generated sorted indexes for load:', sortedIndexes.join(', '));
		
		// Filter indexes to only PDO ranges and sort them properly
		const txpdoIndexes = sortedIndexes.filter(index => {
			const hexVal = parseInt(index, 16);
			return hexVal >= 0x6000 && hexVal < 0x7000 && backupObject.od.txpdo && backupObject.od.txpdo[index];
		}).sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
		
		const rxpdoIndexes = sortedIndexes.filter(index => {
			const hexVal = parseInt(index, 16);
			return hexVal >= 0x7000 && hexVal < 0x8000 && backupObject.od.rxpdo && backupObject.od.rxpdo[index];
		}).sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
		
		console.log('Filtered txpdo indexes for load:', txpdoIndexes.join(', '));
		console.log('Filtered rxpdo indexes for load:', rxpdoIndexes.join(', '));
		
		// Rebuild odSections with proper ordering
		odSections.sdo = backupObject.od.sdo || {};
		
		// Sort txpdo using filtered indexes
		const sortedTxpdo = {};
		txpdoIndexes.forEach(index => {
			sortedTxpdo[index] = backupObject.od.txpdo[index];
		});
		odSections.txpdo = sortedTxpdo;
		
		// Sort rxpdo using filtered indexes
		const sortedRxpdo = {};
		rxpdoIndexes.forEach(index => {
			sortedRxpdo[index] = backupObject.od.rxpdo[index];
		});
		odSections.rxpdo = sortedRxpdo;
		
		console.log('Loaded txpdo keys after sorting:', Object.keys(odSections.txpdo).join(', '));
		console.log('Loaded rxpdo keys after sorting:', Object.keys(odSections.rxpdo).join(', '));
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

// Custom JSON serialization that respects PDO ordering
function stringifyBackupWithCorrectOrder(backupObject) {
	// Check if we have order arrays
	if (backupObject.od._txpdoOrder || backupObject.od._rxpdoOrder) {
		// Build JSON manually to guarantee property order
		let jsonStr = '{\n';
		
		// Add form section
		jsonStr += '  "form": ' + JSON.stringify(backupObject.form, null, 2).replace(/\n/g, '\n  ') + ',\n';
		
		// Add od section manually
		jsonStr += '  "od": {\n';
		jsonStr += '    "sdo": ' + JSON.stringify(backupObject.od.sdo, null, 2).replace(/\n/g, '\n    ') + ',\n';
		
		// Build txpdo section in exact order
		jsonStr += '    "txpdo": {\n';
		const txpdoEntries = [];
		if (backupObject.od._txpdoOrder) {
			backupObject.od._txpdoOrder.forEach((index, arrayIndex) => {
				if (backupObject.od.txpdo[index]) {
					const entryJson = JSON.stringify(backupObject.od.txpdo[index], null, 2).replace(/\n/g, '\n      ');
					txpdoEntries.push(`      "${index}": ${entryJson}`);
				}
			});
		}
		jsonStr += txpdoEntries.join(',\n') + '\n';
		jsonStr += '    },\n';
		
		// Build rxpdo section in exact order
		jsonStr += '    "rxpdo": {\n';
		const rxpdoEntries = [];
		if (backupObject.od._rxpdoOrder) {
			backupObject.od._rxpdoOrder.forEach((index, arrayIndex) => {
				if (backupObject.od.rxpdo[index]) {
					const entryJson = JSON.stringify(backupObject.od.rxpdo[index], null, 2).replace(/\n/g, '\n      ');
					rxpdoEntries.push(`      "${index}": ${entryJson}`);
				}
			});
		}
		jsonStr += rxpdoEntries.join(',\n') + '\n';
		jsonStr += '    }\n';
		
		jsonStr += '  },\n';
		
		// Add dc and tcmod sections
		jsonStr += '  "dc": ' + JSON.stringify(backupObject.dc, null, 2).replace(/\n/g, '\n  ') + ',\n';
		jsonStr += '  "tcmod": ' + JSON.stringify(backupObject.tcmod, null, 2).replace(/\n/g, '\n  ') + '\n';
		jsonStr += '}';
		
		return jsonStr;
	} else {
		return JSON.stringify(backupObject, null, 2);
	}
}

function prepareBackupFileContent(form, odSections, dc, tcmod, indexes) {
	const backupObject = prepareBackupObject(form, odSections, dc, tcmod, indexes);
	const backupFileContent = stringifyBackupWithCorrectOrder(backupObject);
	return backupFileContent;
}

// ####################### Backup using JSON file from filesystem ####################### //

// Localstorage limit is usually 5MB, super large object dictionaries on older browsers might be problematic

function downloadBackupFile(backupJson) {
	downloadFile(backupJson, 'esi.json', 'text/json');
}

function restoreBackup(backupFileContent, form, odSections, _dc, _tcmod) {
	let backupObject;
	try {
		backupObject = JSON.parse(backupFileContent);
	} catch (error) {
		console.error("JSON parsing failed:", error);
		alert("Backup data is corrupted. Clearing local backup.");
		resetLocalBackup();
		return;
	}
	
	// restore form values
	if (backupObject.form) {
		setFormValues(form, backupObject);
	}
	
	// restore OD sections WITH PROPER SORTING to fix old backups
	if (backupObject.od) {
		console.log('=== RESTORING BACKUP WITH SORTING ===');
		console.log('Backup txpdo keys before sorting:', Object.keys(backupObject.od.txpdo).join(', '));
		console.log('Backup rxpdo keys before sorting:', Object.keys(backupObject.od.rxpdo).join(', '));
		
		// Create a temporary OD to get proper sorted indexes
		const tempOd = {};
		
		// Add all objects from backup to temporary OD
		Object.assign(tempOd, backupObject.od.sdo || {});
		Object.assign(tempOd, backupObject.od.txpdo || {});
		Object.assign(tempOd, backupObject.od.rxpdo || {});
		
		// Get properly sorted indexes
		const sortedIndexes = getUsedIndexes(tempOd);
		console.log('Generated sorted indexes for restore:', sortedIndexes.join(', '));
		
		// Filter indexes to only PDO ranges and sort them properly
		const txpdoIndexes = sortedIndexes.filter(index => {
			const hexVal = parseInt(index, 16);
			return hexVal >= 0x6000 && hexVal < 0x7000 && backupObject.od.txpdo && backupObject.od.txpdo[index];
		}).sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
		
		const rxpdoIndexes = sortedIndexes.filter(index => {
			const hexVal = parseInt(index, 16);
			return hexVal >= 0x7000 && hexVal < 0x8000 && backupObject.od.rxpdo && backupObject.od.rxpdo[index];
		}).sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
		
		console.log('Filtered txpdo indexes for restore:', txpdoIndexes.join(', '));
		console.log('Filtered rxpdo indexes for restore:', rxpdoIndexes.join(', '));
		
		// Rebuild odSections with proper ordering
		odSections.sdo = backupObject.od.sdo || {};
		
		// Sort txpdo using filtered indexes
		const sortedTxpdo = {};
		txpdoIndexes.forEach(index => {
			sortedTxpdo[index] = backupObject.od.txpdo[index];
		});
		odSections.txpdo = sortedTxpdo;
		
		// Sort rxpdo using filtered indexes
		const sortedRxpdo = {};
		rxpdoIndexes.forEach(index => {
			sortedRxpdo[index] = backupObject.od.rxpdo[index];
		});
		odSections.rxpdo = sortedRxpdo;
		
		console.log('Restored txpdo keys after sorting:', Object.keys(odSections.txpdo).join(', '));
		console.log('Restored rxpdo keys after sorting:', Object.keys(odSections.rxpdo).join(', '));
	}
	
	// restore synchronization modes
	_dc.length = 0; // Clear existing array
	
	// Check both _dc and dc for backward compatibility
	const dcData = backupObject._dc || backupObject.dc;
	if (dcData && Array.isArray(dcData)) {
		dcData.forEach((dcItem) => {
			_dc.push(dcItem);
		});
	}
	
	// restore TwinCAT modules  
	_tcmod.length = 0; // Clear existing array
	const tcmodData = backupObject._tcmod || backupObject.tcmod;
	if (tcmodData && Array.isArray(tcmodData)) {
		tcmodData.forEach(tcItem => {
			_tcmod.push(tcItem);
		});
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