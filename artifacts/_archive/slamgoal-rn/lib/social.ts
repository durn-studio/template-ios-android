// Social + retention helpers — rate-us prompt, share, invite.
// Each fires its matching AppsFlyer "gaming" vertical event so
// campaign-level reporting lines up with the onboarding checklist.
//
// All three helpers degrade to no-ops on Expo Go / web where their
// native modules aren't linked; safe to call from any screen.

import Constants from "expo-constants";
import { Alert, Linking, Platform, Share } from "react-native";

import { logEvent } from "@/lib/analytics";

// App Store Connect numeric id for the iOS app. Used to build the
// canonical App Store URL shared via Share / Invite. Android gets a
// Play Store link of the form `market://details?id=<package>`.
const IOS_APP_STORE_URL = "https://apps.apple.com/app/idREPLACE_WITH_ASC_APP_ID";
const ANDROID_PACKAGE = "REPLACE_WITH_ANDROID_PACKAGE";
const ANDROID_PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

function storeUrlForPlatform(): string {
  if (Platform.OS === "android") return ANDROID_PLAY_URL;
  return IOS_APP_STORE_URL;
}

const inExpoGo = Constants.appOwnership === "expo";

// Native-only dynamic import for expo-store-review. Falls back to
// opening the store page directly (manual rating flow) when the
// in-app prompt isn't available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let StoreReview: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  StoreReview = require("expo-store-review");
} catch {
  StoreReview = null;
}

/**
 * Ask the player to rate the app. Uses Apple's in-app review prompt
 * on iOS (SKStoreReviewController) and Google's equivalent on
 * Android. Both OSes throttle how often the prompt can actually
 * appear (Apple: max 3 per year per user); we just fire the request
 * and let the OS decide.
 *
 * Fires `af_rate` regardless of whether the prompt actually displayed
 * — AppsFlyer tracks *ask rate*, which is what campaign optimisation
 * wants.
 */
export async function requestRating(): Promise<void> {
  void logEvent("af_rate");

  if (inExpoGo || !StoreReview) return;
  try {
    const available = await StoreReview.isAvailableAsync();
    if (available) {
      await StoreReview.requestReview();
      return;
    }
    // Fall back to opening the store listing directly.
    const url = await StoreReview.storeUrl();
    if (url) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // Swallow — nothing we can show the user usefully, and the
    // failure mode is identical to the user just not rating.
  }
  // Last-resort fallback if expo-store-review couldn't determine the URL.
  try {
    await Linking.openURL(storeUrlForPlatform());
  } catch {
    // noop
  }
}

/**
 * Share the player's score via the OS share sheet. Fires `af_share`.
 * Pass the score + world name so the share text can read naturally
 * ("I scored 12,340 in Football Masters! …"). No identifier — the
 * App Store URL alone is enough for attribution because the install
 * event ships with our customer_user_id.
 */
export async function shareScore(opts: {
  score: number;
  worldName: string;
  title: string;
  // Fully-rendered share body already in the player's language.
  // Callers build this via i18n so translations stay in one place.
  message: string;
}): Promise<void> {
  try {
    const result = await Share.share({
      title: opts.title,
      message: opts.message,
      url: IOS_APP_STORE_URL, // iOS-only; Android ignores this.
    });
    void logEvent("af_share", {
      af_content_type: "score",
      af_description: `score_${opts.score}_world_${opts.worldName}`,
      af_success: result.action === Share.sharedAction,
    });
  } catch {
    // User cancelled or the share sheet errored — nothing to surface.
  }
}

/**
 * Prompt the user to invite a friend to download the app. Same
 * underlying share sheet as `shareScore` but tagged as `af_invite`
 * so campaign reporting separates "this user shares scores" from
 * "this user brings in installs".
 */
export async function inviteFriend(opts: {
  title: string;
  message: string;
}): Promise<void> {
  try {
    const result = await Share.share({
      title: opts.title,
      message: opts.message,
      url: IOS_APP_STORE_URL,
    });
    void logEvent("af_invite", {
      af_content_type: "referral",
      af_success: result.action === Share.sharedAction,
    });
  } catch {
    // noop
  }
}

/**
 * Helper: should we fire a rating request yet? Callers pass a
 * counter (e.g. total games completed since install). We ask once
 * at `minGamesBeforePrompt` and again every `repeatInterval` games —
 * Apple throttles the actual prompt anyway. Returns the decision
 * rather than calling `requestRating` so callers can mix in their
 * own guards (e.g. don't prompt right on top of a paywall).
 */
export function shouldRequestRating(
  gamesCompleted: number,
  minGamesBeforePrompt = 3,
  repeatInterval = 20,
): boolean {
  if (gamesCompleted < minGamesBeforePrompt) return false;
  if (gamesCompleted === minGamesBeforePrompt) return true;
  return (gamesCompleted - minGamesBeforePrompt) % repeatInterval === 0;
}

// Small guard so `Alert` import doesn't trip eslint-no-unused-vars
// if future callers stop using it. Real codepaths don't reach here.
export function __debugAlert(msg: string): void {
  if (__DEV__) Alert.alert("social", msg);
}
