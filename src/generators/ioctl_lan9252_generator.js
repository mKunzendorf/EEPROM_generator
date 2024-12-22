/**
 * IOCTL LAN9252 Generator
 * Generates ioctl_lan9252.h based on the object dictionary
 */

'use strict';

// ####################### ioctl_lan9252.h generation ####################### //

function ioctl_lan9252_generator(form, od, indexes) {
    let header = `#ifndef IOCTL_LAN9252_H
#define IOCTL_LAN9252_H

`;

    // Definitions for byte counts
    header += `#define CUST_BYTE_NUM_OUT ${getTotalOutputBytes(od, indexes)}
#define CUST_BYTE_NUM_IN ${getTotalInputBytes(od, indexes)}
#define TOT_BYTE_NUM_ROUND_OUT ${roundUpToMultiple(getTotalOutputBytes(od, indexes), 4)}
#define TOT_BYTE_NUM_ROUND_IN ${roundUpToMultiple(getTotalInputBytes(od, indexes), 4)}

`;

    // Define input_structure
    let inputStruct = `struct input_structure {
`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes(txpdo)) {
            const varName = variableName(objd.name);
            const ctype = getCType(objd.dtype);
            inputStruct += `    ${ctype} ${varName};
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
            const varName = variableName(objd.name);
            const ctype = getCType(objd.dtype);
            outputStruct += `    ${ctype} ${varName};
`;
        }
    });
    outputStruct += `};

`;

    // Define IOCTL commands
    let ioctlDefs = `#define WR_VALUE _IOW('a', 'a', struct input_structure *)
#define RD_VALUE _IOR('a', 'b', struct output_structure *)

`;

    // Generate individual IOCTL commands for each field
    let ioctlCommands = '';
    let ioctlCode = 128; // Starting code (adjust as needed)
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings) {
            const varName = variableName(objd.name);
            const upperVarName = varName.toUpperCase();
            const ctype = getCType(objd.dtype) + ' *';
            if (objd.pdo_mappings.includes(rxpdo)) {
                ioctlCommands += `#define WR_VALUE_${upperVarName} _IOW('a', ${ioctlCode}, ${ctype})
`;
                ioctlCode++;
            } else if (objd.pdo_mappings.includes(txpdo)) {
                ioctlCommands += `#define RD_VALUE_${upperVarName} _IOR('a', ${ioctlCode}, ${ctype})
`;
                ioctlCode++;
            }
        }
    });

    // Closing the header guard
    header += inputStruct + outputStruct + ioctlDefs + ioctlCommands;
    header += `#endif // IOCTL_LAN9252_H
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
        return name.replace(/\s+/g, '_').replace(/[^\w_]/g, '').toLowerCase();
    }

    function getTotalInputBytes(od, indexes) {
        let totalBytes = 0;
        indexes.forEach(index => {
            const objd = od[index];
            if (objd.pdo_mappings && objd.pdo_mappings.includes(txpdo)) {
                totalBytes += objd.size;
            }
        });
        return totalBytes;
    }

    function getTotalOutputBytes(od, indexes) {
        let totalBytes = 0;
        indexes.forEach(index => {
            const objd = od[index];
            if (objd.pdo_mappings && objd.pdo_mappings.includes(rxpdo)) {
                totalBytes += objd.size;
            }
        });
        return totalBytes;
    }

    function roundUpToMultiple(number, multiple) {
        return Math.ceil(number / multiple) * multiple;
    }
} 