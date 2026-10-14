package com.heathhuang.sfotravel;

import static org.junit.Assert.*;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.os.SystemClock;
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

    private void reload() throws Exception {
        // Mark this JS context: readiness must come from a NEW page, not the old DOM.
        evaluate("window.__beforeReload = true; location.reload(); true");
        await("typeof window.__beforeReload === 'undefined' && !!document.querySelector('.app main')");
        awaitApp();
    }

    private void awaitApp() throws Exception {
        await("!!document.querySelector('.app main') || document.body.innerText.includes('Storage unavailable')");
        assertEquals("App failed to initialize: " + evaluate("document.body.innerText"),
            "true", evaluate("!!document.querySelector('.app main')"));
    }

    private JSONArray query(String sql) throws Exception {
        return nativeCall("query", new JSONObject().put("statement", sql).put("values", new JSONArray()))
            .optJSONArray("values");
    }

    private JSONObject nativeCall(String method, JSONObject options) throws Exception {
        options.put("database", "sfo_travel").put("readonly", false);
        evaluate("window.__storageResult = null; Capacitor.nativePromise('CapacitorSQLite', "
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
        fail("Timed out: " + predicate + "; page=" + evaluate("document.body.innerText"));
    }

    private String evaluate(String script) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script, value -> {
            result.set(value);
            done.countDown();
        }));
        assertTrue("WebView evaluation timed out", done.await(10, TimeUnit.SECONDS));
        return result.get();
    }
}
