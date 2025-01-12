/**
 * IOCTL LAN9252 Generator
 * Generates ioctl_lan9252.h based on the object dictionary
 */

'use strict';

function ioctl_lan9252_generator(form, od, indexes) {
    // Calculate input structure size
    let inputSize = 0;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('txpdo')) {
            inputSize += getDataTypeSize(objd.dtype);
        }
    });
    // Round up to nearest 4 bytes
    const inputSizeAligned = Math.ceil(inputSize / 4) * 4;

    // Calculate output structure size
    let outputSize = 0;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('rxpdo')) {
            outputSize += getDataTypeSize(objd.dtype);
        }
    });
    // Round up to nearest 4 bytes
    const outputSizeAligned = Math.ceil(outputSize / 4) * 4;

    let header = `#ifndef IOCTL_LAN9252_H
#define IOCTL_LAN9252_H

// Structure sizes and CRC configuration
#define INPUT_STRUCTURE_BYTES ${inputSizeAligned}
#define OUTPUT_STRUCTURE_BYTES ${outputSizeAligned}
#define USE_CRC ${form.DetailsEnableCRC.checked ? 1 : 0}
#define INPUT_CRC_BOUNDARY ${inputSize + 3}
#define OUTPUT_CRC_BOUNDARY ${outputSize}

`;

    // Generate structures
    let inputStruct = `struct input_structure {\n`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('txpdo')) {
            if (!form.DetailsEnableCRC.checked || !objd.name.toLowerCase().includes('crc')) {
                inputStruct += `    ${getCType(objd.dtype)} ${objd.name};\n`;
            }
        }
    });
    inputStruct += `};\n\n`;

    let outputStruct = `struct output_structure {\n`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('rxpdo')) {
            if (!form.DetailsEnableCRC.checked || !objd.name.toLowerCase().includes('crc')) {
                outputStruct += `    ${getCType(objd.dtype)} ${objd.name};\n`;
            }
        }
    });
    outputStruct += `};\n\n`;

    // Generate IOCTL commands
    let ioctlCommands = `#define WR_VALUE _IOW('a', 'a', struct input_structure *)
#define RD_VALUE _IOR('a', 'b', struct output_structure *)\n\n`;

    let cmdCounter = 128;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings) {
            const varName = objd.name;
            if (form.DetailsEnableCRC.checked && 
                (varName.toUpperCase().includes('CRC') || 
                 varName.toLowerCase().includes('crc'))) {
                return;
            }
            
            if (objd.pdo_mappings.includes('txpdo')) {
                ioctlCommands += `#define WR_VALUE_${varName.toUpperCase()} _IOW('a', ${cmdCounter++}, ${getCType(objd.dtype)} *)\n`;
            } else if (objd.pdo_mappings.includes('rxpdo')) {
                ioctlCommands += `#define RD_VALUE_${varName.toUpperCase()} _IOR('a', ${cmdCounter++}, ${getCType(objd.dtype)} *)\n`;
            }
        }
    });

    header += inputStruct + outputStruct + ioctlCommands;
    header += `#endif // IOCTL_LAN9252_H\n`;

    return header;

    // Helper functions
    function getCType(dtype) {
        switch (dtype) {
            case 'UNSIGNED8': return 'uint8_t';
            case 'UNSIGNED16': return 'uint16_t';
            case 'UNSIGNED32': return 'uint32_t';
            case 'UNSIGNED64': return 'uint64_t';
            case 'INTEGER8': return 'int8_t';
            case 'INTEGER16': return 'int16_t';
            case 'INTEGER32': return 'int32_t';
            case 'INTEGER64': return 'int64_t';
            case 'REAL32': return 'float';
            case 'REAL64': return 'double';
            case 'BOOLEAN': return 'bool';
            default: return 'uint32_t'; // Default type
        }
    }

    function getDataTypeSize(dtype) {
        switch (dtype) {
            case 'BOOLEAN':
            case 'UNSIGNED8':
            case 'INTEGER8': return 1;
            case 'UNSIGNED16':
            case 'INTEGER16': return 2;
            case 'UNSIGNED32':
            case 'INTEGER32':
            case 'REAL32': return 4;
            case 'UNSIGNED64':
            case 'INTEGER64':
            case 'REAL64': return 8;
            default: return 4; // Default size
        }
    }
} 