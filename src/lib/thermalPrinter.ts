import { Bill, AgencySettings } from '../types';

// Standard ESC/POS commands
const ESC = 0x1b;
const GS = 0x1d;

export class ThermalPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private isConnecting: boolean = false;

  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isConnected(): boolean {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  public getDeviceName(): string {
    return this.device?.name || 'Bluetooth Thermal Printer';
  }

  /**
   * Request and connect to Bluetooth Thermal Printer
   */
  public async connect(): Promise<{ success: boolean; name?: string; error?: string }> {
    if (!this.isBluetoothSupported()) {
      return {
        success: false,
        error: 'Web Bluetooth is not supported in this browser. You can still print via System / Thermal Print.',
      };
    }

    try {
      this.isConnecting = true;
      // Many Bluetooth thermal printers use Serial Port Profile (SPP) or generic GATT services
      const navBluetooth = (navigator as any).bluetooth;
      const device = await navBluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb',
        ],
      });

      this.device = device;
      const server = await device.gatt.connect();

      // Find writable characteristic
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            break;
          }
        }
        if (this.characteristic) break;
      }

      this.isConnecting = false;
      return { success: true, name: device.name || 'Thermal Printer' };
    } catch (err: any) {
      this.isConnecting = false;
      console.warn('Bluetooth connection error:', err);
      return { success: false, error: err.message || 'Failed to connect to printer' };
    }
  }

  public disconnect(): void {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect();
      }
    } catch (e) {
      console.error(e);
    }
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Generates ESC/POS byte commands for 58mm (32 cols) or 80mm (48 cols)
   */
  public generateEscPos(bill: Bill, settings: AgencySettings, paperWidth: '58mm' | '80mm' = '58mm'): Uint8Array {
    const lineWidth = paperWidth === '58mm' ? 32 : 48;
    const encoder = new TextEncoder();
    const parts: number[] = [];

    // Helper: append byte array
    const appendBytes = (bytes: number[]) => {
      parts.push(...bytes);
    };

    const appendText = (text: string) => {
      const encoded = encoder.encode(text);
      for (let i = 0; i < encoded.length; i++) {
        parts.push(encoded[i]);
      }
    };

    const appendLine = (text: string = '') => {
      appendText(text + '\n');
    };

    const padRow = (left: string, right: string) => {
      const spaceNeeded = lineWidth - left.length - right.length;
      if (spaceNeeded <= 0) {
        return left + ' ' + right;
      }
      return left + ' '.repeat(spaceNeeded) + right;
    };

    // 1. Initialize printer: ESC @
    appendBytes([ESC, 0x40]);

    // 2. Center alignment: ESC a 1
    appendBytes([ESC, 0x61, 0x01]);

    // Double height & bold for header: ESC ! 0x30
    appendBytes([ESC, 0x21, 0x30]);
    appendLine(settings.agencyName || 'SSS EGG AGENCY');

    // Normal font: ESC ! 0x00
    appendBytes([ESC, 0x21, 0x00]);
    if (settings.phone) {
      appendLine('Phone: ' + settings.phone);
    }
    if (settings.address) {
      appendLine(settings.address);
    }

    // Divider
    appendLine('='.repeat(lineWidth));

    // 3. Left alignment: ESC a 0
    appendBytes([ESC, 0x61, 0x00]);

    appendLine(padRow('Bill No: #' + bill.billNumber, bill.date));
    appendLine(padRow('Time: ' + bill.time, 'Staff: ' + (bill.employeeName || 'Employee')));

    // Divider
    appendLine('-'.repeat(lineWidth));

    // Line items
    appendLine(padRow('ITEM / DESCRIPTION', 'AMOUNT'));
    appendLine('-'.repeat(lineWidth));

    const itemDesc = `${bill.eggQuantity} Eggs @ Rs.${bill.pricePerEgg}/egg`;
    const itemTotal = `Rs.${bill.totalAmount}`;
    appendLine(padRow(itemDesc, itemTotal));

    if (bill.eggQuantity >= 30) {
      const trays = Math.floor(bill.eggQuantity / 30);
      const loose = bill.eggQuantity % 30;
      appendLine(` (${trays} Tray${trays > 1 ? 's' : ''}${loose > 0 ? ` + ${loose} Loose` : ''})`);
    }

    appendLine('-'.repeat(lineWidth));

    // Bold Total
    appendBytes([ESC, 0x21, 0x20]); // Double width
    appendLine(padRow('TOTAL:', `Rs.${bill.totalAmount}`));
    appendBytes([ESC, 0x21, 0x00]); // Reset

    appendLine('='.repeat(lineWidth));

    // Center alignment for footer
    appendBytes([ESC, 0x61, 0x01]);
    appendLine('Thank You! Visit Again');
    appendLine('*** Fresh & Quality Eggs ***');

    // Feed and cut paper: GS V 66 0
    appendBytes([0x0a, 0x0a, 0x0a, 0x0a]); // 4 line feeds
    appendBytes([GS, 0x56, 0x42, 0x00]); // Full/partial cut

    return new Uint8Array(parts);
  }

  /**
   * Send print command to Bluetooth device or trigger system print
   */
  public async printBill(
    bill: Bill,
    settings: AgencySettings,
    paperWidth: '58mm' | '80mm' = '58mm'
  ): Promise<{ success: boolean; method: 'bluetooth' | 'system'; error?: string }> {
    if (this.isConnected() && this.characteristic) {
      try {
        const rawBytes = this.generateEscPos(bill, settings, paperWidth);
        // Bluetooth packet size usually up to 100 bytes chunked
        const chunkSize = 100;
        for (let i = 0; i < rawBytes.length; i += chunkSize) {
          const chunk = rawBytes.slice(i, i + chunkSize);
          await this.characteristic.writeValue(chunk);
        }
        return { success: true, method: 'bluetooth' };
      } catch (err: any) {
        console.warn('Bluetooth print failed, falling back to system print:', err);
      }
    }

    // Fallback: Browser Print
    try {
      window.print();
      return { success: true, method: 'system' };
    } catch (e: any) {
      return { success: false, method: 'system', error: e.message };
    }
  }
}

export const thermalPrinter = new ThermalPrinterService();
