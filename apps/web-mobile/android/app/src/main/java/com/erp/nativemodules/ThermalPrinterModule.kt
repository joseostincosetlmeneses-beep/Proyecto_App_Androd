package com.erp.nativemodules

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactContextBaseJavaModule

class ThermalPrinterModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "ThermalPrinter"
    @ReactMethod fun connectPrinter(macAddress: String, promise: Promise) {
        if (!macAddress.matches(Regex("([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}"))) { promise.reject("INVALID_MAC", "Direccion MAC invalida"); return }
        promise.resolve(true)
    }
    @ReactMethod fun printTicket(payloadJson: String, promise: Promise) {
        if (payloadJson.isBlank()) { promise.reject("EMPTY_PAYLOAD", "El ticket no puede estar vacio"); return }
        // La capa Bluetooth concreta debe enviar los bytes ESC/POS al dispositivo conectado.
        promise.resolve(true)
    }
}
