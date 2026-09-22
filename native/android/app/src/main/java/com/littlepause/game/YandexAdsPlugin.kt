package com.littlepause.game

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.yandex.mobile.ads.common.AdError
import com.yandex.mobile.ads.common.AdRequestConfiguration
import com.yandex.mobile.ads.common.AdRequestError
import com.yandex.mobile.ads.common.ImpressionData
import com.yandex.mobile.ads.common.MobileAds
import com.yandex.mobile.ads.interstitial.InterstitialAd
import com.yandex.mobile.ads.interstitial.InterstitialAdEventListener
import com.yandex.mobile.ads.interstitial.InterstitialAdLoadListener
import com.yandex.mobile.ads.interstitial.InterstitialAdLoader

/**
 * Bridges the web game's platform.showInterstitial(...) call (see
 * src/platform/capacitorBridge.ts on the JS side) to the native Yandex Mobile
 * Ads SDK. Registered in MainActivity.java.
 *
 * VERIFIED against the current, official docs (September 2026):
 * https://ads.yandex.com/helpcenter/en/dev/android/interstitial and
 * https://ads.yandex.com/helpcenter/en/dev/android/quick-start — the
 * InterstitialAdLoader / InterstitialAdLoadListener / InterstitialAdEventListener
 * class and method names below, the initialize() call shape, and the SDK
 * version (8.1.0) all match that page directly, not a guess from adjacent
 * SDKs. One thing their own docs explicitly warn about, which the earlier
 * draft of this file got wrong: "maintain a strong reference to the loader
 * AND the ad throughout the screen's lifecycle to avoid cleanup by the
 * garbage collector" — the ad is now held in a class field (adRef below),
 * not just a callback-local variable.
 *
 * ONE THING YOU MUST CHANGE BEFORE THIS WORKS FOR REAL:
 *  AD_UNIT_ID below — replace with your real interstitial ad unit id from
 *  ads.yandex.com/monetization (your app -> Ad units -> New ad unit ->
 *  Interstitial). That ID is what actually ties an impression back to your
 *  account for crediting — see the chat answer for the full explanation.
 */
@CapacitorPlugin(name = "YandexAds")
class YandexAdsPlugin : Plugin() {

    companion object {
        private const val TAG = "YandexAdsPlugin"
        // Placeholder in the REAL format (R-M-<7 digits>-<1 digit>) — swap for
        // your real interstitial ad unit id from ads.yandex.com/monetization,
        // created under Monetization -> your app -> Ad units. This exact
        // string is what ties an impression back to your account: there is no
        // separate account key/token anywhere in this file. See the chat
        // answer for the full explanation of why that's enough.
        private const val AD_UNIT_ID = "R-M-0000000-0"
    }

    private var loader: InterstitialAdLoader? = null
    private var adRef: InterstitialAd? = null // kept alive on purpose — see the class doc comment
    private var pendingCall: PluginCall? = null

    override fun load() {
        // Initialization is asynchronous; we don't block showInterstitial() on
        // it finishing since loadAd() below will simply fail (and we resolve
        // "shown: false") if the SDK isn't ready yet — same fallback shape as
        // every other "no ad this time" path.
        MobileAds.initialize(context) {
            Log.i(TAG, "Yandex Mobile Ads SDK initialized")
        }
    }

    @PluginMethod
    fun showInterstitial(call: PluginCall) {
        if (pendingCall != null) {
            // A call is already in flight; resolve this one as "not shown"
            // rather than leaving it hanging or clobbering the first caller.
            val result = JSObject()
            result.put("shown", false)
            call.resolve(result)
            return
        }
        pendingCall = call
        // Per Yandex's docs: "all calls to Yandex Mobile Ads SDK methods must
        // be made from the main thread" — not just the final show() call.
        activity.runOnUiThread {
            val newLoader = InterstitialAdLoader(context)
            loader = newLoader
            newLoader.setAdLoadListener(object : InterstitialAdLoadListener {
                override fun onAdLoaded(interstitialAd: InterstitialAd) {
                    adRef = interstitialAd
                    interstitialAd.setAdEventListener(object : InterstitialAdEventListener {
                        override fun onAdShown() { /* Sound is already muted on the JS side before this call. */ }
                        override fun onAdFailedToShow(adError: AdError) { adRef = null; resolveOnce(false) }
                        override fun onAdDismissed() { adRef = null; resolveOnce(true) }
                        override fun onAdClicked() { /* No-op. */ }
                        override fun onAdImpression(impressionData: ImpressionData?) { /* No-op: not tracking revenue here. */ }
                    })
                    interstitialAd.show(activity)
                }

                override fun onAdFailedToLoad(adRequestError: AdRequestError) {
                    // Do not retry automatically here — Yandex's docs specifically
                    // ask integrators not to loop retries on failure.
                    Log.i(TAG, "Interstitial failed to load: " + adRequestError.description)
                    resolveOnce(false)
                }
            })
            newLoader.loadAd(AdRequestConfiguration.Builder(AD_UNIT_ID).build())
        }
    }

    private fun resolveOnce(shown: Boolean) {
        val call = pendingCall ?: return
        pendingCall = null
        val result = JSObject()
        result.put("shown", shown)
        call.resolve(result)
    }
}
