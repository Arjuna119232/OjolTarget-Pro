package com.ojoltarget.pro;

import android.content.res.AssetManager;

import java.io.ByteArrayOutputStream;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Minimal loopback HTTP server that serves the packaged web app from
 * assets/www. WebView needs a real http:// origin so that ES modules,
 * fetch() and localStorage behave exactly like they do in a browser.
 */
final class AssetServer implements Closeable {

    private final AssetManager assets;
    private final ServerSocket serverSocket;
    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private volatile boolean closed = false;

    private static final int FIRST_PORT = 47210;
    private static final int PORT_TRIES = 8;

    AssetServer(AssetManager assets) throws IOException {
        this.assets = assets;
        this.serverSocket = bindLoopback();
        Thread t = new Thread(this::acceptLoop, "ojol-asset-server");
        t.setDaemon(true);
        t.start();
    }

    /**
     * Binds to a stable loopback port so the web origin (and therefore the
     * app's localStorage data) survives app restarts.
     */
    private static ServerSocket bindLoopback() throws IOException {
        InetAddress loopback = InetAddress.getByName("127.0.0.1");
        IOException last = null;
        for (int port = FIRST_PORT; port < FIRST_PORT + PORT_TRIES; port++) {
            try {
                return new ServerSocket(port, 64, loopback);
            } catch (IOException e) {
                last = e;
            }
        }
        try {
            return new ServerSocket(0, 64, loopback);
        } catch (IOException e) {
            if (last != null) {
                throw last;
            }
            throw e;
        }
    }

    String origin() {
        return "http://127.0.0.1:" + serverSocket.getLocalPort();
    }

    private void acceptLoop() {
        while (!closed) {
            try {
                final Socket socket = serverSocket.accept();
                pool.execute(() -> handle(socket));
            } catch (IOException e) {
                if (closed) {
                    return;
                }
            }
        }
    }

    private void handle(Socket socket) {
        try (Socket s = socket) {
            s.setSoTimeout(15000);
            InputStream in = s.getInputStream();
            String requestLine = readLine(in);
            if (requestLine == null) {
                return;
            }
            // Drain request headers.
            String line;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                // ignore
            }

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                write(s, 400, "text/plain; charset=utf-8", "Bad Request".getBytes("UTF-8"));
                return;
            }

            String path = parts[1];
            int q = path.indexOf('?');
            if (q >= 0) {
                path = path.substring(0, q);
            }
            int hash = path.indexOf('#');
            if (hash >= 0) {
                path = path.substring(0, hash);
            }
            if (path.isEmpty() || path.equals("/")) {
                path = "/index.html";
            }
            if (path.contains("..")) {
                write(s, 403, "text/plain; charset=utf-8", "Forbidden".getBytes("UTF-8"));
                return;
            }

            String assetPath = "www" + path;
            byte[] body;
            try {
                body = readAsset(assetPath);
            } catch (IOException missing) {
                // SPA fallback so client-side routes keep working.
                try {
                    body = readAsset("www/index.html");
                    write(s, 200, "text/html; charset=utf-8", body, "no-cache");
                    return;
                } catch (IOException fatal) {
                    write(s, 404, "text/plain; charset=utf-8", "Not Found".getBytes("UTF-8"));
                    return;
                }
            }

            String cache = path.endsWith(".html")
                    ? "no-cache"
                    : "public, max-age=31536000, immutable";
            write(s, 200, mimeType(path), body, cache);
        } catch (IOException ignored) {
            // Client went away; nothing to do.
        }
    }

    private byte[] readAsset(String path) throws IOException {
        try (InputStream is = assets.open(path)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(1024, is.available()));
            byte[] buffer = new byte[16384];
            int read;
            while ((read = is.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return out.toByteArray();
        }
    }

    private static String readLine(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') {
                int len = sb.length();
                if (len > 0 && sb.charAt(len - 1) == '\r') {
                    sb.setLength(len - 1);
                }
                return sb.toString();
            }
            sb.append((char) c);
            if (sb.length() > 8192) {
                return sb.toString();
            }
        }
        return sb.length() == 0 ? null : sb.toString();
    }

    private static void write(Socket socket, int status, String mime, byte[] body) throws IOException {
        write(socket, status, mime, body, "no-cache");
    }

    private static void write(Socket socket, int status, String mime, byte[] body, String cache)
            throws IOException {
        String reason;
        switch (status) {
            case 200: reason = "OK"; break;
            case 403: reason = "Forbidden"; break;
            case 404: reason = "Not Found"; break;
            default: reason = "Bad Request"; break;
        }
        StringBuilder head = new StringBuilder();
        head.append("HTTP/1.1 ").append(status).append(' ').append(reason).append("\r\n");
        head.append("Content-Type: ").append(mime).append("\r\n");
        head.append("Content-Length: ").append(body.length).append("\r\n");
        head.append("Cache-Control: ").append(cache).append("\r\n");
        head.append("X-Content-Type-Options: nosniff\r\n");
        head.append("Connection: close\r\n\r\n");

        OutputStream out = socket.getOutputStream();
        out.write(head.toString().getBytes("UTF-8"));
        out.write(body);
        out.flush();
    }

    private static String mimeType(String path) {
        String p = path.toLowerCase(Locale.US);
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html; charset=utf-8";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
        if (p.endsWith(".css")) return "text/css; charset=utf-8";
        if (p.endsWith(".json") || p.endsWith(".map")) return "application/json; charset=utf-8";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".otf")) return "font/otf";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".wav")) return "audio/wav";
        if (p.endsWith(".pdf")) return "application/pdf";
        if (p.endsWith(".wasm")) return "application/wasm";
        return "application/octet-stream";
    }

    @Override
    public void close() {
        closed = true;
        try {
            serverSocket.close();
        } catch (IOException ignored) {
            // already gone
        }
        pool.shutdownNow();
    }
}
