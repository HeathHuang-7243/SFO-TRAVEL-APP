package com.heathhuang.sfotravel;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "TravelDevice", permissions = {
    @Permission(alias = "legacyGallery", strings = {Manifest.permission.WRITE_EXTERNAL_STORAGE})
})
public class TravelDevicePlugin extends Plugin {
    @PluginMethod public void setTheme(PluginCall call) {
        String mode = call.getString("mode");
        if (!"light".equals(mode) && !"dark".equals(mode) && !"auto".equals(mode)) { call.reject("Invalid theme mode"); return; }
        getActivity().runOnUiThread(() -> {
            MainActivity activity = (MainActivity) getActivity();
            activity.getSharedPreferences("appearance", 0).edit().putString("mode", mode).apply();
            activity.applySystemTheme();
            call.resolve();
        });
    }

    @PluginMethod public void getSystemTheme(PluginCall call) {
        getActivity().runOnUiThread(() -> call.resolve(systemTheme()));
    }

    private JSObject systemTheme() {
        JSObject result = new JSObject();
        result.put("dark", ((MainActivity) getActivity()).isSystemDark());
        return result;
    }

    void publishSystemTheme() {
        notifyListeners("systemThemeChanged", systemTheme(), true);
    }

    @PluginMethod public void saveReceiptToGallery(PluginCall call) {
        try { ReceiptGallery.receipt(getContext(), call.getString("path")); }
        catch (Exception error) { call.reject("凭证照片不存在 / Receipt photo is missing", error); return; }
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && getPermissionState("legacyGallery") != PermissionState.GRANTED) {
            requestPermissionForAlias("legacyGallery", call, "galleryPermissionResult");
        } else { writeGallery(call); }
    }

    @PermissionCallback private void galleryPermissionResult(PluginCall call) {
        if (getPermissionState("legacyGallery") != PermissionState.GRANTED) {
            call.reject("未授予相册保存权限 / Gallery permission was denied", "GALLERY_PERMISSION_DENIED");
            return;
        }
        writeGallery(call);
    }

    private void writeGallery(PluginCall call) {
        getBridge().execute(() -> {
            try {
                JSObject result = new JSObject();
                result.put("uri", ReceiptGallery.save(getContext(), ReceiptGallery.receipt(getContext(), call.getString("path"))).toString());
                call.resolve(result);
            } catch (Exception error) {
                call.reject("无法保存到相册，请检查权限和剩余空间 / Check gallery permission and free space", error);
            }
        });
    }
}
