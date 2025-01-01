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
const int SYNC0_PIN = 4; // GPIO4
const int SYNC1_PIN = 5; // GPIO5

volatile uint16_t sync0_counter = 0;
volatile uint16_t sync1_counter = 0;

// Create instances of the structures
input_structure tx_data;
output_structure rx_data;

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

void sync0_ISR() {
    sync0_counter++;
}

void sync1_ISR() {
    sync1_counter++;
}

void setup() {
    // Initialize the LED pin
    pinMode(LED_PIN, OUTPUT);
    pinMode(SYNC0_PIN, INPUT_PULLUP); // Use INPUT_PULLUP or adjust based on your circuit
    pinMode(SYNC1_PIN, INPUT_PULLUP);

    // Attach interrupts to SYNC0 and SYNC1 pins
    attachInterrupt(digitalPinToInterrupt(SYNC0_PIN), sync0_ISR, FALLING);
    attachInterrupt(digitalPinToInterrupt(SYNC1_PIN), sync1_ISR, FALLING);

    lan9252.begin(&rx_data, &tx_data);
}

void loop() {
    blinkLEDNonBlocking();
    lan9252.read_all(rx_data);
    // use data from output_structure_data and set input_structure_data
    lan9252.write_all(tx_data);
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
