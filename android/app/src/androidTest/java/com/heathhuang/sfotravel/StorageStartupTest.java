package com.heathhuang.sfotravel;

import static org.junit.Assert.*;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.os.SystemClock;
import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.provider.MediaStore;
import android.database.Cursor;
import androidx.core.view.WindowCompat;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Exercises the packaged WebView and real Capacitor SQLite bridge on Android. */
@RunWith(AndroidJUnit4.class)
public class StorageStartupTest {
    private static final String DB_FILE = "sfo_travelSQLite.db";
    private static final String PERSONAL = "{\"version\":1,\"expenses\":[],\"favorites\":[\"native-test\"]}";
    private ActivityScenario<MainActivity> scenario;

    @Before public void resetTestDatabase() {
        // Only used in the isolated instrumentation test installation.
        Context context = ApplicationProvider.getApplicationContext();
        context.deleteDatabase(DB_FILE);
    }

    @After public void closeActivity() {
        if (scenario != null) scenario.close();
    }

    @Test public void freshInstallAndWebViewReloadPreserveChunkedRecords() throws Exception {
        launch();
        assertEquals("android", new JSONArray("[" + evaluate("Capacitor.getPlatform()") + "]").getString(0));
        assertEquals(2, query("SELECT name FROM sqlite_master WHERE name IN ('local_data','local_chunks')").length());
        JSONObject statement = new JSONObject()
            .put("statement", "INSERT INTO local_chunks(key,part,value) VALUES(?,?,?)")
            .put("values", new JSONArray().put("personal:v1").put(0).put(PERSONAL));
        nativeCall("executeSet", new JSONObject().put("set", new JSONArray().put(statement)).put("transaction", true));
        for (int i = 0; i < 3; i++) {
            reload();
            assertEquals(PERSONAL, query("SELECT value FROM local_chunks WHERE key='personal:v1'").getJSONObject(0).getString("value"));
        }
    }

    @Test public void partialOldSchemaIsRepairedWithoutResettingLegacyRecords() throws Exception {
        Context context = ApplicationProvider.getApplicationContext();
        try (SQLiteDatabase db = context.openOrCreateDatabase(DB_FILE, Context.MODE_PRIVATE, null)) {
            db.execSQL("CREATE TABLE local_data (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)");
            db.execSQL("INSERT INTO local_data(key,value) VALUES(?,?)", new Object[]{"personal:v1", PERSONAL});
            db.setVersion(1);
        }
        launch();
        assertEquals(0, query("SELECT * FROM local_chunks").length());
        assertEquals(PERSONAL, query("SELECT value FROM local_data WHERE key='personal:v1'").getJSONObject(0).getString("value"));
        reload();
        assertEquals(PERSONAL, query("SELECT value FROM local_data WHERE key='personal:v1'").getJSONObject(0).getString("value"));
    }

    private void launch() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        awaitApp();
    }

    @Test public void themeUpdatesStatusIconsAndInsetBackgroundAcrossReloadAndRecreation() throws Exception {
        launch();
        evaluate("document.querySelector('.settings-trigger').click(); true");
        await("!!document.querySelector('.settings-panel')");
        selectTheme("dark");
        awaitBars(true);
        evaluate("document.querySelector('[aria-label=\"关闭设置\"], [aria-label=\"Close settings\"]').click(); true");
        await("!document.querySelector('.settings-panel')");
        screenshot("test-status-dark.png");
        reload();
        awaitBars(true);
        evaluate("document.querySelector('.settings-trigger').click(); true");
        selectTheme("light");
        awaitBars(false);
        evaluate("document.querySelector('[aria-label=\"关闭设置\"], [aria-label=\"Close settings\"]').click(); true");
        await("!document.querySelector('.settings-panel')");
        screenshot("test-status-light.png");
        scenario.recreate();
        awaitApp();
        awaitBars(false);
    }

    @Test public void galleryCopiesAnOwnedReceiptWithoutLibraryPermissionAndRetryDoesNotDuplicate() throws Exception {
        launch();
        Context context = ApplicationProvider.getApplicationContext();
        assertEquals(PackageManager.PERMISSION_DENIED, context.checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES));
        assertEquals(PackageManager.PERMISSION_DENIED, context.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE));
        File file = new File(context.getFilesDir(), "receipts/native-gallery-test.jpg");
        assertTrue(file.getParentFile().isDirectory() || file.getParentFile().mkdirs());
        Bitmap bitmap = Bitmap.createBitmap(8, 8, Bitmap.Config.ARGB_8888);
        bitmap.eraseColor(Color.GREEN);
        try (FileOutputStream output = new FileOutputStream(file)) { assertTrue(bitmap.compress(Bitmap.CompressFormat.JPEG, 85, output)); }
        bitmap.recycle();
        Uri uri = null;
        try {
            JSONObject options = new JSONObject().put("path", "receipts/native-gallery-test.jpg");
            uri = Uri.parse(pluginCall("TravelDevice", "saveReceiptToGallery", options).getString("uri"));
            assertEquals("content", uri.getScheme());
            try (Cursor cursor = context.getContentResolver().query(uri, new String[]{MediaStore.Images.Media.IS_PENDING, MediaStore.Images.Media.RELATIVE_PATH}, null, null, null)) {
                assertNotNull(cursor);
                assertTrue(cursor.moveToFirst());
                assertEquals(0, cursor.getInt(0));
                assertEquals("Pictures/SFO Travel/", cursor.getString(1));
            }
            try (InputStream input = context.getContentResolver().openInputStream(uri)) {
                Bitmap saved = BitmapFactory.decodeStream(input);
                assertNotNull(saved);
                assertEquals(8, saved.getWidth());
                saved.recycle();
            }
            assertEquals(uri.toString(), pluginCall("TravelDevice", "saveReceiptToGallery", options).getString("uri"));
            assertTrue(file.isFile());
            assertThrows(java.io.IOException.class, () -> ReceiptGallery.receipt(context, "../secret.jpg"));
        } finally {
            if (uri != null) context.getContentResolver().delete(uri, null, null);
            file.delete();
        }
    }

    @Test public void automaticThemeFollowsSystemAndManualSelectionOverridesIt() throws Exception {
        String original = shellOutput("cmd uimode night").trim().replaceFirst("(?s).*Night mode: ", "").trim();
        assertTrue("Unexpected system night mode: " + original, original.matches("yes|no|auto"));
        try {
            launch();
            evaluate("document.querySelector('.settings-trigger').click(); true");
            selectTheme("auto");
            evaluate("document.querySelector('.settings-footer button').click(); true");
            shellOutput("cmd uimode night no");
            awaitBars(false);
            shellOutput("cmd uimode night yes");
            awaitBars(true);
            reload();
            assertEquals("\"auto\"", evaluate("localStorage.getItem('bay-theme')"));
            awaitBars(true);
            scenario.recreate();
            awaitApp();
            awaitBars(true);

            evaluate("document.querySelector('.settings-trigger').click(); true");
            selectTheme("light");
            awaitBars(false);
            shellOutput("cmd uimode night no");
            awaitSystemTheme(false);
            shellOutput("cmd uimode night yes");
            awaitSystemTheme(true);
            awaitBars(false);
            selectTheme("auto");
            awaitBars(true);
            evaluate("document.querySelector('.settings-footer button').click(); true");
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);
            shellOutput("cmd uimode night no");
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);
            awaitApp();
            awaitBars(false);
        } finally {
            shellOutput("cmd uimode night " + original);
        }
    }

    private void awaitSystemTheme(boolean dark) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 10000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if (pluginCall("TravelDevice", "getSystemTheme", new JSONObject()).getBoolean("dark") == dark) return;
            SystemClock.sleep(100);
        }
        fail("System night mode did not change");
    }

    private void selectTheme(String mode) throws Exception {
        await("!!document.querySelector('[data-theme-mode=\"" + mode + "\"]')");
        evaluate("document.querySelector('[data-theme-mode=\"" + mode + "\"]').click(); true");
        await("document.documentElement.dataset.themePreference === '" + mode + "'");
    }

    private void awaitBars(boolean dark) throws Exception {
        await("document.documentElement.dataset.theme === '" + (dark ? "dark" : "light") + "'");
        long deadline = SystemClock.elapsedRealtime() + 5000;
        AtomicReference<Boolean> correct = new AtomicReference<>(false);
        do {
            scenario.onActivity(activity -> {
                android.view.View decor = activity.getWindow().getDecorView();
                androidx.core.view.WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(activity.getWindow(), decor);
                android.view.View background = (android.view.View) activity.getBridge().getWebView().getParent();
                correct.set(controller.isAppearanceLightStatusBars() == !dark && controller.isAppearanceLightNavigationBars() == !dark
                    && background.getBackground() instanceof ColorDrawable
                    && ((ColorDrawable) background.getBackground()).getColor() == Color.parseColor(dark ? "#152019" : "#fbfcf9"));
            });
            if (correct.get()) return;
            SystemClock.sleep(100);
        } while (SystemClock.elapsedRealtime() < deadline);
        fail("System bar icon contrast or inset background does not match " + (dark ? "dark" : "light") + " mode");
    }

    private void screenshot(String name) throws Exception {
        // Test-runner shell capture includes real system bars and survives APK teardown.
        assertTrue(name.matches("test-status-(dark|light)\\.png"));
        shellOutput("screencap -p /sdcard/Download/" + name);
        assertTrue("System screenshot was not created", shellOutput("ls /sdcard/Download/" + name).contains(name));
    }

    private String shellOutput(String command) throws Exception {
        // UiAutomation starts the command directly; it does not interpret shell operators.
        android.os.ParcelFileDescriptor descriptor = InstrumentationRegistry.getInstrumentation().getUiAutomation()
            .executeShellCommand(command);
        try (InputStream input = new android.os.ParcelFileDescriptor.AutoCloseInputStream(descriptor)) {
            java.io.ByteArrayOutputStream result = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[256];
            int count;
            while ((count = input.read(buffer)) != -1) result.write(buffer, 0, count);
            return result.toString();
        }
    }

    private void reload() throws Exception {
        // Mark this JS context: readiness must come from a NEW page, not the old DOM.
        evaluate("window.__beforeReload = true; location.reload(); true");
        await("typeof window.__beforeReload === 'undefined' && !!document.querySelector('.app main')");
        awaitApp();
    }

    private void awaitApp() throws Exception {
        await("!!document.querySelector('.app main') || document.body.textContent.includes('Storage unavailable')");
        // Only collect diagnostics on failure. innerText forces layout during cold WebView startup.
        if (!"true".equals(evaluate("!!document.querySelector('.app main')"))) {
            fail("App failed to initialize: " + evaluate("document.body.textContent"));
        }
    }

    private JSONArray query(String sql) throws Exception {
        return nativeCall("query", new JSONObject().put("statement", sql).put("values", new JSONArray()))
            .optJSONArray("values");
    }

    private JSONObject nativeCall(String method, JSONObject options) throws Exception {
        options.put("database", "sfo_travel").put("readonly", false);
        return pluginCall("CapacitorSQLite", method, options);
    }

    private JSONObject pluginCall(String plugin, String method, JSONObject options) throws Exception {
        evaluate("window.__storageResult = null; Capacitor.nativePromise(" + JSONObject.quote(plugin) + ", "
            + JSONObject.quote(method) + ", " + options + ").then(value => { window.__storageResult = {value}; })"
            + ".catch(error => { window.__storageResult = {error: String(error)}; }); true");
        await("window.__storageResult !== null");
        JSONObject result = new JSONObject(evaluate("window.__storageResult"));
        assertFalse(result.toString(), result.has("error"));
        return result.getJSONObject("value");
    }

    private void await(String predicate) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(evaluate(predicate))) return;
            SystemClock.sleep(100);
        }
        fail("Timed out: " + predicate + "; page=" + evaluate("document.body.textContent"));
    }

    private String evaluate(String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script, value -> {
            result.set(value);
            done.countDown();
        }));
        // Fresh hosted emulators can stall while Chromium and system services initialize.
        assertTrue("WebView evaluation timed out: " + script, done.await(30, TimeUnit.SECONDS));
        return result.get();
    }
}
