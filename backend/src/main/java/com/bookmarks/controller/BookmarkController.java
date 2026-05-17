package com.bookmarks.controller;

import com.bookmarks.entity.Bookmark;
import com.bookmarks.service.BookmarkService;
import com.bookmarks.service.ImportProgressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/bookmarks")
@CrossOrigin(origins = "http://localhost:3000")
public class BookmarkController {
    private final BookmarkService bookmarkService;
    private final ImportProgressService importProgressService;

    @Autowired
    public BookmarkController(BookmarkService bookmarkService, ImportProgressService importProgressService) {
        this.bookmarkService = bookmarkService;
        this.importProgressService = importProgressService;
    }

    @GetMapping
    public ResponseEntity<List<Bookmark>> getAllBookmarks() {
        List<Bookmark> bookmarks = bookmarkService.getAllBookmarks();
        return ResponseEntity.ok(bookmarks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bookmark> getBookmarkById(@PathVariable Long id) {
        Bookmark bookmark = bookmarkService.getBookmarkById(id)
                .orElseThrow(() -> new RuntimeException("Bookmark not found with id: " + id));
        return ResponseEntity.ok(bookmark);
    }

    @GetMapping("/check-url")
    public ResponseEntity<Map<String, Object>> checkUrlExists(@RequestParam String url) {
        boolean exists = bookmarkService.existsByUrl(url);
        if (exists) {
            Bookmark existingBookmark = bookmarkService.findByUrl(url).orElse(null);
            return ResponseEntity.ok(Map.of(
                "exists", true,
                "bookmark", existingBookmark
            ));
        }
        return ResponseEntity.ok(Map.of("exists", false));
    }

    @PostMapping
    public ResponseEntity<Bookmark> createBookmark(@RequestBody Bookmark bookmark) {
        Bookmark createdBookmark = bookmarkService.createBookmark(bookmark);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdBookmark);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Bookmark> updateBookmark(@PathVariable Long id, @RequestBody Bookmark bookmarkDetails) {
        Bookmark updatedBookmark = bookmarkService.updateBookmark(id, bookmarkDetails);
        return ResponseEntity.ok(updatedBookmark);
    }

    @PostMapping("/{id}/click")
    public ResponseEntity<Void> recordClick(@PathVariable Long id) {
        bookmarkService.recordClick(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBookmark(@PathVariable Long id) {
        bookmarkService.deleteBookmark(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/batch-delete")
    public ResponseEntity<Map<String, Object>> deleteBookmarks(@RequestBody List<Long> ids) {
        try {
            bookmarkService.deleteBookmarks(ids);
            return ResponseEntity.ok(Map.of("success", true, "message", "成功删除 " + ids.size() + " 个书签"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "删除失败: " + e.getMessage()));
        }
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importBookmarks(@RequestParam("file") MultipartFile file) {
        String taskId = importProgressService.createImportTask();

        bookmarkService.importBookmarksAsync(file, taskId);

        return ResponseEntity.ok(Map.of("success", true, "taskId", taskId, "message", "开始导入..."));
    }

    @GetMapping("/import/progress")
    public ResponseEntity<Map<String, Object>> getImportProgress(@RequestParam String taskId) {
        ImportProgressService.ImportProgress progress = importProgressService.getProgress(taskId);
        if (progress == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of(
            "current", progress.getCurrent(),
            "total", progress.getTotal(),
            "status", progress.getStatus(),
            "message", progress.getMessage(),
            "percent", progress.getPercent()
        ));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportBookmarks() {
        try {
            String html = bookmarkService.exportBookmarks();
            String filename = "bookmarks_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + ".html";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_HTML);
            headers.setContentDispositionFormData("attachment", filename);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(html.getBytes("UTF-8"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}