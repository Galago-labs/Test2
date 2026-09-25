package com.littlepause.game;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Local (non-npm) plugin — must be registered before super.onCreate().
        registerPlugin(YandexAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
