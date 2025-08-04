/**
 * EtherCAT Master Integration Header Generator
 * Generates *.h file for EtherCAT master integration (IgH EtherCAT Master)
 * Based on object dictionary and PDO mappings
 * 
 * Victor Sluiter 2013-2018
 * Kuba Buda 2020-2024
 */
'use strict';

function ethercat_master_header_generator(form, od, indexes) {
    const deviceName = form.TextDeviceName.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const deviceNameLower = deviceName.toLowerCase();
    
    // Extract PDO variables
    const rxpdoVars = []; // Output variables (master -> slave)
    const txpdoVars = []; // Input variables (slave -> master)
    
    indexes.forEach(index => {
        const objd = od[index];
        if (objd.pdo_mappings) {
            if (objd.pdo_mappings.includes('rxpdo')) {
                rxpdoVars.push({
                    index: index,
                    name: objd.name,
                    dtype: objd.dtype,
                    objd: objd
                });
            }
            if (objd.pdo_mappings.includes('txpdo')) {
                txpdoVars.push({
                    index: index,
                    name: objd.name,
                    dtype: objd.dtype,
                    objd: objd
                });
            }
        }
    });

    let header = generateHeaderComment(deviceName);
    header += generateDeviceIdentification(form, deviceName);
    header += generatePdoOffsetsStructure(deviceName, rxpdoVars, txpdoVars);
    header += generatePdoEntryRegistrationMacro(deviceName, rxpdoVars, txpdoVars);
    header += generatePdoConfigurationArrays(deviceName, rxpdoVars, txpdoVars);
    header += generateSyncManagerConfiguration(deviceName, rxpdoVars, txpdoVars);
    header += generateProcessDataMacros(deviceName, rxpdoVars, txpdoVars);
    header += generateDeviceConfigurationFunction(deviceName);
    header += generateHeaderFooter(deviceName);

    return header;

    function generateHeaderComment(deviceName) {
        return `#ifndef ${deviceName}_H
#define ${deviceName}_H

#include "ecrt.h"

/***************************************************************************** 
 * ${deviceName} Device Type Definition
 * Generic header for ${deviceName} EtherCAT slave devices
 * This header can be reused for multiple instances of the same device type
 *****************************************************************************/

`;
    }

    function generateDeviceIdentification(form, deviceName) {
        const vendorId = `0x${parseInt(form.VendorID.value).toString(16).padStart(8, '0')}`;
        const productCode = `0x${parseInt(form.ProductCode.value).toString(16).padStart(8, '0')}`;
        const revision = `0x${parseInt(form.RevisionNumber.value).toString(16).padStart(8, '0')}`;

        return `/* Device Identification */
#define ${deviceName}_VENDOR_ID    ${vendorId}
#define ${deviceName}_PRODUCT_CODE ${productCode}
#define ${deviceName}_REVISION     ${revision}

/* Device Type ID Macro for easy use */
#define ${deviceName}_ID ${deviceName}_VENDOR_ID, ${deviceName}_PRODUCT_CODE

`;
    }

    function generatePdoOffsetsStructure(deviceName, rxpdoVars, txpdoVars) {
        const deviceNameLower = deviceName.toLowerCase();
        let structure = `/* PDO Entry Offsets Structure */
typedef struct {
`;

        // Add output variables (RxPDO - master writes to slave)
        rxpdoVars.forEach(variable => {
            const varName = sanitizeVariableName(variable.name);
            const comment = `/* 0x${variable.index}:0 */`;
            structure += `    unsigned int ${varName};      ${comment}\n`;
        });

        // Add input variables (TxPDO - slave writes to master)
        txpdoVars.forEach(variable => {
            const varName = sanitizeVariableName(variable.name);
            const comment = `/* 0x${variable.index}:0 */`;
            structure += `    unsigned int ${varName};       ${comment}\n`;
        });

        structure += `} ${deviceNameLower}_offsets_t;

`;
        return structure;
    }

    function generatePdoEntryRegistrationMacro(deviceName, rxpdoVars, txpdoVars) {
        const deviceNameLower = deviceName.toLowerCase();
        let macro = `/* PDO Entry Registration Macro for multiple device instances */
#define ${deviceName}_PDO_ENTRIES(alias, pos, offsets) \\\n`;

        const entries = [];
        
        // Add output entries (RxPDO)
        rxpdoVars.forEach(variable => {
            const varName = sanitizeVariableName(variable.name);
            entries.push(`    {alias, pos, ${deviceName}_ID, 0x${variable.index}, 0, &offsets.${varName}, NULL}`);
        });

        // Add input entries (TxPDO)
        txpdoVars.forEach(variable => {
            const varName = sanitizeVariableName(variable.name);
            entries.push(`    {alias, pos, ${deviceName}_ID, 0x${variable.index}, 0, &offsets.${varName}, NULL}`);
        });

        macro += entries.join(', \\\n') + '\n\n';
        return macro;
    }

    function generatePdoConfigurationArrays(deviceName, rxpdoVars, txpdoVars) {
        const deviceNameLower = deviceName.toLowerCase();
        let arrays = `/* PDO Configuration Arrays */

`;

        // Generate Output PDO Entries (RxPDO)
        if (rxpdoVars.length > 0) {
            arrays += `/* Output PDO Entries */
static const ec_pdo_entry_info_t ${deviceNameLower}_out_pdo_entries[] = {
`;
            rxpdoVars.forEach(variable => {
                const varName = variable.name.replace(/[^a-zA-Z0-9_]/g, '_');
                const bitSize = getDataTypeBitSize(variable.dtype);
                arrays += `    {0x${variable.index}, 0x00, ${bitSize}}, /* ${varName} */\n`;
            });
            arrays += `};

`;
        }

        // Generate Input PDO Entries (TxPDO)  
        if (txpdoVars.length > 0) {
            arrays += `/* Input PDO Entries */
static const ec_pdo_entry_info_t ${deviceNameLower}_in_pdo_entries[] = {
`;
            txpdoVars.forEach(variable => {
                const varName = variable.name.replace(/[^a-zA-Z0-9_]/g, '_');
                const bitSize = getDataTypeBitSize(variable.dtype);
                arrays += `    {0x${variable.index}, 0x00, ${bitSize}}, /* ${varName} */\n`;
            });
            arrays += `};

`;
        }

        // Generate Output PDO Configuration (RxPDO)
        if (rxpdoVars.length > 0) {
            arrays += `/* Output PDO Configuration */
static const ec_pdo_info_t ${deviceNameLower}_out_pdos[] = {
`;
            rxpdoVars.forEach((variable, idx) => {
                const varName = variable.name.replace(/[^a-zA-Z0-9_]/g, '_');
                const pdoIndex = (0x1600 + idx).toString(16);
                arrays += `    {0x${pdoIndex}, 1, ${deviceNameLower}_out_pdo_entries + ${idx}}, /* ${varName} */\n`;
            });
            arrays += `};

`;
        }

        // Generate Input PDO Configuration (TxPDO)
        if (txpdoVars.length > 0) {
            arrays += `/* Input PDO Configuration */
static const ec_pdo_info_t ${deviceNameLower}_in_pdos[] = {
`;
            txpdoVars.forEach((variable, idx) => {
                const varName = variable.name.replace(/[^a-zA-Z0-9_]/g, '_');
                const pdoIndex = (0x1a00 + idx).toString(16);
                arrays += `    {0x${pdoIndex}, 1, ${deviceNameLower}_in_pdo_entries + ${idx}}, /* ${varName} */\n`;
            });
            arrays += `};

`;
        }

        return arrays;
    }

    function generateSyncManagerConfiguration(deviceName, rxpdoVars, txpdoVars) {
        const deviceNameLower = deviceName.toLowerCase();
        
        return `/* Sync Manager Configuration */
static const ec_sync_info_t ${deviceNameLower}_syncs[] = {
    {0, EC_DIR_OUTPUT, 0, NULL, EC_WD_DISABLE},
    {1, EC_DIR_INPUT, 0, NULL, EC_WD_DISABLE},
    {2, EC_DIR_OUTPUT, ${rxpdoVars.length}, ${rxpdoVars.length > 0 ? `${deviceNameLower}_out_pdos` : 'NULL'}, EC_WD_DISABLE},
    {3, EC_DIR_INPUT, ${txpdoVars.length}, ${txpdoVars.length > 0 ? `${deviceNameLower}_in_pdos` : 'NULL'}, EC_WD_DISABLE},
    {0xff, EC_DIR_OUTPUT, 0, NULL, EC_WD_DISABLE} /* Terminator */
};

`;
    }

    function generateProcessDataMacros(deviceName, rxpdoVars, txpdoVars) {
        let macros = `/* Convenience Macros for Process Data Access */

`;

        // Generate output (write) macros for RxPDO
        if (rxpdoVars.length > 0) {
            macros += `/* Output (Write) Macros */\n`;
            rxpdoVars.forEach(variable => {
                const varName = sanitizeVariableName(variable.name);
                const macroName = varName.toUpperCase();
                const writeFunction = getEcWriteFunction(variable.dtype);
                macros += `#define ${deviceName}_WRITE_${macroName}(pd, offset, value) \\\n`;
                macros += `    ${writeFunction}(pd + offset, value)\n`;
            });
            macros += '\n';
        }

        // Generate input (read) macros for TxPDO
        if (txpdoVars.length > 0) {
            macros += `/* Input (Read) Macros */\n`;
            txpdoVars.forEach(variable => {
                const varName = sanitizeVariableName(variable.name);
                const macroName = varName.toUpperCase();
                const readFunction = getEcReadFunction(variable.dtype);
                macros += `#define ${deviceName}_READ_${macroName}(pd, offset) \\\n`;
                macros += `    ${readFunction}(pd + offset)\n`;
            });
            macros += '\n';
        }

        return macros;
    }

    function generateDeviceConfigurationFunction(deviceName) {
        const deviceNameLower = deviceName.toLowerCase();
        
        return `/* Device Configuration Function */
static inline ec_slave_config_t* ${deviceNameLower}_configure_slave(
    ec_master_t* master, 
    uint16_t alias, 
    uint16_t position) 
{
    ec_slave_config_t* slave_config;
    
    slave_config = ecrt_master_slave_config(master, alias, position, ${deviceName}_ID);
    if (!slave_config) {
        return NULL;
    }
    
    if (ecrt_slave_config_pdos(slave_config, EC_END, ${deviceNameLower}_syncs)) {
        return NULL;
    }
    
    return slave_config;
}

`;
    }

    function generateHeaderFooter(deviceName) {
        return `#endif /* ${deviceName}_H */\n`;
    }

    function sanitizeVariableName(name) {
        return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }

    function getDataTypeBitSize(dtype) {
        const sizes = {
            'BOOLEAN': 1,
            'UNSIGNED8': 8,
            'INTEGER8': 8,
            'UNSIGNED16': 16,
            'INTEGER16': 16,
            'UNSIGNED32': 32,
            'INTEGER32': 32,
            'REAL32': 32,
            'UNSIGNED64': 64,
            'INTEGER64': 64,
            'REAL64': 64
        };
        return sizes[dtype] || 32;
    }

    function getEcWriteFunction(dtype) {
        const functions = {
            'BOOLEAN': 'EC_WRITE_U8',
            'UNSIGNED8': 'EC_WRITE_U8',
            'INTEGER8': 'EC_WRITE_S8',
            'UNSIGNED16': 'EC_WRITE_U16',
            'INTEGER16': 'EC_WRITE_S16',
            'UNSIGNED32': 'EC_WRITE_U32',
            'INTEGER32': 'EC_WRITE_S32',
            'REAL32': 'EC_WRITE_REAL',
            'UNSIGNED64': 'EC_WRITE_U64',
            'INTEGER64': 'EC_WRITE_S64',
            'REAL64': 'EC_WRITE_LREAL'
        };
        return functions[dtype] || 'EC_WRITE_U32';
    }

    function getEcReadFunction(dtype) {
        const functions = {
            'BOOLEAN': 'EC_READ_U8',
            'UNSIGNED8': 'EC_READ_U8',
            'INTEGER8': 'EC_READ_S8',
            'UNSIGNED16': 'EC_READ_U16',
            'INTEGER16': 'EC_READ_S16',
            'UNSIGNED32': 'EC_READ_U32',
            'INTEGER32': 'EC_READ_S32',
            'REAL32': 'EC_READ_REAL',
            'UNSIGNED64': 'EC_READ_U64',
            'INTEGER64': 'EC_READ_S64',
            'REAL64': 'EC_READ_LREAL'
        };
        return functions[dtype] || 'EC_READ_U32';
    }
}