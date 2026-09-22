package com.littlepause.game

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.yandex.mobile.ads.common.AdError
import com.yandex.mobile.ads.common.AdRequest
import com.yandex.mobile.ads.common.AdRequestError
import com.yandex.mobile.ads.common.ImpressionData
import com.yandex.mobile.ads.common.YandexAds
import com.yandex.mobile.ads.interstitial.InterstitialAd
import com.yandex.mobile.ads.interstitial.InterstitialAdEventListener
import com.yandex.mobile.ads.interstitial.InterstitialAdLoadListener
import com.yandex.mobile.ads.interstitial.InterstitialAdLoader

/**
 * Capacitor bridge for Yandex Mobile Ads SDK 8.x.
 *
 * Keeps the JS API unchanged:
 * platform.showInterstitial() -> native -> Yandex interstitial ad.
 */
@CapacitorPlugin(name = "YandexAds")
class YandexAdsPlugin : Plugin() {

    companion object {
        private const val TAG = "YandexAdsPlugin"

        // Replace with your real Yandex ad unit id.
        private const val AD_UNIT_ID = "R-M-0000000-0"
    }

    private var loader: InterstitialAdLoader? = null
    private var adRef: InterstitialAd? = null
    private var pendingCall: PluginCall? = null

    override fun load() {
        YandexAds.initialize(context)
        Log.i(TAG, "Yandex Mobile Ads SDK initialized")
    }

    @PluginMethod
    fun showInterstitial(call: PluginCall) {
        if (pendingCall != null) {
            val result = JSObject()
            result.put("shown", false)
            call.resolve(result)
            return
        }

        pendingCall = call

        activity.runOnUiThread {
            val newLoader = InterstitialAdLoader(context)
            loader = newLoader

            newLoader.loadAd(
                AdRequest.Builder(AD_UNIT_ID).build(),
                object : InterstitialAdLoadListener {
                    override fun onAdLoaded(interstitialAd: InterstitialAd) {
                        adRef = interstitialAd

                        interstitialAd.setAdEventListener(
                            object : InterstitialAdEventListener {
                                override fun onAdShown() {}

                                override fun onAdFailedToShow(adError: AdError) {
                                    Log.i(TAG, "Interstitial failed to show: ${adError.description}")
                                    adRef = null
                                    resolveOnce(false)
                                }

                                override fun onAdDismissed() {
                                    adRef = null
                                    resolveOnce(true)
                                }

                                override fun onAdClicked() {}

                                override fun onAdImpression(impressionData: ImpressionData?) {}
                            }
                        )

                        interstitialAd.show(activity)
                    }

                    override fun onAdFailedToLoad(adRequestError: AdRequestError) {
                        Log.i(TAG, "Interstitial failed to load: ${adRequestError.description}")
                        resolveOnce(false)
                    }
                }
            )
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
