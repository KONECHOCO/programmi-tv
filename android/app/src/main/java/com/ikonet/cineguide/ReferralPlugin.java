package com.ikonet.cineguide;

import android.annotation.SuppressLint;
import android.provider.Settings;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Ambassador program helpers (only used when the user came from an invitation):
 * - getInstallReferrer: the Play Store referrer string, e.g. "utm_campaign=CODE&ref=CODE"
 * - getDeviceId: a SHA-256 hash of the app-scoped ANDROID_ID, so a reinstall on the same phone
 *   is not counted twice. The raw id never leaves the device.
 */
@CapacitorPlugin(name = "Referral")
public class ReferralPlugin extends Plugin {

    @PluginMethod
    public void getInstallReferrer(final PluginCall call) {
        final InstallReferrerClient client = InstallReferrerClient.newBuilder(getContext()).build();
        try {
            client.startConnection(new InstallReferrerStateListener() {
                private boolean done = false;

                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    if (done) return;
                    done = true;
                    JSObject ret = new JSObject();
                    try {
                        if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                            ReferrerDetails details = client.getInstallReferrer();
                            ret.put("referrer", details.getInstallReferrer());
                            ret.put("installedAt", details.getInstallBeginTimestampSeconds());
                        } else {
                            ret.put("referrer", null);
                            ret.put("responseCode", responseCode);
                        }
                        call.resolve(ret);
                    } catch (Exception e) {
                        call.reject("referrer_error", e);
                    } finally {
                        client.endConnection();
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    if (done) return;
                    done = true;
                    call.reject("referrer_disconnected");
                }
            });
        } catch (Exception e) {
            call.reject("referrer_unavailable", e);
        }
    }

    @SuppressLint("HardwareIds")
    @PluginMethod
    public void getDeviceId(PluginCall call) {
        try {
            String androidId = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(("com.ikonet.cineguide-referral:" + androidId).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            JSObject ret = new JSObject();
            ret.put("id", hex.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("device_id_unavailable", e);
        }
    }
}
