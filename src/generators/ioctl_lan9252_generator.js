/**
 * IOCTL LAN9252 Generator
 * Generates ioctl_lan9252.h based on the object dictionary
 */

'use strict';

function ioctl_lan9252_generator(form, od, indexes) {

    // Define PDO mapping identifiers
    const txpdo = 'txpdo';
    const rxpdo = 'rxpdo';

    let header = `#ifndef IOCTL_LAN9252_H
#define IOCTL_LAN9252_H

`;

    // Definitions for byte counts
    const totalOutputBytes = getTotalOutputBytes(od, indexes);
    const totalInputBytes = getTotalInputBytes(od, indexes);

    header += `#define CUST_BYTE_NUM_OUT ${totalOutputBytes}
#define CUST_BYTE_NUM_IN ${totalInputBytes}
#define TOT_BYTE_NUM_ROUND_OUT ${roundUpToMultiple(totalOutputBytes, 4)}
#define TOT_BYTE_NUM_ROUND_IN ${roundUpToMultiple(totalInputBytes, 4)}

`;

    // Define input_structure
    let inputStruct = `struct input_structure {
`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('txpdo')) {
            const varName = objd.name;
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
        if (objd.pdo_mappings && objd.pdo_mappings.includes('rxpdo')) {
            const varName = objd.name;
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
    let ioctlCode = 128; // Starting code
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings) {
            const varName = objd.name;
            if (objd.pdo_mappings.includes('txpdo')) {
                ioctlCommands += `#define WR_VALUE_${varName.toUpperCase()} _IOW('a', ${ioctlCode}, ${getCType(objd.dtype)} *)
`;
                ioctlCode++;
            } else if (objd.pdo_mappings.includes('rxpdo')) {
                ioctlCommands += `#define RD_VALUE_${varName.toUpperCase()} _IOR('a', ${ioctlCode}, ${getCType(objd.dtype)} *)
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
                totalBytes += getDataTypeSize(objd.dtype);
            }
        });
        return totalBytes;
    }

    function getTotalOutputBytes(od, indexes) {
        let totalBytes = 0;
        indexes.forEach(index => {
            const objd = od[index];
            if (objd.pdo_mappings && objd.pdo_mappings.includes(rxpdo)) {
                totalBytes += getDataTypeSize(objd.dtype);
            }
        });
        return totalBytes;
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

    function roundUpToMultiple(number, multiple) {
        return Math.ceil(number / multiple) * multiple;
    }
} 