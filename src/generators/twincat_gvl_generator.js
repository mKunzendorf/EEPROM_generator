/**
 * TwinCAT Module Generator
 * Generates .TcGVL files for each TwinCAT module
 */

'use strict';

function twincat_gvl_generator(form, od, indexes, tcmod) {
    // Will store all generated GVL files
    const gvlFiles = {};
    
    // Generate a GVL file for each module
    tcmod.forEach(module => {
        let code = `{attribute 'qualified_only'}
VAR_GLOBAL
    // Input variables (Device to PLC)
`;
        
        // Get lists of input and output variables
        indexes.forEach(index => {
            const objd = od[index];
            if (objd.pdo_mappings) {
                const varName = variableName(objd.name);
                const varType = getTwinCatDataType(objd.data_type);
                
                // Handle TxPDO (inputs to PLC)
                if (objd.pdo_mappings.includes('txpdo')) {
                    code += `    ${varName} : ${varType};\n`;
                }
            }
        });
        
        code += `
    // Output variables (PLC to Device)
`;
        
        // Add output variables
        indexes.forEach(index => {
            const objd = od[index];
            if (objd.pdo_mappings) {
                const varName = variableName(objd.name);
                const varType = getTwinCatDataType(objd.data_type);
                
                // Handle RxPDO (outputs from PLC)
                if (objd.pdo_mappings.includes('rxpdo')) {
                    code += `    ${varName} : ${varType};\n`;
                }
            }
        });
        
        code += `END_VAR`;
        
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
