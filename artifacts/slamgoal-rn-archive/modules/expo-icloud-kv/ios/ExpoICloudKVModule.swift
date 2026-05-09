import ExpoModulesCore
import Foundation

// Thin wrapper over NSUbiquitousKeyValueStore — Apple's tiny iCloud
// key-value store (1 MB total, free, no CloudKit setup needed). Used
// by the app as a cross-device sync layer for the coin balance so
// players who own an iPhone + iPad see the same total on both.
//
// Intentionally minimal: `getNumber` / `setNumber` only. Add more
// types here when a call site actually needs them. Note that
// `object(forKey:)` is used to distinguish "unset" (nil) from "zero"
// (Double 0) — `double(forKey:)` alone returns 0 for both.
//
// Apple docs: https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore

public class ExpoICloudKVModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoICloudKV")

    // Lets the JS side distinguish "module installed" (iOS with the
    // entitlement) from "module missing" (Expo Go, Android, web).
    Function("isAvailable") { () -> Bool in
      return true
    }

    AsyncFunction("getNumber") { (key: String, promise: Promise) in
      let store = NSUbiquitousKeyValueStore.default
      // Nudge iCloud to reconcile local + server state. `synchronize`
      // isn't guaranteed immediate but it's the right breadcrumb — the
      // system already runs its own periodic sync every ~5s.
      store.synchronize()
      if store.object(forKey: key) == nil {
        promise.resolve(nil)
        return
      }
      promise.resolve(store.double(forKey: key))
    }

    AsyncFunction("setNumber") { (key: String, value: Double, promise: Promise) in
      let store = NSUbiquitousKeyValueStore.default
      store.set(value, forKey: key)
      store.synchronize()
      promise.resolve(true)
    }
  }
}
