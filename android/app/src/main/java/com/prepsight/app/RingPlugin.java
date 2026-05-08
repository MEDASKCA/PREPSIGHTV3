package com.prepsight.app;

import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RingPlugin")
public class RingPlugin extends Plugin {

    private MediaPlayer player;

    @PluginMethod
    public void startRing(PluginCall call) {
        stopPlayer();
        try {
            Uri uri = Uri.parse("android.resource://" + getContext().getPackageName() + "/" + R.raw.outgoing_call);
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build());
            player.setDataSource(getContext(), uri);
            player.setLooping(true);
            player.prepare();
            player.start();
            call.resolve();
        } catch (Exception e) {
            call.reject("startRing failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopRing(PluginCall call) {
        stopPlayer();
        if (call != null) call.resolve();
    }

    private void stopPlayer() {
        if (player != null) {
            try { if (player.isPlaying()) player.stop(); player.release(); } catch (Exception ignored) {}
            player = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopPlayer();
    }
}
