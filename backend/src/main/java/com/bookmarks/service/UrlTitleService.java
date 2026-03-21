package com.bookmarks.service;

import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class UrlTitleService {

    private static final int TIMEOUT = 5000;
    private static final int MAX_CONTENT_LENGTH = 1024 * 1024;

    public String getTitleFromUrl(String urlString) {
        if (urlString == null || urlString.isEmpty()) {
            return null;
        }

        if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
            urlString = "https://" + urlString;
        }

        HttpURLConnection connection = null;
        try {
            URL url = new URL(urlString);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(TIMEOUT);
            connection.setReadTimeout(TIMEOUT);
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            connection.setInstanceFollowRedirects(true);

            int responseCode = connection.getResponseCode();
            if (responseCode != HttpURLConnection.HTTP_OK) {
                return null;
            }

            String contentType = connection.getContentType();
            if (contentType != null && !contentType.contains("text/html")) {
                return null;
            }

            StringBuilder content = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                char[] buffer = new char[8192];
                int bytesRead;
                int totalBytesRead = 0;

                while ((bytesRead = reader.read(buffer)) != -1) {
                    totalBytesRead += bytesRead;
                    if (totalBytesRead > MAX_CONTENT_LENGTH) {
                        break;
                    }
                    content.append(buffer, 0, bytesRead);
                }
            }

            String html = content.toString();
            return extractTitle(html);

        } catch (Exception e) {
            return null;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String extractTitle(String html) {
        if (html == null || html.isEmpty()) {
            return null;
        }

        Pattern titlePattern = Pattern.compile(
            "<title\\s*[^>]*>([^<]+)</title>",
            Pattern.CASE_INSENSITIVE
        );
        Matcher matcher = titlePattern.matcher(html);

        if (matcher.find()) {
            String title = matcher.group(1).trim();
            title = title.replaceAll("\\s+", " ");
            title = htmlEntityDecode(title);
            return title;
        }

        Pattern ogTitlePattern = Pattern.compile(
            "<meta\\s+property=\"og:title\"\\s+content=\"([^\"]+)\"",
            Pattern.CASE_INSENSITIVE
        );
        matcher = ogTitlePattern.matcher(html);

        if (matcher.find()) {
            String title = matcher.group(1).trim();
            title = htmlEntityDecode(title);
            return title;
        }

        return null;
    }

    private String htmlEntityDecode(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        return text.replace("&amp;", "&")
                   .replace("&lt;", "<")
                   .replace("&gt;", ">")
                   .replace("&quot;", "\"")
                   .replace("&#39;", "'")
                   .replace("&nbsp;", " ");
    }
}