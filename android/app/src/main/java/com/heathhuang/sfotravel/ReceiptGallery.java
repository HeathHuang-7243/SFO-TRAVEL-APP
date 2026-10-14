package com.heathhuang.sfotravel;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

/** Copies an app-owned receipt without granting access to the user's library. */
final class ReceiptGallery {
    static File receipt(Context context, String path) throws IOException {
        if (path == null || !path.matches("receipts/[a-zA-Z0-9_-]+\\.jpg")) throw new IOException("Invalid receipt path");
        File file = new File(context.getFilesDir(), path);
        if (!file.isFile() || file.length() == 0) throw new IOException("Receipt photo is missing");
        return file;
    }

    static Uri save(Context context, File source) throws IOException {
        String name = "SFO-" + source.getName();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            String folder = Environment.DIRECTORY_PICTURES + "/SFO Travel/";
            Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            // Retries do not create another copy of a photo already published by this app.
            try (Cursor cursor = context.getContentResolver().query(collection,
                    new String[]{MediaStore.Images.Media._ID},
                    MediaStore.Images.Media.DISPLAY_NAME + "=? AND " + MediaStore.Images.Media.RELATIVE_PATH + "=? AND " + MediaStore.Images.Media.IS_PENDING + "=0",
                    new String[]{name, folder}, null)) {
                if (cursor != null && cursor.moveToFirst()) return Uri.withAppendedPath(collection, cursor.getString(0));
            }
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, name);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, folder);
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
            Uri uri = context.getContentResolver().insert(collection, values);
            if (uri == null) throw new IOException("Could not create gallery photo");
            try {
                try (OutputStream output = context.getContentResolver().openOutputStream(uri)) {
                    if (output == null) throw new IOException("Could not open gallery photo");
                    copy(source, output);
                }
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                if (context.getContentResolver().update(uri, values, null, null) != 1) throw new IOException("Could not publish gallery photo");
                return uri;
            } catch (Exception error) {
                try { context.getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
                throw new IOException("Could not save gallery photo", error);
            }
        }
        // API 23–28: caller must obtain WRITE_EXTERNAL_STORAGE first.
        File folder = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "SFO Travel");
        if (!folder.isDirectory() && !folder.mkdirs()) throw new IOException("Could not create gallery folder");
        File target = new File(folder, name);
        if (!target.isFile() || target.length() == 0) {
            File temporary = File.createTempFile("receipt-", ".tmp", folder);
            try {
                try (OutputStream output = new FileOutputStream(temporary)) { copy(source, output); }
                if (!temporary.renameTo(target)) throw new IOException("Could not publish gallery photo");
            } finally { temporary.delete(); }
        }
        MediaScannerConnection.scanFile(context, new String[]{target.getAbsolutePath()}, new String[]{"image/jpeg"}, null);
        return Uri.fromFile(target);
    }

    private static void copy(File source, OutputStream output) throws IOException {
        try (FileInputStream input = new FileInputStream(source)) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        }
    }
}
