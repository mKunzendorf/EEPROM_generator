/**
 * TwinCAT CRC Generator
 * Generates .TcPOU files for CRC calculation
 */

'use strict';

const DATA_TYPE_UNIONS = {
    'UNSIGNED32': 'udint_union',
    'UNSIGNED16': 'uint_union',
    'UNSIGNED64': 'ulint_union',
    'INTEGER32': 'dint_union',
    'INTEGER16': 'int_union',
    'INTEGER64': 'lint_union',
    'REAL32': 'real_union',
    'REAL64': 'lreal_union'
};

const DATA_TYPE_SIZES = {
    'UNSIGNED8': 1,
    'UNSIGNED16': 2,
    'UNSIGNED32': 4,
    'UNSIGNED64': 8,
    'INTEGER8': 1,
    'INTEGER16': 2,
    'INTEGER32': 4,
    'INTEGER64': 8,
    'REAL32': 4,
    'REAL64': 8
};

function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateInputCrcCalculator(moduleName, variables) {
    // Remove debug logging
    
    const totalBytes = variables.length * 4;
    
    let code = `<?xml version="1.0" encoding="utf-8"?>
<TcPlcObject Version="1.1.0.1" ProductVersion="3.1.4024.12">
  <POU Name="${moduleName}_crc_input_calc" Id="{${generateGuid()}}" SpecialFunc="None">
    <Declaration><![CDATA[FUNCTION_BLOCK ${moduleName}_crc_input_calc
VAR_INPUT
END_VAR
VAR_OUTPUT
	CRCResult : UDINT;                  // Final CRC-32
	crcValid  : BOOL;
END_VAR
VAR
	i   : UDINT; 
    bitNumber : INT;
    crc : UDINT := 16#FFFFFFFF;         // Initial value
	DataArray : ARRAY [0..${totalBytes-1}] OF BYTE;  // Adjust size as needed
    Length    : UDINT := ${totalBytes};                  // Number of bytes to process
	
${variables.map(v => `	${v.name}_union 	: ${DATA_TYPE_UNIONS[v.dtype]};`).join('\n')}
END_VAR
]]></Declaration>
    <Implementation>
      <ST><![CDATA[`;

    // Generate assignments
    let byteOffset = 0;
    variables.forEach(variable => {
        const typeSize = DATA_TYPE_SIZES[variable.dtype] || 4; // Default to 4 if type not found
        code += `${variable.name}_union.value := ${moduleName}.${variable.name};\n`;
        
        // Generate byte assignments based on data type size
        for (let i = 0; i < typeSize; i++) {
            code += `DataArray[${byteOffset + i}] := ${variable.name}_union.byteArray[${i}];\n`;
        }
        code += '\n';
        
        byteOffset += typeSize;
    });

    code += `crc := 16#FFFFFFFF;

FOR i := 0 TO Length - 1 DO
	// XOR current byte
	crc := crc XOR DataArray[i];

	// Process each bit
	FOR  bitNumber := 0 TO 7 DO
		IF (crc AND 16#00000001) = 1 THEN
			// Use SHR instead of >> 
			crc := SHR(crc, 1) XOR 16#EDB88320;
		ELSE
			crc := SHR(crc, 1);
		END_IF
	END_FOR
END_FOR

// Final XOR
CRCResult := NOT crc;
IF (CRCResult = ${moduleName}.crc_input) THEN 
	crcValid := TRUE;
ELSE
	crcValid := FALSE; 
END_IF]]></ST>
    </Implementation>
  </POU>
</TcPlcObject>`;

    return code;
}

function generateOutputCrcCalculator(moduleName, variables) {
    const totalBytes = variables.length * 4;
    
    let code = `<?xml version="1.0" encoding="utf-8"?>
<TcPlcObject Version="1.1.0.1" ProductVersion="3.1.4024.12">
  <POU Name="${moduleName}_crc_output_calc" Id="{${generateGuid()}}" SpecialFunc="None">
    <Declaration><![CDATA[FUNCTION_BLOCK ${moduleName}_crc_output_calc
VAR_INPUT
END_VAR
VAR_OUTPUT
	CRCResult : UDINT;
END_VAR
VAR
	i   : UDINT; 
    bitNumber : INT;
    crc : UDINT := 16#FFFFFFFF;        
	DataArray : ARRAY [0..${totalBytes-1}] OF BYTE;  
    Length    : UDINT := ${totalBytes};                 

${variables.map(v => `	${v.name}_union 	: ${DATA_TYPE_UNIONS[v.dtype]};`).join('\n')}
END_VAR
]]></Declaration>
    <Implementation>
      <ST><![CDATA[`;

    // Generate assignments
    let byteOffset = 0;
    variables.forEach(variable => {
        const typeSize = DATA_TYPE_SIZES[variable.dtype] || 4; // Default to 4 if type not found
        code += `${variable.name}_union.value := ${moduleName}.${variable.name};\n`;
        
        // Generate byte assignments based on data type size
        for (let i = 0; i < typeSize; i++) {
            code += `DataArray[${byteOffset + i}] := ${variable.name}_union.byteArray[${i}];\n`;
        }
        code += '\n';
        
        byteOffset += typeSize;
    });

    code += `crc := 16#FFFFFFFF;

FOR i := 0 TO Length - 1 DO
	// XOR current byte
	crc := crc XOR DataArray[i];

	// Process each bit
	FOR  bitNumber := 0 TO 7 DO
		IF (crc AND 16#00000001) = 1 THEN
			// Use SHR instead of >> 
			crc := SHR(crc, 1) XOR 16#EDB88320;
		ELSE
			crc := SHR(crc, 1);
		END_IF
	END_FOR
END_FOR

// Final XOR
CRCResult := NOT crc;
${moduleName}.crc_output := CRCResult;]]></ST>
    </Implementation>
  </POU>
</TcPlcObject>`;

    return code;
}

window.twincat_crc_generator = function(form, od, indexes, tcmod) {
    // Only generate if CRC is enabled
    if (!form?.DetailsEnableCRC?.checked) {
        return {};
    }

    // Safety checks
    if (!od || !tcmod) {
        return {};
    }

    const crcFiles = {};
    
    // Ensure tcmod is an array
    const modules = Array.isArray(tcmod) ? tcmod : [tcmod];
    
    modules.forEach(module => {
        if (!module || !module.name) {
            return;
        }

        const inputVars = Object.entries(od)
            .filter(([key, obj]) => {
                return obj && 
                       obj.pdo_mappings && 
                       obj.pdo_mappings.includes('txpdo') && 
                       obj.name;
            })
            .map(([_, obj]) => ({
                name: obj.name,
                dtype: obj.dtype || 'UNSIGNED32'
            }))
            .slice(1) // Skip the first variable (CRC input)
            .filter((v, i, arr) => arr.findIndex(t => t.name === v.name) === i); // Remove duplicates

        // Get output variables (skip first variable and remove duplicates)
        const outputVars = Object.entries(od)
            .filter(([key, obj]) => {
                return obj && 
                       obj.pdo_mappings && 
                       obj.pdo_mappings.includes('rxpdo') && 
                       obj.name;
            })
            .map(([_, obj]) => ({
                name: obj.name,
                dtype: obj.dtype || 'UNSIGNED32'
            }))
            .slice(1) // Skip the first variable (CRC output)
            .filter((v, i, arr) => arr.findIndex(t => t.name === v.name) === i); // Remove duplicates

        // Generate CRC calculators
        crcFiles[`${module.name}_crc_input_calc`] = generateInputCrcCalculator(module.name, inputVars);
        crcFiles[`${module.name}_crc_output_calc`] = generateOutputCrcCalculator(module.name, outputVars);
    });
    
    return crcFiles;
};
