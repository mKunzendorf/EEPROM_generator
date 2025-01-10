/**
 * TwinCAT Module Generator
 * Generates .TcGVL files for each TwinCAT module in XML format
 */

'use strict';

function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function twincat_gvl_generator(form, od, indexes, tcmod) {
    // Will store all generated GVL files
    const gvlFiles = {};
    
    // Generate a GVL file for each module
    tcmod.forEach(module => {
        // First pass: collect all variables
        const inputs = new Map();  // Use Map to prevent duplicates
        const outputs = new Map();
        
        indexes.forEach(index => {
            const objd = od[index];
            if (objd && objd.pdo_mappings) {
                const varName = variableName(objd.name);
                const varType = getTwinCatDataType(objd.dtype.toUpperCase());
                
                if (objd.pdo_mappings.includes('txpdo')) {
                    inputs.set(varName, varType);
                }
                if (objd.pdo_mappings.includes('rxpdo')) {
                    outputs.set(varName, varType);
                }
            }
        });
        
        // Generate XML code
        let code = `<?xml version="1.0" encoding="utf-8"?>
<TcPlcObject Version="1.1.0.1" ProductVersion="3.1.4024.12">
  <GVL Name="${module.name}" Id="{${generateGuid()}}">
    <Declaration><![CDATA[{attribute 'qualified_only'}
VAR_GLOBAL
    // Input variables (Device to PLC)
`;
        
        // Add input variables with proper indentation (using tabs)
        inputs.forEach((type, name) => {
            code += `\t${name} AT%I*\t: ${type};\n`;
        });
        
        code += `
    // Output variables (PLC to Device)
`;
        
        // Add output variables with proper indentation (using tabs)
        outputs.forEach((type, name) => {
            code += `\t${name} AT%Q*\t: ${type};\n`;
        });
        
        code += `END_VAR]]></Declaration>
  </GVL>
</TcPlcObject>`;
        
        // Store the generated code with the module name
        gvlFiles[module.name] = code;
    });
    
    return gvlFiles;
}

function getTwinCatDataType(dataType) {
    // Map SOES data types to TwinCAT data types
    const typeMap = {
        'BOOLEAN': 'BOOL',
        'INTEGER8': 'SINT',
        'INTEGER16': 'INT',
        'INTEGER32': 'DINT',
        'INTEGER64': 'LINT',
        'UNSIGNED8': 'USINT',
        'UNSIGNED16': 'UINT',
        'UNSIGNED32': 'UDINT',
        'UNSIGNED64': 'ULINT',
        'REAL32': 'REAL',
        'REAL64': 'LREAL',
        'VISIBLE_STRING': 'STRING'
    };
    
    return typeMap[dataType] || 'BYTE';
}

function variableName(name) {
    // Convert to valid TwinCAT variable name
    return name.replace(/\s+/g, '_');
}
