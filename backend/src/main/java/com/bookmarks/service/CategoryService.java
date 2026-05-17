package com.bookmarks.service;

import com.bookmarks.entity.Category;
import com.bookmarks.repository.BookmarkRepository;
import com.bookmarks.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final BookmarkRepository bookmarkRepository;

    @Autowired
    public CategoryService(CategoryRepository categoryRepository, BookmarkRepository bookmarkRepository) {
        this.categoryRepository = categoryRepository;
        this.bookmarkRepository = bookmarkRepository;
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    public Optional<Category> getCategoryById(Long id) {
        return categoryRepository.findById(id);
    }

    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    public Category updateCategory(Long id, Category categoryDetails) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        category.setName(categoryDetails.getName());
        category.setColor(categoryDetails.getColor());

        return categoryRepository.save(category);
    }

    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found with id: " + id));

        if (bookmarkRepository.existsByCategoryId(id)) {
            long count = bookmarkRepository.countByCategoryId(id);
            throw new RuntimeException("该分类下存在 " + count + " 个书签，请先删除这些书签");
        }

        categoryRepository.delete(category);
    }

    public void deleteCategoriesBatch(List<Long> ids) {
        for (Long id : ids) {
            if (bookmarkRepository.existsByCategoryId(id)) {
                long count = bookmarkRepository.countByCategoryId(id);
                throw new RuntimeException("选中的分类中存在 " + count + " 个书签，请先删除这些书签");
            }
        }
        categoryRepository.deleteAllById(ids);
    }

    public int deleteEmptyCategories() {
        List<Category> allCategories = categoryRepository.findAll();
        List<Category> emptyCategories = allCategories.stream()
                .filter(cat -> !bookmarkRepository.existsByCategoryId(cat.getId()))
                .toList();

        if (!emptyCategories.isEmpty()) {
            categoryRepository.deleteAll(emptyCategories);
        }

        return emptyCategories.size();
    }
}