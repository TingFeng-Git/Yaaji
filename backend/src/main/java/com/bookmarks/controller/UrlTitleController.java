package com.bookmarks.controller;

import com.bookmarks.service.UrlTitleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/url")
@CrossOrigin(origins = "http://localhost:3000")
public class UrlTitleController {
    private final UrlTitleService urlTitleService;

    @Autowired
    public UrlTitleController(UrlTitleService urlTitleService) {
        this.urlTitleService = urlTitleService;
    }

    @GetMapping("/title")
    public ResponseEntity<?> getTitle(@RequestParam String url) {
        try {
            String title = urlTitleService.getTitleFromUrl(url);
            if (title != null && !title.isEmpty()) {
                return ResponseEntity.ok(Map.of("title", title));
            } else {
                return ResponseEntity.ok(Map.of("title", ""));
            }
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("title", ""));
        }
    }
}