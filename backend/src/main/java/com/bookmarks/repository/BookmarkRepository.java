package com.bookmarks.repository;

import com.bookmarks.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    Optional<Bookmark> findByUrl(String url);
    boolean existsByUrl(String url);
    boolean existsByCategoryId(Long categoryId);
    long countByCategoryId(Long categoryId);
}