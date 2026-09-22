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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "YandexAds")
class YandexAdsPlugin : Plugin() {

    companion object {
        private const val TAG = "YandexAdsPlugin"
        private const val AD_UNIT_ID = "R-M-0000000-0"
    }

    private var loader: InterstitialAdLoader? = null
    private var adRef: InterstitialAd? = null
    private var pendingCall: PluginCall? = null

    override fun load() {
        MobileAds.initialize(context) {
            Log.i(TAG, "Yandex Mobile Ads SDK initialized")
        }
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

        // Yandex SDK v7+ / v8+ requires loadAd() to be called from a Coroutine (suspend function)
        // on the Main thread.
        CoroutineScope(Dispatchers.Main).launch {
            val newLoader = InterstitialAdLoader(context)
            loader = newLoader
            newLoader.setAdLoadListener(object : InterstitialAdLoadListener {
                override fun onAdLoaded(interstitialAd: InterstitialAd) {
                    adRef = interstitialAd
                    interstitialAd.setAdEventListener(object : InterstitialAdEventListener {
                        override fun onAdShown() {}
                        override fun onAdFailedToShow(adError: AdError) {
                            adRef = null
                            resolveOnce(false)
                        }
                        override fun onAdDismissed() {
                            adRef = null
                            resolveOnce(true)
                        }
                        override fun onAdClicked() {}
                        override fun onAdImpression(impressionData: ImpressionData?) {}
                    })
                    interstitialAd.show(activity)
                }

                override fun onAdFailedToLoad(adRequestError: AdRequestError) {
                    Log.i(TAG, "Interstitial failed to load: " + adRequestError.description)
                    resolveOnce(false)
                }
            })
            val adRequestConfiguration = AdRequestConfiguration.Builder(AD_UNIT_ID).build()
            newLoader.loadAd(adRequestConfiguration)
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
