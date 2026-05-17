package com.bookmarks.service;

import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ImportProgressService {
    private final ConcurrentHashMap<String, ImportProgress> progressMap = new ConcurrentHashMap<>();

    public String createImportTask() {
        String taskId = UUID.randomUUID().toString();
        progressMap.put(taskId, new ImportProgress());
        return taskId;
    }

    public ImportProgress getProgress(String taskId) {
        return progressMap.get(taskId);
    }

    public void updateProgress(String taskId, int current, int total, String status) {
        updateProgress(taskId, current, total, status, "");
    }

    public void updateProgress(String taskId, int current, int total, String status, String message) {
        ImportProgress progress = progressMap.get(taskId);
        if (progress != null) {
            progress.setCurrent(current);
            progress.setTotal(total);
            progress.setStatus(status);
            progress.setMessage(message);
        }
    }

    public void complete(String taskId, int imported, String message) {
        ImportProgress progress = progressMap.get(taskId);
        if (progress != null) {
            progress.setStatus("completed");
            progress.setCurrent(100);
            progress.setTotal(100);
            progress.setMessage(message);
        }
    }

    public void fail(String taskId, String error) {
        ImportProgress progress = progressMap.get(taskId);
        if (progress != null) {
            progress.setStatus("failed");
            progress.setMessage(error);
        }
    }

    public void remove(String taskId) {
        progressMap.remove(taskId);
    }

    public static class ImportProgress {
        private int current = 0;
        private int total = 0;
        private String status = "uploading";
        private String message = "";

        public int getCurrent() { return current; }
        public void setCurrent(int current) { this.current = current; }
        public int getTotal() { return total; }
        public void setTotal(int total) { this.total = total; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public int getPercent() {
            if (total == 0) return 0;
            return (current * 100) / total;
        }
    }
}