package com.automation.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Root Controller for main API endpoints
 */
@RestController
@RequestMapping("/")
public class RootController {

    /**
     * GET /
     * Root health check endpoint
     */
    @GetMapping
    public Map<String, Object> root() {
        return Map.of(
                "status", "success",
                "message", "API is running",
                "version", "1.0.0",
                "timestamp", System.currentTimeMillis());
    }

    /**
     * GET /health
     * Health check endpoint
     */
    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of(
                "status", "success",
                "message", "API health is good",
                "timestamp", System.currentTimeMillis());
    }
}
