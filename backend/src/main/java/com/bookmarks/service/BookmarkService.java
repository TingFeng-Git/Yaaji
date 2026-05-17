package com.bookmarks.service;

import com.bookmarks.entity.Bookmark;
import com.bookmarks.entity.Category;
import com.bookmarks.repository.BookmarkRepository;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BookmarkService {
    private final BookmarkRepository bookmarkRepository;
    private final CategoryService categoryService;
    private final ApplicationContext applicationContext;

    @Autowired
    public BookmarkService(BookmarkRepository bookmarkRepository, CategoryService categoryService, ApplicationContext applicationContext) {
        this.bookmarkRepository = bookmarkRepository;
        this.categoryService = categoryService;
        this.applicationContext = applicationContext;
    }

    public List<Bookmark> getAllBookmarks() {
        return bookmarkRepository.findAll();
    }

    public Optional<Bookmark> getBookmarkById(Long id) {
        return bookmarkRepository.findById(id);
    }

    public boolean existsByUrl(String url) {
        return bookmarkRepository.existsByUrl(url);
    }

    public Optional<Bookmark> findByUrl(String url) {
        return bookmarkRepository.findByUrl(url);
    }

    public Bookmark createBookmark(Bookmark bookmark) {
        return bookmarkRepository.save(bookmark);
    }

    public Bookmark updateBookmark(Long id, Bookmark bookmarkDetails) {
        Bookmark bookmark = bookmarkRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bookmark not found with id: " + id));

        bookmark.setTitle(bookmarkDetails.getTitle());
        bookmark.setUrl(bookmarkDetails.getUrl());
        bookmark.setDescription(bookmarkDetails.getDescription());
        bookmark.setCategoryId(bookmarkDetails.getCategoryId());

        return bookmarkRepository.save(bookmark);
    }

    public Bookmark recordClick(Long id) {
        Bookmark bookmark = bookmarkRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bookmark not found with id: " + id));

        bookmark.setLastClickedAt(LocalDateTime.now());
        return bookmarkRepository.save(bookmark);
    }

    public void deleteBookmark(Long id) {
        Bookmark bookmark = bookmarkRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bookmark not found with id: " + id));
        bookmarkRepository.delete(bookmark);
    }

    public void deleteBookmarks(List<Long> ids) {
        List<Bookmark> bookmarks = bookmarkRepository.findAllById(ids);
        bookmarkRepository.deleteAll(bookmarks);
    }

    @Async
    public void importBookmarksAsync(MultipartFile file, String taskId) {
        ImportProgressService progressService = applicationContext.getBean(ImportProgressService.class);
        try {
            importBookmarksInternal(file, taskId, progressService);
        } catch (IOException e) {
            progressService.fail(taskId, e.getMessage());
            e.printStackTrace();
        }
    }

    public int importBookmarks(MultipartFile file, String taskId, ImportProgressService progressService) throws IOException {
        importBookmarksInternal(file, taskId, progressService);
        return 0;
    }

    private void importBookmarksInternal(MultipartFile file, String taskId, ImportProgressService progressService) throws IOException {
        if (progressService != null) {
            progressService.updateProgress(taskId, 0, 100, "uploading", "正在读取文件...");
        }

        byte[] fileBytes = file.getBytes();

        if (progressService != null) {
            progressService.updateProgress(taskId, 10, 100, "uploading", "文件已接收，正在解析...");
        }

        String html = new String(fileBytes, "UTF-8");

        if (progressService != null) {
            progressService.updateProgress(taskId, 20, 100, "parsing", "正在解析HTML...");
        }

        Document doc = Jsoup.parse(html);

        Elements dls = doc.select("dl");
        int totalLinks = countLinks(doc);

        if (progressService != null) {
            progressService.updateProgress(taskId, 30, 100, "parsing", "发现 " + totalLinks + " 个链接，准备导入...");
        }

        Map<String, Long> categoryMap = new HashMap<>();
        int imported = 0;

        if (!dls.isEmpty()) {
            imported = processDL(dls.first(), null, categoryMap, 0, taskId, progressService, imported, totalLinks);
        } else {
            Elements allLinks = doc.select("a");
            for (Element a : allLinks) {
                String title = a.text().trim();
                String url = a.attr("href");

                if (url != null && !url.isEmpty() && !title.isEmpty()) {
                    Bookmark bookmark = new Bookmark();
                    bookmark.setTitle(title);
                    bookmark.setUrl(url);
                    bookmarkRepository.save(bookmark);
                    imported++;

                    if (progressService != null) {
                        int progress = 30 + (imported * 70) / Math.max(totalLinks, 1);
                        progress = Math.min(progress, 99);
                        progressService.updateProgress(taskId, progress, 100, "importing", "正在导入: " + imported + "/" + totalLinks);
                    }
                }
            }
        }

        if (progressService != null) {
            progressService.complete(taskId, imported, "成功导入 " + imported + " 个书签");
        }
    }

    private int countLinks(Document doc) {
        Elements allLinks = doc.select("a");
        return allLinks.size();
    }

    private int processDL(Element dl, Long parentCategoryId, Map<String, Long> categoryMap, int depth, String taskId, ImportProgressService progressService, int importedCount, int totalLinks) {
        if (depth > 10 || dl == null) return importedCount;

        Elements children = dl.children();

        for (int i = 0; i < children.size(); i++) {
            Element child = children.get(i);
            String tagName = child.tagName();

            if ("dt".equals(tagName)) {
                Element h3 = child.selectFirst("h3");
                Element a = child.selectFirst("a");

                if (h3 != null) {
                    String categoryName = h3.text().trim();
                    if (categoryName.isEmpty()) continue;

                    Category category = categoryService.getAllCategories().stream()
                            .filter(c -> c.getName().equals(categoryName))
                            .findFirst()
                            .orElse(null);

                    if (category == null) {
                        category = new Category();
                        category.setName(categoryName);
                        category = categoryService.createCategory(category);
                    }

                    categoryMap.put(categoryName, category.getId());

                    Element childDl = child.selectFirst("dl");
                    if (childDl != null) {
                        importedCount = processDL(childDl, category.getId(), categoryMap, depth + 1, taskId, progressService, importedCount, totalLinks);
                    }
                } else if (a != null) {
                    String title = a.text().trim();
                    String url = a.attr("href");

                    if (url != null && !url.isEmpty() && !title.isEmpty()) {
                        Bookmark bookmark = new Bookmark();
                        bookmark.setTitle(title);
                        bookmark.setUrl(url);
                        bookmark.setCategoryId(parentCategoryId);
                        bookmarkRepository.save(bookmark);
                        importedCount++;

                        if (progressService != null) {
                            int progress = 30 + (importedCount * 70) / Math.max(totalLinks, 1);
                            progress = Math.min(progress, 99);
                            progressService.updateProgress(taskId, progress, 100, "importing", "正在导入: " + importedCount + "/" + totalLinks);
                        }
                    }
                }
            } else if ("p".equals(tagName)) {
                importedCount = processDL(child, parentCategoryId, categoryMap, depth, taskId, progressService, importedCount, totalLinks);
            }
        }
        return importedCount;
    }

    public String exportBookmarks() {
        List<Bookmark> bookmarks = bookmarkRepository.findAll();
        List<Category> categories = categoryService.getAllCategories();

        Map<Long, String> categoryMap = new HashMap<>();
        for (Category category : categories) {
            categoryMap.put(category.getId(), category.getName());
        }

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n");
        sb.append("<!-- This is an automatically generated file.\n");
        sb.append("      It will be read and overwritten.\n");
        sb.append("      DO NOT EDIT! -->\n");
        sb.append("<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n");
        sb.append("<TITLE>Bookmarks</TITLE>\n");
        sb.append("<H1>Bookmarks</H1>\n");
        sb.append("<DL><p>\n");

        Map<Long, List<Bookmark>> byCategory = bookmarks.stream()
                .collect(java.util.stream.Collectors.groupingBy(b -> b.getCategoryId() != null ? b.getCategoryId() : 0L));

        for (Map.Entry<Long, List<Bookmark>> entry : byCategory.entrySet()) {
            Long categoryId = entry.getKey();
            List<Bookmark> categoryBookmarks = entry.getValue();

            if (categoryId == 0 || categoryId == null) {
                for (Bookmark bookmark : categoryBookmarks) {
                    sb.append("    <DT><A HREF=\"").append(escapeHtml(bookmark.getUrl())).append("\" ADD_DATE=\"").append(getTimestamp(bookmark.getCreatedAt())).append("\">").append(escapeHtml(bookmark.getTitle())).append("</A>\n");
                }
            } else {
                String categoryName = categoryMap.get(categoryId);
                if (categoryName != null) {
                    sb.append("    <DT><H3 ADD_DATE=\"").append(getTimestamp(java.time.LocalDateTime.now())).append("\">").append(escapeHtml(categoryName)).append("</H3>\n");
                    sb.append("    <DL><p>\n");
                    for (Bookmark bookmark : categoryBookmarks) {
                        sb.append("        <DT><A HREF=\"").append(escapeHtml(bookmark.getUrl())).append("\" ADD_DATE=\"").append(getTimestamp(bookmark.getCreatedAt())).append("\">").append(escapeHtml(bookmark.getTitle())).append("</A>\n");
                    }
                    sb.append("    </DL><p>\n");
                }
            }
        }

        sb.append("</DL><p>\n");
        return sb.toString();
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;");
    }

    private long getTimestamp(LocalDateTime dateTime) {
        if (dateTime == null) {
            return System.currentTimeMillis() / 1000;
        }
        return dateTime.atZone(ZoneId.systemDefault()).toEpochSecond();
    }
}