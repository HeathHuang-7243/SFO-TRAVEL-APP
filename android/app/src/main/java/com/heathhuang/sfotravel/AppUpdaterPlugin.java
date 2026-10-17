package com.heathhuang.sfotravel;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** User-initiated, same-package and same-signer updates from the project's public releases. */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    @Override protected void handleOnDestroy() {
        cancelled.set(true);
        HttpURLConnection connection = activeConnection;
        if (connection != null) connection.disconnect();
        worker.shutdownNow();
    }
    private final AtomicBoolean downloading = new AtomicBoolean(false);
    private final AtomicBoolean cancelled = new AtomicBoolean(false);
    private volatile HttpURLConnection activeConnection;
    private volatile long downloadedBytes = 0, totalBytes = 0;
    private volatile String phase = "idle", lastUrl = "", lastHash = "", failureCode = "";

    private JSObject downloadState() {
        JSObject state = new JSObject();
        state.put("phase", phase); state.put("downloadedBytes", downloadedBytes); state.put("totalBytes", totalBytes);
        state.put("url", lastUrl); state.put("sha256", lastHash); state.put("errorCode", failureCode);
        return state;
    }
    private void progress(String nextPhase) {
        phase = nextPhase;
        notifyListeners("downloadProgress", downloadState(), true);
    }
    @PluginMethod public void getDownloadState(PluginCall call) { call.resolve(downloadState()); }
    @PluginMethod public void cancelDownload(PluginCall call) {
        if (downloading.get()) {
            cancelled.set(true);
            HttpURLConnection connection = activeConnection;
            if (connection != null) connection.disconnect();
        }
        call.resolve();
    }
    private void requireActive() throws Exception {
        if (cancelled.get()) throw new Exception("DOWNLOAD_CANCELLED");
    }

    private static final long MAX_BYTES = 150L * 1024 * 1024;
    private File apk() { return new File(getContext().getCacheDir(), "updates/SFOBusinessTravel.apk"); }

    static boolean releaseUrl(String value) {
        return value != null && value.matches("https://github\\.com/HeathHuang-7243/SFO-TRAVEL-APP/releases/download/v([0-9]+\\.[0-9]+\\.[0-9]+)/SFOBusinessTravel-v\\1\\.apk");
    }

    @PluginMethod public void downloadUpdate(PluginCall call) {
        String url = call.getString("url"), digest = call.getString("sha256");
        if (!releaseUrl(url) || digest == null || !digest.matches("[a-f0-9]{64}")) {
            call.reject("Invalid update URL or checksum", "INVALID_PACKAGE"); return;
        }
        if (!downloading.compareAndSet(false, true)) { call.reject("Update download is already running", "DOWNLOAD_BUSY"); return; }
        cancelled.set(false); downloadedBytes = 0; totalBytes = call.getLong("size", 0L);
        lastUrl = url; lastHash = digest; failureCode = ""; progress("connecting");
        worker.execute(() -> {
            File part = new File(apk().getParentFile(), "download.part.apk");
            try {
                if (!part.getParentFile().isDirectory() && !part.getParentFile().mkdirs()) throw new Exception("Cannot create update directory");
                HttpURLConnection connection = connect(url);
                try {
                    if (connection.getContentLength() > MAX_BYTES) throw new Exception("Update is too large");
                    if (connection.getContentLength() > 0) totalBytes = connection.getContentLength();
                    MessageDigest hash = MessageDigest.getInstance("SHA-256");
                    long deadline = android.os.SystemClock.elapsedRealtime() + 300000, lastProgress = 0;
                    progress("downloading");
                    try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(part)) {
                        byte[] buffer = new byte[32768]; int count;
                        while ((count = input.read(buffer)) != -1) {
                            requireActive(); downloadedBytes += count;
                            long now = android.os.SystemClock.elapsedRealtime();
                            if (downloadedBytes > MAX_BYTES || now > deadline) throw new Exception("Update download exceeded its limit");
                            hash.update(buffer, 0, count); output.write(buffer, 0, count);
                            if (now - lastProgress >= 150) { progress("downloading"); lastProgress = now; }
                        }
                        output.getFD().sync();
                    }
                    requireActive(); progress("verifying");
                    StringBuilder actual = new StringBuilder();
                    for (byte value : hash.digest()) actual.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
                    if (!digest.equals(actual.toString())) throw new Exception("APK checksum mismatch");
                } finally { connection.disconnect(); activeConnection = null; }
                requireActive(); validateArchive(part); requireActive();
                if (!part.renameTo(apk())) throw new Exception("Cannot save update package");
                progress("ready"); call.resolve();
            } catch (Exception error) {
                String message = String.valueOf(error.getMessage());
                failureCode = cancelled.get() ? "DOWNLOAD_CANCELLED"
                    : message.contains("checksum") ? "CHECKSUM_MISMATCH"
                    : message.contains("signing certificate") ? "SIGNATURE_MISMATCH"
                    : message.contains("Package ID") || message.contains("newer version") ? "INVALID_PACKAGE"
                    : message.contains("No space") || message.contains("save update") || message.contains("directory") ? "STORAGE_ERROR"
                    : "NETWORK_ERROR";
                progress(cancelled.get() ? "cancelled" : "error");
                call.reject(message, failureCode, error);
            } finally { part.delete(); activeConnection = null; downloading.set(false); }
        });
    }

    private HttpURLConnection connect(String address) throws Exception {
        URL url = new URL(address);
        for (int redirect = 0; redirect < 5; redirect++) {
            requireActive();
            String host = url.getHost();
            if (!"https".equals(url.getProtocol()) || url.getUserInfo() != null || (url.getPort() != -1 && url.getPort() != 443)
                || !("github.com".equals(host) || "release-assets.githubusercontent.com".equals(host) || "objects.githubusercontent.com".equals(host)))
                throw new Exception("Untrusted download redirect");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            activeConnection = connection;
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000); connection.setReadTimeout(30000);
            connection.setRequestProperty("User-Agent", "SFOBusinessTravel-Android");
            try {
                int code = connection.getResponseCode();
                if (code == 200) return connection;
                if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                    String location = connection.getHeaderField("Location");
                    if (location == null) throw new Exception("Missing redirect destination");
                    url = new URL(url, location);
                } else { throw new Exception("Download returned HTTP " + code); }
            } catch (Exception error) { connection.disconnect(); throw error; }
            connection.disconnect();
        }
        throw new Exception("Too many download redirects");
    }

    @SuppressWarnings("deprecation")
    private void validateArchive(File file) throws Exception {
        if (!file.isFile()) throw new Exception("请重新下载更新 / Please download the update again");
        PackageManager manager = getContext().getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo next = manager.getPackageArchiveInfo(file.getAbsolutePath(), flags);
        PackageInfo current = manager.getPackageInfo(getContext().getPackageName(), flags);
        if (next == null || !current.packageName.equals(next.packageName)) throw new Exception("安装包名称不匹配 / Package ID mismatch");
        long oldVersion = Build.VERSION.SDK_INT >= 28 ? current.getLongVersionCode() : current.versionCode;
        long newVersion = Build.VERSION.SDK_INT >= 28 ? next.getLongVersionCode() : next.versionCode;
        if (newVersion <= oldVersion) throw new Exception("安装包不是更新版本 / APK is not a newer version");
        if (!signers(current).equals(signers(next))) throw new Exception("安装包签名不匹配 / APK signing certificate mismatch");
    }

    @SuppressWarnings("deprecation")
    private static Set<String> signers(PackageInfo info) throws Exception {
        Signature[] certificates = Build.VERSION.SDK_INT >= 28
            ? (info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners()) : info.signatures;
        if (certificates == null || certificates.length == 0) throw new Exception("Missing signing certificate");
        Set<String> result = new HashSet<>();
        for (Signature certificate : certificates) result.add(certificate.toCharsString());
        return result;
    }

    @PluginMethod public void installUpdate(PluginCall call) {
        if (downloading.get()) { call.reject("请等待下载完成 / Please wait for the download"); return; }
        getBridge().execute(() -> {
            try { validateArchive(apk()); }
            catch (Exception error) { call.reject(error.getMessage(), error); return; }
            getActivity().runOnUiThread(() -> {
                try {
                    boolean permissionRequired = Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls();
                    if (permissionRequired) {
                        getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName())));
                    } else {
                        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk());
                        Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        getActivity().startActivity(intent);
                    }
                    JSObject result = new JSObject(); result.put("permissionRequired", permissionRequired); call.resolve(result);
                } catch (Exception error) { call.reject("无法打开系统安装器 / Cannot open Android installer", error); }
            });
        });
    }
}
