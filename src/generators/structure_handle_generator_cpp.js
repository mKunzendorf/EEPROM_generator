function structure_handle_generator_cpp(form, od, indexes) {
    // Convert the object dictionary to an array if it's not already
    const odList = Array.isArray(od) ? od : Object.values(od);

    let code = '';
    code += '#include "ethercat_structure/cpp/structure_handle_cpp.h"\n';
    code += '#include <string.h> // for memcpy\n\n';

    // Function to copy output data to structure
    code += 'void copyOutputDataToStructure(uint8_t* outputData, output_structure& output_structure_data) {\n';

    let offset = 0;
    odList.forEach((variable) => {
        if (variable.pdo_mappings) {
            const varName = variable.name;
            const dataTypeSize = getSizeFromDtype(variable.dtype);
            if (varName.startsWith('TestOutput_')) {
                code += `    memcpy(&output_structure_data.${varName}, &outputData[${offset}], ${dataTypeSize});\n`;
                offset += dataTypeSize;
            }
        }
    });
    code += '}\n\n';

    // Function to copy structure to input data
    code += 'void copyStructureToInputData(const input_structure& input_structure_data, uint8_t* inputData) {\n';

    offset = 0;
    odList.forEach((variable) => {
        if (variable.pdo_mappings) {
            const varName = variable.name;
            const dataTypeSize = getSizeFromDtype(variable.dtype);
            if (varName.startsWith('TestInput_')) {
                code += `    memcpy(&inputData[${offset}], &input_structure_data.${varName}, ${dataTypeSize});\n`;
                offset += dataTypeSize;
            }
        }
    });
    code += '}\n';

    return code;
}

// Helper function to get size from data type
function getSizeFromDtype(dtype) {
    switch (dtype.toUpperCase()) {
        case 'BOOLEAN':
        case 'UINT8':
        case 'UNSIGNED8':
        case 'INT8':
        case 'INTEGER8':
        case 'VISIBLE_STRING':  // Each character is 1 byte
            return 1;
            
        case 'UINT16':
        case 'UNSIGNED16':
        case 'INT16':
        case 'INTEGER16':
            return 2;
            
        case 'UINT32':
        case 'UNSIGNED32':
        case 'INT32':
        case 'INTEGER32':
        case 'REAL32':
            return 4;
            
        case 'UINT64':
        case 'UNSIGNED64':
        case 'INT64':
        case 'INTEGER64':
        case 'REAL64':
            return 8;
            
        default:
            console.warn(`Warning: Unknown data type ${dtype}, defaulting to 4 bytes`);
            return 4;
    }
}

// Expose the function to the global scope
window.structure_handle_generator_cpp = structure_handle_generator_cpp; 