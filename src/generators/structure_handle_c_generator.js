/**
 * Structure Handle C Generator
 * Generates structure_handle_c.h based on the object dictionary
 */

'use strict';

// ####################### structure_handle_c.h generation ####################### //

function structure_handle_c_generator(form, od, indexes) {
    let header = `// structure_handle.h
#include <stdint.h>
#ifndef STRUCTURE_HANDLE_C_H
#define STRUCTURE_HANDLE_C_H

#pragma pack(push, 1)  // Align structures to 1-byte boundaries

`;

    // Define a structure
    header += `// Define a structure
`;

    // Define input_structure
    let inputStruct = `struct input_structure {
`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes(txpdo)) {
            const varName = capitalizeFirstLetter(variableName(objd.name));
            const ctype = getCType(objd.dtype);
            inputStruct += `    ${ctype}\t${varName};
`;
        }
    });
    inputStruct += `};

`;

    // Define output_structure
    let outputStruct = `struct output_structure {
`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes(rxpdo)) {
            const varName = capitalizeFirstLetter(variableName(objd.name));
            const ctype = getCType(objd.dtype);
            outputStruct += `    ${ctype}\t${varName};
`;
        }
    });
    outputStruct += `};

`;

    // Closing the header with pragma pack and header guard
    header += inputStruct + outputStruct;

    header += `#pragma pack(pop)      // Restore default alignment

#endif  // STRUCTURE_HANDLE_C_H
`;

    return header;

    // Helper functions

    function getCType(dtype) {
        switch (dtype) {
            case DTYPE.UNSIGNED8: return 'uint8_t';
            case DTYPE.UNSIGNED16: return 'uint16_t';
            case DTYPE.UNSIGNED32: return 'uint32_t';
            case DTYPE.UNSIGNED64: return 'uint64_t';
            case DTYPE.INTEGER8: return 'int8_t';
            case DTYPE.INTEGER16: return 'int16_t';
            case DTYPE.INTEGER32: return 'int32_t';
            case DTYPE.INTEGER64: return 'int64_t';
            case DTYPE.REAL32: return 'float';
            case DTYPE.REAL64: return 'double';
            // Add more cases as needed
            default: return 'uint32_t'; // Default type
        }
    }

    function variableName(name) {
        // Remove invalid characters and replace spaces with underscores
        return name.replace(/\s+/g, '').replace(/[^\w]/g, '');
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
} 