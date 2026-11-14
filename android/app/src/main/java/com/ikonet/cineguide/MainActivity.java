package com.ikonet.cineguide;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin for the ambassador program (Play Install Referrer + hashed device id)
        registerPlugin(ReferralPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
