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
        // First pass: collect all variables and find longest name
        const inputs = new Map();  // Use Map to prevent duplicates
        const outputs = new Map();
        let maxLength = 0;
        
        indexes.forEach(index => {
            const objd = od[index];
            if (objd && objd.pdo_mappings) {
                const varName = variableName(objd.name);
                maxLength = Math.max(maxLength, varName.length);
                const varType = getTwinCatDataType(objd.dtype.toUpperCase());
                
                if (objd.pdo_mappings.includes('txpdo')) {
                    inputs.set(varName, varType);  // Map will automatically handle duplicates
                }
                if (objd.pdo_mappings.includes('rxpdo')) {
                    outputs.set(varName, varType);
                }
            }
        });
        
        // Generate code with proper alignment
        let code = `{attribute 'qualified_only'}
VAR_GLOBAL
    // Input variables (Device to PLC)
`;
        
        // Add input variables with padding
        inputs.forEach((type, name) => {
            code += `    ${name} AT%I*\t: ${type};\n`;
        });
        
        code += `
    // Output variables (PLC to Device)
`;
        
        // Add output variables with padding
        outputs.forEach((type, name) => {
            code += `    ${name} AT%Q*\t: ${type};\n`;
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
