/**
 * Structure Handle C Generator
 * Generates structure_handle_c.h based on the object dictionary
 */

'use strict';

function structure_handle_c_generator(form, od, indexes) {
    let header = `#ifndef STRUCTURE_HANDLE_C_H
#define STRUCTURE_HANDLE_C_H

#include <linux/mutex.h>
#include <linux/uaccess.h>
#include "ioctl_lan9252.h"

`;

    // Define input_structure
    let inputStruct = `struct input_structure {
`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('txpdo')) {
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
        if (objd.pdo_mappings && objd.pdo_mappings.includes('rxpdo')) {
            const varName = variableName(objd.name);
            const ctype = getCType(objd.dtype);
            outputStruct += `    ${ctype} ${varName};
`;
        }
    });
    outputStruct += `};

`;

    // Extern declarations and mutexes
    let externDeclarations = `
extern struct input_structure ethercat_input_structure;
extern struct output_structure ethercat_output_structure;
extern struct mutex ethercat_input_structure_mutex;
extern struct mutex ethercat_output_structure_mutex;

`;

    // Function to handle input data
    let inputDataHandleFunc = `void input_data_handle(struct input_structure *data, uint8_t *ethercat_input) {
    uint8_t offset = 3; // Adjust offset as needed
`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('txpdo')) {
            const varName = variableName(objd.name);
            inputDataHandleFunc += `    memcpy(ethercat_input + offset, &data->${varName}, sizeof(data->${varName}));
    offset += sizeof(data->${varName});
`;
        }
    });
    inputDataHandleFunc += `}

`;

    // Function to handle output data
    let outputDataHandleFunc = `void output_data_handle(struct output_structure *data, uint8_t *ethercat_output_data) {
    uint8_t offset = 0;
`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('rxpdo')) {
            const varName = variableName(objd.name);
            outputDataHandleFunc += `    memcpy(&data->${varName}, ethercat_output_data + offset, sizeof(data->${varName}));
    offset += sizeof(data->${varName});
`;
        }
    });
    outputDataHandleFunc += `}

`;

    // Function lan9252_ioctl
    let ioctlFunc = `static long int lan9252_ioctl(struct file *file, unsigned cmd, unsigned long arg){

    switch(cmd){
`;
    // Common cases
    ioctlFunc += `        case WR_VALUE:
            mutex_lock(&ethercat_input_structure_mutex);
            if(copy_from_user(&ethercat_input_structure, (struct input_structure *) arg, sizeof(ethercat_input_structure)))
                printk("ioctl - Error copying data from user!\\n");
            mutex_unlock(&ethercat_input_structure_mutex);
            break;

        case RD_VALUE:
            mutex_lock(&ethercat_output_structure_mutex);
            if(copy_to_user((struct output_structure *) arg, &ethercat_output_structure, sizeof(ethercat_output_structure)))
                printk("ioctl - Error copying data to user!\\n");
            mutex_unlock(&ethercat_output_structure_mutex);
            break;

`;

    // Generate write cases for input_structure variables
    indexes.forEach((index, idx) => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('txpdo')) {
            const varName = variableName(objd.name);
            const caseName = `WR_VALUE_${varName.toUpperCase()}`;
            ioctlFunc += `        case ${caseName}:
            mutex_lock(&ethercat_input_structure_mutex);
            if(copy_from_user(&ethercat_input_structure.${varName}, (${getCType(objd.dtype)} *) arg, sizeof(ethercat_input_structure.${varName})))
                printk("ioctl - Error copying data from user!\\n");
            mutex_unlock(&ethercat_input_structure_mutex);
            break;

`;
        }
    });

    // Generate read cases for output_structure variables
    indexes.forEach((index, idx) => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes('rxpdo')) {
            const varName = variableName(objd.name);
            const caseName = `RD_VALUE_${varName.toUpperCase()}`;
            ioctlFunc += `        case ${caseName}:
            mutex_lock(&ethercat_output_structure_mutex);
            if(copy_to_user((${getCType(objd.dtype)} *) arg, &ethercat_output_structure.${varName}, sizeof(ethercat_output_structure.${varName})))
                printk("ioctl - Error copying data to user!\\n");
            mutex_unlock(&ethercat_output_structure_mutex);
            break;

`;
        }
    });

    ioctlFunc += `        default:
            return -EINVAL;
    }
    return 0;
}

`;

    // Close header guard
    let footer = `#endif // STRUCTURE_HANDLE_C_H
`;

    // Combine all parts
    header += inputStruct + outputStruct + externDeclarations + inputDataHandleFunc + outputDataHandleFunc + ioctlFunc + footer;

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
            // Add more cases as needed
            default: return 'uint32_t'; // Default type
        }
    }

    function variableName(name) {
        // Remove invalid characters and replace spaces with underscores
        return name.replace(/\s+/g, '_').replace(/[^\w]/g, '');
    }

} 