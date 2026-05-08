package com.prepsight.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** True while the app is in the foreground — checked by PrepSightMessagingService */
    public static volatile boolean isForeground = false;

    @Override
    public void load() {
        registerPlugin(RingPlugin.class);
        super.load();
    }

    @Override
    public void onResume() {
        super.onResume();
        isForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        isForeground = false;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
        // Request all runtime permissions up-front so users aren't prompted mid-call
        java.util.List<String> permsNeeded = new java.util.ArrayList<>();
        String[] permsToCheck = {
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
        };
        for (String p : permsToCheck) {
            if (ActivityCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                permsNeeded.add(p);
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                permsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
        if (!permsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permsNeeded.toArray(new String[0]),
                101
            );
        }
        handleCallIntent(getIntent());
        handleCommsIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleCallIntent(intent);
        handleCommsIntent(intent);
    }

    private void handleCallIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("answerCall", false)) return;
        // Stop the ringtone/vibration immediately — Answer was tapped
        stopService(new Intent(this, CallRingtoneService.class));
        String callId = intent.getStringExtra(CallRingtoneService.EXTRA_CALL_ID);
        // Include callId so the web app can auto-answer the right call
        String url = "https://prepsight.medaskca.com/comms"
            + (callId != null && !callId.isEmpty() ? "?autoAnswer=" + callId : "");
        final String finalUrl = url;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                getBridge().getWebView().loadUrl(finalUrl);
            } catch (Exception ignored) {}
        }, 300);
    }

    private void handleCommsIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("openComms", false)) return;
        String threadId      = intent.getStringExtra("threadId");
        String callSenderUid = intent.getStringExtra("callSenderUid");
        String url = "https://prepsight.medaskca.com/comms";
        if (threadId != null && !threadId.isEmpty()) {
            url += "?threadId=" + threadId;
        } else if (callSenderUid != null && !callSenderUid.isEmpty()) {
            url += "?callSender=" + callSenderUid;
        }
        final String finalUrl = url;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                getBridge().getWebView().loadUrl(finalUrl);
            } catch (Exception ignored) {}
        }, 300);
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);

        // Message channel — uses device default notification sound (chime)
        if (nm.getNotificationChannel("prepsight_messages") == null) {
            NotificationChannel messages = new NotificationChannel(
                "prepsight_messages", "PrepSight Messages", NotificationManager.IMPORTANCE_HIGH);
            messages.setDescription("Message notifications");
            messages.enableVibration(true);
            messages.setShowBadge(true);
            nm.createNotificationChannel(messages);
        }

        // Legacy comms channel — kept so existing installs don't lose their channel
        if (nm.getNotificationChannel("prepsight_comms") == null) {
            NotificationChannel comms = new NotificationChannel(
                "prepsight_comms", "PrepSight Comms", NotificationManager.IMPORTANCE_HIGH);
            comms.setDescription("Messages and calls");
            comms.enableVibration(true);
            comms.setShowBadge(true);
            nm.createNotificationChannel(comms);
        }
    }
}
