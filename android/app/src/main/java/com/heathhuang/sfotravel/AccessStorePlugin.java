package com.heathhuang.sfotravel;

import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.util.Objects;

/** Private, atomic password-verifier storage; never stores plaintext passwords. */
@CapacitorPlugin(name = "AccessStore")
public class AccessStorePlugin extends Plugin {
    private static final Object MUTEX = new Object();
    private SharedPreferences preferences() { return getContext().getSharedPreferences("access_lock", 0); }
    @PluginMethod public void read(PluginCall call) {
        synchronized (MUTEX) {
            JSObject result = new JSObject();
            String value = preferences().getString("record", null);
            result.put("value", value == null ? JSONObject.NULL : value);
            call.resolve(result);
        }
    }
    @PluginMethod public void replace(PluginCall call) {
        String expected = call.getString("expected"), value = call.getString("value");
        if (value == null || value.length() > 4096) { call.reject("Invalid password settings"); return; }
        getBridge().execute(() -> {
            synchronized (MUTEX) {
                SharedPreferences preferences = preferences();
                if (!Objects.equals(preferences.getString("record", null), expected)) { call.reject("Password settings changed; please retry"); return; }
                if (!preferences.edit().putString("record", value).commit()) { call.reject("Could not save password settings"); return; }
                call.resolve();
            }
        });
    }
}
