"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canErrors = void 0;
exports.default = getVersionFromDLL;
exports.deinitHardware = deinitHardware;
exports.initHardware = initHardware;
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-bitwise */
const koffi_1 = __importDefault(require("koffi"));
const process_1 = __importDefault(require("process"));
let m_fIsInitialized = false;
let m_UcanHandle = null;
let hwControlInitialized = false;
let devicePlugged = false;
const pathToDLL = './Usbcan64.dll';
const ucanLib = koffi_1.default.load(pathToDLL);
var baudRateOptions;
(function (baudRateOptions) {
    baudRateOptions["B_10kBit"] = "B_10kBit";
    baudRateOptions["B_20kBit"] = "B_20kBit";
    baudRateOptions["B_25kBit"] = "B_25kBit";
    baudRateOptions["B_50kBit"] = "B_50kBit";
    baudRateOptions["B_100kBit"] = "B_100kBit";
    baudRateOptions["B_125kBit"] = "B_125kBit";
    baudRateOptions["B_250kBit"] = "B_250kBit";
    baudRateOptions["B_500kBit"] = "B_500kBit";
    baudRateOptions["B_800kBit"] = "B_800kBit";
    baudRateOptions["B_1MBit"] = "B_1MBit";
})(baudRateOptions || (baudRateOptions = {}));
const BTR_CONFIGS = {
    B_10kBit: { BTR: 0x672f, BTR_SP2: 0x80771772, BTR_G4: 0x412f0077 },
    B_20kBit: { BTR: 0x532f, BTR_SP2: 0x00771772, BTR_G4: 0x412f003b },
    B_25kBit: { BTR: 0x1f34, BTR_SP2: 0x805f0051, BTR_G4: 0x4016005f },
    B_50kBit: { BTR: 0x472f, BTR_SP2: 0x003b1741, BTR_G4: 0x412f0017 },
    B_100kBit: { BTR: 0x432f, BTR_SP2: 0x001d1741, BTR_G4: 0x412f000b },
    B_125kBit: { BTR: 0x031c, BTR_SP2: 0x00170741, BTR_G4: 0x401c000b },
    B_250kBit: { BTR: 0x011c, BTR_SP2: 0x000b0741, BTR_G4: 0x401c0005 },
    B_500kBit: { BTR: 0x001c, BTR_SP2: 0x00050741, BTR_G4: 0x401c0002 },
    B_800kBit: { BTR: 0x0016, BTR_SP2: 0x00030731, BTR_G4: 0x401b0001 },
    B_1MBit: { BTR: 0x0014, BTR_SP2: 0x00020741, BTR_G4: 0x40180001 },
};
var USBCAN_CHANNEL;
(function (USBCAN_CHANNEL) {
    USBCAN_CHANNEL[USBCAN_CHANNEL["CH0"] = 0] = "CH0";
    USBCAN_CHANNEL[USBCAN_CHANNEL["CH1"] = 1] = "CH1";
    USBCAN_CHANNEL[USBCAN_CHANNEL["ANY"] = 255] = "ANY";
    USBCAN_CHANNEL[USBCAN_CHANNEL["ALL"] = 254] = "ALL";
    USBCAN_CHANNEL[USBCAN_CHANNEL["NO"] = 253] = "NO";
    USBCAN_CHANNEL[USBCAN_CHANNEL["CAN1"] = 0] = "CAN1";
    USBCAN_CHANNEL[USBCAN_CHANNEL["CAN2"] = 1] = "CAN2";
    USBCAN_CHANNEL[USBCAN_CHANNEL["LIN"] = 1] = "LIN";
})(USBCAN_CHANNEL || (USBCAN_CHANNEL = {}));
var UcanMode;
(function (UcanMode) {
    UcanMode[UcanMode["Normal"] = 0] = "Normal";
    UcanMode[UcanMode["ListenOnly"] = 1] = "ListenOnly";
    UcanMode[UcanMode["TxEcho"] = 2] = "TxEcho";
    UcanMode[UcanMode["RxOrderCh"] = 4] = "RxOrderCh";
    UcanMode[UcanMode["HighResTimer"] = 8] = "HighResTimer";
    UcanMode[UcanMode["Reserved"] = 16] = "Reserved";
})(UcanMode || (UcanMode = {}));
var UcanEvent;
(function (UcanEvent) {
    UcanEvent[UcanEvent["InitHW"] = 0] = "InitHW";
    UcanEvent[UcanEvent["InitCan"] = 1] = "InitCan";
    UcanEvent[UcanEvent["Receive"] = 2] = "Receive";
    UcanEvent[UcanEvent["Status"] = 3] = "Status";
    UcanEvent[UcanEvent["DeinitCan"] = 4] = "DeinitCan";
    UcanEvent[UcanEvent["DeinitHW"] = 5] = "DeinitHW";
    UcanEvent[UcanEvent["Connect"] = 6] = "Connect";
    UcanEvent[UcanEvent["Disconnect"] = 7] = "Disconnect";
    UcanEvent[UcanEvent["FatalDisconnect"] = 8] = "FatalDisconnect";
})(UcanEvent || (UcanEvent = {}));
const USBCAN_ANY_MODULE = 255;
const USBCAN_BAUDEX_USE_BTR01 = 0x00000000; // uses predefined values of BTR0/BTR1 for GW-001/002
const USBCAN_BAUDEX_AUTO = 0xffffffff; // automatic baudrate detection (not implemented in this version)
// Function return codes (encoding)
const USBCAN_SUCCESSFUL = 0x00; // no error
const USBCAN_ERR = 0x01; // error in library; function has not been executed
const USBCAN_ERRCMD = 0x40; // error in module; function has not been executed
const USBCAN_WARNING = 0x80; // Warning; function has been executed anyway
const USBCAN_RESERVED = 0xc0; // reserved return codes (up to 255)
const USBCAN_WARN_NODATA = 0x80;
const USBCAN_AMR_ALL = 0xffffffff; // Mask for "receive all CAN messages"
const USBCAN_ACR_ALL = 0x00000000; // Acceptance Code Register setting for receiving all messages
const USBCAN_OCR_DEFAULT = 0x1a; // Default OCR for standard GW-002
const USBCAN_OCR_RS485_ISOLATED = 0x1e; // OCR for RS485 interface with galvanic isolation
const USBCAN_OCR_RS485_NOT_ISOLATED = 0x0a; // OCR for RS485 interface without galvanic isolation
const USBCAN_DEFAULT_BUFFER_ENTRIES = 4096; // Default number of buffer entries
const USBCAN_PRODCODE_MASK_PID = 0x00007fff;
const USBCAN_PRODCODE_PID_GW002 = 0x00001102; // order code GW-002 "USB-CANmodul" outdated
const USBCAN_PRODCODE_PID_BASIC_G4 = 0x00001122; // order code 3204000 "USB-CANmodul1" 4th generation
const USBCAN_PRODCODE_PID_BASIC = 0x00001104; // order code 3204000/3204001 "USB-CANmodul1"
const USBCAN_BAUD_USE_BTREX = 0x0000; // uses predefined extended values of baudrate for
// Multiport 3004006, USB-CANmodul1 3204000 or USB-CANmodul2 3204002
// (do not use for GW-001/002)
/**
 * @brief Sets the Acceptance Mask Register (AMR) for CAN messages.
 * @param extended Indicates if the CAN ID is extended.
 * @param canId The CAN identifier.
 * @param rtr Indicates if the message is a Remote Transmission Request (RTR).
 * @return The result as an unsigned 32-bit integer.
 */
function USBCAN_SET_AMR(extended, canId, rtr) {
    let result;
    if (extended) {
        result = (canId << 3) | (rtr ? 0x000004 : 0) | 0x00003;
    }
    else {
        result = (canId << 21) | (rtr ? 0x100000 : 0) | 0xfffff;
    }
    return result >>> 0; // Force to unsigned 32-bit integer
}
/**
 * @brief Sets the Acceptance Code Register (ACR) for CAN messages.
 * @param extended Indicates if the CAN ID is extended.
 * @param canId The CAN identifier.
 * @param rtr Indicates if the message is a Remote Transmission Request (RTR).
 * @return The result as an unsigned 32-bit integer.
 */
function USBCAN_SET_ACR(extended, canId, rtr) {
    let result;
    if (extended) {
        result = (canId << 3) | (rtr ? 0x000004 : 0);
    }
    else {
        result = (canId << 21) | (rtr ? 0x100000 : 0);
    }
    return result >>> 0; // Force to unsigned 32-bit integer
}
/**
 * @brief Gets the address from the Programmable Gain Amplifier (PGA).
 * @param ADDR The address to process.
 * @return The processed address.
 */
function GET_ADRESS_FROM_PGA(ADDR) {
    return ADDR & 0x1fff;
}
/**
 * @brief Sets the address for the Programmable Gain Amplifier (PGA).
 * @param ADDR The address to set.
 * @param answer Optional parameter indicating if it's an answer.
 * @return The modified address.
 */
function SET_PGA_ADDR(ADDR, answer) {
    return (ADDR & 0x1fff) | ((answer ? 0 : 1) << 14);
}
exports.canErrors = {
    0x00: { name: 'USBCAN_SUCCESSFUL', description: 'No error' },
    0x01: {
        name: 'USBCAN_ERR_RESOURCE',
        description: 'Could not create a resource (memory, Handle, ...)',
    },
    0x02: {
        name: 'USBCAN_ERR_MAXMODULES',
        description: 'The maximum number of open modules is exceeded',
    },
    0x03: {
        name: 'USBCAN_ERR_HWINUSE',
        description: 'A module is already in use',
    },
    0x04: {
        name: 'USBCAN_ERR_ILLVERSION',
        description: 'The software versions of the module and library are incompatible',
    },
    0x05: {
        name: 'USBCAN_ERR_ILLHW',
        description: 'The module with the corresponding device number is not connected',
    },
    0x06: {
        name: 'USBCAN_ERR_ILLHANDLE',
        description: 'Wrong USB-CAN-Handle handed over to the function',
    },
    0x07: {
        name: 'USBCAN_ERR_ILLPARAM',
        description: 'Wrong parameter handed over to the function',
    },
    0x08: {
        name: 'USBCAN_ERR_BUSY',
        description: 'Instruction cannot be processed at this time',
    },
    0x09: {
        name: 'USBCAN_ERR_TIMEOUT',
        description: 'No answer from the module',
    },
    0x0a: {
        name: 'USBCAN_ERR_IOFAILED',
        description: 'A request for the driver failed',
    },
    0x0b: {
        name: 'USBCAN_ERR_DLL_TXFULL',
        description: 'The message did not fit into the transmission queue',
    },
    0x0c: {
        name: 'USBCAN_ERR_MAXINSTANCES',
        description: 'Maximum number of applications is reached',
    },
    0x0d: {
        name: 'USBCAN_ERR_CANNOTINIT',
        description: 'CAN-interface is not yet initialized',
    },
    0x0e: {
        name: 'USBCAN_ERR_DISCONNECT',
        description: 'USB-CANmodul was disconnected',
    },
    0x0f: {
        name: 'USBCAN_ERR_NOHWCLASS',
        description: 'The needed device class does not exist',
    },
    0x10: {
        name: 'USBCAN_ERR_ILLCHANNEL',
        description: 'Illegal CAN channel for GW-001/GW-002',
    },
    0x11: { name: 'USBCAN_ERR_RESERVED1', description: '' },
    0x12: {
        name: 'USBCAN_ERR_ILLHWTYPE',
        description: 'The API function cannot be used with this hardware',
    },
    0x13: {
        name: 'USBCAN_ERR_SERVER_TIMEOUT',
        description: 'The command server does not send a reply to a command',
    },
    0x14: {
        name: 'USERCAN_INITIALIZING',
        description: 'Initializing function has already been called',
    },
    0x15: {
        name: 'USERCAN_CONNECTED',
        description: 'Device is already in a connected state',
    },
    0x16: {
        name: 'USERCAN_DISCONNECT',
        description: 'Device is already in a disconnected state',
    },
    0x92: {
        name: 'USERCAN_UNPLUGED_BUT_CONNECTED',
        description: 'Device is unplugged, waiting to be replugged',
    },
    // User Custom Errors
    0xf0: {
        name: 'USBCAN_ERR_PRODUCT_CODE',
        description: 'Device Product Code not recognized',
    },
};
const AppConnectControlCallbackExProto = koffi_1.default.proto('void AppConnectControlCallbackEx(uint32_t dwEvent_p, uint32_t dwParam_p, void* pArg_p)');
const CallbackProto = koffi_1.default.proto('void CallbackTest(uint32_t event)');
const UcanCallBackExProto = koffi_1.default.proto('void UcanCallBackEx(uint8_t ucanHandle, uint8_t bEvent, uint8_t bChannel_p, CallbackTest *test)');
const UcanCallbackProto = koffi_1.default.proto('void UcanCallback(uint8_t ucanHandle, uint8_t bEvent)');
/**
 * @brief Callback function for CAN events.
 * @param cbCanHandle The handle of the CAN device.
 * @param bEvent The event that occurred.
 */
const UcanCallback = koffi_1.default.register((cbCanHandle, bEvent) => {
    console.log(`Handle:${cbCanHandle}, Event:${bEvent}`);
}, koffi_1.default.pointer(UcanCallbackProto));
const TUcanInitCanParam = koffi_1.default.struct('TUcanInitCanParam', {
    m_dwSize: [1, 'uint32_t'], // [IN] size of this structure
    m_bMode: [1, 'uint8_t'], // [IN] selects the mode of CAN controller (see kUcanMode...)
    m_bBTR0: [1, 'uint8_t'], // [IN] Bus Timing Register 0 (SJA1000 - use high byte USBCAN_BAUD_...)
    m_bBTR1: [1, 'uint8_t'], // [IN] Bus Timing Register 1 (SJA1000 - use low  byte USBCAN_BAUD_...)
    m_bOCR: [1, 'uint8_t'], // [IN] Output Controll Register of SJA1000 (should be 0x1A)
    m_dwAMR: [1, 'uint32_t'], // [IN] Acceptance Mask Register (SJA1000)
    m_dwACR: [1, 'uint32_t'], // [IN] Acceptance Code Register (SJA1000)
    m_dwBaudrate: [1, 'uint32_t'], // [IN] Baudrate Register for Multiport 3004006, USB-CANmodul1 3204000 or USB-CANmodul2 3204002
    m_wNrOfRxBufferEntries: [1, 'uint16_t'], // [IN] number of receive buffer entries (default is 4096)
    m_wNrOfTxBufferEntries: [1, 'uint16_t'], // [IN] number of transmit buffer entries (default is 4096)
});
const TUcanStatusStruct = koffi_1.default.struct('TUcanStatusStruct', {
    m_wCanStatus: [1, 'uint16_t'], // [OUT] current CAN status
    m_wUsbStatus: [1, 'uint16_t'], // [OUT] current USB status
});
const TUcanHardwareInfo = koffi_1.default.struct('TUcanHardwareInfo', {
    m_bDeviceNr: [1, 'uint8_t'], // [OUT] device number of the USB-CANmodul
    m_UcanHandle: [1, 'uint8_t'], // [OUT] USB-CAN-Handle assigned by the library
    m_dwReserved: [1, 'uint32_t'], // [OUT] reserved
    m_bBTR0: [1, 'uint8_t'], // [OUT] Bus Timing Register 0 (SJA1000)
    m_bBTR1: [1, 'uint8_t'], // [OUT] Bus Timing Register 1 (SJA1000)
    m_bOCR: [1, 'uint8_t'], // [OUT] Output Control Register (SJA1000)
    m_dwAMR: [1, 'uint32_t'], // [OUT] Acceptance Mask Register (SJA1000)
    m_dwACR: [1, 'uint32_t'], // [OUT] Acceptance Code Register (SJA1000)
    m_bMode: [1, 'uint8_t'], // [OUT] mode of CAN controller (see kUcanMode...)
    m_dwSerialNr: [1, 'uint32_t'], // [OUT] serial number from USB-CANmodul
});
const TUcanHardwareInfoEx = koffi_1.default.struct('TUcanHardwareInfoEx', {
    m_dwSize: [1, 'uint32_t'], //        [IN]  size of this structure
    m_UcanHandle: [1, 'uint8_t'], //    [OUT] USB-CAN-Handle assigned by the DLL
    m_bDeviceNr: [1, 'uint8_t'], //     [OUT] device number of the USB-CANmodul
    m_dwSerialNr: [1, 'uint32_t'], //    [OUT] serial number from USB-CANmodul
    m_dwFwVersionEx: [1, 'uint32_t'], // [OUT] version of firmware
    m_dwProductCode: [1, 'uint32_t'], // [OUT] product code (for differentiate between different hardware modules)
    //                            see constants USBCAN_PRODCODE_...
    m_adwUniqueId: [1, 'uint32_t [4]'], // [OUT] unique ID (available since V5.01) !!! m_dwSize must be >= USBCAN_HWINFO_SIZE_V2
    m_dwFlags: [1, 'uint32_t'], //       [OUT] additional flags
});
const TUcanChannelInfo = koffi_1.default.struct('TUcanChannelInfo', {
    m_dwSize: [1, 'uint32_t'], // [IN]  size of this structure 26, 28 with padding
    m_bMode: [1, 'uint8_t'], // [OUT] selects the mode of CAN controller (see kUcanMode...)
    m_bBTR0: [1, 'uint8_t'], // [OUT] Bus Timing Register 0 (SJA1000 - use high byte USBCAN_BAUD_...)
    m_bBTR1: [1, 'uint8_t'], // [OUT] Bus Timing Register 1 (SJA1000 - use low  byte USBCAN_BAUD_...)
    m_bOCR: [1, 'uint8_t'], // [OUT] Output Controll Register of SJA1000 (should be 0x1A)
    m_dwAMR: [1, 'uint32_t'], // [OUT] Acceptance Mask Register (SJA1000)
    m_dwACR: [1, 'uint32_t'], // [OUT] Acceptance Code Register (SJA1000)
    m_dwBaudrate: [1, 'uint32_t'], // [OUT] Baudrate Register for Multiport 3004006, USB-CANmodul1 3204000 or USB-CANmodul2 3204002 (use USBCAN_BAUDEX_...)
    m_fCanIsInit: [1, 'bool'], // [OUT] is TRUE if CAN interface was initialized, otherwise FALSE
    m_wCanStatus: [1, 'uint16_t'], // [OUT] CAN status (same as received from function UcanGetStatus..())
});
const TUcanMsgStruct = koffi_1.default.struct('TUcanMsgStruct', {
    m_dwID: [1, 'uint32_t'], // CAN identifier
    m_bFF: [1, 'uint8_t'], // CAN frame format
    m_bDLC: [1, 'uint8_t'], // CAN data length code
    m_bData: [1, 'uint8_t [8]'], // CAN data
    m_dwTime: [1, 'uint32_t'], // Receipt time in ms
});
const UcanGetMsgPending = ucanLib.func('uint8_t UcanGetMsgPending(uint8_t UcanHandle_p, uint8_t bChannel_p, uint32_t dwFlags_p, _Out_ uint32_t *pdwCount_p)');
const UcangetVersionEx = ucanLib.func('uint32_t UcanGetVersionEx(int32_t VerType_p)');
const UcanInitHwConnectControlEx = ucanLib.func('uint8_t UcanInitHwConnectControlEx(AppConnectControlCallbackEx *pfnConnectControlEx_p, void *pCallbackArg_p)');
const UcanInitHardware = ucanLib.func('uint8_t UcanInitHardware(_Out_ uint8_t *pUcanHandle_p, uint8_t bDeviceNr_p, UcanCallback *cb)');
const UcanInitHardwareEx = ucanLib.func('uint8_t UcanInitHardwareEx(_Out_ uint8_t *pUcanHandle_p, uint8_t bDeviceNr_p, UcanCallBackEx *cb, CallbackTest *test)');
const UcanInitHardwareEx2 = ucanLib.func('uint8_t UcanInitHardwareEx2(_Out_ uint8_t *pUcanHandle_p, uint32_t dwSerialNr_p, UcanCallBackEx *cb, CallbackTest *test)');
const UcanDeinitHardware = ucanLib.func('uint8_t UcanDeinitHardware(uint8_t UcanHandle_p)');
const UcanGetHardwareInfo = ucanLib.func('uint8_t UcanGetHardwareInfo(uint8_t UcanHandle_p, _Out_ TUcanHardwareInfo *pHwInfo_p )');
const UcanGetHardwareInfoEx2 = ucanLib.func('uint8_t UcanGetHardwareInfoEx2(uint8_t UcanHandle_p, _Inout_ TUcanHardwareInfoEx* pHwInfoEx_p, _Inout_ TUcanChannelInfo* pCanInfoCh0_p, _Inout_ TUcanChannelInfo* pCanInfoCh1_p)');
const UcanInitCan = ucanLib.func('uint8_t UcanInitCan(uint8_t UcanHandle_p, uint8_t bBTR0_p, uint8_t bBTR1_p, uint32_t dwAMR_p, uint32_t dwACR_p)');
const UcanInitCanEx = ucanLib.func('uint8_t UcanInitCanEx(uint8_t UcanHandle_p, TUcanInitCanParam* pInitCanParam_p)');
const UcanInitCanEx2 = ucanLib.func('uint8_t UcanInitCanEx2(uint8_t UcanHandle_p, uint8_t bChannel_p, _Inout_ TUcanInitCanParam* pInitCanParam_p)');
const UcanDeinitCan = ucanLib.func('uint8_t UcanDeinitCan(uint8_t UcanHandle_p)');
const UcanGetStatus = ucanLib.func('uint8_t UcanGetStatus(uint8_t UcanHandle_p, _Out_ TUcanStatusStruct* pStatus_p)');
const UcanSetBaudrate = ucanLib.func('uint8_t UcanSetBaudrate(uint8_t UcanHandle_p, uint8_t bBTR0_p, uint8_t bBTR1_p)');
const UcanWriteCanMsg = ucanLib.func('uint8_t UcanWriteCanMsg(uint8_t UcanHandle_p, TUcanMsgStruct* pCanMsg_p)');
const UcanReadCanMsg = ucanLib.func('uint8_t UcanReadCanMsg(uint8_t UcanHandle_p, _Out_ TUcanMsgStruct* pCanMsg_p)');
const UcanReadCanMsgEx = ucanLib.func('uint8_t UcanReadCanMsgEx(uint8_t UcanHandle_p, uint8_t* pbChannel_p, TUcanMsgStruct* pCanMsg_p, uint32_t* pdwCount_p)');
/**
 * @brief Retrieves the version of the DLL.
 * @return The version as a string in the format "X.Y.Z".
 */
function getVersionFromDLL() {
    try {
        const result = UcangetVersionEx(1);
        console.log('Result:', result);
        const version = result & 0xff;
        const revision = (result >> 8) & 0xff;
        const release = result >> 16;
        return `${version}.${revision}.${release}`;
    }
    catch (err) {
        console.error('Error calling DLL function:', err);
        throw err; // Rethrow or handle as needed
    }
}
/**
 * @brief Initializes the USB-CAN hardware.
 * @param bDeviceNr_p The device number.
 * @param baudrate The baud rate option.
 * @param dwSerialNr_p The serial number.
 * @param eventCb Callback for CAN events.
 * @param controlCb Callback for control events.
 * @return The result of the initialization.
 */
function m_initialize(bDeviceNr_p, baudrate, dwSerialNr_p, eventCb = () => {
    console.error('Not implemented');
}, controlCb = () => {
    console.error('Not implemented');
}) {
    var _a;
    let canReturn = USBCAN_SUCCESSFUL;
    const AppConnectControlCallbackEx = koffi_1.default.register((dwEvent_p, dwParam_p, pArg_p) => {
        controlCb(dwEvent_p);
    }, koffi_1.default.pointer(AppConnectControlCallbackExProto));
    const UcanCallBackEx = koffi_1.default.register((cbCanHandle, bEvent, bChannel_p, pArg_p) => {
        const ret = eventCb(bEvent);
    }, koffi_1.default.pointer(UcanCallBackExProto));
    if (!hwControlInitialized) {
        canReturn = UcanInitHwConnectControlEx(AppConnectControlCallbackEx, 0);
    }
    hwControlInitialized = true;
    if (canReturn !== USBCAN_SUCCESSFUL) {
        return canReturn;
    }
    // Check if USB-CANmodul is already initialized
    if (m_fIsInitialized === false) {
        // Initialize hardware
        if (dwSerialNr_p === 0) {
            const ucanHandleRef = [null];
            canReturn = UcanInitHardwareEx(ucanHandleRef, bDeviceNr_p, UcanCallBackEx, (data) => { });
            [m_UcanHandle] = ucanHandleRef;
            if (canReturn !== USBCAN_SUCCESSFUL) {
                if (m_fIsInitialized !== false) {
                    // Deinitialize CAN interface
                    UcanDeinitCan(m_UcanHandle);
                }
                if (m_fIsInitialized !== false) {
                    // Deinitialize hardware
                    UcanDeinitHardware(m_UcanHandle);
                }
                return canReturn;
            }
        }
        else {
            const ucanHandleRef = [null];
            canReturn = UcanInitHardwareEx2(ucanHandleRef, dwSerialNr_p, UcanCallBackEx, (data) => { });
            [m_UcanHandle] = ucanHandleRef;
            if (canReturn !== USBCAN_SUCCESSFUL) {
                if (m_fIsInitialized !== false) {
                    UcanDeinitCan(m_UcanHandle);
                }
                if (m_fIsInitialized !== false) {
                    UcanDeinitHardware(m_UcanHandle);
                }
                return canReturn;
            }
        }
    }
    const channelInfoBuffer = { m_dwSize: 64 };
    const hardwareInfoExBuffer = { m_dwSize: 64 };
    canReturn = UcanGetHardwareInfoEx2(m_UcanHandle, hardwareInfoExBuffer, channelInfoBuffer, null);
    if (canReturn !== 0) {
        return canReturn;
    }
    console.log(`BTR:0x${BTR_CONFIGS[baudrate].BTR.toString(16)}`);
    const tUcanInitCanParam = {
        m_dwSize: 64,
        m_bMode: UcanMode.Normal,
        m_bBTR0: 0,
        m_bBTR1: 0,
        m_dwBaudrate: 0,
        m_bOCR: USBCAN_OCR_DEFAULT,
        m_dwAMR: USBCAN_AMR_ALL, // receive all CAN messages
        m_dwACR: USBCAN_ACR_ALL,
        m_wNrOfRxBufferEntries: USBCAN_DEFAULT_BUFFER_ENTRIES,
        m_wNrOfTxBufferEntries: USBCAN_DEFAULT_BUFFER_ENTRIES,
    };
    switch (((_a = hardwareInfoExBuffer.m_dwProductCode) !== null && _a !== void 0 ? _a : 0) & USBCAN_PRODCODE_MASK_PID) {
        // 0x1102 or 4354
        case USBCAN_PRODCODE_PID_GW002:
            tUcanInitCanParam.m_bBTR0 = BTR_CONFIGS[baudrate].BTR >> 8; // 0x1f
            tUcanInitCanParam.m_bBTR1 = BTR_CONFIGS[baudrate].BTR & 0xff; // 0x34
            tUcanInitCanParam.m_dwBaudrate = USBCAN_BAUDEX_USE_BTR01;
            console.log('PID GW002');
            break;
        // 0x1104 or 4356
        case USBCAN_PRODCODE_PID_BASIC:
            tUcanInitCanParam.m_bBTR0 = (USBCAN_BAUD_USE_BTREX >> 8) & 0xff;
            tUcanInitCanParam.m_bBTR1 = (USBCAN_BAUD_USE_BTREX >> 0) & 0xff;
            tUcanInitCanParam.m_dwBaudrate = BTR_CONFIGS[baudrate].BTR_SP2;
            console.log('PID BASIC');
            break;
        // 0x1122 or 4386
        case USBCAN_PRODCODE_PID_BASIC_G4:
            tUcanInitCanParam.m_bBTR0 = (USBCAN_BAUD_USE_BTREX >> 8) & 0xff;
            tUcanInitCanParam.m_bBTR1 = (USBCAN_BAUD_USE_BTREX >> 0) & 0xff;
            tUcanInitCanParam.m_dwBaudrate = BTR_CONFIGS[baudrate].BTR_G4;
            console.log('PID BASIC G4');
            break;
        default:
            console.log('ERROR WITH PRODUCT CODE');
            canReturn = 0xf0;
            break;
    }
    // Initialize CAN interface
    canReturn = UcanInitCanEx(m_UcanHandle, tUcanInitCanParam);
    if (canReturn !== 0) {
        return canReturn;
    }
    if (canReturn !== USBCAN_SUCCESSFUL) {
        if (m_fIsInitialized !== false) {
            // Deinitialize CAN interface
            UcanDeinitCan(m_UcanHandle);
        }
        if (m_fIsInitialized !== false) {
            // Deinitialize hardware
            UcanDeinitHardware(m_UcanHandle);
        }
        return canReturn;
    }
    // Initialization complete
    m_fIsInitialized = true;
    return canReturn;
}
/**
 * @brief Reads a message from the CAN bus.
 * @param msg The message structure to fill with data.
 * @return The result of the read operation.
 */
function m_read_msg(msg) {
    let canReturn = USBCAN_SUCCESSFUL;
    // Check if USB-CANmodul is already initialized
    if (m_fIsInitialized !== false) {
        canReturn = UcanReadCanMsg(m_UcanHandle, msg);
        if (canReturn !== USBCAN_SUCCESSFUL) {
            return canReturn;
        }
    }
    return USBCAN_SUCCESSFUL;
}
/**
 * @brief Writes a message to the CAN bus.
 * @param pCanMsg_p The message structure to send.
 * @return The result of the write operation.
 */
function m_write_msg(pCanMsg_p) {
    let canReturn = USBCAN_SUCCESSFUL;
    if (m_fIsInitialized !== false) {
        canReturn = UcanWriteCanMsg(m_UcanHandle, pCanMsg_p);
        if (canReturn !== USBCAN_SUCCESSFUL) {
            return canReturn;
        }
    }
    return canReturn;
}
/**
 * @brief Deinitializes the USB-CAN hardware.
 * @return The result of the deinitialization.
 */
function deinitHardware() {
    let canReturn = UcanDeinitCan(m_UcanHandle);
    if (canReturn !== USBCAN_SUCCESSFUL)
        return canReturn;
    canReturn = UcanDeinitHardware(m_UcanHandle);
    if (canReturn !== USBCAN_SUCCESSFUL)
        return canReturn;
    m_fIsInitialized = false;
    m_UcanHandle = null;
    return canReturn;
}
/**
 * @brief Initializes the USB-CAN hardware and sets up event listeners.
 * @return The result of the initialization.
 */
function initHardware(onMessageReceived) {
    /**
     * @brief Callback for CAN events.
     * @param event The event that occurred.
     * @return The result of the event handling.
     */
    function eventCallback(event) {
        let canReturn = 0;
        if (event === UcanEvent.Receive) {
            const msg = {};
            const countRef = [42];
            UcanGetMsgPending(m_UcanHandle, 0, 1, countRef);
            let [count] = countRef;
            for (; count >= 1; count -= 1) {
                canReturn = m_read_msg(msg);
                onMessageReceived(msg);
                if (devicePlugged === false) {
                    devicePlugged = true;
                }
            }
        }
        return canReturn;
    }
    /**
     * @brief Callback for control events.
     * @param control The control event that occurred.
     */
    function controlCallback(control) {
        switch (control) {
            case UcanEvent.Connect:
                console.log('Device Connected');
                break;
            case UcanEvent.Disconnect:
                console.log('Device Disconnected');
                devicePlugged = false;
                break;
            case UcanEvent.FatalDisconnect:
                console.log('Device Fatal Disconnected');
                devicePlugged = false;
                break;
            default:
                console.log('Unknown Device Control', control);
                break;
        }
    }
    const canReturn = m_initialize(USBCAN_ANY_MODULE, baudRateOptions.B_25kBit, 0, eventCallback, controlCallback);
    console.log('INIT RET :', canReturn);
    if (canReturn !== USBCAN_SUCCESSFUL) {
        return canReturn;
    }
    devicePlugged = true;
    return 0;
}
/* Demo begin below */
// Custom callback for received CAN messages
function onMessageReceived(msg) {
    console.log('Received CAN MSG', msg);
}
// Initialize hardware with custom callback
initHardware(onMessageReceived);
// Variable to toggle PGA light
let onoff = false;
// Interval ID for sending CAN messages
let intervalId;
// Interval to send CAN commands to toggle PGA light
intervalId = setInterval(() => {
    const canMsgToSendBuffer = {
        m_dwID: 0x000C8019,
        m_bFF: 0x80,
        m_bDLC: 8,
        m_bData: [
            0x12,
            0x02,
            0x30,
            onoff ? 0x40 : 0x50,
            0x00,
            0x00,
            0x0F,
            0x0F,
        ],
    };
    onoff = !onoff;
    const sendMsgCanReturn = m_write_msg(canMsgToSendBuffer);
    console.log('SEND MSG CAN RETURN', sendMsgCanReturn);
}, 2000);
// Handler for SIGINT signal (Ctrl+C) to clean up resources
process_1.default.on('SIGINT', () => {
    console.log('\nReceived SIGINT (Ctrl+C). Cleaning up en cours...');
    if (intervalId) {
        clearInterval(intervalId);
    }
    // Deinitialize CAN hardware
    if (m_fIsInitialized) {
        const result = deinitHardware();
        console.log(`Hardware deinitialization: ${result === 0 ? 'Success' : `Error: 0x${result.toString(16)}`}`);
    }
    console.log('Tout est clean !!!');
    process_1.default.exit(0);
});
