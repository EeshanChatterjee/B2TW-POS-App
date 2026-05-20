# Thermal Printer Setup Guide

## Supported Printers

The POS system uses ESC/POS protocol and supports most 2" Bluetooth thermal printers:

- Zebra LP2844
- Star Micronics mPOP
- Sunmi T2
- Epson TM-M30
- Generic ESC/POS printers

## Hardware Requirements

- 2" thermal paper roll (typically 80mm)
- Bluetooth connectivity (most modern printers)
- USB cable for initial setup/testing
- Power supply

## Setup Steps

### 1. Physical Setup

1. **Unbox and inspect** the printer
2. **Load thermal paper** following manufacturer instructions
3. **Connect power** using the provided adapter
4. **Wait for initialization** (usually 30 seconds)

### 2. Bluetooth Pairing (Mac/Linux)

#### Mac OS

1. Open **System Preferences** → **Bluetooth**
2. Put printer in pairing mode (usually hold power button for 3 seconds)
3. Printer appears in available devices list
4. Click **Connect**
5. Device should show as "Connected"

#### Linux

```bash
# Use bluetoothctl to pair
bluetoothctl

# In bluetoothctl shell:
scan on
pair <printer-mac-address>
connect <printer-mac-address>
trust <printer-mac-address>
quit
```

#### Windows

1. **Settings** → **Bluetooth & other devices** → **Add device**
2. Select printer from list
3. Complete pairing

### 3. Identify Printer Port

#### Linux/Mac

```bash
# List available serial ports
ls /dev/tty* | grep -i usb

# Common locations:
# /dev/ttyUSB0 (USB connection)
# /dev/ttyACM0 (USB on some systems)
# /dev/cu.usbserial-* (Mac USB)
# /dev/cu.name-of-printer (Bluetooth)

# For Bluetooth, check:
ls /dev | grep -i bluetooth
```

#### Windows

```powershell
# Check device manager or use:
Get-PnPDevice | Where-Object {$_.Class -eq "Ports"}
```

### 4. Configure Backend

Create `.env` file in `backend/` directory:

```bash
# For USB Connection
PRINTER_PORT=/dev/ttyUSB0
PRINTER_BAUDRATE=9600

# For Mac USB
PRINTER_PORT=/dev/cu.usbserial-14130
PRINTER_BAUDRATE=9600

# For Bluetooth (Linux)
PRINTER_PORT=rfcomm0  # After binding Bluetooth device
PRINTER_BAUDRATE=9600
```

### 5. Test Printer Connectivity

#### Via API

```bash
# Test printer connection
curl -X POST http://localhost:5000/api/printer/test

# Expected response:
# {
#   "success": true,
#   "data": {
#     "status": "connected",
#     "message": "Test page printed"
#   }
# }
```

#### Via Command Line

```bash
# Test serial connection (Linux/Mac)
screen /dev/ttyUSB0 9600

# Send ESC/POS test command
printf '\x1b\x40'  # Initialize printer

# Press Ctrl+A then Ctrl+\ to exit
```

## Bluetooth Binding (Linux-Specific)

To make Bluetooth printer more reliable:

```bash
# Get printer MAC address
bluetoothctl info <printer-name>

# Create rfcomm binding
sudo rfcomm bind /dev/rfcomm0 <printer-mac-address>

# In .env, use:
PRINTER_PORT=/dev/rfcomm0
```

## Print Format

The system prints to 2" (80mm) thermal paper:

```
BAO TO THE WINGS
Pune, India

================================
Bill #: 42
Time: 15/01/2024 10:30 AM
================================

Item              Qty   Price
--------------------------------
Bao - Chicken      2    300
Sprite             1     50
Fries              1     80
--------------------------------

Total: ₹430

Thank you!
Contact: 9876543210
```

## Paper Specifications

- **Width:** 80mm (fits 2" printer)
- **Type:** Thermal receipt paper
- **Roll diameter:** 40mm typical
- **Density:** Standard 50-60gsm

## Troubleshooting

### Printer Not Detected

```bash
# Check if device is accessible
ls -l /dev/ttyUSB0  # Should show crw-rw-rw-

# Fix permissions if needed
sudo usermod -a -G dialout $USER
# Restart system for changes to take effect

# Or add permissions to file
sudo chmod 666 /dev/ttyUSB0
```

### Bluetooth Pairing Failed

```bash
# Reset Bluetooth on printer (hold power 10+ seconds)
# Remove and re-pair from system settings
# Try USB connection as fallback
```

### Garbled Output

- Check baud rate matches printer (usually 9600)
- Verify cable is properly connected
- Try different USB port
- Replace USB cable

### Printer Connected but Won't Print

```bash
# Test with echo command
echo "Hello World" > /dev/ttyUSB0

# If that works, issue is in driver code
# Check backend logs for errors
tail -f logs/app.log
```

### Print Cuts Off Mid-Page

- Increase PRINTER_TIMEOUT in .env
- Check paper is properly loaded
- Test with shorter bill content

## Performance Notes

- First print may take 1-2 seconds (driver initialization)
- Subsequent prints ~0.5 seconds
- Bluetooth adds 100-200ms latency vs USB

## Paper Cost Estimation

At ₹150/roll with ~40 bills per roll:
- Cost per bill: ~₹3.75
- Daily usage (50 bills): ~₹188

## Maintenance

- Clean print head weekly with alcohol if printing gets faint
- Check paper alignment
- Keep power supply clean and dry
- Store spare rolls in cool, dry place

## Alternative: Cloud Printing

For future multi-location setup:
- Use thermal printer driver via browser print dialog
- Route through cloud print service (Google Cloud Print)
- Queue management on server

## Next Steps

1. ✅ Physical printer setup
2. ✅ Bluetooth pairing
3. ✅ Port identification
4. ✅ .env configuration
5. ⏭️ Test via API endpoint
6. ⏭️ Full integration testing
