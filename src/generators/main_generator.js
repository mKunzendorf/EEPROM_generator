/**
 * CPP Main Program Generator
 * Generates main.cpp based on the object dictionary
 */

'use strict';

function main_generator(form, od, indexes) {
    let code = `#include <Arduino.h>
#include "lan9252.h"
#include "structure_handle_cpp.h"

// Define the LED pin
const int LED_PIN = 25;  // Replace with your board's LED pin

// Create instances of the structures
input_structure inputData;
output_structure outputData;

// Create an instance of LAN9252
LAN9252 lan9252;

// Non-blocking LED blink function
void blinkLEDNonBlocking() {
    static unsigned long previousMillis = 0;
    const unsigned long interval = 250;  // Interval at which to blink (milliseconds)

    unsigned long currentMillis = millis();

    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;

        // Toggle the LED state
        digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
}

void setup() {
    // Initialize the LED pin
    pinMode(LED_PIN, OUTPUT);

    // Simplified initialization
    lan9252.begin(outputData, inputData);
}

void loop() {
    // Call the non-blocking LED blink function
    blinkLEDNonBlocking();

`;

    // Get lists of input and output variables
    let inputVars = [];
    let outputVars = [];

    indexes.forEach(index => {
        const objd = od[index];
        const varName = variableName(objd.name);
        if (objd.pdo_mappings && objd.pdo_mappings.includes('txpdo')) {
            inputVars.push(varName);
        }
        if (objd.pdo_mappings && objd.pdo_mappings.includes('rxpdo')) {
            outputVars.push(varName);
        }
    });

    // Generate code to read outputs
    code += '\n    // Read EtherCAT outputs\n';
    outputVars.forEach(varName => {
        code += `    lan9252.getOutputValue(outputData.${varName});\n`;
    });

    // Generate code to write inputs
    code += '\n    // Write to EtherCAT inputs\n';
    inputVars.forEach(varName => {
        // Check if there is a corresponding output variable with similar name
        let matchingOutput = outputVars.find(outVar => areNamesMatching(varName, outVar));
        if (matchingOutput) {
            // Loop back output to input
            code += `    inputData.${varName} = outputData.${matchingOutput};\n`;
        } else {
            // Set input value (you can customize this as needed)
            code += `    lan9252.setInputValue(inputData.${varName});\n`;
        }
    });

    code += '}\n';

    return code;

    // Helper functions
    function variableName(name) {
        // Convert to valid C++ variable name if necessary
        return name.replace(/\s+/g, '_');
    }

    function areNamesMatching(inputName, outputName) {
        // Check if names differ only by 'In'/'Out' or 'in'/'out'
        let pattern = /in$/i;
        let inputBase = inputName.replace(pattern, '');
        let outputBase = outputName.replace(/out$/i, '');
        return inputBase.toLowerCase() === outputBase.toLowerCase();
    }
} 