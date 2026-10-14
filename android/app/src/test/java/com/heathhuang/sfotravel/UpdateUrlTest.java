package com.heathhuang.sfotravel;

import org.junit.Test;
import static org.junit.Assert.*;

public class UpdateUrlTest {
    @Test public void acceptsOnlyMatchingVersionsFromOwnedRepository() {
        String prefix = "https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/releases/download/";
        assertTrue(AppUpdaterPlugin.releaseUrl(prefix + "v1.2.0/SFOBusinessTravel-v1.2.0.apk"));
        assertFalse(AppUpdaterPlugin.releaseUrl(prefix + "v1.2.0/SFOBusinessTravel-v1.3.0.apk"));
        assertFalse(AppUpdaterPlugin.releaseUrl(prefix + "v1.2.0/SFOBusinessTravel-v1.2.0.apk?redirect=evil"));
        assertFalse(AppUpdaterPlugin.releaseUrl("https://example.com/update.apk"));
        assertFalse(AppUpdaterPlugin.releaseUrl(null));
    }
}
