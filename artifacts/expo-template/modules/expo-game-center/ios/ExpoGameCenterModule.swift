import ExpoModulesCore
import GameKit
import UIKit

// Thin Swift bridge over GameKit. Exposes three async functions to
// JS — authenticate, submitScore, presentLeaderboard — plus
// `isAvailable()` for environment checks. The rest of the GameKit
// surface (achievements, matchmaking) is not needed yet; add
// functions here as features need them.
//
// See Apple's "Initializing and configuring Game Center" guide:
// https://developer.apple.com/documentation/gamekit/initializing-and-configuring-game-center

public class ExpoGameCenterModule: Module {
  // Single delegate instance kept alive for the lifetime of the
  // module — GKGameCenterViewController's delegate property is weak,
  // so a local (scope-bound) delegate would be deallocated before
  // "Done" gets tapped.
  private let dismissDelegate = GameCenterDismissDelegate()

  public func definition() -> ModuleDefinition {
    Name("ExpoGameCenter")

    Function("isAvailable") { () -> Bool in
      // `GKLocalPlayer` is always present on iOS; there's no
      // feature check to run. Returning true here lets the JS side
      // distinguish "module installed" from "module missing".
      return true
    }

    AsyncFunction("authenticate") { (promise: Promise) in
      DispatchQueue.main.async {
        let player = GKLocalPlayer.local

        // `authenticateHandler` can fire multiple times across an
        // app session — Apple uses it to hand us a login VC on
        // first call and then to push status updates (e.g. the user
        // signed out). We resolve the promise on the first terminal
        // state and don't touch it afterwards.
        var settled = false
        player.authenticateHandler = { [weak self] viewController, error in
          guard let self = self else { return }
          if let vc = viewController {
            // iOS wants us to present its login sheet — do so and
            // wait for a follow-up handler call with the result.
            if let presenter = self.currentViewController() {
              presenter.present(vc, animated: true)
            }
            return
          }
          if settled { return }
          settled = true

          if player.isAuthenticated {
            promise.resolve([
              "authenticated": true,
              "displayName": player.displayName,
              "alias": player.alias,
              "gamePlayerID": player.gamePlayerID,
              "teamPlayerID": player.teamPlayerID
            ])
          } else {
            // Build the payload imperatively so we don't have to mix
            // String? / NSNull in a literal dict — Swift infers a
            // narrow value type from the first entry and refuses
            // NSNull as a coalesce target on a String? key.
            var payload: [String: Any] = ["authenticated": false]
            if let msg = error?.localizedDescription {
              payload["errorMessage"] = msg
            }
            promise.resolve(payload)
          }
        }
      }
    }

    AsyncFunction("submitScore") { (score: Int, leaderboardIDs: [String], promise: Promise) in
      // Guard against the common "not signed in" case so the caller
      // doesn't have to — `submitScore` on an unauthenticated
      // player no-ops silently on some iOS versions, logs on
      // others, but never succeeds.
      let player = GKLocalPlayer.local
      guard player.isAuthenticated else {
        promise.resolve(false)
        return
      }

      if #available(iOS 14.0, *) {
        GKLeaderboard.submitScore(
          score,
          context: 0,
          player: player,
          leaderboardIDs: leaderboardIDs
        ) { error in
          promise.resolve(error == nil)
        }
      } else {
        // iOS 13 and earlier — the deployment target is 15.1 so in
        // practice this branch is unreachable, kept for safety.
        promise.resolve(false)
      }
    }

    AsyncFunction("presentLeaderboard") { (leaderboardID: String?, promise: Promise) in
      DispatchQueue.main.async { [weak self] in
        guard let self = self else {
          promise.resolve(false)
          return
        }
        guard let presenter = self.currentViewController() else {
          promise.resolve(false)
          return
        }

        let vc: GKGameCenterViewController
        if let id = leaderboardID, !id.isEmpty {
          vc = GKGameCenterViewController(
            leaderboardID: id,
            playerScope: .global,
            timeScope: .allTime
          )
        } else {
          vc = GKGameCenterViewController(state: .leaderboards)
        }
        vc.gameCenterDelegate = self.dismissDelegate
        presenter.present(vc, animated: true) {
          promise.resolve(true)
        }
      }
    }
  }

  // Grab the top-most presented view controller on the active
  // window scene. `UIApplication.shared.keyWindow` is deprecated on
  // iOS 13+; walking `connectedScenes` is the modern replacement.
  private func currentViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
    let active = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
    let keyWindow = active?.windows.first(where: { $0.isKeyWindow }) ?? active?.windows.first
    var top = keyWindow?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

// GKGameCenterViewController's delegate is weak. A one-off delegate
// would deallocate before the user taps "Done" — so we hold one
// shared instance in the module.
final class GameCenterDismissDelegate: NSObject, GKGameCenterControllerDelegate {
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}
