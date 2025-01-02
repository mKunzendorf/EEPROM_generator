/**
 * Structure Handle Generator
 * Generates structure_handle_cpp.h based on the object dictionary
 */

'use strict';

// ####################### structure_handle_cpp.h generation ####################### //

function structure_handle_generator(form, od, indexes) {
    let header = `// structure_handle_cpp.h
#ifndef STRUCTURE_HANDLE_CPP_H
#define STRUCTURE_HANDLE_CPP_H

#include <cstdint>
#include <cstddef>  

`;

    // Calculate input structure size
    let inputSize = 0;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes(txpdo)) {
            inputSize += getTypeSize(objd.dtype);
        }
    });
    // Round up to nearest 4 bytes
    const inputSizeAligned = Math.ceil(inputSize / 4) * 4;

    // Calculate output structure size
    let outputSize = 0;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes(rxpdo)) {
            outputSize += getTypeSize(objd.dtype);
        }
    });
    // Round up to nearest 4 bytes
    const outputSizeAligned = Math.ceil(outputSize / 4) * 4;

    // Add size constants before structures
    header += `constexpr size_t input_structure_bytes = ${inputSizeAligned};\n`;
    header += `constexpr size_t output_structure_bytes = ${outputSizeAligned};\n`;
    header += `constexpr bool use_crc = ${form.DetailsEnableCRC.checked};\n\n`;

    // Define input_structure
    let inputStruct = `struct input_structure {\n`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes(txpdo)) {
            const varName = variableName(objd.name);
            const ctype = getCType(objd.dtype);
            inputStruct += `    ${ctype} ${varName};\n`;
        }
    });
    inputStruct += `};\n\n`;

    // Define output_structure
    let outputStruct = `struct output_structure {\n`;
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings && objd.pdo_mappings.includes(rxpdo)) {
            const varName = variableName(objd.name);
            const ctype = getCType(objd.dtype);
            outputStruct += `    ${ctype} ${varName};\n`;
        }
    });
    outputStruct += `};\n\n`;

    // Close the header file
    header += inputStruct + outputStruct;
    //header += `#pragma pack(pop)      // Restore default alignment
    header += `void copyOutputDataToStructure(uint8_t* outputData, output_structure& output_structure_data);
void copyStructureToInputData(const input_structure& input_structure_data, uint8_t* inputData);


#endif  // STRUCTURE_HANDLE_CPP_H
`;

    return header;

    // Helper function to get the C++ type from data type
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
            case DTYPE.BOOLEAN: return 'bool';
            default: return 'uint32_t'; // Default type
        }
    }

    // Helper function to get size of data type in bytes
    function getTypeSize(dtype) {
        switch (dtype) {
            case DTYPE.UNSIGNED8:
            case DTYPE.INTEGER8:
            case DTYPE.BOOLEAN:
                return 1;
            case DTYPE.UNSIGNED16:
            case DTYPE.INTEGER16:
                return 2;
            case DTYPE.UNSIGNED32:
            case DTYPE.INTEGER32:
            case DTYPE.REAL32:
                return 4;
            case DTYPE.UNSIGNED64:
            case DTYPE.INTEGER64:
            case DTYPE.REAL64:
                return 8;
            default:
                return 4; // Default size
        }
    }
} 