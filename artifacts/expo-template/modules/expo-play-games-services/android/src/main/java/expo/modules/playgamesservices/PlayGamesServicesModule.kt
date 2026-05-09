package expo.modules.playgamesservices

import android.app.Activity
import android.content.Intent
import com.google.android.gms.games.PlayGames
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Thin Kotlin bridge over Google Play Games Services v2 — the
// counterpart to `modules/expo-game-center` (iOS GameKit). Exposes
// the same four functions to JS — isAvailable, authenticate,
// submitScore, presentLeaderboard — so `lib/gameCenter.ts` can
// dispatch by platform without remapping fields.
//
// PGS v2 is the modern API: sign-in is handled transparently by the
// Play Games app, no Google Sign-In OAuth dance required. The user
// signs in once at the device level; subsequent calls return the
// cached identity. Our `authenticate()` therefore acts mostly as a
// "fetch identity" rather than a UI-presenting auth call.
//
// Reference: https://developers.google.com/games/services/android/quickstart
class PlayGamesServicesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPlayGamesServices")

    // Module installation check. Returns true when the native lib is
    // linked — in Expo Go / web this returns false because the
    // module isn't included. Distinct from "Play Games is signed in"
    // (handled by authenticate()).
    Function("isAvailable") {
      true
    }

    AsyncFunction("authenticate") { promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.resolve(buildResult(false, errorMessage = "No active Activity"))
        return@AsyncFunction
      }

      val gamesSignInClient = PlayGames.getGamesSignInClient(activity)

      // PGS v2 signInIntent: returns success/failure of the cached
      // sign-in state. If the user has the Play Games app and is
      // signed in, this resolves immediately. Otherwise the user is
      // shown a system prompt and the call resolves on their choice.
      gamesSignInClient.isAuthenticated.addOnCompleteListener { task ->
        val authenticated = task.isSuccessful && task.result?.isAuthenticated == true
        if (!authenticated) {
          // Trigger an interactive sign-in attempt. The result fires
          // back through the same listener pattern; PGS handles the
          // UI without us needing to track an intent result.
          gamesSignInClient.signIn().addOnCompleteListener { signInTask ->
            val ok = signInTask.isSuccessful && signInTask.result?.isAuthenticated == true
            if (ok) {
              fetchPlayer(activity, promise)
            } else {
              val err = signInTask.exception?.localizedMessage
                ?: "Play Games sign-in declined"
              promise.resolve(buildResult(false, errorMessage = err))
            }
          }
        } else {
          fetchPlayer(activity, promise)
        }
      }
    }

    AsyncFunction("submitScore") { score: Long, leaderboardIDs: List<String>, promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      if (leaderboardIDs.isEmpty()) {
        promise.resolve(false)
        return@AsyncFunction
      }

      val client = PlayGames.getLeaderboardsClient(activity)
      // Submit to every provided leaderboard ID — same shape as the
      // iOS call site. For a Suika-like single leaderboard "Best
      // score per theme", this is a list of one. PGS accepts the
      // calls in parallel; we resolve true if at least one succeeds.
      var remaining = leaderboardIDs.size
      var anySucceeded = false

      for (leaderboardID in leaderboardIDs) {
        client.submitScoreImmediate(leaderboardID, score)
          .addOnCompleteListener { task ->
            if (task.isSuccessful) {
              anySucceeded = true
            }
            remaining -= 1
            if (remaining == 0) {
              promise.resolve(anySucceeded)
            }
          }
      }
    }

    AsyncFunction("presentLeaderboard") { leaderboardID: String?, promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }

      val client = PlayGames.getLeaderboardsClient(activity)

      // Two surfaces: a single leaderboard's UI vs. the all-
      // leaderboards picker. PGS provides distinct intents for each.
      val intentTask = if (leaderboardID.isNullOrEmpty()) {
        client.allLeaderboardsIntent
      } else {
        client.getLeaderboardIntent(leaderboardID)
      }

      intentTask.addOnSuccessListener { intent: Intent ->
        try {
          activity.startActivityForResult(intent, RC_LEADERBOARD_UI)
          promise.resolve(true)
        } catch (e: Exception) {
          promise.resolve(false)
        }
      }.addOnFailureListener {
        promise.resolve(false)
      }
    }
  }

  // Resolve the player identity once we know the user is signed in.
  // Called by both branches of `authenticate()` — the no-op-already-
  // signed-in case and the interactive-sign-in case.
  private fun fetchPlayer(activity: Activity, promise: Promise) {
    val playersClient = PlayGames.getPlayersClient(activity)
    playersClient.currentPlayer.addOnCompleteListener { task ->
      if (task.isSuccessful) {
        val player = task.result
        // `alias` is null on Android: it's an Apple Game Center
        // concept (GKPlayer.alias = the @-handle, distinct from
        // displayName). Google's Play Games Player class only has
        // displayName, so we leave alias unpopulated and the JS
        // dispatch layer treats it as undefined on Android.
        promise.resolve(buildResult(
          authenticated = true,
          displayName = player?.displayName,
          alias = null,
          gamePlayerID = player?.playerId,
        ))
      } else {
        // Signed in but couldn't fetch profile — partial success.
        // Surface the auth flag without identity fields so the caller
        // can decide whether to retry or proceed unauthenticated.
        promise.resolve(buildResult(
          authenticated = true,
          errorMessage = task.exception?.localizedMessage,
        ))
      }
    }
  }

  private fun buildResult(
    authenticated: Boolean,
    displayName: String? = null,
    alias: String? = null,
    gamePlayerID: String? = null,
    teamPlayerID: String? = null,
    errorMessage: String? = null,
  ): Map<String, Any?> {
    val out = mutableMapOf<String, Any?>("authenticated" to authenticated)
    if (displayName != null) out["displayName"] = displayName
    if (alias != null) out["alias"] = alias
    if (gamePlayerID != null) out["gamePlayerID"] = gamePlayerID
    if (teamPlayerID != null) out["teamPlayerID"] = teamPlayerID
    if (errorMessage != null) out["errorMessage"] = errorMessage
    return out
  }

  companion object {
    // Arbitrary request code for the leaderboard UI intent. PGS
    // doesn't return data through onActivityResult for the UI flow
    // (it's a one-way show-then-dismiss), so the value just has to
    // be unique in our app's request-code space.
    private const val RC_LEADERBOARD_UI = 9001
  }
}
