package com.heathhuang.sfotravel;

import com.getcapacitor.BridgeActivity;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TravelDevicePlugin.class);
        registerPlugin(AppUpdaterPlugin.class);
        registerPlugin(AccessStorePlugin.class);
        super.onCreate(savedInstanceState);
        applySystemTheme();
    }

    @Override public void onResume() {
        super.onResume();
        applySystemTheme();
        publishSystemTheme();
    }

    @Override public void onConfigurationChanged(Configuration configuration) {
        super.onConfigurationChanged(configuration);
        applySystemTheme();
        publishSystemTheme();
    }

    boolean isSystemDark() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }

    private void publishSystemTheme() {
        if (getBridge() == null || getBridge().getPlugin("TravelDevice") == null) return;
        ((TravelDevicePlugin) getBridge().getPlugin("TravelDevice").getInstance()).publishSystemTheme();
    }

    @SuppressWarnings("deprecation")
    void applySystemTheme() {
        android.content.SharedPreferences preferences = getSharedPreferences("appearance", 0);
        String mode = preferences.getString("mode", null);
        boolean dark = mode == null ? preferences.getBoolean("dark", isSystemDark())
            : "auto".equals(mode) ? isSystemDark() : "dark".equals(mode);
        int color = Color.parseColor(dark ? "#152019" : "#fbfcf9");
        View decor = getWindow().getDecorView();
        WindowCompat.getInsetsController(getWindow(), decor).setAppearanceLightStatusBars(!dark);
        WindowCompat.getInsetsController(getWindow(), decor).setAppearanceLightNavigationBars(!dark);
        getWindow().setStatusBarColor(color);
        // Before API 26 navigation buttons cannot be dark; use a dark backdrop.
        getWindow().setNavigationBarColor(Build.VERSION.SDK_INT < 26 ? Color.parseColor("#152019") : color);
        decor.setBackgroundColor(color);
        // API 35 enforces transparent bars. Color the view behind Capacitor's inset margins.
        if (getBridge() != null && getBridge().getWebView().getParent() instanceof View) {
            ((View) getBridge().getWebView().getParent()).setBackgroundColor(color);
        }
    }
}
