# SYSTEC USB-CAN NodeJS/TypeScript Interface

A TypeScript library for interfacing with SYSTEC USB-CAN modules in Node.js applications. This library provides a wrapper around the SYSTEC USB-CAN API (Usbcan64.dll) using Koffi for the native bindings.

## Features

- Initialize and deinitialize CAN hardware
- Send and receive CAN messages
- Event-based message handling
- Support for different baud rates including PGA baudrate (25k)
- Error handling with descriptive error codes

## Requirements

- Node.js
- pnpm
- SYSTEC USB-CAN driver ([Download](https://www.systec-electronic.com/media/default/Redakteur/produkte/Interfaces_Gateways/sysWORXX_USB_CANmodul_Series/Downloads/SO-387.zip))

## Usage

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the project in dev mode:
   ```bash
   pnpm dev
   ```

3. Build the project:
   ```bash
   pnpm build
   ```

4. Run the builded project:
   ```bash
   pnpm start
   ```
