package com.heathhuang.sfotravel;

import android.Manifest;
import android.os.Build;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
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
    @PluginMethod public void saveDocument(PluginCall call) {
        try {
            exportFile(call.getString("path"));
            String name = call.getString("name", "SFOTravel-backup.json");
            if (!name.matches("[A-Za-z0-9._-]{1,150}")) throw new Exception("Invalid filename");
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, name);
            startActivityForResult(call, intent, "documentResult");
        } catch (Exception error) { call.reject("无法打开保存位置 / Cannot open save location", error); }
    }

    private File exportFile(String path) throws Exception {
        if (path == null || !path.matches("exports/[A-Za-z0-9._-]+")) throw new Exception("Invalid export path");
        File root = new File(getContext().getCacheDir(), "exports").getCanonicalFile();
        File file = new File(getContext().getCacheDir(), path).getCanonicalFile();
        if (!root.equals(file.getParentFile()) || !file.isFile()) throw new Exception("Missing export file");
        return file;
    }

    @ActivityCallback private void documentResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            JSObject value = new JSObject(); value.put("saved", false); call.resolve(value); return;
        }
        getBridge().execute(() -> {
            try (FileInputStream input = new FileInputStream(exportFile(call.getString("path")));
                 OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                if (output == null) throw new Exception("Cannot open output file");
                byte[] buffer = new byte[32768]; int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                output.flush();
            } catch (Exception error) { call.reject("备份未能保存，请重试 / Backup was not saved; please retry", error); return; }
            JSObject value = new JSObject(); value.put("saved", true); call.resolve(value);
        });
    }
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
