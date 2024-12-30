// test_program_generator.js
// This generator creates a C test program based on the provided EtherCAT variables.

function test_program_generator(form, od, indexes) {
    // Convert od to an array if it's not already
    const odList = Array.isArray(od) ? od : Object.values(od);

    let code = '';

    // Add necessary includes
    code += '#define _GNU_SOURCE   // Enable GNU extensions\n';
    code += '#include <stdio.h>\n';
    code += '#include <stdlib.h>\n';
    code += '#include <unistd.h>\n';
    code += '#include <fcntl.h>\n';
    code += '#include <stdint.h>\n';
    code += '#include <sys/ioctl.h>\n';
    code += '#include <time.h>\n';
    code += '#include "ioctl_lan9252.h"\n';
    code += '#include <string.h>\n';
    code += '#include <pthread.h>\n';
    code += '#include <sched.h>\n';
    code += '#include <errno.h>\n\n';

    // Start of thread function
    code += 'void *thread_func(void *arg) {\n';
    code += '    int dev = *(int *)arg;\n\n';

    code += '    // Set thread name\n';
    code += '    int s = pthread_setname_np(pthread_self(), "my_thread_name");\n';
    code += '    if (s != 0) {\n';
    code += '        fprintf(stderr, "Error setting thread name: %s\\n", strerror(s));\n';
    code += '        // Decide whether to exit or continue\n';
    code += '    }\n\n';

    code += '    // Set CPU affinity to core 4\n';
    code += '    cpu_set_t cpuset;\n';
    code += '    CPU_ZERO(&cpuset);\n';
    code += '    CPU_SET(4, &cpuset); // Core 4\n\n';

    code += '    // Set thread scheduling policy and priority\n';
    code += '    struct sched_param param;\n';
    code += '    param.sched_priority = sched_get_priority_max(SCHED_FIFO);\n\n';

    code += '    s = pthread_setschedparam(pthread_self(), SCHED_FIFO, &param);\n';
    code += '    if (s != 0) {\n';
    code += '        fprintf(stderr, "Error setting thread scheduling: %s\\n", strerror(s));\n';
    code += '        // Decide whether to exit or continue\n';
    code += '    }\n\n';

    code += '    struct timespec req;\n';
    code += '    req.tv_sec = 0;\n';
    code += '    req.tv_nsec = 100000000; // 100 milliseconds\n\n';

    // Variable declarations
    code += '    // Variable declarations\n';
    
    // First declare all output variables
    odList.forEach((variable) => {
        if (variable.pdo_mappings) {
            const varName = variable.name.toLowerCase();
            if (varName.startsWith('testoutput_')) {
                const cType = getCTypeFromDtype(variable.dtype);
                code += `    ${cType} ${varName};\n`;
            }
        }
    });

    code += '\n';

    // Then declare all input variables
    odList.forEach((variable) => {
        if (variable.pdo_mappings) {
            const varName = variable.name.toLowerCase();
            if (varName.startsWith('testinput_')) {
                const cType = getCTypeFromDtype(variable.dtype);
                code += `    ${cType} ${varName};\n`;
            }
        }
    });

    code += '\n';

    // Start of infinite loop
    code += '    while (1) {\n';

    // First read from variables that are outputs (e.g., testoutput_N)
    odList.forEach((variable) => {
        if (variable.pdo_mappings) {
            const varName = variable.name.toLowerCase();
            const ioctlName = `RD_VALUE_${varName.toUpperCase()}`;
            if (varName.startsWith('testoutput_')) {
                code += `        ioctl(dev, ${ioctlName}, &${varName});\n`;
            }
        }
    });

    code += '\n';

    // Then write to variables that are inputs (e.g., testinput_N)
    odList.forEach((variable) => {
        if (variable.pdo_mappings) {
            const varName = variable.name.toLowerCase();
            const ioctlName = `WR_VALUE_${varName.toUpperCase()}`;
            if (varName.startsWith('testinput_')) {
                code += `        ioctl(dev, ${ioctlName}, &${varName});\n`;
            }
        }
    });

    code += '\n';
    code += '        nanosleep(&req, NULL);\n';
    code += '    }\n';
    code += '    return NULL;\n';
    code += '}\n\n';

    // Main function
    code += 'int main() {\n';
    code += '    int dev = open("/dev/lan9252", O_WRONLY);\n';
    code += '    if (dev == -1) {\n';
    code += '        printf("Opening was not possible!\\n");\n';
    code += '        return -1;\n';
    code += '    }\n\n';
    code += '    printf("Opening was successful!\\n");\n\n';
    code += '    // Create a thread\n';
    code += '    pthread_t thread;\n\n';
    code += '    // Create the thread\n';
    code += '    int s = pthread_create(&thread, NULL, thread_func, &dev);\n';
    code += '    if (s != 0) {\n';
    code += '        fprintf(stderr, "Error creating thread: %s\\n", strerror(s));\n';
    code += '        close(dev);\n';
    code += '        return -1;\n';
    code += '    }\n\n';
    code += '    // Wait for the thread to finish (infinite loop in this case)\n';
    code += '    pthread_join(thread, NULL);\n\n';
    code += '    close(dev);\n';
    code += '    return 0;\n';
    code += '}\n';

    return code;
}

// Helper function to map EtherCAT data types to C data types
function getCTypeFromDtype(dtype) {
    switch (dtype) {
        case 'UINT8':
        case 'UNSIGNED8':
            return 'uint8_t';
        case 'UINT16':
        case 'UNSIGNED16':
            return 'uint16_t';
        case 'UINT32':
        case 'UNSIGNED32':
            return 'uint32_t';
        case 'INT8':
        case 'INTEGER8':
            return 'int8_t';
        case 'INT16':
        case 'INTEGER16':
            return 'int16_t';
        case 'INT32':
        case 'INTEGER32':
            return 'int32_t';
        case 'BOOL':
            return 'bool';
        default:
            return 'uint32_t'; // Default type
    }
}

// Expose the function to the global scope so browser can access it
window.test_program_generator = test_program_generator;