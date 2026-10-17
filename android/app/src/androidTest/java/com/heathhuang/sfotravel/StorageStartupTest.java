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
    private static final String TEST_PASSWORD = "2468";
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
        // Public data refreshes may already have populated unrelated cache keys.
        assertEquals(0, query("SELECT * FROM local_chunks WHERE key='personal:v1'").length());
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
            // ActivityScenario's synthetic EmptyActivity is itself recreated by
            // a system theme change, which can strand moveToState(RESUMED).
            // Exercise real background/foreground behavior via the launcher.
            shellOutput("input keyevent KEYCODE_HOME");
            awaitLifecycle(androidx.lifecycle.Lifecycle.State.CREATED);
            shellOutput("cmd uimode night no");
            Context context = ApplicationProvider.getApplicationContext();
            shellOutput("am start -W -n " + context.getPackageName() + "/com.heathhuang.sfotravel.MainActivity");
            awaitLifecycle(androidx.lifecycle.Lifecycle.State.RESUMED);
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

    private void awaitLifecycle(androidx.lifecycle.Lifecycle.State state) {
        long deadline = SystemClock.elapsedRealtime() + 15000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if (scenario.getState() == state) return;
            SystemClock.sleep(100);
        }
        fail("Activity did not reach " + state + "; current state=" + scenario.getState());
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
        await("!!document.querySelector('.access-form') || !!document.querySelector('.app main') || document.body.textContent.includes('Storage unavailable')");
        if ("true".equals(evaluate("!!document.querySelector('.access-form')"))) {
            fillPasswordForm(TEST_PASSWORD);
            evaluate("document.querySelector('.access-form').requestSubmit(); true");
        }
        await("!!document.querySelector('.app main') || document.body.textContent.includes('Storage unavailable')");
        // Only collect diagnostics on failure. innerText forces layout during cold WebView startup.
        if (!"true".equals(evaluate("!!document.querySelector('.app main')"))) {
            fail("App failed to initialize: " + evaluate("document.body.textContent"));
        }
        if ("true".equals(evaluate("!!document.querySelector('.welcome-panel')"))) {
            evaluate("(() => { const choice = document.querySelector('.welcome-choice input'); if (!choice.checked) choice.click(); })(); true");
            await("document.querySelector('.welcome-choice input').checked");
            evaluate("document.querySelector('.welcome-start').click(); true");
            await("!document.querySelector('.welcome-panel')");
        }
    }

    private void fillPasswordForm(String password) throws Exception {
        evaluate("(() => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;"
            + " document.querySelectorAll('.access-form input[type=password]').forEach(input => { setter.call(input, " + JSONObject.quote(password)
            + "); input.dispatchEvent(new Event('input', {bubbles:true})); }); })(); true");
    }

    @Test public void passwordAfterUpgradeKeepsRecordsOnFailureAndSurvivesRecreation() throws Exception {
        launch();
        JSONObject statement = new JSONObject().put("statement", "INSERT OR REPLACE INTO local_chunks(key,part,value) VALUES(?,?,?)")
            .put("values", new JSONArray().put("personal:v1").put(0).put(PERSONAL));
        nativeCall("executeSet", new JSONObject().put("set", new JSONArray().put(statement)).put("transaction", true));
        scenario.close(); scenario = null;
        Context context = ApplicationProvider.getApplicationContext();
        android.content.SharedPreferences settings = context.getSharedPreferences("access_lock", 0);
        JSONObject before = new JSONObject(settings.getString("record", ""));
        assertFalse(before.toString().contains(TEST_PASSWORD));
        before.put("approvedVersion", "previous-version");
        assertTrue(settings.edit().putString("record", before.toString()).commit());
        scenario = ActivityScenario.launch(MainActivity.class);
        await("!!document.querySelector('.access-form[data-access-mode=unlock]')");
        assertEquals("false", evaluate("!!document.querySelector('.app main')"));
        fillPasswordForm("wrong-password");
        evaluate("document.querySelector('.access-form').requestSubmit(); true");
        await("!!document.querySelector('.access-form [role=alert]')");
        assertEquals("false", evaluate("!!document.querySelector('.app main')"));
        assertEquals("previous-version", new JSONObject(settings.getString("record", "")).getString("approvedVersion"));
        try (SQLiteDatabase database = SQLiteDatabase.openDatabase(context.getDatabasePath(DB_FILE).getPath(), null, SQLiteDatabase.OPEN_READONLY);
             Cursor row = database.rawQuery("SELECT value FROM local_chunks WHERE key='personal:v1' AND part=0", null)) {
            assertTrue(row.moveToFirst()); assertEquals(PERSONAL, row.getString(0));
        }
        fillPasswordForm(TEST_PASSWORD);
        evaluate("document.querySelector('.access-form').requestSubmit(); true");
        await("!!document.querySelector('.app main')");
        assertEquals(PERSONAL, query("SELECT value FROM local_chunks WHERE key='personal:v1'").getJSONObject(0).getString("value"));
        scenario.recreate();
        await("!!document.querySelector('.app main')");
        assertEquals("false", evaluate("!!document.querySelector('.access-form')"));
    }

    private JSONArray query(String sql) throws Exception {
        return nativeCall("query", new JSONObject().put("statement", sql).put("values", new JSONArray()))
            .optJSONArray("values");
    }

    @Test public void betaDraftSurvivesNativeWebViewRestart() throws Exception {
        launch();
        evaluate("document.querySelectorAll('.app-tabs button')[2].click(); true");
        evaluate("document.querySelector('.page-heading .primary').click(); true");
        await("!!document.querySelector('.expense-editor input[type=number]')");
        assertEquals("\"\"", evaluate("document.querySelector('.expense-editor input[type=number]').value"));
        evaluate("(() => { const input=document.querySelector('.expense-editor input[type=number]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'42.25'); input.dispatchEvent(new Event('input',{bubbles:true})); const text=document.querySelector('.expense-editor textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(text,'Native draft'); text.dispatchEvent(new Event('input',{bubbles:true})); })(); true");
        await("!!document.querySelector('.editor-footer [role=status]') && /Draft saved|草稿已/.test(document.querySelector('.editor-footer [role=status]').textContent)");
        JSONObject draft = new JSONObject(query("SELECT value FROM local_chunks WHERE key='expense-draft:v1' AND part=0").getJSONObject(0).getString("value"));
        assertEquals("42.25", draft.getString("amount"));
        assertEquals("Native draft", draft.getString("description"));
        reload();
        evaluate("document.querySelectorAll('.app-tabs button')[2].click(); true");
        evaluate("document.querySelector('.page-heading .primary').click(); true");
        await("!!document.querySelector('.draft-choice .primary')");
        evaluate("document.querySelector('.draft-choice .primary').click(); true");
        await("!!document.querySelector('.expense-editor textarea')");
        assertEquals("\"42.25\"", evaluate("document.querySelector('.expense-editor input[type=number]').value"));
        assertEquals("\"Native draft\"", evaluate("document.querySelector('.expense-editor textarea').value"));
    }

    @Test public void betaUpdaterBridgeReportsStateAndRejectsUntrustedDownloads() throws Exception {
        launch();
        assertEquals("idle", pluginCall("AppUpdater", "getDownloadState", new JSONObject()).getString("phase"));
        evaluate("window.__cancelFinished=false; Capacitor.nativePromise('AppUpdater','cancelDownload',{}).then(()=>{window.__cancelFinished=true;}); true");
        await("window.__cancelFinished === true");
        evaluate("window.__updateError=null; Capacitor.nativePromise('AppUpdater','downloadUpdate',{url:'https://example.com/foreign.apk',sha256:'a'.repeat(64)}).then(()=>{window.__updateError='unexpected success';}).catch(error=>{window.__updateError=error.code;}); true");
        await("window.__updateError !== null");
        assertEquals("\"INVALID_PACKAGE\"", evaluate("window.__updateError"));
        assertEquals("idle", pluginCall("AppUpdater", "getDownloadState", new JSONObject()).getString("phase"));
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
