package com.prepsight.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;

public class MainActivity extends BridgeActivity {
    public static volatile boolean isForeground = false;

    private MediaPlayer ringPlayer;
    private ListenerRegistration callRingListener;

    // JS bridge — fast path if JS bridge happens to work
    private class RingBridge {
        @JavascriptInterface
        public void start() { runOnUiThread(() -> startRingPlayer()); }

        @JavascriptInterface
        public void stop() { runOnUiThread(() -> stopRingPlayer()); }
    }

    private void startRingPlayer() {
        if (ringPlayer != null) return; // already ringing
        try {
            Uri uri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.outgoing_call);
            ringPlayer = new MediaPlayer();
            ringPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build());
            ringPlayer.setDataSource(this, uri);
            ringPlayer.setLooping(true);
            ringPlayer.prepare();
            ringPlayer.start();
        } catch (Exception e) {
            ringPlayer = null;
        }
    }

    private void stopRingPlayer() {
        if (ringPlayer != null) {
            try { if (ringPlayer.isPlaying()) ringPlayer.stop(); ringPlayer.release(); } catch (Exception ignored) {}
            ringPlayer = null;
        }
    }

    // Watches Firestore for outgoing ringing calls — plays/stops ring natively without any JS bridge
    private void startCallRingListener() {
        if (callRingListener != null) return;
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            return;
        }
        String myUid = user.getUid();
        callRingListener = FirebaseFirestore.getInstance()
            .collection("comms_v5_calls")
            .whereEqualTo("callerUid", myUid)
            .addSnapshotListener((snapshot, error) -> {
                if (error != null) {
                    return;
                }
                if (snapshot == null) return;
                long fiveMinutesAgo = System.currentTimeMillis() - 5 * 60 * 1000;
                boolean ringing = false;
                for (DocumentSnapshot doc : snapshot.getDocuments()) {
                    String status = doc.getString("status");
                    Long createdAt = doc.getLong("createdAt");
                    if ("ringing".equals(status) && createdAt != null && createdAt > fiveMinutesAgo) {
                        ringing = true;
                        break;
                    }
                }
                final boolean shouldRing = ringing;
                runOnUiThread(() -> {
                    if (shouldRing) startRingPlayer();
                    else stopRingPlayer();
                });
            });
    }

    private void stopCallRingListener() {
        if (callRingListener != null) { callRingListener.remove(); callRingListener = null; }
        stopRingPlayer();
    }

    @Override
    public void load() {
        WebView.setWebContentsDebuggingEnabled(true);
        registerPlugin(RingPlugin.class);
        super.load();
        android.webkit.WebView wv = getBridge().getWebView();
        wv.clearCache(true);
        wv.addJavascriptInterface(new RingBridge(), "PSRing");
    }

    @Override
    public void onResume() {
        super.onResume();
        isForeground = true;
        startCallRingListener();
    }

    @Override
    public void onPause() {
        super.onPause();
        isForeground = false;
        stopCallRingListener();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
        java.util.List<String> permsNeeded = new java.util.ArrayList<>();
        String[] permsToCheck = { Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA };
        for (String p : permsToCheck) {
            if (ActivityCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED)
                permsNeeded.add(p);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED)
                permsNeeded.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!permsNeeded.isEmpty())
            ActivityCompat.requestPermissions(this, permsNeeded.toArray(new String[0]), 101);
        handleCallIntent(getIntent());
        handleCommsIntent(getIntent());
        // Start ring listener as soon as auth state is available
        FirebaseAuth.getInstance().addAuthStateListener(auth -> {
            if (auth.getCurrentUser() != null) startCallRingListener();
            else stopCallRingListener();
        });
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
        stopService(new Intent(this, CallRingtoneService.class));
        String callId = intent.getStringExtra(CallRingtoneService.EXTRA_CALL_ID);
        String url = "https://prepsight.medaskca.com/comms"
            + (callId != null && !callId.isEmpty() ? "?autoAnswer=" + callId : "");
        final String finalUrl = url;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try { getBridge().getWebView().loadUrl(finalUrl); } catch (Exception ignored) {}
        }, 300);
    }

    private void handleCommsIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("openComms", false)) return;
        String threadId      = intent.getStringExtra("threadId");
        String callSenderUid = intent.getStringExtra("callSenderUid");
        String url = "https://prepsight.medaskca.com/comms";
        if (threadId != null && !threadId.isEmpty()) url += "?threadId=" + threadId;
        else if (callSenderUid != null && !callSenderUid.isEmpty()) url += "?callSender=" + callSenderUid;
        final String finalUrl = url;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try { getBridge().getWebView().loadUrl(finalUrl); } catch (Exception ignored) {}
        }, 300);
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel("prepsight_messages") == null) {
            NotificationChannel messages = new NotificationChannel(
                "prepsight_messages", "PrepSight Messages", NotificationManager.IMPORTANCE_HIGH);
            messages.setDescription("Message notifications");
            messages.enableVibration(true);
            messages.setShowBadge(true);
            nm.createNotificationChannel(messages);
        }
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
